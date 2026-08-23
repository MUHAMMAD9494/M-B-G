/**
 * @nexora/utils — pure, dependency-free helpers shared across the platform.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371008.8;

/**
 * Great-circle distance between two points using the Haversine formula.
 * Returns distance in meters. This is the V1 geospatial primitive and is
 * intentionally kept in a single function so it can be swapped for PostGIS
 * (ST_DWithin / geography) without touching attendance logic.
 */
export function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export interface GeofenceCheck {
  inside: boolean;
  distanceMeters: number;
}

/** Whether a point lies inside a circular geofence (and by how far). */
export function isWithinGeofence(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number,
): GeofenceCheck {
  const distanceMeters = haversineDistanceMeters(point, center);
  return { inside: distanceMeters <= radiusMeters, distanceMeters };
}

export function isValidLatitude(latitude: number): boolean {
  return latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return longitude >= -180 && longitude <= 180;
}

export function isValidCoordinates(coords: Coordinates | null | undefined): boolean {
  if (!coords) return false;
  return isValidLatitude(coords.latitude) && isValidLongitude(coords.longitude);
}

/** Generate a non-cryptographic, sortable local id for offline events. */
export function newLocalId(prefix = 'local'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
