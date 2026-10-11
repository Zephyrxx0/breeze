import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../src/app";
import { createMockServer, type MockServer } from "./helpers/mockUpstream";
import { AssessResponseSchema } from "../src/assessSchema";

describe("GET /api/assess validation & caching", () => {
  let mock: MockServer;

  beforeAll(async () => {
    mock = await createMockServer((req, res) => {
      if (req.url?.includes("/air-quality?")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            current: { time: "2026-10-11T12:00", pm2_5: 42 },
            hourly: {
              time: ["2026-10-11T12:00"],
              pm2_5: [42],
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
              temperature_2m: [30],
            },
          })
        );
      } else if (req.url?.includes("/locations?")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ results: [] }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    process.env.AIR_BASE_URL = `${mock.baseUrl}/air-quality`;
    process.env.FORECAST_BASE_URL = `${mock.baseUrl}/forecast`;
    process.env.OPENAQ_BASE_URL = `${mock.baseUrl}/locations`;
    process.env.OPENAQ_API_KEY = "test-key";
  });

  afterAll(async () => {
    delete process.env.AIR_BASE_URL;
    delete process.env.FORECAST_BASE_URL;
    delete process.env.OPENAQ_BASE_URL;
    delete process.env.OPENAQ_API_KEY;
    await mock.close();
  });

  it("returns 400 invalid_params on missing or non-numeric lat/lon", async () => {
    const res1 = await app.request("/api/assess");
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toBe("invalid_params");
    expect(res1.headers.get("Cache-Control")).toBe("public, max-age=300");

    const res2 = await app.request("/api/assess?lat=abc&lon=77");
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.error).toBe("invalid_params");

    const res3 = await app.request("/api/assess?lat=28.61");
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3.error).toBe("invalid_params");
  });

  it("returns 400 out_of_coverage for coordinates outside India", async () => {
    const res1 = await app.request("/api/assess?lat=40.7&lon=-74");
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toBe("out_of_coverage");

    const res2 = await app.request("/api/assess?lat=5&lon=77");
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.error).toBe("out_of_coverage");

    const res3 = await app.request("/api/assess?lat=38.1&lon=77");
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3.error).toBe("out_of_coverage");

    const res4 = await app.request("/api/assess?lat=28.6&lon=98.6");
    expect(res4.status).toBe(400);
    const body4 = await res4.json();
    expect(body4.error).toBe("out_of_coverage");
  });

  it("returns 200 with schema-valid response and 2-dp coordinates", async () => {
    const res = await app.request("/api/assess?lat=28.6149&lon=77.2095");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");

    const body = await res.json();
    const parsed = AssessResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);

    expect(body.location.lat).toBe(28.61);
    expect(body.location.lon).toBe(77.21);
    expect(body.location.utcOffsetSeconds).toBe(19800);
  });
});
