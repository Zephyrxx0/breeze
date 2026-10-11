import { describe, it, expect } from "vitest";
import { buildTips, formatTip } from "../src/tips";
import type { BestWindow, EffectivePm25 } from "../src/types";

describe("buildTips & formatTip", () => {
  const defaultEffective: EffectivePm25 = {
    pm25: 100,
    source: "station",
    measuredAt: "2026-10-11T10:00:00Z",
    confidence: "High",
  };

  const sampleWindow: BestWindow = {
    startWall: "2026-10-11T14:00",
    endWall: "2026-10-11T16:00",
    meanPm25: 40,
    improvementPct: 0.35,
  };

  it("fires A1, A2, A4 for standard profile at PM2.5 >= 91", () => {
    const tips = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 95 },
        window: null,
      },
      "standard"
    );

    const ids = tips.map((t) => t.id);
    expect(ids).toContain("A1");
    expect(ids).toContain("A2");
    expect(ids).toContain("A4");
  });

  it("fires A5 for sensitive profile at PM2.5 >= 31", () => {
    const tips = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 45 },
        window: null,
      },
      "sensitive"
    );

    const ids = tips.map((t) => t.id);
    expect(ids).toContain("A5");
  });

  it("fires A2b at PM2.5 61–90", () => {
    const tips = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 75 },
        window: null,
      },
      "standard"
    );

    const ids = tips.map((t) => t.id);
    expect(ids).toContain("A2b");
  });

  it("fires A3 only when window exists, category is Moderate-or-worse, and window.meanPm25 < 91", () => {
    // Normal qualifying A3
    const tips = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 120 },
        window: sampleWindow,
      },
      "standard"
    );
    expect(tips.map((t) => t.id)).toContain("A3");

    // Suppressed when window mean is >= 91
    const badWindow: BestWindow = {
      ...sampleWindow,
      meanPm25: 95,
    };
    const tipsSuppressed = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 150 },
        window: badWindow,
      },
      "standard"
    );
    expect(tipsSuppressed.map((t) => t.id)).not.toContain("A3");

    // Suppressed when window is null (station-only degrade lock)
    const tipsNoWindow = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 120 },
        window: null,
      },
      "standard"
    );
    expect(tipsNoWindow.map((t) => t.id)).not.toContain("A3");
  });

  it("switches UV wording at UV >= 8 for A6", () => {
    const tipsModerateUv = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 20 },
        window: null,
        uv: 5,
      },
      "standard"
    );
    const a6Mod = tipsModerateUv.find((t) => t.id === "A6");
    expect(a6Mod?.text).toContain("UV peaks about 10 AM–4 PM");
    expect(a6Mod?.text).not.toContain("At 8+ seek shade at midday");

    const tipsHighUv = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 20 },
        window: null,
        uv: 9,
      },
      "standard"
    );
    const a6High = tipsHighUv.find((t) => t.id === "A6");
    expect(a6High?.text).toContain("At 8+ seek shade at midday");
  });

  it("caps tips at 5 and orders by priority", () => {
    const tips = buildTips(
      {
        effectivePm25: { ...defaultEffective, pm25: 120 },
        window: sampleWindow,
        uv: 10,
        feelsLikeC: 38,
        rainProbNext6h: 70,
      },
      "sensitive"
    );

    expect(tips.length).toBeLessThanOrEqual(5);
    // Ensure priority order is non-decreasing
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i].priority).toBeGreaterThanOrEqual(tips[i - 1].priority);
    }
  });

  it("formats tip display string correctly", () => {
    const formatted = formatTip({
      id: "A1",
      cite: "PM2.5 is 84 µg/m³",
      text: "Wear a well-fitted N95 or FFP2 mask outdoors; cloth and surgical masks filter fine particles poorly",
      priority: 1,
    });
    expect(formatted).toBe(
      "PM2.5 is 84 µg/m³ — Wear a well-fitted N95 or FFP2 mask outdoors; cloth and surgical masks filter fine particles poorly"
    );
  });
});
