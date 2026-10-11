export type Category =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type Profile = "standard" | "sensitive";

/** What the person is doing outdoors; changes the tips (never the CPCB verdict). */
export type Activity = "everyday" | "runner" | "worker" | "parent";

export type Verdict = "Good to go" | "Take care" | "Stay indoors if you can";

export type Confidence = "High" | "Medium" | "Low";

/** Canonical hour-precision ISO string: YYYY-MM-DDTHH or YYYY-MM-DDTHH:00 */
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
  apparentTemperature?: number;
  uvIndex?: number;
  precipitationProbability?: number;
}

export interface StationReading {
  id?: number | string;
  stationId?: string;
  name: string;
  stationName?: string;
  lat: number;
  lon: number;
  distanceKm?: number;
  bearingDeg?: number;
  measuredAt: string; // ISO 8601 UTC
  measuredAtUtc?: string;
  pm25: number;
  units?: string;
  provider?: string;
}

export interface EffectivePm25 {
  pm25: number;
  value?: number;
  source: "station" | "model";
  basis?: "station" | "model" | "blended";
  sourceName?: string;
  measuredAt: string; // ISO 8601 UTC
  station?: {
    id?: number | string;
    name: string;
    distanceKm: number;
    provider?: string;
  };
  modelDistanceNote?: "~45 km";
  confidence: Confidence;
  ratio?: number | null; // station / model
}

export interface Tip {
  id: string;
  cite: string;
  text: string;
  priority: number;
}

export interface BestWindow {
  startWall: WallClock;
  endWall: WallClock;
  meanPm25: number;
  improvementPct: number; // e.g. 0.20 for 20%
}

export interface ReasonLinesInput {
  effective: EffectivePm25;
  category: Category;
  profile: Profile;
  next6hPeakWorse?: boolean;
  stationModelRatio?: number | null;
  nowMs: number;
  tomorrow?: {
    daytimeMean: number;
    peakHourLabel: string;
    peakCategory: Category;
  };
}

export interface TomorrowTabResult {
  verdict: Verdict;
  category: Category;
  daytimeMean: number;
  reasonLines: [string, string];
  peakHourLabel: string;
  peakCategory: Category;
}

export interface PlaceSearchResult {
  id: number;
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface AssessResponse {
  generatedAt: string;
  location: {
    lat: number;
    lon: number;
    timezone?: string;
    utcOffsetSeconds: number;
  };
  air: {
    status: "ok" | "stale" | "unavailable";
    current: {
      pm25: number;
      source: "station" | "model";
      measuredAt: string;
      station?: {
        id?: number | string;
        name: string;
        distanceKm: number;
        provider?: string;
      };
      modelDistanceNote?: "~45 km";
      confidence: Confidence;
    } | null;
    model: {
      hourly: Array<{
        time: string;
        pm25: number;
        pm10?: number;
      }>;
    } | null;
    comparison?: {
      ratio: number;
      stationPm25: number;
      modelPm25: number;
    };
  };
  weather: {
    status: "ok" | "stale" | "unavailable";
    current?: {
      temperature2m?: number;
      apparentTemperature?: number;
      relativeHumidity2m?: number;
      precipitationProbability?: number;
      uvIndex?: number;
      windSpeed10m?: number;
      windDirection10m?: number;
    };
    hourly?: Array<{
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
  };
  sources: Record<
    string,
    {
      status: "ok" | "stale" | "unavailable";
      fetchedAt?: string;
      ageMin?: number;
      error?: string;
    }
  >;
}

