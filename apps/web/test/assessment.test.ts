import { describe, it, expect } from "vitest";
import type { AssessResponse } from "@breeze/core";
import { deriveAssessment } from "../src/lib/assessment";

// 2026-10-11 21:30 IST
const NOW = Date.parse("2026-10-11T16:00:00Z");
const series = (spikeAt23: boolean) =>
  Array.from({ length: 48 }, (_, i) => ({
    time: `2026-10-${i < 24 ? "11" : "12"}T${String(i % 24).padStart(2, "0")}:00`,
    pm25: spikeAt23 && i === 23 ? 100 : 70, // model ~70 (Moderate); optionally Poor by 23:00
  }));

const base = (current: NonNullable<AssessResponse["air"]["current"]>, ratio?: number, spike = false): AssessResponse => ({
  generatedAt: new Date(NOW).toISOString(),
  location: { lat: 28.61, lon: 77.21, timezone: "Asia/Kolkata", utcOffsetSeconds: 19800 },
  air: { status: "ok", current, model: { hourly: series(spike) }, comparison: ratio ? { ratio, stationPm25: current.pm25, modelPm25: 70 } : undefined },
  weather: { status: "unavailable" },
  sources: {},
});

describe("deriveAssessment correctness", () => {
  it("computes station age from the measurement timestamp (no invented age)", () => {
    const a = deriveAssessment(
      base({ pm25: 21, source: "station", measuredAt: new Date(NOW - 30 * 60000).toISOString(), station: { name: "S", distanceKm: 3 }, confidence: "High" }),
      "standard",
      NOW
    )!;
    expect(a.ageMin).toBe(30);
    expect(a.confidence).toBe("High"); // < 5 km and < 1 h
  });

  it("is only Medium when the station reading is older than an hour", () => {
    const a = deriveAssessment(
      base({ pm25: 21, source: "station", measuredAt: new Date(NOW - 90 * 60000).toISOString(), station: { name: "S", distanceKm: 3 }, confidence: "High" }),
      "standard",
      NOW
    )!;
    expect(a.confidence).toBe("Medium");
  });

  it("does not fake a 'getting worse' trend when a clean station reads below the model", () => {
    // station 21 (Good) vs flat model 70 (Moderate): model->model trend is flat
    const a = deriveAssessment(
      base({ pm25: 21, source: "station", measuredAt: new Date(NOW).toISOString(), station: { name: "S", distanceKm: 3 }, confidence: "High" }, 0.3),
      "standard",
      NOW
    )!;
    expect(a.today.reasons[1]).not.toBe("Getting worse by evening");
    expect(a.today.reasons[1]).toBe("Local station reads much lower than the regional model");
  });

  it("flags a model-vs-model worsening (Moderate 70 → Poor 100 within 6 h)", () => {
    const a = deriveAssessment(base({ pm25: 70, source: "model", measuredAt: "2026-10-11T21", confidence: "Low" }, undefined, true), "standard", NOW)!;
    expect(a.today.reasons[1]).toBe("Getting worse by evening");
  });
});
