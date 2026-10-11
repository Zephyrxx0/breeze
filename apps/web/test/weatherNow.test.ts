import { describe, it, expect } from "vitest";
import type { AssessResponse } from "@breeze/core";
import { weatherNow } from "../src/lib/weatherNow";

const hourly = Array.from({ length: 48 }, (_, i) => ({
  time: `2026-10-${i < 24 ? "11" : "12"}T${String(i % 24).padStart(2, "0")}:00`,
  apparentTemperature: 20 + (i % 24),
  relativeHumidity2m: 50 + (i % 24),
  uvIndex: i % 24 === 12 ? 8 : 0,
  precipitationProbability: i % 24 === 20 ? 70 : 10,
  windSpeed10m: 5,
  windDirection10m: 90,
}));

const weather: AssessResponse["weather"] = {
  status: "ok",
  hourly,
  daily: { uvIndexMax: [8, 7], sunrise: ["2026-10-11T06:19", "2026-10-12T06:20"], sunset: ["2026-10-11T17:56", "2026-10-12T17:55"] },
};

// 2026-10-11 15:30 IST
const NOW = Date.parse("2026-10-11T10:00:00Z");
const IST = 19800;

describe("weatherNow", () => {
  it("selects the current local hour, never hourly[0] (local midnight)", () => {
    const w = weatherNow(weather, IST, NOW)!;
    expect(w.index).toBe(15);
    expect(w.feelsLikeC).toBe(35);
    expect(w.humidity).toBe(65);
  });

  it("uses today's UV max by date and the rain probability of the next 6 hours", () => {
    const w = weatherNow(weather, IST, NOW)!;
    expect(w.uvMaxToday).toBe(8);
    expect(w.rainNext6h).toBe(70); // 15..20 includes 20:00
    expect(w.sunrise).toBe("2026-10-11T06:19");
  });

  it("returns null when the series does not cover now (never shows another hour as current)", () => {
    expect(weatherNow(weather, IST, Date.parse("2026-10-20T10:00:00Z"))).toBeNull();
  });

  it("returns null for unavailable or empty weather", () => {
    expect(weatherNow({ status: "unavailable" }, IST, NOW)).toBeNull();
    expect(weatherNow({ status: "ok", hourly: [] }, IST, NOW)).toBeNull();
  });
});
