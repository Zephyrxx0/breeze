import {
  bestWindow,
  buildTips,
  categoryFor,
  confidenceFor,
  next6hPeakWorse,
  reasonLines,
  tomorrowTab,
  verdictFor,
  wallFromInstant,
  type AssessResponse,
  type BestWindow,
  type Category,
  type Confidence,
  type EffectivePm25,
  type Profile,
  type Activity,
  type Tip,
  type TomorrowTabResult,
  type Verdict,
} from "@breeze/core";
import { weatherNow, type WeatherNow } from "./weatherNow";

export interface Assessment {
  effective: EffectivePm25;
  confidence: Confidence;
  /** Age of a station reading in minutes (null for model values / unknown) */
  ageMin: number | null;
  isStale: boolean;
  today: { category: Category; verdict: Verdict; reasons: [string, string] };
  /** null when the regional forecast model is unavailable (station-only degrade) */
  tomorrow: TomorrowTabResult | null;
  window: BestWindow | null;
  tips: Tip[];
  weather: WeatherNow | null;
  nowWall: string;
}

/**
 * Single place where the shared @breeze/core rules are applied to an API response.
 * Pure: re-run on profile change, never refetches.
 */
export function deriveAssessment(
  data: AssessResponse,
  profile: Profile,
  nowMs: number,
  activity: Activity = "everyday"
): Assessment | null {
  const current = data.air?.current;
  if (!current || data.air.status === "unavailable") return null;

  const offset = data.location.utcOffsetSeconds;
  const nowWall = wallFromInstant(nowMs, offset);

  let ageMin: number | null = null;
  if (current.source === "station") {
    const t = Date.parse(current.measuredAt);
    if (!Number.isNaN(t)) ageMin = Math.max(0, Math.round((nowMs - t) / 60000));
  }

  const confidence = confidenceFor({
    source: current.source,
    distanceKm: current.station?.distanceKm,
    ageMin: ageMin ?? undefined,
  });

  const effective: EffectivePm25 = {
    pm25: current.pm25,
    source: current.source,
    measuredAt: current.measuredAt,
    station: current.station,
    modelDistanceNote: current.modelDistanceNote,
    confidence,
  };

  const hourly = (data.air.model?.hourly ?? []).map((h) => ({ time: h.time, pm25: h.pm25, pm10: h.pm10 }));
  const category = categoryFor(current.pm25);
  // Trend compares model against model: a station reading and the regional model can sit in
  // different categories, which would otherwise fake a "getting worse" trend.
  const modelNowPoint = hourly.find((h) => h.time.slice(0, 13) === nowWall.slice(0, 13));
  const trendBaseline = current.source === "model" || !modelNowPoint ? category : categoryFor(modelNowPoint.pm25);
  const worse = next6hPeakWorse(hourly, nowWall, trendBaseline);

  const reasons = reasonLines({
    effective,
    category,
    profile,
    next6hPeakWorse: worse,
    stationModelRatio: data.air.comparison?.ratio ?? null,
    nowMs,
  });

  const window = bestWindow(hourly, nowWall);
  const weather = weatherNow(data.weather, offset, nowMs);

  const tips = buildTips(
    {
      effectivePm25: effective,
      window,
      uv: weather?.uvNow,
      feelsLikeC: weather?.feelsLikeC,
      rainProbNext6h: weather?.rainNext6h,
      activity,
    },
    profile
  );

  return {
    effective,
    confidence,
    ageMin,
    isStale: data.air.status === "stale",
    today: { category, verdict: verdictFor(category, profile), reasons },
    tomorrow: tomorrowTab(hourly, offset, nowWall, profile),
    window,
    tips,
    weather,
    nowWall,
  };
}
