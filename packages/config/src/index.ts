/**
 * @nexora/config — shared runtime constants (non-secret).
 * Secrets live in environment variables only (see .env.example).
 */

export const API_PREFIX = 'api';
export const API_VERSION = 'v1';

/** Cookie names used for the HTTP-only token transport. */
export const ACCESS_TOKEN_COOKIE = 'nse_access';
export const REFRESH_TOKEN_COOKIE = 'nse_refresh';

/** Client-side localStorage/IndexedDB keys. */
export const STORAGE_KEYS = {
  offlineDb: 'nse-offline-db',
  deviceId: 'nse-device-id',
} as const;

/** Default geofence radius (meters) when a school has not configured one. */
export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

/** Maximum acceptable GPS accuracy (meters) for a valid attendance event. */
export const MAX_GPS_ACCURACY_METERS = 100;

/** Default attendance rules (overridable per school). */
export const DEFAULT_ATTENDANCE_RULES = {
  lateThresholdMinutes: 15,
  earlyDepartureThresholdMinutes: 30,
} as const;
