import { describe, it, expect } from "vitest";
import {
  yForPm25,
  xForIndex,
  clampIndex,
  getCpcbBands,
  PLOT_TOP,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  CPCB_THRESHOLDS,
} from "../src/components/ForecastChart";

describe("ForecastChart Math & Accessibility", () => {
  describe("yForPm25 coordinate mapping", () => {
    it("maps 0 µg/m³ to the bottom of the plot area", () => {
      const y = yForPm25(0, 200, PLOT_TOP, PLOT_BOTTOM);
      expect(y).toBe(PLOT_BOTTOM);
    });

    it("maps maxVal µg/m³ to the top of the plot area", () => {
      const y = yForPm25(200, 200, PLOT_TOP, PLOT_BOTTOM);
      expect(y).toBe(PLOT_TOP);
    });

    it("maps mid value to the exact midpoint of plot area", () => {
      const y = yForPm25(100, 200, PLOT_TOP, PLOT_BOTTOM);
      expect(y).toBeCloseTo((PLOT_TOP + PLOT_BOTTOM) / 2);
    });

    it("clamps values gracefully when value exceeds maxVal", () => {
      const y = yForPm25(300, 200, PLOT_TOP, PLOT_BOTTOM);
      expect(y).toBe(PLOT_TOP);
    });

    it("returns bottom when maxVal is zero or negative", () => {
      expect(yForPm25(50, 0, PLOT_TOP, PLOT_BOTTOM)).toBe(PLOT_BOTTOM);
    });
  });

  describe("xForIndex coordinate mapping", () => {
    it("maps index 0 to PLOT_LEFT", () => {
      const x = xForIndex(0, 48, PLOT_LEFT, PLOT_RIGHT);
      expect(x).toBe(PLOT_LEFT);
    });

    it("maps last index (total - 1) to PLOT_RIGHT", () => {
      const x = xForIndex(47, 48, PLOT_LEFT, PLOT_RIGHT);
      expect(x).toBe(PLOT_RIGHT);
    });

    it("maps midpoint index to exact horizontal center", () => {
      const x = xForIndex(24, 49, PLOT_LEFT, PLOT_RIGHT);
      expect(x).toBeCloseTo((PLOT_LEFT + PLOT_RIGHT) / 2);
    });

    it("handles total <= 1 gracefully without divide by zero", () => {
      expect(xForIndex(0, 1, PLOT_LEFT, PLOT_RIGHT)).toBe(PLOT_LEFT);
    });
  });

  describe("getCpcbBands band generation", () => {
    it("generates bands matching CPCB thresholds with valid geometry", () => {
      const bands = getCpcbBands(300, PLOT_TOP, PLOT_BOTTOM);
      expect(bands.length).toBe(6);

      // Verify each band has positive height and valid y coordinates
      for (const b of bands) {
        expect(b.height).toBeGreaterThan(0);
        expect(b.y).toBeGreaterThanOrEqual(PLOT_TOP);
        expect(b.y + b.height).toBeLessThanOrEqual(PLOT_BOTTOM);
      }

      // Check threshold labels
      expect(bands[0].label).toBe("Good");
      expect(bands[0].threshold).toBe(0);
      expect(bands[1].label).toBe("Satisfactory");
      expect(bands[1].threshold).toBe(30);
      expect(bands[2].label).toBe("Moderate");
      expect(bands[2].threshold).toBe(60);
      expect(bands[3].label).toBe("Poor");
      expect(bands[3].threshold).toBe(90);
      expect(bands[4].label).toBe("Very Poor");
      expect(bands[4].threshold).toBe(120);
      expect(bands[5].label).toBe("Severe");
      expect(bands[5].threshold).toBe(250);
    });

    it("filters out bands above maxVal when air is clean", () => {
      const bands = getCpcbBands(80, PLOT_TOP, PLOT_BOTTOM);
      // Bands up to 80 should only include Good (0-30), Satisfactory (30-60), and Moderate (60-90)
      expect(bands.length).toBe(3);
      expect(bands.map((b) => b.label)).toEqual(["Good", "Satisfactory", "Moderate"]);
    });
  });

  describe("clampIndex keyboard scrubbing", () => {
    it("clamps index to min and max boundaries", () => {
      expect(clampIndex(-1, 0, 47)).toBe(0);
      expect(clampIndex(48, 0, 47)).toBe(47);
      expect(clampIndex(10, 0, 47)).toBe(10);
    });
  });
});

