import { z } from "zod";

// Stage 1: Coerce and ensure numeric lat/lon are present
export const QueryNumericSchema = z.object({
  lat: z.coerce.number({
    error: "lat must be numeric",
  }),
  lon: z.coerce.number({
    error: "lon must be numeric",
  }),
});

// Stage 2: Bounds checking for India bounding box (lat 6-38, lon 68-98.5)
export const QueryIndiaBoundsSchema = z.object({
  lat: z.number().min(6).max(38),
  lon: z.number().min(68).max(98.5),
});

export const AssessResponseSchema = z.object({
  generatedAt: z.string(),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    timezone: z.string().optional(),
    utcOffsetSeconds: z.number(),
  }),
  air: z.object({
    status: z.enum(["ok", "stale", "unavailable"]),
    current: z
      .object({
        pm25: z.number(),
        source: z.enum(["station", "model"]),
        measuredAt: z.string(),
        station: z
          .object({
            id: z.union([z.number(), z.string()]).optional(),
            name: z.string(),
            distanceKm: z.number(),
            provider: z.string().optional(),
          })
          .optional(),
        modelDistanceNote: z.literal("~45 km").optional(),
        confidence: z.enum(["High", "Medium", "Low"]),
      })
      .nullable(),
    model: z
      .object({
        hourly: z.array(
          z.object({
            time: z.string(),
            pm25: z.number(),
            pm10: z.number().optional(),
          })
        ),
      })
      .nullable(),
    comparison: z
      .object({
        ratio: z.number(),
        stationPm25: z.number(),
        modelPm25: z.number(),
      })
      .optional(),
  }),
  weather: z.object({
    status: z.enum(["ok", "stale", "unavailable"]),
    current: z
      .object({
        temperature2m: z.number().optional(),
        apparentTemperature: z.number().optional(),
        relativeHumidity2m: z.number().optional(),
        precipitationProbability: z.number().optional(),
        uvIndex: z.number().optional(),
        windSpeed10m: z.number().optional(),
        windDirection10m: z.number().optional(),
      })
      .optional(),
    hourly: z
      .array(
        z.object({
          time: z.string(),
          temperature2m: z.number().optional(),
          apparentTemperature: z.number().optional(),
          relativeHumidity2m: z.number().optional(),
          precipitationProbability: z.number().optional(),
          uvIndex: z.number().optional(),
          windSpeed10m: z.number().optional(),
          windDirection10m: z.number().optional(),
        })
      )
      .optional(),
    daily: z
      .object({
        uvIndexMax: z.array(z.number()).optional(),
        sunrise: z.array(z.string()).optional(),
        sunset: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  sources: z.record(
    z.string(),
    z.object({
      status: z.enum(["ok", "stale", "unavailable"]),
      fetchedAt: z.string().optional(),
      ageMin: z.number().optional(),
      error: z.string().optional(),
    })
  ),
});

export type AssessResponse = z.infer<typeof AssessResponseSchema>;
