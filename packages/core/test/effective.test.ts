import { describe, it, expect } from "vitest";
import { selectEffectivePm25, confidenceFor } from "../src/effective";
import type { StationReading } from "../src/types";

describe("selectEffectivePm25", () => {
  const delhi = { lat: 28.61, lon: 77.21 };
  const nowMs = 1791721200000;
  const halfHourAgoIso = new Date(nowMs - 30 * 60 * 1000).toISOString();
  const twoHoursAgoIso = new Date(nowMs - 120 * 60 * 1000).toISOString();
  const fourHoursAgoIso = new Date(nowMs - 240 * 60 * 1000).toISOString();

  it("selects median of nearest 3 stations when >= 2 stations are within 10 km", () => {
    const stations: StationReading[] = [
      {
        name: "Station A",
        lat: 28.62,
        lon: 77.22, // ~1.5 km away
        pm25: 120,
        measuredAt: halfHourAgoIso,
      },
      {
        name: "Station B",
        lat: 28.63,
        lon: 77.23, // ~3 km away
        pm25: 80,
        measuredAt: halfHourAgoIso,
      },
      {
        name: "Station C",
        lat: 28.64,
        lon: 77.23, // ~3.8 km away (< 5 km)
        pm25: 100,
        measuredAt: halfHourAgoIso,
      },
    ];

    const res = selectEffectivePm25({
      point: delhi,
      stations,
      modelPm25Now: 90,
      modelOffsetSeconds: 19800,
      nowMs,
    });

    expect(res).not.toBeNull();
    // Median of [80, 100, 120] is 100
    expect(res?.pm25).toBe(100);
    expect(res?.source).toBe("station");
    expect(res?.confidence).toBe("High");
  });

  it("selects nearest single station when only 1 is within 10 km or 25 km", () => {
    const stations: StationReading[] = [
      {
        name: "Station Far",
        lat: 28.75,
        lon: 77.30, // ~18 km away
        pm25: 140,
        measuredAt: halfHourAgoIso,
      },
    ];

    const res = selectEffectivePm25({
      point: delhi,
      stations,
      modelPm25Now: 95,
      modelOffsetSeconds: 19800,
      nowMs,
    });

    expect(res).not.toBeNull();
    expect(res?.pm25).toBe(140);
    expect(res?.source).toBe("station");
    expect(res?.confidence).toBe("Medium");
  });

  it("falls back to model when stations are >25 km or older than 3 hours", () => {
    const stations: StationReading[] = [
      {
        name: "Station Too Old",
        lat: 28.62,
        lon: 77.22,
        pm25: 50,
        measuredAt: fourHoursAgoIso, // 4 hours old
      },
      {
        name: "Station Too Far",
        lat: 29.50,
        lon: 78.50, // >100 km away
        pm25: 60,
        measuredAt: halfHourAgoIso,
      },
      {
        name: "Station Negative",
        lat: 28.62,
        lon: 77.22,
        pm25: -999,
        measuredAt: halfHourAgoIso,
      },
    ];

    const res = selectEffectivePm25({
      point: delhi,
      stations,
      modelPm25Now: 88,
      modelOffsetSeconds: 19800,
      nowMs,
    });

    expect(res).not.toBeNull();
    expect(res?.pm25).toBe(88);
    expect(res?.source).toBe("model");
    expect(res?.confidence).toBe("Low");
    expect(res?.modelDistanceNote).toBe("~45 km");
  });

  it("returns null when no stations qualify and no model data exists", () => {
    const res = selectEffectivePm25({
      point: delhi,
      stations: [],
      modelPm25Now: null,
      modelOffsetSeconds: 19800,
      nowMs,
    });
    expect(res).toBeNull();
  });
});

describe("confidenceFor", () => {
  it("grades confidence accurately", () => {
    expect(confidenceFor({ source: "model" })).toBe("Low");
    expect(confidenceFor({ source: "station", distanceKm: 4, ageMin: 30 })).toBe("High");
    expect(confidenceFor({ source: "station", distanceKm: 4, ageMin: 70 })).toBe("Medium");
    expect(confidenceFor({ source: "station", distanceKm: 15, ageMin: 20 })).toBe("Medium");
    expect(confidenceFor({ source: "station", distanceKm: 30, ageMin: 10 })).toBe("Low");
  });
});
