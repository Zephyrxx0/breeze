import { Hono } from "hono";
import { selectEffectivePm25, type StationReading } from "@breeze/core";
import { QueryNumericSchema, QueryIndiaBoundsSchema, type AssessResponse } from "../assessSchema";
import { fetchOpenMeteoAir, type OpenMeteoAirData } from "../clients/openmeteoAir";
import { fetchOpenMeteoForecast, type OpenMeteoForecastData } from "../clients/openmeteoForecast";
import { fetchOpenAq } from "../clients/openaq";
import { getFresh, setSection, getStaleFallback } from "../cache";

export const assessRoutes = new Hono();

// Global middleware for /assess: set Cache-Control on all responses
assessRoutes.use("/assess", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=300");
});

assessRoutes.get("/assess", async (c) => {
  const query = c.req.query();

  // Stage 1 validation: presence and numeric type
  const numParsed = QueryNumericSchema.safeParse(query);
  if (!numParsed.success) {
    return c.json({ error: "invalid_params" }, 400);
  }

  // Stage 2 validation: India bounds
  const boundsParsed = QueryIndiaBoundsSchema.safeParse(numParsed.data);
  if (!boundsParsed.success) {
    return c.json({ error: "out_of_coverage" }, 400);
  }

  const rawLat = boundsParsed.data.lat;
  const rawLon = boundsParsed.data.lon;

  // 2 dp rounding for cache identity and location output
  const lat2 = Number(rawLat.toFixed(2));
  const lon2 = Number(rawLon.toFixed(2));
  const cacheKey = `${lat2},${lon2}`;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  let cacheHit = true;

  // Check TTL cache per upstream (TTLs from PRD §8: OpenAQ 15m, Air 60m, Forecast 30m)
  const TTL_OPENAQ = 15 * 60 * 1000;
  const TTL_AIR = 60 * 60 * 1000;
  const TTL_FORECAST = 30 * 60 * 1000;

  let cachedAir = getFresh<OpenMeteoAirData>(cacheKey, "air", TTL_AIR, nowMs);
  let cachedForecast = getFresh<OpenMeteoForecastData>(cacheKey, "forecast", TTL_FORECAST, nowMs);
  let cachedOpenAq = getFresh<StationReading[]>(cacheKey, "openaq", TTL_OPENAQ, nowMs);

  const fetchTasks: [
    Promise<unknown>,
    Promise<unknown>,
    Promise<unknown>
  ] = [
    cachedAir
      ? Promise.resolve({ ok: true, data: cachedAir, cached: true })
      : (cacheHit = false, fetchOpenMeteoAir(lat2, lon2).then((res) => ({ ...res, cached: false }))),
    cachedForecast
      ? Promise.resolve({ ok: true, data: cachedForecast, cached: true })
      : (cacheHit = false, fetchOpenMeteoForecast(lat2, lon2).then((res) => ({ ...res, cached: false }))),
    cachedOpenAq
      ? Promise.resolve({ ok: true, data: cachedOpenAq, cached: true })
      : (cacheHit = false, fetchOpenAq(lat2, lon2).then((res) => ({ ...res, cached: false }))),
  ];

  const results = await Promise.allSettled(fetchTasks);

  // Parse upstream results
  type UpstreamRes<T> = { ok: boolean; data?: T; error?: string; cached?: boolean };
  const airRes = (results[0].status === "fulfilled" ? results[0].value : { ok: false, error: "network error" }) as UpstreamRes<OpenMeteoAirData>;
  const forecastRes = (results[1].status === "fulfilled" ? results[1].value : { ok: false, error: "network error" }) as UpstreamRes<OpenMeteoForecastData>;
  const openaqRes = (results[2].status === "fulfilled" ? results[2].value : { ok: false, error: "network error" }) as UpstreamRes<StationReading[]>;

  const sources: AssessResponse["sources"] = {};

  // Air handling
  let airData: OpenMeteoAirData | null = null;
  let airStatus: "ok" | "stale" | "unavailable" = "unavailable";
  if (airRes.ok && airRes.data) {
    airData = airRes.data;
    airStatus = "ok";
    if (!airRes.cached) {
      setSection(cacheKey, "air", airData, nowMs);
    }
    sources["openmeteo_air"] = { status: "ok", fetchedAt: nowIso };
  } else {
    const stale = getStaleFallback<OpenMeteoAirData>(cacheKey, "air", nowMs);
    if (stale) {
      airData = stale.data;
      airStatus = "stale";
      sources["openmeteo_air"] = { status: "stale", ageMin: stale.ageMin, error: airRes.error };
    } else {
      sources["openmeteo_air"] = { status: "unavailable", error: airRes.error ?? "failed" };
    }
  }

  // Forecast handling
  let forecastData: OpenMeteoForecastData | null = null;
  let forecastStatus: "ok" | "stale" | "unavailable" = "unavailable";
  if (forecastRes.ok && forecastRes.data) {
    forecastData = forecastRes.data;
    forecastStatus = "ok";
    if (!forecastRes.cached) {
      setSection(cacheKey, "forecast", forecastData, nowMs);
    }
    sources["openmeteo_forecast"] = { status: "ok", fetchedAt: nowIso };
  } else {
    const stale = getStaleFallback<OpenMeteoForecastData>(cacheKey, "forecast", nowMs);
    if (stale) {
      forecastData = stale.data;
      forecastStatus = "stale";
      sources["openmeteo_forecast"] = { status: "stale", ageMin: stale.ageMin, error: forecastRes.error };
    } else {
      sources["openmeteo_forecast"] = { status: "unavailable", error: forecastRes.error ?? "failed" };
    }
  }

  // OpenAQ handling
  let openaqData: StationReading[] = [];
  if (openaqRes.ok && openaqRes.data) {
    openaqData = openaqRes.data;
    if (!openaqRes.cached) {
      setSection(cacheKey, "openaq", openaqData, nowMs);
    }
    sources["openaq"] = { status: "ok", fetchedAt: nowIso };
  } else {
    const stale = getStaleFallback<StationReading[]>(cacheKey, "openaq", nowMs);
    if (stale) {
      openaqData = stale.data;
      sources["openaq"] = { status: "stale", ageMin: stale.ageMin, error: openaqRes.error };
    } else {
      sources["openaq"] = { status: "unavailable", error: openaqRes.error ?? "failed" };
    }
  }

  // Check 502: all upstreams failed and no cached data exists
  const hasAir = airData !== null;
  const hasForecast = forecastData !== null;
  const hasStations = openaqData.length > 0;

  if (!hasAir && !hasForecast && !hasStations) {
    return c.json({ error: "all_upstreams_failed" }, 502);
  }

  // Determine effective PM2.5 via core's selectEffectivePm25 (data-selection only)
  const effective = selectEffectivePm25({
    point: { lat: lat2, lon: lon2 },
    stations: openaqData,
    modelPm25Now: airData?.pm25Now ?? null,
    modelOffsetSeconds: airData?.utcOffsetSeconds ?? 19800,
    nowMs,
  });

  // Calculate comparison ratio if station and model both exist
  let comparison: AssessResponse["air"]["comparison"] | undefined;
  if (
    effective &&
    effective.source === "station" &&
    airData &&
    airData.pm25Now !== null &&
    airData.pm25Now > 0
  ) {
    comparison = {
      ratio: Number((effective.pm25 / airData.pm25Now).toFixed(2)),
      stationPm25: effective.pm25,
      modelPm25: airData.pm25Now,
    };
  }

  // Air section status: ok if either air or station served
  const combinedAirStatus: "ok" | "stale" | "unavailable" =
    effective !== null ? (airStatus === "stale" ? "stale" : "ok") : "unavailable";

  const responseBody: AssessResponse = {
    generatedAt: nowIso,
    location: {
      lat: lat2,
      lon: lon2,
      timezone: airData?.timezone ?? "Asia/Kolkata",
      utcOffsetSeconds: airData?.utcOffsetSeconds ?? 19800,
    },
    air: {
      status: combinedAirStatus,
      current: effective
        ? {
            pm25: effective.pm25,
            source: effective.source,
            measuredAt: effective.measuredAt,
            station: effective.station,
            modelDistanceNote: effective.modelDistanceNote,
            confidence: effective.confidence,
          }
        : null,
      model: airData
        ? {
            hourly: airData.hourly,
          }
        : null, // Null on station-only degrade
      comparison,
    },
    weather: {
      status: forecastStatus,
      current: forecastData?.hourly?.[0]
        ? {
            temperature2m: forecastData.hourly[0].temperature2m,
            apparentTemperature: forecastData.hourly[0].apparentTemperature,
            relativeHumidity2m: forecastData.hourly[0].relativeHumidity2m,
            precipitationProbability: forecastData.hourly[0].precipitationProbability,
            uvIndex: forecastData.hourly[0].uvIndex,
            windSpeed10m: forecastData.hourly[0].windSpeed10m,
            windDirection10m: forecastData.hourly[0].windDirection10m,
          }
        : undefined,
      hourly: forecastData?.hourly,
      daily: forecastData?.daily,
    },
    sources,
  };

  // Structured log per PRD §16 (2 dp coordinates, no keys)
  console.log(
    JSON.stringify({
      requestId: crypto.randomUUID(),
      lat: lat2,
      lon: lon2,
      cacheHit,
      upstreams: [
        { name: "openmeteo_air", status: sources["openmeteo_air"]?.status },
        { name: "openmeteo_forecast", status: sources["openmeteo_forecast"]?.status },
        { name: "openaq", status: sources["openaq"]?.status },
      ],
      status: 200,
    })
  );

  return c.json(responseBody);
});
