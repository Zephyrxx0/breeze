import { describe, it, expect } from "vitest";
import { categoryFor, subIndex } from "../src/category";

describe("categoryFor", () => {
  it("classifies continuous values at exact boundaries without rounding", () => {
    expect(categoryFor(0)).toBe("Good");
    expect(categoryFor(30)).toBe("Good");
    expect(categoryFor(30.1)).toBe("Satisfactory");
    expect(categoryFor(60)).toBe("Satisfactory");
    expect(categoryFor(60.1)).toBe("Moderate");
    expect(categoryFor(90)).toBe("Moderate");
    expect(categoryFor(90.1)).toBe("Poor");
    expect(categoryFor(120)).toBe("Poor");
    expect(categoryFor(120.1)).toBe("Very Poor");
    expect(categoryFor(250)).toBe("Very Poor");
    expect(categoryFor(250.1)).toBe("Severe");
    expect(categoryFor(500)).toBe("Severe");
    expect(categoryFor(800)).toBe("Severe");
  });

  it("throws on invalid values", () => {
    expect(() => categoryFor(-1)).toThrow();
    expect(() => categoryFor(NaN)).toThrow();
    expect(() => categoryFor(Infinity)).toThrow();
  });
});

describe("subIndex", () => {
  it("matches CPCB golden pairs", () => {
    expect(subIndex(31)).toBe(51);
    expect(subIndex(60)).toBe(100);
  });

  it("is monotonically non-decreasing across 0..600", () => {
    let last = -1;
    for (let pm = 0; pm <= 600; pm += 5) {
      const current = subIndex(pm);
      expect(current).toBeGreaterThanOrEqual(last);
      last = current;
    }
  });

  it("caps at 500 for PM2.5 >= 500", () => {
    expect(subIndex(500)).toBe(500);
    expect(subIndex(600)).toBe(500);
    expect(subIndex(1200)).toBe(500);
  });

  it("throws on invalid inputs", () => {
    expect(() => subIndex(-5)).toThrow();
    expect(() => subIndex(NaN)).toThrow();
  });
});
