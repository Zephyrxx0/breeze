import { wallFromInstant } from "@breeze/core";

/** "2026-10-11T17:56" → "5:56 PM" (wall-clock string, no timezone maths) */
export function wallToClock(wall: string): string {
  const hour = parseInt(wall.slice(11, 13), 10);
  const minute = wall.length >= 16 ? wall.slice(14, 16) : "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${ampm}`;
}

/** "2026-10-11T17" → "5 PM" */
export function wallToHour(wall: string): string {
  const hour = parseInt(wall.slice(11, 13), 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${ampm}`;
}

/** ISO instant → local clock of the *place* (not the viewer's browser zone) */
export function instantToPlaceClock(iso: string | undefined, utcOffsetSeconds: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const wall = wallFromInstant(ms, utcOffsetSeconds);
  // wallFromInstant is hour precision; add minutes from the shifted instant
  const minute = String(new Date(ms + utcOffsetSeconds * 1000).getUTCMinutes()).padStart(2, "0");
  return wallToClock(`${wall}:${minute}`);
}

/**
 * Location wall-clock string → Date that *displays* the same wall-clock in any browser zone.
 * (Built from local components on purpose — never `new Date("2026-10-11T15:00")`.)
 */
export function wallToLocalDate(wall: string): Date {
  const y = parseInt(wall.slice(0, 4), 10);
  const m = parseInt(wall.slice(5, 7), 10);
  const d = parseInt(wall.slice(8, 10), 10);
  const h = parseInt(wall.slice(11, 13), 10);
  return new Date(y, m - 1, d, h, 0, 0, 0);
}

export function compassFromDegrees(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
