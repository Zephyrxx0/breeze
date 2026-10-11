import { useState, useCallback } from "react";

export interface SavedPlace {
  lat: number;
  lon: number;
  name: string;
}

const STORAGE_KEY = "breeze:saved-places";
const MAX_SAVED = 5;

function parseStored(): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item.lat === "number" && typeof item.lon === "number" && typeof item.name === "string")
        .slice(0, MAX_SAVED);
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

export function useSavedPlaces(current: { lat: number; lon: number; name: string }) {
  const [places, setPlaces] = useState<SavedPlace[]>(parseStored);

  const isCurrentSaved = places.some(
    (p) => Math.abs(p.lat - current.lat) < 0.02 && Math.abs(p.lon - current.lon) < 0.02
  );

  const persist = (next: SavedPlace[]) => {
    setPlaces(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota or storage errors
    }
  };

  const toggleSaveCurrent = useCallback((): { action: "saved" | "removed" | "limit_reached" } => {
    const existsIndex = places.findIndex(
      (p) => Math.abs(p.lat - current.lat) < 0.02 && Math.abs(p.lon - current.lon) < 0.02
    );

    if (existsIndex >= 0) {
      const next = places.filter((_, idx) => idx !== existsIndex);
      persist(next);
      return { action: "removed" };
    }

    if (places.length >= MAX_SAVED) {
      return { action: "limit_reached" };
    }

    const roundedLat = Math.round(current.lat * 100) / 100;
    const roundedLon = Math.round(current.lon * 100) / 100;
    const next = [...places, { lat: roundedLat, lon: roundedLon, name: current.name }];
    persist(next);
    return { action: "saved" };
  }, [places, current]);

  const removePlace = useCallback((place: SavedPlace) => {
    const next = places.filter(
      (p) => !(Math.abs(p.lat - place.lat) < 0.001 && Math.abs(p.lon - place.lon) < 0.001)
    );
    persist(next);
  }, [places]);

  return {
    places,
    isCurrentSaved,
    toggleSaveCurrent,
    removePlace,
  };
}

