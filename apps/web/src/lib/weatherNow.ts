import { wallFromInstant, type AssessResponse } from "@breeze/core";

export interface WeatherNow {
  /** Index of the current local hour in weather.hourly */
  index: number;
  feelsLikeC?: number;
  temperatureC?: number;
  humidity?: number;
  uvNow?: number;
  uvMaxToday?: number;
  /** Highest precipitation probability over the current and next 5 hours */
  rainNext6h?: number;
  windSpeedKmh?: number;
  windFromDeg?: number;
  sunrise?: string;
  sunset?: string;
}

/**
 * Picks the weather for the *current local hour* out of the 48 h hourly series.
 *
 * The API returns the series starting at local midnight, so hourly[0] is NOT "now".
 * Returns null when the series does not cover the current hour (never fall back to a
 * different hour and present it as current — data-honesty rule).
 */
export function weatherNow(
  weather: AssessResponse["weather"] | null | undefined,
  utcOffsetSeconds: number,
  nowMs: number
): WeatherNow | null {
  const hourly = weather?.hourly;
  if (!weather || weather.status === "unavailable" || !hourly || hourly.length === 0) return null;

  const wall = wallFromInstant(nowMs, utcOffsetSeconds); // YYYY-MM-DDTHH
  const index = hourly.findIndex((h) => h.time.slice(0, 13) === wall.slice(0, 13));
  if (index < 0) return null;

  const cur = hourly[index];
  const today = wall.slice(0, 10);

  const todayUv = hourly
    .filter((h) => h.time.startsWith(today) && typeof h.uvIndex === "number")
    .map((h) => h.uvIndex as number);
  const dailyIdx = weather.daily?.sunrise?.findIndex((s) => s.startsWith(today)) ?? -1;
  const dailyUvMax = dailyIdx >= 0 ? weather.daily?.uvIndexMax?.[dailyIdx] : undefined;
  const uvMaxToday = dailyUvMax ?? (todayUv.length ? Math.max(...todayUv) : undefined);

  const next6 = hourly
    .slice(index, index + 6)
    .map((h) => h.precipitationProbability)
    .filter((v): v is number => typeof v === "number");

  return {
    index,
    feelsLikeC: cur.apparentTemperature,
    temperatureC: cur.temperature2m,
    humidity: cur.relativeHumidity2m,
    uvNow: cur.uvIndex,
    uvMaxToday,
    rainNext6h: next6.length ? Math.max(...next6) : undefined,
    windSpeedKmh: cur.windSpeed10m,
    windFromDeg: cur.windDirection10m,
    sunrise: dailyIdx >= 0 ? weather.daily?.sunrise?.[dailyIdx] : undefined,
    sunset: dailyIdx >= 0 ? weather.daily?.sunset?.[dailyIdx] : undefined,
  };
}
