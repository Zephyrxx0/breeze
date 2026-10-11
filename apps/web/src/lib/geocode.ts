import { z } from "zod";
import type { PlaceSearchResult } from "@breeze/core";

export const GeocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
      })
    )
    .default([]),
});

export interface SearchPlacesOptions {
  signal?: AbortSignal;
  baseUrl?: string;
}

/**
 * Browser-side client for Open-Meteo Geocoding search.
 * Defensively filters country_code === "IN" and limits to 8 results.
 */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {}
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const base =
    options.baseUrl ??
    (typeof process !== "undefined" && process.env?.GEOCODE_BASE_URL
      ? process.env.GEOCODE_BASE_URL
      : "https://geocoding-api.open-meteo.com/v1/search");

  const url = `${base}?name=${encodeURIComponent(trimmed)}&count=8&language=en&countryCode=IN`;

  const ac = new AbortController();
  const timer = setTimeout(() => {
    ac.abort(new Error("Geocode timeout of 8000ms"));
  }, 8000);

  if (options.signal) {
    options.signal.addEventListener("abort", () => ac.abort(options.signal?.reason));
  }

  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const parsed = GeocodeResponseSchema.safeParse(json);
    if (!parsed.success) {
      return [];
    }

    // Defensive country_code IN filter + slice to 8
    const inResults = parsed.data.results
      .filter((r) => !r.country_code || r.country_code.toUpperCase() === "IN")
      .slice(0, 8);

    return inResults.map((r) => ({
      id: r.id,
      name: r.name,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
}

/**
 * BigDataCloud reverse geocode client (free, client-side, keyless).
 * Fallback chain: city || locality || principalSubdivision || "Your location"
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const ac = new AbortController();
  const timer = setTimeout(() => {
    ac.abort(new Error("Reverse geocode timeout"));
  }, 6000);

  if (signal) {
    signal.addEventListener("abort", () => ac.abort(signal.reason));
  }

  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) {
      return { latitude: lat, longitude: lon };
    }
    const json = await res.json();
    return {
      latitude: lat,
      longitude: lon,
      city: json.city,
      locality: json.locality,
      principalSubdivision: json.principalSubdivision,
      countryName: json.countryName,
      countryCode: json.countryCode,
    };
  } catch {
    return { latitude: lat, longitude: lon };
  } finally {
    clearTimeout(timer);
  }
}
