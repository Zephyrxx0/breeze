export type Category =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type Profile = "general" | "sensitive";

export type Verdict = "good_to_go" | "take_care" | "stay_indoors";

export type Confidence = "high" | "moderate" | "low";

/** Canonical hour-precision ISO string: YYYY-MM-DDTHH */
export type WallClock = string;

export interface HourPoint {
  time: WallClock;
  pm25: number;
  pm10?: number;
  humidity?: number;
  windSpeed10m?: number;
  windDirection10m?: number;
  surfacePressure?: number;
  temperature2m?: number;
}

export interface StationReading {
  stationId: string;
  stationName: string;
  distanceKm: number;
  bearingDeg?: number;
  measuredAt: string; // ISO 8601
  pm25: number;
}

export interface EffectivePm25 {
  value: number;
  confidence: Confidence;
  basis: "station" | "model" | "blended";
  sourceName: string;
  measuredAt?: string;
  ratio?: number; // station / model
}

export interface Tip {
  id: string;
  text: string;
  priority: number;
}

export interface BestWindow {
  start: WallClock;
  end: WallClock;
  avgPm25: number;
  deltaPercent: number; // vs current PM2.5
}

export interface ReasonLinesInput {
  effective: EffectivePm25;
  category: Category;
  profile: Profile;
  verdict: Verdict;
  windSpeed?: number;
  windDirection?: number;
  nowMs: number;
}

export interface PlaceSearchResult {
  id: number;
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
