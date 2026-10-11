import { describe, it, expect } from "vitest";
import { clampIndex, nightRuns, CPCB_THRESHOLDS } from "../src/components/ForecastChart";
import { scalePosition } from "../src/components/CpcbScale";
import { wallToLocalDate, wallToClock, wallToHour } from "../src/lib/format";

describe("ForecastChart helpers", () => {
  it("clamps keyboard scrubbing index to min and max", () => {
    expect(clampIndex(-3, 0, 47)).toBe(0);
    expect(clampIndex(99, 0, 47)).toBe(47);
    expect(clampIndex(10, 0, 47)).toBe(10);
  });

  it("CPCB bands are contiguous and match the NAQI breakpoints", () => {
    expect(CPCB_THRESHOLDS.map((b) => b.min)).toEqual([0, 30, 60, 90, 120, 250]);
    for (let i = 1; i < CPCB_THRESHOLDS.length; i++) {
      expect(CPCB_THRESHOLDS[i].min).toBe(CPCB_THRESHOLDS[i - 1].max);
    }
  });

  it("nightRuns finds before-06:00 and from-20:00 runs", () => {
    const hourly = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-10-${i < 24 ? "11" : "12"}T${String(i % 24).padStart(2, "0")}:00`,
    }));
    const runs = nightRuns(hourly);
    // 00–06 (idx 0→6), 20–06 next day (idx 20→30), 20–end (idx 44→47)
    expect(runs).toEqual([
      [0, 6],
      [20, 30],
      [44, 47],
    ]);
  });
});

describe("CpcbScale position", () => {
  it("maps band edges to sixths of the scale", () => {
    expect(scalePosition(0)).toBe(0);
    expect(scalePosition(30)).toBeCloseTo(1 / 6);
    expect(scalePosition(60)).toBeCloseTo(2 / 6);
    expect(scalePosition(120)).toBeCloseTo(4 / 6);
    expect(scalePosition(250)).toBeCloseTo(5 / 6);
    expect(scalePosition(900)).toBe(1);
  });
  it("interpolates inside a band", () => {
    expect(scalePosition(45)).toBeCloseTo(1.5 / 6);
  });
});

describe("wall-clock formatting never depends on the browser zone", () => {
  it("formats clock strings", () => {
    expect(wallToClock("2026-10-11T17:56")).toBe("5:56 PM");
    expect(wallToClock("2026-10-11T00:05")).toBe("12:05 AM");
    expect(wallToHour("2026-10-11T12")).toBe("12 PM");
  });
  it("wallToLocalDate keeps the same wall-clock components", () => {
    const d = wallToLocalDate("2026-10-11T15:00");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 11, 15]);
  });
});
