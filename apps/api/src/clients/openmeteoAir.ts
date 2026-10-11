import { z } from "zod";
import { fetchWithTimeout, type ClientResult } from "./http";

export const OpenMeteoAirSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  utc_offset_seconds: z.number().default(19800),
  timezone: z.string().default("Asia/Kolkata"),
  current: z
    .object({
      time: z.string(),
      pm2_5: z.number(),
    })
    .optional(),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: z.array(z.number().nullable()),
    pm10: z.array(z.number().nullable()).optional(),
  }),
});

export interface OpenMeteoAirData {
  hourly: Array<{
    time: string;
    pm25: number;
    pm10?: number;
  }>;
  pm25Now: number | null;
  utcOffsetSeconds: number;
  timezone: string;
}

export interface ClientOptions {
  signal?: AbortSignal;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Client for Open-Meteo Air Quality API (CAMS Global).
 * Base URL overridable via AIR_BASE_URL env var or options.baseUrl.
 */
export async function fetchOpenMeteoAir(
  lat: number,
  lon: number,
  options: ClientOptions = {}
): Promise<ClientResult<OpenMeteoAirData>> {
  const base =
    options.baseUrl ??
    process.env.AIR_BASE_URL ??
    "https://air-quality-api.open-meteo.com/v1/air-quality";

  const url = `${base}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10&current=pm2_5&forecast_days=2&timezone=auto`;

  try {
    const res = await fetchWithTimeout(
      url,
      { signal: options.signal },
      options.timeoutMs ?? 4000
    );

    if (!res.ok) {
      return { ok: false, error: `Upstream HTTP ${res.status}` };
    }

    const json = await res.json();
    const parsed = OpenMeteoAirSchema.safeParse(json);

    if (!parsed.success) {
      return {
        ok: false,
        error: `Schema validation failed: ${parsed.error.message}`,
      };
    }

    const { hourly, current, utc_offset_seconds, timezone } = parsed.data;
    const points: OpenMeteoAirData["hourly"] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      const pmVal = hourly.pm2_5[i];
      if (pmVal !== null && pmVal !== undefined && Number.isFinite(pmVal)) {
        points.push({
          time: hourly.time[i],
          pm25: pmVal,
          pm10: hourly.pm10 ? hourly.pm10[i] ?? undefined : undefined,
        });
      }
    }

    return {
      ok: true,
      data: {
        hourly: points,
        pm25Now: current?.pm2_5 ?? (points.length > 0 ? points[0].pm25 : null),
        utcOffsetSeconds: utc_offset_seconds,
        timezone,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
