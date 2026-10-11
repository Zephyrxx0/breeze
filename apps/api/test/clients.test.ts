import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMockServer, type MockServer } from "./helpers/mockUpstream";
import { fetchOpenMeteoAir } from "../src/clients/openmeteoAir";
import { fetchOpenMeteoForecast } from "../src/clients/openmeteoForecast";
import { fetchOpenAq, buildBoundingBox } from "../src/clients/openaq";
import { searchPlaces } from "../../web/src/lib/geocode";

describe("upstream clients (hermetic)", () => {
  let mock: MockServer;

  beforeAll(async () => {
    mock = await createMockServer();
  });

  afterAll(async () => {
    await mock.close();
  });

  describe("openmeteoAir", () => {
    it("parses valid air quality payload correctly", async () => {
      mock.setHandler((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            current: { time: "2026-10-11T12:00", pm2_5: 42 },
            hourly: {
              time: ["2026-10-11T12:00", "2026-10-11T13:00"],
              pm2_5: [42, 45],
              pm10: [80, 85],
            },
          })
        );
      });

      const res = await fetchOpenMeteoAir(28.61, 77.21, {
        baseUrl: mock.baseUrl,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.pm25Now).toBe(42);
      expect(res.data.utcOffsetSeconds).toBe(19800);
      expect(res.data.hourly.length).toBe(2);
      expect(res.data.hourly[0].pm25).toBe(42);
    });

    it("returns ok:false on upstream error or schema failure", async () => {
      mock.setHandler((_req, res) => {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: true, reason: "bad coordinates" }));
      });

      const res = await fetchOpenMeteoAir(999, 999, {
        baseUrl: mock.baseUrl,
      });
      expect(res.ok).toBe(false);
    });
  });

  describe("openmeteoForecast", () => {
    it("parses weather and daily fields correctly", async () => {
      mock.setHandler((_req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            utc_offset_seconds: 19800,
            timezone: "Asia/Kolkata",
            hourly: {
              time: ["2026-10-11T12:00"],
              temperature_2m: [32.5],
              apparent_temperature: [36.2],
              relative_humidity_2m: [65],
              precipitation_probability: [10],
              uv_index: [7],
              wind_speed_10m: [12.4],
              wind_direction_10m: [220],
            },
            daily: {
              uv_index_max: [9],
              sunrise: ["2026-10-11T06:20"],
              sunset: ["2026-10-11T18:05"],
            },
          })
        );
      });

      const res = await fetchOpenMeteoForecast(28.61, 77.21, {
        baseUrl: mock.baseUrl,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.hourly.length).toBe(1);
      expect(res.data.hourly[0].apparentTemperature).toBe(36.2);
      expect(res.data.daily?.uvIndexMax?.[0]).toBe(9);
    });
  });

  describe("openaq", () => {
    it("builds correct bbox order (west,south,east,north)", () => {
      const { bboxStr } = buildBoundingBox(28.61, 77.21);
      // lon 77.21 - 0.25 = 76.96, lat 28.61 - 0.25 = 28.36
      // lon 77.21 + 0.25 = 77.46, lat 28.61 + 0.25 = 28.86
      expect(bboxStr).toBe("76.96,28.36,77.46,28.86");
    });

    it("refuses with no-key when OPENAQ_API_KEY is absent", async () => {
      const origKey = process.env.OPENAQ_API_KEY;
      delete process.env.OPENAQ_API_KEY;
      try {
        const res = await fetchOpenAq(28.61, 77.21, {
          baseUrl: mock.baseUrl,
        });
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe("no key");
        }
      } finally {
        process.env.OPENAQ_API_KEY = origKey;
      }
    });

    it("fetches locations and latest readings under api key", async () => {
      mock.setHandler((req, res) => {
        expect(req.headers["x-api-key"]).toBe("test-key-123");
        if (req.url?.includes("/locations?")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              results: [
                {
                  id: 101,
                  name: "Pusa Station",
                  coordinates: { latitude: 28.63, longitude: 77.22 },
                  sensors: [{ id: 501, parameter: { id: 2, name: "pm25" } }],
                },
              ],
            })
          );
        } else if (req.url?.includes("/locations/101/latest")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              results: [
                {
                  sensorsId: 501,
                  value: 68,
                  datetime: { utc: "2026-10-11T11:45:00Z" },
                },
              ],
            })
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      const res = await fetchOpenAq(28.61, 77.21, {
        baseUrl: mock.baseUrl,
        key: "test-key-123",
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.length).toBe(1);
      expect(res.data[0].pm25).toBe(68);
      expect(res.data[0].name).toBe("Pusa Station");
    });
  });

  describe("openaq station selection correctness", () => {
    const json = (res: import("node:http").ServerResponse, body: unknown) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    it("skips dead stations, locations without a PM2.5 sensor, and never reads another parameter", async () => {
      const recent = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      mock.setHandler((req, res) => {
        if (req.url?.includes("/locations?")) {
          expect(req.url).toContain("limit=1000");
          json(res, {
            results: [
              // nearest, but dead since 2018
              { id: 1, name: "Dead", datetimeLast: { utc: "2018-02-22T04:00:00Z" }, coordinates: { latitude: 28.611, longitude: 77.211 }, sensors: [{ id: 11, parameter: { id: 2, units: "µg/m³" } }] },
              // near, live, but only reports NO2 (no PM2.5 sensor)
              { id: 2, name: "NO2 only", datetimeLast: { utc: recent }, coordinates: { latitude: 28.612, longitude: 77.212 }, sensors: [{ id: 21, parameter: { id: 5, units: "µg/m³" } }] },
              // live PM2.5
              { id: 3, name: "Live PM2.5", datetimeLast: { utc: recent }, provider: { name: "CPCB" }, coordinates: { latitude: 28.65, longitude: 77.22 }, sensors: [{ id: 31, parameter: { id: 2, units: "µg/m³" } }] },
            ],
          });
        } else if (req.url?.includes("/locations/3/latest")) {
          json(res, { results: [{ sensorsId: 99, value: 5, datetime: { utc: recent } }, { sensorsId: 31, value: 88, datetime: { utc: recent } }] });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      const res = await fetchOpenAq(28.61, 77.21, { baseUrl: mock.baseUrl, key: "k" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.map((r) => r.name)).toEqual(["Live PM2.5"]);
      expect(res.data[0].pm25).toBe(88); // the PM2.5 sensor row, not the first row
      expect(res.data[0].provider).toBe("CPCB");
    });

    it("rejects PM2.5 sensors that are not in µg/m³", async () => {
      const recent = new Date().toISOString();
      mock.setHandler((req, res) => {
        if (req.url?.includes("/locations?")) {
          json(res, { results: [{ id: 4, name: "ppb", datetimeLast: { utc: recent }, coordinates: { latitude: 28.62, longitude: 77.21 }, sensors: [{ id: 41, parameter: { id: 2, units: "ppb" } }] }] });
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      const res = await fetchOpenAq(28.61, 77.21, { baseUrl: mock.baseUrl, key: "k" });
      expect(res.ok && res.data.length).toBe(0);
    });
  });

  describe("geocode searchPlaces", () => {
    it("returns places filtered to country_code IN", async () => {
      mock.setHandler((_req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            results: [
              {
                id: 1,
                name: "Lucknow",
                latitude: 26.85,
                longitude: 80.95,
                country_code: "IN",
                admin1: "Uttar Pradesh",
              },
              {
                id: 2,
                name: "Lucknow Non-IN",
                latitude: 10.0,
                longitude: 10.0,
                country_code: "US",
              },
            ],
          })
        );
      });

      const results = await searchPlaces("Lucknow", {
        baseUrl: mock.baseUrl,
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Lucknow");
      expect(results[0].admin1).toBe("Uttar Pradesh");
    });

    it("returns empty array when results key is omitted", async () => {
      mock.setHandler((_req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({}));
      });

      const results = await searchPlaces("UnknownPlace", {
        baseUrl: mock.baseUrl,
      });

      expect(results).toEqual([]);
    });
  });

  describe("abort timeout", () => {
    it("aborts when server hangs", async () => {
      mock.setHandler((_req, _res) => {
        // Deliberately never respond
      });

      const res = await fetchOpenMeteoAir(28.61, 77.21, {
        baseUrl: mock.baseUrl,
        timeoutMs: 50,
      });

      expect(res.ok).toBe(false);
    });
  });
});
