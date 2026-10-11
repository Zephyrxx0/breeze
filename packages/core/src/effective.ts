import { haversineKm } from "./geo";
import { wallFromInstant } from "./wallclock";
import type {
  StationReading,
  EffectivePm25,
  Confidence,
} from "./types";

/**
 * Determines confidence grade per PRD §7.3:
 * High = station within 5 km and under 1 h (60 min) old
 * Medium = station within 25 km
 * Low = model only
 */
export function confidenceFor(input: {
  source: "station" | "model";
  distanceKm?: number;
  ageMin?: number;
}): Confidence {
  if (input.source === "model") {
    return "Low";
  }
  const dist = input.distanceKm ?? 999;
  const age = input.ageMin ?? 999;
  if (dist <= 5 && age < 60) {
    return "High";
  }
  if (dist <= 25) {
    return "Medium";
  }
  return "Low";
}

export interface SelectEffectiveInput {
  point: { lat: number; lon: number };
  stations: StationReading[];
  modelPm25Now: number | null;
  modelOffsetSeconds: number;
  nowMs: number;
}

/**
 * Implements the PRD §7.3 ladder:
 * 1. Filter stations to valid (non-negative), units µg/m³ (if units specified),
 *    no older than 3 hours (180 min), and within 25 km haversine.
 * 2. If ≥2 stations within 10 km, take the median of the nearest 3.
 *    Otherwise take the nearest station.
 * 3. If no station qualifies, fall back to modelPm25Now with "Low" confidence and "~45 km" note.
 * 4. Returns null if both station and model data are missing (leads to "Can't assess").
 */
export function selectEffectivePm25(
  input: SelectEffectiveInput
): EffectivePm25 | null {
  const { point, stations, modelPm25Now, modelOffsetSeconds, nowMs } = input;

  const validStations: Array<{
    station: StationReading;
    distanceKm: number;
    ageMin: number;
  }> = [];

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  for (const st of stations) {
    if (!Number.isFinite(st.pm25) || st.pm25 < 0) continue;
    if (st.units && st.units !== "µg/m³" && st.units !== "ug/m3") continue;

    const measuredInstant = Date.parse(st.measuredAt || st.measuredAtUtc || "");
    if (isNaN(measuredInstant)) continue;
    const ageMs = nowMs - measuredInstant;
    if (ageMs < 0 || ageMs > THREE_HOURS_MS) continue;

    const dist = haversineKm(point.lat, point.lon, st.lat, st.lon);
    if (dist > 25) continue;

    validStations.push({
      station: st,
      distanceKm: dist,
      ageMin: Math.floor(ageMs / 60000),
    });
  }

  // Sort by distance ascending
  validStations.sort((a, b) => a.distanceKm - b.distanceKm);

  if (validStations.length > 0) {
    const within10Km = validStations.filter((s) => s.distanceKm <= 10);
    let selected: { station: StationReading; distanceKm: number; ageMin: number };

    if (within10Km.length >= 2) {
      // Median of the nearest up to 3 stations
      const nearestUpTo3 = within10Km.slice(0, 3);
      nearestUpTo3.sort((a, b) => a.station.pm25 - b.station.pm25);
      const mid = Math.floor(nearestUpTo3.length / 2);
      selected = nearestUpTo3[mid];
    } else {
      // Nearest single station
      selected = validStations[0];
    }

    const conf = confidenceFor({
      source: "station",
      distanceKm: selected.distanceKm,
      ageMin: selected.ageMin,
    });

    const ratio =
      modelPm25Now !== null && modelPm25Now > 0
        ? selected.station.pm25 / modelPm25Now
        : null;

    return {
      pm25: selected.station.pm25,
      value: selected.station.pm25,
      source: "station",
      basis: "station",
      measuredAt: selected.station.measuredAt || selected.station.measuredAtUtc || "",
      station: {
        id: selected.station.id || selected.station.stationId,
        name: selected.station.name || selected.station.stationName || "Local Station",
        distanceKm: selected.distanceKm,
        provider: selected.station.provider,
      },
      confidence: conf,
      ratio,
    };
  }

  // Model fallback path
  if (modelPm25Now !== null && Number.isFinite(modelPm25Now) && modelPm25Now >= 0) {
    const wallNow = wallFromInstant(nowMs, modelOffsetSeconds);
    return {
      pm25: modelPm25Now,
      value: modelPm25Now,
      source: "model",
      basis: "model",
      measuredAt: wallNow,
      modelDistanceNote: "~45 km",
      confidence: "Low",
      ratio: null,
    };
  }

  return null;
}
