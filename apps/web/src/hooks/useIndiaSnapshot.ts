import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CITIES, type City } from "../lib/cities";

const PointSchema = z.object({
  current: z
    .object({
      time: z.number(),
      pm2_5: z.number().nullable().optional(),
    })
    .optional(),
});
const ResponseSchema = z.union([z.array(PointSchema), PointSchema]);

export interface CityReading extends City {
  /** Regional-model PM2.5 (µg/m³); null when the model has no value */
  pm25: number | null;
}

export interface IndiaSnapshot {
  cities: CityReading[];
  /** Model valid-time (ISO, UTC) of the first city that returned a value */
  validAt: string | null;
}

/**
 * Live CAMS regional-model PM2.5 for the overview cities in ONE keyless Open-Meteo call.
 * Always labelled "regional model estimate"; a failed call yields an error (map shows no numbers).
 */
export async function fetchIndiaSnapshot(signal?: AbortSignal): Promise<IndiaSnapshot> {
  const lat = CITIES.map((c) => c.lat).join(",");
  const lon = CITIES.map((c) => c.lon).join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&timeformat=unixtime&timezone=UTC`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Overview unavailable (${res.status})`);
  const parsed = ResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Overview response malformed");

  const points = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  let validAt: string | null = null;
  const cities = CITIES.map((c, i) => {
    const cur = points[i]?.current;
    const pm25 = typeof cur?.pm2_5 === "number" && cur.pm2_5 >= 0 ? cur.pm2_5 : null;
    if (pm25 !== null && !validAt && cur) validAt = new Date(cur.time * 1000).toISOString();
    return { ...c, pm25 };
  });
  return { cities, validAt };
}

export function useIndiaSnapshot() {
  return useQuery({
    queryKey: ["india-snapshot"],
    queryFn: ({ signal }) => fetchIndiaSnapshot(signal),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
