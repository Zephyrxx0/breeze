import { describe, it, expect } from "vitest";
import { isWithinIndia } from "../src/hooks/useLocationParams";

describe("Location & Coverage Verification", () => {
  it("validates coordinates inside India bounds", () => {
    // Delhi
    expect(isWithinIndia(28.61, 77.21)).toBe(true);
    // Bengaluru
    expect(isWithinIndia(12.97, 77.59)).toBe(true);
    // Kanyakumari (southern edge)
    expect(isWithinIndia(8.08, 77.55)).toBe(true);
    // Srinagar (northern edge)
    expect(isWithinIndia(34.08, 74.80)).toBe(true);
    // Bhuj (western edge)
    expect(isWithinIndia(23.24, 69.67)).toBe(true);
    // Tezu, Arunachal Pradesh (eastern edge)
    expect(isWithinIndia(27.91, 96.16)).toBe(true);
  });

  it("rejects coordinates outside India bounds (out of coverage)", () => {
    // New York, USA
    expect(isWithinIndia(40.71, -74.01)).toBe(false);
    // London, UK
    expect(isWithinIndia(51.51, -0.13)).toBe(false);
    // Tokyo, Japan
    expect(isWithinIndia(35.68, 139.76)).toBe(false);
    // Sydney, Australia
    expect(isWithinIndia(-33.87, 151.21)).toBe(false);
    // North of bounds
    expect(isWithinIndia(39.0, 77.0)).toBe(false);
    // South of bounds
    expect(isWithinIndia(5.0, 77.0)).toBe(false);
    // West of bounds
    expect(isWithinIndia(20.0, 67.0)).toBe(false);
    // East of bounds
    expect(isWithinIndia(20.0, 99.0)).toBe(false);
  });

  it("handles exact boundary values correctly", () => {
    expect(isWithinIndia(6.0, 68.0)).toBe(true);
    expect(isWithinIndia(38.0, 98.5)).toBe(true);
    expect(isWithinIndia(5.99, 68.0)).toBe(false);
    expect(isWithinIndia(38.01, 98.5)).toBe(false);
  });
});

