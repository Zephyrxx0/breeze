import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../src/app";
import { createMockServer, type MockServer } from "./helpers/mockUpstream";
import { clearCache } from "../src/cache";

describe("fail-soft orchestration & degradation", () => {
  let mock: MockServer;

  beforeAll(async () => {
    mock = await createMockServer();
  });

  afterAll(async () => {
    await mock.close();
  });

  beforeEach(() => {
    clearCache();
  });

  it("handles model-only degrade path when OpenAQ is blackholed", async () => {
    mock.setHandler((req, res) => {
      if (req.url?.includes("/air-quality?")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            current: { time: "2026-10-11T12:00", pm2_5: 55 },
            hourly: {
              time: ["2026-10-11T12:00"],
              pm2_5: [55],
            },
          })
        );
      } else if (req.url?.includes("/forecast?")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            hourly: {
              time: ["2026-10-11T12:00"],
              temperature_2m: [28],
            },
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    process.env.AIR_BASE_URL = `${mock.baseUrl}/air-quality`;
    process.env.FORECAST_BASE_URL = `${mock.baseUrl}/forecast`;
    // Fast-fail non-routable port for OpenAQ blackhole
    process.env.OPENAQ_BASE_URL = "http://127.0.0.1:9";
    process.env.OPENAQ_API_KEY = "test-key";

    try {
      const res = await app.request("/api/assess?lat=28.61&lon=77.21");
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.air.status).toBe("ok");
      expect(body.air.current?.source).toBe("model");
      expect(body.air.current?.pm25).toBe(55);
      expect(body.sources.openaq.status).toBe("unavailable");
      expect(body.air.model).not.toBeNull();
    } finally {
      delete process.env.AIR_BASE_URL;
      delete process.env.FORECAST_BASE_URL;
      delete process.env.OPENAQ_BASE_URL;
      delete process.env.OPENAQ_API_KEY;
    }
  });

  it("handles station-only degrade path when Open-Meteo Air is blackholed", async () => {
    mock.setHandler((req, res) => {
      if (req.url?.includes("/forecast?")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            hourly: {
              time: ["2026-10-11T12:00"],
              temperature_2m: [28],
            },
          })
        );
      } else if (req.url?.includes("/locations") && !req.url?.includes("/latest")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            results: [
              {
                id: 1,
                name: "Station Alpha",
                coordinates: { latitude: 28.61, longitude: 77.21 },
                sensors: [{ id: 10, parameter: { id: 2, name: "pm25" } }],
              },
            ],
          })
        );
      } else if (req.url?.includes("/locations/1/latest") || req.url?.includes("/latest")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            results: [
              {
                sensorsId: 10,
                value: 75,
                datetime: { utc: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
              },
            ],
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Air is blackholed
    process.env.AIR_BASE_URL = "http://127.0.0.1:9";
    process.env.FORECAST_BASE_URL = `${mock.baseUrl}/forecast`;
    process.env.OPENAQ_BASE_URL = mock.baseUrl;
    process.env.OPENAQ_API_KEY = "test-key";

    try {
      const res = await app.request("/api/assess?lat=28.61&lon=77.21");
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.air.status).toBe("ok");
      expect(body.air.current?.source).toBe("station");
      expect(body.air.current?.pm25).toBe(75);
      expect(body.air.model).toBeNull(); // No model forecast
      expect(body.air.comparison).toBeUndefined();
      expect(body.sources.openmeteo_air.status).toBe("unavailable");
    } finally {
      delete process.env.AIR_BASE_URL;
      delete process.env.FORECAST_BASE_URL;
      delete process.env.OPENAQ_BASE_URL;
      delete process.env.OPENAQ_API_KEY;
    }
  });

  it("returns 502 all_upstreams_failed when all upstreams fail without cache", async () => {
    process.env.AIR_BASE_URL = "http://127.0.0.1:9";
    process.env.FORECAST_BASE_URL = "http://127.0.0.1:9";
    process.env.OPENAQ_BASE_URL = "http://127.0.0.1:9";
    process.env.OPENAQ_API_KEY = "test-key";

    try {
      const res = await app.request("/api/assess?lat=28.61&lon=77.21");
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe("all_upstreams_failed");
    } finally {
      delete process.env.AIR_BASE_URL;
      delete process.env.FORECAST_BASE_URL;
      delete process.env.OPENAQ_BASE_URL;
      delete process.env.OPENAQ_API_KEY;
    }
  });
});
