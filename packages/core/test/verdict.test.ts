import { describe, it, expect } from "vitest";
import { verdictFor, reasonLines, tomorrowTab, next6hPeakWorse } from "../src/verdict";
import type { Category, Profile, HourPoint } from "../src/types";

describe("verdictFor (12-cell matrix)", () => {
  it("evaluates all 12 cells correctly per PRD §7.2", () => {
    expect(verdictFor("Good", "standard")).toBe("Good to go");
    expect(verdictFor("Good", "sensitive")).toBe("Good to go");

    expect(verdictFor("Satisfactory", "standard")).toBe("Good to go");
    expect(verdictFor("Satisfactory", "sensitive")).toBe("Take care");

    expect(verdictFor("Moderate", "standard")).toBe("Take care");
    expect(verdictFor("Moderate", "sensitive")).toBe("Take care");

    expect(verdictFor("Poor", "standard")).toBe("Take care");
    expect(verdictFor("Poor", "sensitive")).toBe("Stay indoors if you can");

    expect(verdictFor("Very Poor", "standard")).toBe("Stay indoors if you can");
    expect(verdictFor("Very Poor", "sensitive")).toBe("Stay indoors if you can");

    expect(verdictFor("Severe", "standard")).toBe("Stay indoors if you can");
    expect(verdictFor("Severe", "sensitive")).toBe("Stay indoors if you can");
  });
});

describe("reasonLines", () => {
  const nowMs = 1791721200000; // Reference timestamp
  const twentyMinAgoIso = new Date(nowMs - 20 * 60 * 1000).toISOString();

  it("builds line 1 and line 2 for Today standard profile with station reading", () => {
    const [line1, line2] = reasonLines({
      effective: {
        pm25: 84,
        source: "station",
        measuredAt: twentyMinAgoIso,
        confidence: "High",
        station: { name: "Anand Vihar", distanceKm: 3.2 },
      },
      category: "Poor",
      profile: "standard",
      nowMs,
    });

    expect(line1).toBe("PM2.5 is 84 µg/m³ — Poor, from a station 3 km away (20 min old)");
    expect(line2).toBe("Standard profile — general guidance for most people");
  });

  it("handles extras precedence: trend extra wins over ratio extra", () => {
    const [, line2] = reasonLines({
      effective: {
        pm25: 84,
        source: "station",
        measuredAt: twentyMinAgoIso,
        confidence: "High",
        station: { name: "Station", distanceKm: 3 },
      },
      category: "Poor",
      profile: "standard",
      next6hPeakWorse: true,
      stationModelRatio: 2.5,
      nowMs,
    });

    expect(line2).toBe("Getting worse by evening");
  });

  it("handles comparison extra when ratio is high or low", () => {
    const [, lineHigh] = reasonLines({
      effective: {
        pm25: 84,
        source: "station",
        measuredAt: twentyMinAgoIso,
        confidence: "High",
      },
      category: "Poor",
      profile: "standard",
      stationModelRatio: 2.4,
      nowMs,
    });
    expect(lineHigh).toBe("Local station reads much higher than the regional model");

    const [, lineLow] = reasonLines({
      effective: {
        pm25: 30,
        source: "station",
        measuredAt: twentyMinAgoIso,
        confidence: "High",
      },
      category: "Good",
      profile: "standard",
      stationModelRatio: 0.4,
      nowMs,
    });
    expect(lineLow).toBe("Local station reads much lower than the regional model");
  });

  it("handles sensitive profile with no extras", () => {
    const [, line2] = reasonLines({
      effective: {
        pm25: 84,
        source: "model",
        measuredAt: "2026-10-11T15:00",
        confidence: "Low",
      },
      category: "Poor",
      profile: "sensitive",
      nowMs,
    });
    expect(line2).toBe("Your Sensitive profile acts at lower levels");
  });

  it("formats model source clause in line 1", () => {
    const [line1] = reasonLines({
      effective: {
        pm25: 84,
        source: "model",
        measuredAt: "2026-10-11T15:00",
        confidence: "Low",
      },
      category: "Poor",
      profile: "standard",
      nowMs,
    });
    expect(line1).toBe("PM2.5 is 84 µg/m³ — Poor, model estimate (~45 km)");
  });
});

describe("tomorrowTab", () => {
  it("returns null on empty model hourly series (station-only lock)", () => {
    expect(tomorrowTab([], 19800, "2026-10-11T15", "standard")).toBeNull();
  });

  it("calculates daytime mean from hours 06..20 and finds worst peak hour across all 24", () => {
    const hourly: HourPoint[] = [];
    // Generate 48 hours covering today (2026-10-11) and tomorrow (2026-10-12)
    for (let d = 11; d <= 12; d++) {
      for (let h = 0; h < 24; h++) {
        const time = `2026-10-${d}T${String(h).padStart(2, "0")}`;
        let pm25 = 50;
        if (d === 12) {
          // Daytime mean: set all 06..20 to 71 µg/m³ (Poor)
          if (h >= 6 && h <= 20) {
            pm25 = 71;
          }
          // Peak at 21 (9 PM): 150 µg/m³ (Very Poor)
          if (h === 21) {
            pm25 = 150;
          }
        }
        hourly.push({ time, pm25 });
      }
    }

    const res = tomorrowTab(hourly, 19800, "2026-10-11T15", "standard");
    expect(res).not.toBeNull();
    if (!res) return;

    expect(Math.round(res.daytimeMean)).toBe(71);
    expect(res.category).toBe("Moderate"); // 71 is Moderate (60, 90]
    expect(res.verdict).toBe("Take care");
    expect(res.peakCategory).toBe("Very Poor");
    expect(res.peakHourLabel).toBe("~9 PM");
    expect(res.reasonLines[0]).toBe(
      "Tomorrow's daytime mean is 71 µg/m³ — Moderate (model forecast)"
    );
    expect(res.reasonLines[1]).toBe(
      "Tomorrow evening peaks at Very Poor (~9 PM)"
    );
  });
});
