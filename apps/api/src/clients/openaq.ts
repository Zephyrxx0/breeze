import { z } from "zod";
import { haversineKm, type StationReading } from "@breeze/core";
import { fetchWithTimeout, type ClientResult } from "./http";
import type { ClientOptions } from "./openmeteoAir";

export const OpenAqLocationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      name: z.string().default("Unknown station"),
      coordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      sensors: z
        .array(
          z.object({
            id: z.union([z.number(), z.string()]),
            parameter: z
              .object({
                id: z.number(),
                name: z.string().optional(),
                units: z.string().optional(),
              })
              .optional(),
          })
        )
        .optional(),
    })
  ),
});

export const OpenAqLatestSchema = z.object({
  results: z.array(
    z.object({
      sensorsId: z.union([z.number(), z.string()]).optional(),
      value: z.number().nullable(),
      datetime: z
        .object({
          utc: z.string(),
          local: z.string().optional(),
        })
        .optional(),
    })
  ),
});

/**
 * Computes west,south,east,north bounding box around point (±0.25 degrees).
 */
export function buildBoundingBox(
  lat: number,
  lon: number
): { west: number; south: number; east: number; north: number; bboxStr: string } {
  const west = Number((lon - 0.25).toFixed(4));
  const south = Number((lat - 0.25).toFixed(4));
  const east = Number((lon + 0.25).toFixed(4));
  const north = Number((lat + 0.25).toFixed(4));
  return {
    west,
    south,
    east,
    north,
    bboxStr: `${west},${south},${east},${north}`,
  };
}

/**
 * Client for OpenAQ v3 API.
 * Requires process.env.OPENAQ_API_KEY (refuses with error if absent).
 */
export async function fetchOpenAq(
  lat: number,
  lon: number,
  options: ClientOptions & { key?: string } = {}
): Promise<ClientResult<StationReading[]>> {
  const apiKey = options.key ?? process.env.OPENAQ_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return { ok: false, error: "no key" };
  }

  const base =
    options.baseUrl ?? process.env.OPENAQ_BASE_URL ?? "https://api.openaq.org/v3";
  const { bboxStr } = buildBoundingBox(lat, lon);

  const locationsUrl = `${base}/locations?bbox=${bboxStr}&parameters_id=2&limit=20`;

  try {
    const locRes = await fetchWithTimeout(
      locationsUrl,
      {
        headers: { "X-API-Key": apiKey },
        signal: options.signal,
      },
      options.timeoutMs ?? 4000
    );

    if (!locRes.ok) {
      return { ok: false, error: `OpenAQ locations HTTP ${locRes.status}` };
    }

    const locJson = await locRes.json();
    const locParsed = OpenAqLocationsSchema.safeParse(locJson);
    if (!locParsed.success) {
      return {
        ok: false,
        error: `OpenAQ locations schema error: ${locParsed.error.message}`,
      };
    }

    // Filter locations with coordinates and calculate distances
    const candidateLocations: Array<{
      id: string | number;
      name: string;
      lat: number;
      lon: number;
      distanceKm: number;
      pm25SensorId?: string | number;
    }> = [];

    for (const loc of locParsed.data.results) {
      if (!loc.coordinates) continue;
      const dist = haversineKm(
        lat,
        lon,
        loc.coordinates.latitude,
        loc.coordinates.longitude
      );
      if (dist <= 25) {
        // Find PM2.5 sensor ID (parameter id 2)
        const sensor = loc.sensors?.find((s) => s.parameter?.id === 2);
        candidateLocations.push({
          id: loc.id,
          name: loc.name,
          lat: loc.coordinates.latitude,
          lon: loc.coordinates.longitude,
          distanceKm: dist,
          pm25SensorId: sensor?.id,
        });
      }
    }

    // Sort by distance ascending and pick up to 3 nearest
    candidateLocations.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest3 = candidateLocations.slice(0, 3);

    if (nearest3.length === 0) {
      return { ok: true, data: [] };
    }

    // Parallel fetch /latest for each selected station
    const latestPromises = nearest3.map(async (loc) => {
      const latestUrl = `${base}/locations/${loc.id}/latest`;
      try {
        const latRes = await fetchWithTimeout(
          latestUrl,
          {
            headers: { "X-API-Key": apiKey },
            signal: options.signal,
          },
          options.timeoutMs ?? 4000
        );

        if (!latRes.ok) return null;
        const latJson = await latRes.json();
        const latParsed = OpenAqLatestSchema.safeParse(latJson);
        if (!latParsed.success) return null;

        // Match PM2.5 row
        const row = latParsed.data.results.find((r) => {
          if (loc.pm25SensorId !== undefined) {
            return String(r.sensorsId) === String(loc.pm25SensorId);
          }
          return true;
        });

        if (!row || row.value === null || row.value === undefined || row.value < 0) {
          return null;
        }

        const reading: StationReading = {
          id: loc.id,
          stationId: String(loc.id),
          name: loc.name,
          stationName: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          distanceKm: loc.distanceKm,
          pm25: row.value,
          measuredAt: row.datetime?.utc ?? new Date().toISOString(),
          measuredAtUtc: row.datetime?.utc,
          units: "µg/m³",
        };
        return reading;
      } catch {
        return null;
      }
    });

    const readings = (await Promise.all(latestPromises)).filter(
      (r): r is StationReading => r !== null
    );

    return { ok: true, data: readings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
