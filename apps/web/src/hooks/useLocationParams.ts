import { useState, useEffect, useCallback } from "react";

export interface LocationState {
  lat: number;
  lon: number;
  name: string;
  isOutOfCoverage?: boolean;
}

const DEFAULT_LOCATION: LocationState = {
  lat: 28.61,
  lon: 77.21,
  name: "New Delhi, Delhi",
};

// India Bounding Box: lat 6 to 38, lon 68 to 98.5
export function isWithinIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98.5;
}

function parseUrlLocation(): LocationState {
  if (typeof window === "undefined") return DEFAULT_LOCATION;
  const params = new URLSearchParams(window.location.search);
  const latStr = params.get("lat");
  const lonStr = params.get("lon");
  const name = params.get("name") || params.get("n");

  if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lon)) {
      if (!isWithinIndia(lat, lon)) {
        return {
          lat,
          lon,
          name: name || `${lat}, ${lon}`,
          isOutOfCoverage: true,
        };
      }
      return {
        lat: Math.round(lat * 100) / 100,
        lon: Math.round(lon * 100) / 100,
        name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        isOutOfCoverage: false,
      };
    }
  }

  return DEFAULT_LOCATION;
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

    setLocationState({
      lat: roundedLat,
      lon: roundedLon,
      name: newLoc.name,
      isOutOfCoverage: outOfCoverage,
    });
  }, []);

  return {
    ...location,
    setLocation,
  };
}

