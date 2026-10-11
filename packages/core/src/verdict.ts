import { VERDICT_MATRIX } from "./config";
import { categoryFor } from "./category";
import { parseWall, wallAddHours, hourLabel } from "./wallclock";
import type {
  Category,
  Profile,
  Verdict,
  ReasonLinesInput,
  TomorrowTabResult,
  HourPoint,
  WallClock,
} from "./types";

/**
 * 12-cell decision matrix per PRD §7.2
 */
export function verdictFor(category: Category, profile: Profile): Verdict {
  return VERDICT_MATRIX[category][profile];
}

/**
 * Checks whether the peak PM2.5 in (now, now+6h] place-local falls into
 * a worse CPCB category than currentCategory.
 */
export function next6hPeakWorse(
  modelHourly: HourPoint[],
  nowWall: WallClock,
  currentCategory: Category
): boolean {
  if (!modelHourly || modelHourly.length === 0) return false;

  const currentWallParsed = parseWall(nowWall);
  const nowHourIndex = currentWallParsed.year * 10000 + currentWallParsed.month * 100 + currentWallParsed.day;

  // Band categories order: 0 is Good, 5 is Severe
  const categorySeverity: Record<Category, number> = {
    Good: 0,
    Satisfactory: 1,
    Moderate: 2,
    Poor: 3,
    "Very Poor": 4,
    Severe: 5,
  };
  const currentSeverity = categorySeverity[currentCategory];

  // Look at up to 6 hours ahead
  const horizonWalls = new Set<string>();
  for (let i = 1; i <= 6; i++) {
    horizonWalls.add(wallAddHours(nowWall, i).slice(0, 13)); // match YYYY-MM-DDTHH
  }

  for (const pt of modelHourly) {
    const ptKey = pt.time.slice(0, 13);
    if (horizonWalls.has(ptKey)) {
      const cat = categoryFor(pt.pm25);
      if (categorySeverity[cat] > currentSeverity) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generates exactly two number-first reason lines per D-01 / D-02 / D-05 / D-06 / D-07.
 */
export function reasonLines(input: ReasonLinesInput): [string, string] {
  // If this is for the Tomorrow tab:
  if (input.tomorrow) {
    const { daytimeMean, peakHourLabel, peakCategory } = input.tomorrow;
    const cat = categoryFor(daytimeMean);
    const line1 = `Tomorrow's daytime mean is ${Math.round(daytimeMean)} µg/m³ — ${cat} (model forecast)`;
    const line2 = `Tomorrow evening peaks at ${peakCategory} (${peakHourLabel})`;
    return [line1, line2];
  }

  // Today path
  const { effective, category, profile, next6hPeakWorse: isWorse, stationModelRatio, nowMs } = input;
  const pm25Value = Math.round(effective.pm25);

  // Line 1: Number-first
  let sourceClause: string;
  if (effective.source === "station" && effective.station) {
    const dist = Math.round(effective.station.distanceKm);
    const measuredTimeMs = Date.parse(effective.measuredAt);
    const ageMin = Math.max(0, Math.floor((nowMs - measuredTimeMs) / 60000));
    sourceClause = `from a station ${dist} km away (${ageMin} min old)`;
  } else {
    sourceClause = "model estimate (~45 km)";
  }
  const line1 = `PM2.5 is ${pm25Value} µg/m³ — ${category}, ${sourceClause}`;

  // Line 2: Precedence: trend extra > ratio extra > sensitive profile > standard default filler
  let line2: string;
  if (isWorse) {
    line2 = "Getting worse by evening";
  } else if (stationModelRatio !== undefined && stationModelRatio !== null) {
    if (stationModelRatio > 2) {
      line2 = "Local station reads much higher than the regional model";
    } else if (stationModelRatio < 0.5) {
      line2 = "Local station reads much lower than the regional model";
    } else if (profile === "sensitive") {
      line2 = "Your Sensitive profile acts at lower levels";
    } else {
      line2 = "Standard profile — general guidance for most people";
    }
  } else if (profile === "sensitive") {
    line2 = "Your Sensitive profile acts at lower levels";
  } else {
    line2 = "Standard profile — general guidance for most people";
  }

  return [line1, line2];
}

/**
 * Derives the Tomorrow tab assessment.
 * Returns null if modelHourly is empty/absent (station-only degrade lock, D-07, ASM-04).
 */
export function tomorrowTab(
  modelHourly: HourPoint[],
  utcOffsetSeconds: number,
  nowWall: WallClock,
  profile: Profile
): TomorrowTabResult | null {
  if (!modelHourly || modelHourly.length === 0) {
    return null;
  }

  // Compute tomorrow's date string in place-local wall-clock space
  const nowParsed = parseWall(nowWall);
  const tomorrowWall = wallAddHours(nowWall, 24);
  const tomorrowDateStr = parseWall(tomorrowWall).dateString;

  // Filter tomorrow's hours
  const tomorrowHours: HourPoint[] = [];
  const daytimeHours: HourPoint[] = [];

  for (const pt of modelHourly) {
    const p = parseWall(pt.time);
    if (p.dateString === tomorrowDateStr) {
      tomorrowHours.push(pt);
      if (p.hour >= 6 && p.hour <= 20) {
        daytimeHours.push(pt);
      }
    }
  }

  if (daytimeHours.length === 0 || tomorrowHours.length === 0) {
    return null;
  }

  // Daytime mean: 06:00-20:00 inclusive (D-05)
  const daytimeMean =
    daytimeHours.reduce((sum, pt) => sum + pt.pm25, 0) / daytimeHours.length;
  const category = categoryFor(daytimeMean);
  const verdict = verdictFor(category, profile);

  // Peak across all 24 hours of tomorrow (D-06)
  let peakPt = tomorrowHours[0];
  for (let i = 1; i < tomorrowHours.length; i++) {
    if (tomorrowHours[i].pm25 > peakPt.pm25) {
      peakPt = tomorrowHours[i];
    }
  }
  const peakHourParsed = parseWall(peakPt.time);
  const peakHourLabelStr = hourLabel(peakHourParsed.hour);
  const peakCategory = categoryFor(peakPt.pm25);

  const lines = reasonLines({
    effective: {
      pm25: daytimeMean,
      source: "model",
      measuredAt: peakPt.time,
      confidence: "Low",
    },
    category,
    profile,
    nowMs: 0,
    tomorrow: {
      daytimeMean,
      peakHourLabel: peakHourLabelStr,
      peakCategory,
    },
  });

  return {
    verdict,
    category,
    daytimeMean,
    reasonLines: lines,
    peakHourLabel: peakHourLabelStr,
    peakCategory,
  };
}
