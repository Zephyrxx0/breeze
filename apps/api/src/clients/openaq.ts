import { z } from "zod";
import { haversineKm, type StationReading } from "@breeze/core";
import { fetchWithTimeout, type ClientResult } from "./http";
import type { ClientOptions } from "./openmeteoAir";

export const OpenAqLocationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      name: z.string().default("Unknown station"),
      datetimeLast: z.object({ utc: z.string().optional() }).nullable().optional(),
      provider: z.object({ name: z.string().optional() }).nullable().optional(),
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

  // limit=1000 (API max): metro bboxes hold 100+ locations, many long dead, and results are
  // relevance-sorted (bbox gives no distance), so a small page can miss the nearest live station.
  const locationsUrl = `${base}/locations?bbox=${bboxStr}&parameters_id=2&limit=1000`;
  const nowMs = Date.now();
  const MAX_LAST_SEEN_MS = 3 * 60 * 60 * 1000;

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

    // Filter locations: must have coordinates, a PM2.5 sensor in µg/m³, be within 25 km and
    // have reported in the last 3 h (OpenAQ keeps long-dead stations listed).
    const candidateLocations: Array<{
      id: string | number;
      name: string;
      provider?: string;
      lat: number;
      lon: number;
      distanceKm: number;
      pm25SensorId: string | number;
      units: string;
    }> = [];

    for (const loc of locParsed.data.results) {
      if (!loc.coordinates) continue;
      const sensor = loc.sensors?.find((s) => s.parameter?.id === 2);
      if (!sensor) continue; // never fall back to another parameter's value
      const units = sensor.parameter?.units ?? "µg/m³";
      if (units !== "µg/m³") continue;

      const lastSeen = loc.datetimeLast?.utc ? Date.parse(loc.datetimeLast.utc) : NaN;
      if (Number.isFinite(lastSeen) && nowMs - lastSeen > MAX_LAST_SEEN_MS) continue;

      const dist = haversineKm(lat, lon, loc.coordinates.latitude, loc.coordinates.longitude);
      if (dist <= 25) {
        candidateLocations.push({
          id: loc.id,
          name: loc.name,
          provider: loc.provider?.name,
          lat: loc.coordinates.latitude,
          lon: loc.coordinates.longitude,
          distanceKm: dist,
          pm25SensorId: sensor.id,
          units,
        });
      }
    }

    // Sort by distance ascending; look at a few more than 3 so a stale latest value doesn't hide the next station
    candidateLocations.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest3 = candidateLocations.slice(0, 5);

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
        const row = latParsed.data.results.find((r) => String(r.sensorsId) === String(loc.pm25SensorId));

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
          units: loc.units,
          provider: loc.provider,
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
