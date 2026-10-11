import { useState, useEffect, useCallback } from "react";

export interface LocationState {
  lat: number;
  lon: number;
  name: string;
  /** false when neither the URL nor a remembered place provides a location (welcome state) */
  hasLocation: boolean;
  isOutOfCoverage?: boolean;
}

const LAST_PLACE_KEY = "breeze:last-place";

const NO_LOCATION: LocationState = {
  lat: NaN,
  lon: NaN,
  name: "",
  hasLocation: false,
  isOutOfCoverage: false,
};

// India Bounding Box: lat 6 to 38, lon 68 to 98.5
export function isWithinIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98.5;
}

function readLastPlace(): LocationState | null {
  try {
    const raw = localStorage.getItem(LAST_PLACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.lat === "number" && typeof p?.lon === "number" && typeof p?.name === "string" && isWithinIndia(p.lat, p.lon)) {
      return { lat: p.lat, lon: p.lon, name: p.name, hasLocation: true, isOutOfCoverage: false };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function rememberPlace(place: { lat: number; lon: number; name: string }) {
  try {
    localStorage.setItem(LAST_PLACE_KEY, JSON.stringify(place));
  } catch {
    // ignore storage errors
  }
}

function parseUrlLocation(): LocationState {
  if (typeof window === "undefined") return NO_LOCATION;
  const params = new URLSearchParams(window.location.search);
  const latStr = params.get("lat");
  const lonStr = params.get("lon");
  const name = params.get("name") || params.get("n");

  if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lon)) {
      if (!isWithinIndia(lat, lon)) {
        return { lat, lon, name: name || `${lat}, ${lon}`, hasLocation: true, isOutOfCoverage: true };
      }
      return {
        lat: Math.round(lat * 100) / 100,
        lon: Math.round(lon * 100) / 100,
        name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        hasLocation: true,
        isOutOfCoverage: false,
      };
    }
  }

  // No (valid) place in the URL: resume the last place viewed on this device, else show the welcome state
  return readLastPlace() ?? NO_LOCATION;
}

export function useLocationParams() {
  const [location, setLocationState] = useState<LocationState>(parseUrlLocation);

  useEffect(() => {
    const handlePopState = () => {
      setLocationState(parseUrlLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setLocation = useCallback((newLoc: { lat: number; lon: number; name: string }) => {
    const roundedLat = Math.round(newLoc.lat * 100) / 100;
    const roundedLon = Math.round(newLoc.lon * 100) / 100;
    const outOfCoverage = !isWithinIndia(roundedLat, roundedLon);

    const params = new URLSearchParams(window.location.search);
    params.set("lat", roundedLat.toString());
    params.set("lon", roundedLon.toString());
    params.set("name", newLoc.name);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, "", newUrl);

    if (!outOfCoverage) rememberPlace({ lat: roundedLat, lon: roundedLon, name: newLoc.name });

    setLocationState({
      lat: roundedLat,
      lon: roundedLon,
      name: newLoc.name,
      hasLocation: true,
      isOutOfCoverage: outOfCoverage,
    });
  }, []);

  return {
    ...location,
    setLocation,
  };
}
