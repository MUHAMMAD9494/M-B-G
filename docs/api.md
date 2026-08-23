# Nexora Smart Edu — API Reference

Base URL: `http://localhost:4000/api/v1`. All responses are wrapped:

```json
{ "success": true, "data": { }, "meta": { } }
```

Errors:

```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```

Auth: HTTP-only cookies `nse_access` / `nse_refresh` (set on login), with a
Bearer-token fallback. Admin routes require the listed permission.

## Auth (public: login, refresh)

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/auth/login` | public | `{ email, password }` | `{ user, accessToken, expiresIn }` + cookies |
| POST | `/auth/refresh` | public (refresh cookie) | `{ refreshToken? }` | `{ accessToken, expiresIn }` + cookies |
| POST | `/auth/logout` | cookie | — | `{}` + clears cookies |
| GET | `/auth/me` | cookie/Bearer | — | `AuthUser` |
| POST | `/auth/change-password` | cookie/Bearer | `{ currentPassword, newPassword }` | `{}` |

## Users

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/users` | `users.read` | List (tenant-scoped, `?page&limit&role&status&search`) |
| POST | `/users` | `users.create` | Create in own school |
| PATCH | `/users/:id` | `users.update` | Update |
| POST | `/users/:id/disable` | `users.disable` | Disable account |
| POST | `/users/:id/enable` | `users.disable` | Enable account |

## Schools

| Method | Path | Permission |
|--------|------|------------|
| GET | `/schools/me` | `school.read` |
| PATCH | `/schools/me` | `school.update` |

Body: `name, logoUrl, address, phone, email, timezone, workingDays[],
lateThresholdMinutes, earlyDepartureThresholdMinutes`.

## Branches

| Method | Path | Permission |
|--------|------|------------|
| GET | `/branches` | any authenticated |
| POST | `/branches` | `school.update` |
| PATCH | `/branches/:id` | `school.update` |

## Teachers

| Method | Path | Permission |
|--------|------|------------|
| GET | `/teachers` | `teachers.read` |
| GET | `/teachers/:id` | `teachers.read` |
| POST | `/teachers` | `teachers.create` |
| PATCH | `/teachers/:id` | `teachers.update` |

## Attendance

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/attendance/check-in` | `attendance.create` | Check-in/out (GPS + geofence) |
| POST | `/attendance/sync` | `attendance.create` | Offline batch sync |
| GET | `/attendance` | `attendance.read` | List (`?date&teacherId&branchId&status`) |
| GET | `/attendance/today-summary` | `attendance.read` | Dashboard roll-up |
| PATCH | `/attendance/:id/correct` | `attendance.correct` | Correct record (audited) |

Check-in body:

```json
{
  "attendanceType": "CHECK_IN",
  "latitude": 11.8443,
  "longitude": 13.1423,
  "accuracy": 12,
  "verificationMethod": "gps_geofence"
}
```

Sync body:

```json
{
  "events": [{
    "localEventId": "uuid", "attendanceType": "CHECK_IN",
    "timestamp": "2026-08-22T08:00:00Z", "latitude": 11.8, "longitude": 13.1,
    "accuracy": 10
  }]
}
```

## Geofences

| Method | Path | Permission |
|--------|------|------------|
| GET | `/geofences` | any authenticated |
| POST | `/geofences` | `settings.update` |
| PATCH | `/geofences/:id` | `settings.update` |

## Biometrics (dev-only adapter in V1)

| Method | Path | Permission |
|--------|------|------------|
| POST | `/biometrics/enroll` | `teachers.update` |
| POST | `/biometrics/verify/:teacherId` | `attendance.create` |
| GET | `/biometrics` | `teachers.read` |
| DELETE | `/biometrics/:id` | `teachers.delete` |

## Devices

| Method | Path | Permission |
|--------|------|------------|
| POST | `/devices/register` | any authenticated |
| GET | `/devices` | any authenticated |

## Reports

| Method | Path | Permission |
|--------|------|------------|
| GET | `/reports/daily?date=` | `reports.read` |
| GET | `/reports/weekly?date=` | `reports.read` |
| GET | `/reports/monthly?year=&month=` | `reports.read` |
| GET | `/reports/teacher/:teacherId/history` | `reports.read` |
| GET | `/reports/export/csv?startDate=&endDate=` | `reports.export` |

## Audit, Settings, Health, Notifications

| Method | Path | Permission |
|--------|------|------------|
| GET | `/audit` | `audit.read` |
| GET | `/settings?key=` | `settings.read` |
| PATCH | `/settings` | `settings.update` |
| GET | `/health` | public |
| GET | `/health/database` | public |
| GET | `/notifications/preferences` | authenticated |
| PATCH | `/notifications/preferences` | authenticated |

## Error codes

`INVALID_CREDENTIALS`, `UNAUTHORIZED`, `FORBIDDEN`, `TENANT_ACCESS_DENIED`,
`ACCOUNT_DISABLED`, `ACCOUNT_LOCKED`, `VALIDATION_FAILED`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `OUTSIDE_GEOFENCE`, `GPS_UNAVAILABLE`,
`GPS_ACCURACY_LOW`, `FACE_VERIFICATION_FAILED`, `LIVENESS_FAILED`,
`BIOMETRIC_NOT_ENROLLED`, `ATTENDANCE_ALREADY_RECORDED`,
`OFFLINE_EVENT_REJECTED`, `SYNC_CONFLICT`, `GEOFENCE_NOT_CONFIGURED`,
`DEVICE_UNKNOWN`, `INTERNAL_ERROR`.
