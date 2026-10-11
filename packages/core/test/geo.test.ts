import { describe, it, expect } from "vitest";
import { haversineKm, bearingDeg, isUpwind } from "../src/geo";

describe("geo", () => {
  const delhi = { lat: 28.61, lon: 77.21 };
  const jaipur = { lat: 26.91, lon: 75.79 };

  it("calculates haversine distance within goldens", () => {
    const dist = haversineKm(delhi.lat, delhi.lon, jaipur.lat, jaipur.lon);
    // Golden: ~240 km ± 10 km
    expect(dist).toBeGreaterThanOrEqual(230);
    expect(dist).toBeLessThanOrEqual(250);
  });

  it("calculates initial bearing within goldens", () => {
    const bearing = bearingDeg(delhi.lat, delhi.lon, jaipur.lat, jaipur.lon);
    // Golden: ~225° ± 10° (South-West)
    expect(bearing).toBeGreaterThanOrEqual(215);
    expect(bearing).toBeLessThanOrEqual(235);
  });

  it("checks upwind relationship correctly", () => {
    // Bearing to station is 225°
    // Wind blowing FROM 225° is directly upwind
    expect(isUpwind(225, 225, 45)).toBe(true);
    expect(isUpwind(225, 200, 45)).toBe(true);
    expect(isUpwind(225, 260, 45)).toBe(true);
    // Outside 45°
    expect(isUpwind(225, 170, 45)).toBe(false);
    expect(isUpwind(225, 280, 45)).toBe(false);
    expect(isUpwind(225, 45, 45)).toBe(false);

    // Circular wrap around 0 / 360
    expect(isUpwind(5, 355, 45)).toBe(true);
    expect(isUpwind(355, 5, 45)).toBe(true);
    expect(isUpwind(5, 60, 45)).toBe(false);
  });
});
