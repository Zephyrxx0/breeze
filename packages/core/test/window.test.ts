import { describe, it, expect } from "vitest";
import { bestWindow } from "../src/window";
import type { HourPoint } from "../src/types";

describe("bestWindow", () => {
  const nowWall = "2026-10-11T05:00";

  it("returns null on empty series (station-only degrade lock, ASM-04)", () => {
    expect(bestWindow([], nowWall)).toBeNull();
  });

  it("returns null on single-point series or flat series", () => {
    expect(bestWindow([{ time: "2026-10-11T06:00", pm25: 50 }], nowWall)).toBeNull();

    // Flat series: 50 across the board -> 0% improvement -> null
    const flat: HourPoint[] = [];
    for (let h = 5; h <= 21; h++) {
      flat.push({
        time: `2026-10-11T${String(h).padStart(2, "0")}:00`,
        pm25: 100,
      });
    }
    expect(bestWindow(flat, nowWall)).toBeNull();
  });

  it("returns window when improvement is >= 15% lower than the restricted period mean", () => {
    const hourly: HourPoint[] = [];
    // Baseline hours at 100 µg/m³
    for (let h = 5; h <= 21; h++) {
      let pm25 = 100;
      // Dips sharply between 14:00 and 16:00 (hours 14, 15, 16) to 30 µg/m³
      if (h >= 14 && h <= 16) {
        pm25 = 30;
      }
      hourly.push({
        time: `2026-10-11T${String(h).padStart(2, "0")}:00`,
        pm25,
      });
    }

    const win = bestWindow(hourly, nowWall);
    expect(win).not.toBeNull();
    if (!win) return;

    expect(win.startWall.slice(0, 13)).toBe("2026-10-11T14");
    expect(win.endWall.slice(0, 13)).toBe("2026-10-11T16");
    expect(win.meanPm25).toBe(30);
    expect(win.improvementPct).toBeGreaterThan(0.15);
  });
});
