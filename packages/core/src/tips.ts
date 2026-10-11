import { VERBATIM_TIPS } from "./config";
import { categoryFor } from "./category";
import { parseWall, hourLabel } from "./wallclock";
import type {
  Tip,
  Profile,
  BestWindow,
  Category,
  EffectivePm25,
} from "./types";

export interface TipContext {
  effectivePm25: EffectivePm25;
  window: BestWindow | null;
  uv?: number;
  feelsLikeC?: number;
  rainProbNext6h?: number;
}

/**
 * Formats a single Tip into its final display string: `${cite} — ${text}` (D-03 / D-04)
 */
export function formatTip(tip: Tip): string {
  return `${tip.cite} — ${tip.text}`;
}

/**
 * Builds rule-driven tips per PRD §7.5 in priority order, capped at 5 tips.
 * Multi-trigger/cite prefixes adhere to D-03: primary triggering value leads.
 * A3 is suppressed if window is null OR window.meanPm25 >= 91 (no invitation into Poor air).
 */
export function buildTips(ctx: TipContext, profile: Profile): Tip[] {
  const { effectivePm25, window, uv, feelsLikeC, rainProbNext6h } = ctx;
  const pm25 = effectivePm25.pm25;
  const currentCategory = categoryFor(pm25);
  const pmCite = `PM2.5 is ${Math.round(pm25)} µg/m³`;

  const candidates: Tip[] = [];

  // A1: Wear N95/FFP2 mask outdoors
  // Trigger: Standard >= 91 / Sensitive >= 61
  // Priority: 1
  if ((profile === "standard" && pm25 >= 91) || (profile === "sensitive" && pm25 >= 61)) {
    candidates.push({
      id: "A1",
      cite: pmCite,
      text: VERBATIM_TIPS.A1,
      priority: 1,
    });
  }

  // A5: Sensitive and PM2.5 >= 31
  // Priority: 1
  if (profile === "sensitive" && pm25 >= 31) {
    candidates.push({
      id: "A5",
      cite: pmCite,
      text: VERBATIM_TIPS.A5,
      priority: 1,
    });
  }

  // A2: Skip outdoor exercise today (PM2.5 >= 91)
  // Priority: 2
  if (pm25 >= 91) {
    candidates.push({
      id: "A2",
      cite: pmCite,
      text: VERBATIM_TIPS.A2,
      priority: 2,
    });
  }

  // A3: Best window exists and category is Moderate or worse
  // Suppressed if window.meanPm25 >= 91 or window is null
  // Priority: 2
  const isModerateOrWorse =
    currentCategory === "Moderate" ||
    currentCategory === "Poor" ||
    currentCategory === "Very Poor" ||
    currentCategory === "Severe";

  if (window && isModerateOrWorse && window.meanPm25 < 91) {
    const startH = parseWall(window.startWall).hour;
    const endH = parseWall(window.endWall).hour + 1; // End of 3-hour window
    const windowPhrase = `${hourLabel(startH).replace("~", "")}–${hourLabel(endH).replace("~", "")}`.trim();
    const pctLower = Math.round(window.improvementPct * 100);

    const a3Text = `Go out between ${windowPhrase}; levels are about ${pctLower}% lower`;
    candidates.push({
      id: "A3",
      cite: `Cleanest window ${windowPhrase}`,
      text: a3Text,
      priority: 2,
    });
  }

  // A2b: Do hard exercise indoors or in the cleanest window (PM2.5 61–90)
  // Priority: 3
  if (pm25 >= 61 && pm25 <= 90) {
    candidates.push({
      id: "A2b",
      cite: pmCite,
      text: VERBATIM_TIPS.A2b,
      priority: 3,
    });
  }

  // A6: UV >= 3 (>= 8 for stronger wording)
  // Priority: 3
  if (uv !== undefined && uv >= 3) {
    const isHighUv = uv >= 8;
    candidates.push({
      id: "A6",
      cite: `UV index is ${Math.round(uv)}`,
      text: isHighUv ? VERBATIM_TIPS.A6_HIGH : VERBATIM_TIPS.A6_STANDARD,
      priority: 3,
    });
  }

  // A7: Feels-like >= 35 °C
  // Priority: 3
  if (feelsLikeC !== undefined && feelsLikeC >= 35) {
    candidates.push({
      id: "A7",
      cite: `Feels like ${Math.round(feelsLikeC)} °C`,
      text: VERBATIM_TIPS.A7,
      priority: 3,
    });
  }

  // A4: PM2.5 >= 91 (windows closed, run purifier)
  // Priority: 4
  if (pm25 >= 91) {
    candidates.push({
      id: "A4",
      cite: pmCite,
      text: VERBATIM_TIPS.A4,
      priority: 4,
    });
  }

  // A8: Rain probability >= 60% in next 6 h
  // Priority: 5
  if (rainProbNext6h !== undefined && rainProbNext6h >= 60) {
    candidates.push({
      id: "A8",
      cite: `${Math.round(rainProbNext6h)}% chance of rain`,
      text: VERBATIM_TIPS.A8,
      priority: 5,
    });
  }

  // Sort ascending by priority, cap at top 5
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, 5);
}
