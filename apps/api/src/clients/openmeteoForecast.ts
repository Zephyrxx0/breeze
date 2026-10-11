import { z } from "zod";
import { fetchWithTimeout, type ClientResult } from "./http";
import type { ClientOptions } from "./openmeteoAir";

export const OpenMeteoForecastSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  utc_offset_seconds: z.number().default(19800),
  timezone: z.string().default("Asia/Kolkata"),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number().nullable()).optional(),
    apparent_temperature: z.array(z.number().nullable()).optional(),
    relative_humidity_2m: z.array(z.number().nullable()).optional(),
    precipitation_probability: z.array(z.number().nullable()).optional(),
    uv_index: z.array(z.number().nullable()).optional(),
    wind_speed_10m: z.array(z.number().nullable()).optional(),
    wind_direction_10m: z.array(z.number().nullable()).optional(),
  }),
  daily: z
    .object({
      time: z.array(z.string()).optional(),
      uv_index_max: z.array(z.number().nullable()).optional(),
      sunrise: z.array(z.string()).optional(),
      sunset: z.array(z.string()).optional(),
    })
    .optional(),
});

export interface OpenMeteoForecastData {
  hourly: Array<{
    time: string;
    temperature2m?: number;
    apparentTemperature?: number;
    relativeHumidity2m?: number;
    precipitationProbability?: number;
    uvIndex?: number;
    windSpeed10m?: number;
    windDirection10m?: number;
  }>;
  daily?: {
    uvIndexMax?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

/**
 * Client for Open-Meteo Weather Forecast API.
 * Base URL overridable via FORECAST_BASE_URL env var or options.baseUrl.
 */
export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  options: ClientOptions = {}
): Promise<ClientResult<OpenMeteoForecastData>> {
  const base =
    options.baseUrl ??
    process.env.FORECAST_BASE_URL ??
    "https://api.open-meteo.com/v1/forecast";

  const url = `${base}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,uv_index,wind_speed_10m,wind_direction_10m&daily=uv_index_max,sunrise,sunset&forecast_days=2&timezone=auto`;

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
    const parsed = OpenMeteoForecastSchema.safeParse(json);

    if (!parsed.success) {
      return {
        ok: false,
        error: `Schema validation failed: ${parsed.error.message}`,
      };
    }

    const { hourly, daily } = parsed.data;
    const points: OpenMeteoForecastData["hourly"] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      points.push({
        time: hourly.time[i],
        temperature2m: hourly.temperature_2m?.[i] ?? undefined,
        apparentTemperature: hourly.apparent_temperature?.[i] ?? undefined,
        relativeHumidity2m: hourly.relative_humidity_2m?.[i] ?? undefined,
        precipitationProbability: hourly.precipitation_probability?.[i] ?? undefined,
        uvIndex: hourly.uv_index?.[i] ?? undefined,
        windSpeed10m: hourly.wind_speed_10m?.[i] ?? undefined,
        windDirection10m: hourly.wind_direction_10m?.[i] ?? undefined,
      });
    }

    return {
      ok: true,
      data: {
        hourly: points,
        daily: daily
          ? {
              uvIndexMax: daily.uv_index_max?.map((v) => v ?? 0),
              sunrise: daily.sunrise,
              sunset: daily.sunset,
            }
          : undefined,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
