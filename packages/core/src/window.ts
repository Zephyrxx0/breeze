import { parseWall, wallAddHours } from "./wallclock";
import { WINDOW_CONFIG } from "./config";
import type { HourPoint, BestWindow, WallClock } from "./types";

/**
 * Calculates the cleanest 3-hour window over the next 24 hours.
 * Restricted to hours 05:00-21:00 inclusive (place-local).
 * Returns null if:
 * 1. Hourly series is empty or absent (station-only degrade lock, grilling Q5, ASM-04)
 * 2. No valid 3-hour sliding window exists within the restricted hours
 * 3. Improvement is less than 15% (0.15) compared to the mean over the same restricted period
 */
export function bestWindow(
  hourly: HourPoint[],
  nowWall: WallClock
): BestWindow | null {
  if (!hourly || hourly.length === 0) {
    return null;
  }

  // Define 24-hour horizon in wall-clock space
  const horizonHours = new Set<string>();
  for (let i = 0; i < 24; i++) {
    horizonHours.add(wallAddHours(nowWall, i).slice(0, 13));
  }

  // Filter to next 24 hours AND restricted to 05:00-21:00 inclusive
  const restrictedPoints: HourPoint[] = [];
  for (const pt of hourly) {
    const key = pt.time.slice(0, 13);
    if (horizonHours.has(key)) {
      const p = parseWall(pt.time);
      if (
        p.hour >= WINDOW_CONFIG.DAY_START_HOUR &&
        p.hour <= WINDOW_CONFIG.DAY_END_HOUR
      ) {
        restrictedPoints.push(pt);
      }
    }
  }

  // If fewer than 3 points survive, no 3-hour sliding window can be formed
  if (restrictedPoints.length < WINDOW_CONFIG.WINDOW_DURATION_HOURS) {
    return null;
  }

  // Baseline mean over the restricted period
  const totalPm25 = restrictedPoints.reduce((sum, pt) => sum + pt.pm25, 0);
  const baselineMean = totalPm25 / restrictedPoints.length;
  if (baselineMean <= 0) {
    return null;
  }

  // Slide a 3-hour contiguous window
  let best: {
    startWall: WallClock;
    endWall: WallClock;
    meanPm25: number;
    improvementPct: number;
  } | null = null;

  for (
    let i = 0;
    i <= restrictedPoints.length - WINDOW_CONFIG.WINDOW_DURATION_HOURS;
    i++
  ) {
    const windowSlice = restrictedPoints.slice(
      i,
      i + WINDOW_CONFIG.WINDOW_DURATION_HOURS
    );

    // Verify points are strictly consecutive hours
    const startP = parseWall(windowSlice[0].time);
    const endP = parseWall(windowSlice[WINDOW_CONFIG.WINDOW_DURATION_HOURS - 1].time);
    const expectedEndWall = wallAddHours(
      windowSlice[0].time,
      WINDOW_CONFIG.WINDOW_DURATION_HOURS - 1
    );
    if (windowSlice[WINDOW_CONFIG.WINDOW_DURATION_HOURS - 1].time.slice(0, 13) !== expectedEndWall.slice(0, 13)) {
      continue; // Not consecutive
    }

    const windowSum = windowSlice.reduce((sum, pt) => sum + pt.pm25, 0);
    const windowMean = windowSum / WINDOW_CONFIG.WINDOW_DURATION_HOURS;
    const improvement = (baselineMean - windowMean) / baselineMean;

    if (best === null || windowMean < best.meanPm25) {
      best = {
        startWall: windowSlice[0].time,
        endWall: windowSlice[WINDOW_CONFIG.WINDOW_DURATION_HOURS - 1].time,
        meanPm25: windowMean,
        improvementPct: improvement,
      };
    }
  }

  // Improvement must be at least 15% (0.15) lower than the restricted period mean
  if (best === null || best.improvementPct < WINDOW_CONFIG.IMPROVEMENT_THRESHOLD) {
    return null;
  }

  return best;
}
