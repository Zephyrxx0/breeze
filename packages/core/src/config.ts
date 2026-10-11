import type { Category, Profile, Verdict } from "./types";

export interface Band {
  category: Category;
  lo: number;
  hi: number;
  subLo: number;
  subHi: number;
}

/**
 * CPCB continuous half-open breakpoint bands:
 * Good: [0, 30] -> sub-index [0, 50]
 * Satisfactory: (30, 60] -> sub-index [51, 100]
 * Moderate: (60, 90] -> sub-index [101, 200]
 * Poor: (90, 120] -> sub-index [201, 300]
 * Very Poor: (120, 250] -> sub-index [301, 400]
 * Severe: (250, 500] -> sub-index [401, 500] (capped at 500 above)
 */
export const BANDS: readonly Band[] = [
  { category: "Good", lo: 0, hi: 30, subLo: 0, subHi: 50 },
  { category: "Satisfactory", lo: 30, hi: 60, subLo: 51, subHi: 100 },
  { category: "Moderate", lo: 60, hi: 90, subLo: 101, subHi: 200 },
  { category: "Poor", lo: 90, hi: 120, subLo: 201, subHi: 300 },
  { category: "Very Poor", lo: 120, hi: 250, subLo: 301, subHi: 400 },
  { category: "Severe", lo: 250, hi: 500, subLo: 401, subHi: 500 },
] as const;

/**
 * 12-cell verdict decision matrix
 * PRD §7.2
 */
export const VERDICT_MATRIX: Record<Category, Record<Profile, Verdict>> = {
  Good: {
    general: "good_to_go",
    sensitive: "good_to_go",
  },
  Satisfactory: {
    general: "good_to_go",
    sensitive: "take_care",
  },
  Moderate: {
    general: "take_care",
    sensitive: "take_care",
  },
  Poor: {
    general: "take_care",
    sensitive: "stay_indoors",
  },
  "Very Poor": {
    general: "stay_indoors",
    sensitive: "stay_indoors",
  },
  Severe: {
    general: "stay_indoors",
    sensitive: "stay_indoors",
  },
};

export const WINDOW_CONFIG = {
  DAY_START_HOUR: 5,
  DAY_END_HOUR: 21,
  WINDOW_DURATION_HOURS: 3,
  IMPROVEMENT_THRESHOLD: 0.15, // 15% better than current
  DAYTIME_START_HOUR: 6,
  DAYTIME_END_HOUR: 20,
} as const;

export const TIP_THRESHOLDS = {
  POOR_PM25: 90,
  VERY_POOR_PM25: 120,
  SEVERE_PM25: 250,
  WIND_CALM_KPH: 5,
  HIGH_HUMIDITY_PERCENT: 80,
} as const;

export const VERBATIM_TIPS = {
  MASK_N95: "Wear an N95 mask if you step outside today.",
  CLOSE_WINDOWS: "Keep windows and doors closed to block outdoor particulate.",
  INDOOR_PURIFIER: "Run an air purifier indoors, especially in bedrooms.",
  LIMIT_OUTDOOR_EXERCISE: "Avoid intense outdoor exercise until air quality improves.",
  MORNING_HAZE: "Early morning inversion traps pollutants; postpone runs until afternoon.",
  WIND_DISPERSION: "Breezy conditions are helping disperse surface pollutants.",
  CALM_WIND: "Calm surface winds are allowing pollutants to settle and accumulate.",
} as const;
