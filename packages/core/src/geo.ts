const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates great-circle distance between two points in kilometres (Haversine formula).
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates initial compass bearing (0..360°) from point 1 to point 2.
 */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * Determines whether a source station or point is upwind relative to the observer.
 * bearing: bearing from observer to source (direction to source)
 * windFromDeg: meteorological wind direction (direction wind blows FROM)
 * If the wind blows FROM the direction of the source (within maxDeg), it is upwind.
 */
export function isUpwind(
  bearing: number,
  windFromDeg: number,
  maxDeg = 45
): boolean {
  let diff = Math.abs(bearing - windFromDeg) % 360;
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff <= maxDeg;
}
