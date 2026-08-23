# Nexora Smart Edu — Offline Sync

NSE is **offline-first**: teachers can check in/out without connectivity, and the
event is queued locally and synced when the network returns.

## Storage (client)

The web client uses **IndexedDB** (via `idb`) with a single object store
`attendance-queue`. Each record is an offline event:

```ts
interface OfflineEvent {
  localEventId: string;      // client-generated UUID
  teacherId: string;
  attendanceType: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;         // client-captured time
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  deviceId: string | null;
  verificationMethod?: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}
```

## Sync states

| State | Meaning |
|-------|---------|
| `PENDING` | Captured offline, not yet synced |
| `SYNCING` | In-flight (reserved) |
| `SYNCED` | Server accepted |
| `FAILED` | Server rejected (will be retried / surfaced) |
| `CONFLICT` | Duplicate event for the same type that day (server-side) |

## Flow

1. **Capture** — the client reads GPS (browser geolocation) and timestamps the
   event locally.
2. **Try real-time** — `POST /attendance/check-in`. On success, done.
3. **Queue on failure** — a network/rejection failure writes to IndexedDB with
   `syncStatus = PENDING`.
4. **Sync** — `POST /attendance/sync` sends the batch. The server returns a
   **per-item** result (`ACCEPTED`, `REJECTED`, `CONFLICT`) with reasons.

## Server-side rules (48h window)

- Events older than **48 hours** are `REJECTED` (stale).
- GPS accuracy over **100 m** is `REJECTED`.
- Events outside the school's active geofence are rejected for real-time
  check-in (offline events are still recorded and risk-scored).
- Duplicate check-in/check-out for the same day → `CONFLICT`.

## Tamper resistance

- The client timestamp is **never trusted** for status. The server records both
  the client `timestamp` and the authoritative `server_timestamp`, then derives
  status from a deterministic calculator (with 2-minute clock-skew tolerance).
- Offline events are flagged `offline_created = true` and carry a `risk_score`
  (GPS accuracy + geofence status). High-risk records are surfaced for review.
