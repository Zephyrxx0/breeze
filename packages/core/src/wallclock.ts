import type { WallClock } from "./types";

export const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/;

export interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  dateString: string; // YYYY-MM-DD
}

/**
 * Parses a wall-clock string (e.g. "2026-10-11T15" or "2026-10-11T15:00")
 * into numeric components. Throws on missing or malformed hour component.
 */
export function parseWall(wall: string): WallParts {
  const match = WALL_RE.exec(wall);
  if (!match) {
    throw new Error(`Invalid wall-clock string: "${wall}"`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);

  return {
    year,
    month,
    day,
    hour,
    dateString: `${match[1]}-${match[2]}-${match[3]}`,
  };
}

/**
 * Formats a canonical WallClock from an epoch timestamp and UTC offset in seconds.
 * Strictly uses UTC getters on an offset-shifted timestamp so the host timezone is never consulted.
 */
export function wallFromInstant(epochMs: number, offsetSeconds: number): WallClock {
  const shiftedMs = epochMs + offsetSeconds * 1000;
  const d = new Date(shiftedMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}`;
}

/**
 * Adds an integer number of hours to a canonical WallClock string.
 * Pure wall-clock arithmetic without consulting system timezone.
 */
export function wallAddHours(wall: WallClock, hours: number): WallClock {
  const p = parseWall(wall);
  // Construct a UTC timestamp matching the wall clock numbers
  const fakeEpoch = Date.UTC(p.year, p.month - 1, p.day, p.hour + hours);
  const d = new Date(fakeEpoch);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}`;
}

/**
 * Formats a human 12-hour label for an hour number (0..23).
 * E.g. 21 -> "~9 PM", 9 -> "~9 AM", 12 -> "~12 PM", 0 -> "~12 AM"
 */
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `~${displayH} ${period}`;
}
