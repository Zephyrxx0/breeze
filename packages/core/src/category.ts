import { BANDS } from "./config";
import type { Category } from "./types";

/**
 * Classifies a raw, continuous PM2.5 value into a CPCB category.
 * Never rounds the input before classifying.
 * Throws on negative numbers or non-finite values.
 */
export function categoryFor(pm25: number): Category {
  if (!Number.isFinite(pm25) || pm25 < 0) {
    throw new Error(`Invalid PM2.5 value: ${pm25}`);
  }

  // Good is [0, 30] inclusive
  if (pm25 <= 30) {
    return "Good";
  }

  // Other bands are half-open (lo, hi]
  for (let i = 1; i < BANDS.length; i++) {
    const band = BANDS[i];
    if (pm25 <= band.hi) {
      return band.category;
    }
  }

  // Above 500 is still Severe
  return "Severe";
}

/**
 * Computes the continuous CPCB sub-index for PM2.5.
 * Golden pairs: 31 -> 51, 60 -> 100.
 * Severe interpolates linearly across (250, 500] from 401 to 500, capped at 500 above.
 * Rounds down (Math.floor) to match CPCB standard rounding.
 */
// Anchor mapping specified in task 1:
// Good: 0->0, 30->50
// Satisfactory: 30->50, 60->100
// Moderate: 60->100, 90->200
// Poor: 90->200, 120->300
// Very Poor: 120->300, 250->400
// Severe: 250->400, 500->500
interface SubIndexAnchor {
  lo: number;
  hi: number;
  subLo: number;
  subHi: number;
}

const SUBINDEX_ANCHORS: readonly SubIndexAnchor[] = [
  { lo: 0, hi: 30, subLo: 0, subHi: 50 },
  { lo: 30, hi: 60, subLo: 50, subHi: 100 },
  { lo: 60, hi: 90, subLo: 100, subHi: 200 },
  { lo: 90, hi: 120, subLo: 200, subHi: 300 },
  { lo: 120, hi: 250, subLo: 300, subHi: 400 },
  { lo: 250, hi: 500, subLo: 400, subHi: 500 },
];

export function subIndex(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 < 0) {
    throw new Error(`Invalid PM2.5 value: ${pm25}`);
  }

  if (pm25 >= 500) {
    return 500;
  }

  let matched = SUBINDEX_ANCHORS[0];
  if (pm25 <= 30) {
    matched = SUBINDEX_ANCHORS[0];
  } else {
    for (let i = 1; i < SUBINDEX_ANCHORS.length; i++) {
      if (pm25 <= SUBINDEX_ANCHORS[i].hi) {
        matched = SUBINDEX_ANCHORS[i];
        break;
      }
    }
  }

  const { lo, hi, subLo, subHi } = matched;
  const interpolated = subLo + ((pm25 - lo) * (subHi - subLo)) / (hi - lo);
  return Math.floor(interpolated);
}
