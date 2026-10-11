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
 * PRD §7.2:
 * Good: both "Good to go"
 * Satisfactory: standard "Good to go", sensitive "Take care"
 * Moderate: both "Take care"
 * Poor: standard "Take care", sensitive "Stay indoors if you can"
 * Very Poor: both "Stay indoors if you can"
 * Severe: both "Stay indoors if you can"
 */
export const VERDICT_MATRIX: Record<Category, Record<Profile, Verdict>> = {
  Good: {
    standard: "Good to go",
    sensitive: "Good to go",
  },
  Satisfactory: {
    standard: "Good to go",
    sensitive: "Take care",
  },
  Moderate: {
    standard: "Take care",
    sensitive: "Take care",
  },
  Poor: {
    standard: "Take care",
    sensitive: "Stay indoors if you can",
  },
  "Very Poor": {
    standard: "Stay indoors if you can",
    sensitive: "Stay indoors if you can",
  },
  Severe: {
    standard: "Stay indoors if you can",
    sensitive: "Stay indoors if you can",
  },
};

export const WINDOW_CONFIG = {
  DAY_START_HOUR: 5,
  DAY_END_HOUR: 21,
  WINDOW_DURATION_HOURS: 3,
  IMPROVEMENT_THRESHOLD: 0.15, // 15% better than mean of same period
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
  A1: "Wear a well-fitted N95 or FFP2 mask outdoors; cloth and surgical masks filter fine particles poorly",
  A5: "Keep any prescribed inhaler or medication with you and limit time outside",
  A2: "Skip outdoor exercise today",
  A2b: "Do hard exercise indoors or in the cleanest window",
  A6_STANDARD: "Use SPF 30+ sunscreen, a hat and sunglasses; UV peaks about 10 AM–4 PM",
  A6_HIGH: "Use SPF 30+ sunscreen, a hat and sunglasses; UV peaks about 10 AM–4 PM. At 8+ seek shade at midday",
  A7: "Drink water regularly and avoid heavy exertion at midday",
  A4: "Keep windows closed at peak hours, run a purifier if you have one, air the room when levels dip",
  A8: "Rain is likely; carry an umbrella",
} as const;
