# Nexora Smart Edu — Backup Runbook

Applies to the local/staging PostgreSQL instance (compose) and to production.

---

## 0. What is and isn't a backup

| Thing | Is it a backup? |
|---|---|
| `infrastructure/backups/output/*.sql.gz` (via `backup.ps1`) | ✅ Yes — restorable logical dump |
| Managed-PG point-in-time recovery (PITR / continuous archiving) | ✅ Yes — for production, this is the primary backup |
| Docker named volume `nexora_pgdata` | ❌ **NO** |
| A copy of `nexora_pgdata` taken while Postgres is running | ⚠️ Only if consistent (e.g. `pg_basebackup`); a plain file copy of a live data dir is **not** trustworthy |
| `node_modules` / source code | ❌ No — not data |

> **Named volumes are NOT backups.** Deleting/overwriting the volume destroys the
> database. The compose volume (`nexora_pgdata`) does not survive disk failure,
> accidental `docker compose down -v`, or container deletion.

## 1. Local / staging backups (compose DB)

```powershell
# one-shot
powershell -ExecutionPolicy Bypass -File infrastructure/backups/backup.ps1

# with an offsite copy (second disk / NAS / synced folder)
$env:OFFLOAD_DIR = "D:\backups\nexora-offsite"
powershell -ExecutionPolicy Bypass -File infrastructure/backups/backup.ps1
```

What it does:

- `docker exec nexora-postgres pg_dump -U nexora -d nexora` (plain SQL, `-c` so
  restore is idempotent), gzipped inside the container, copied out byte-safe.
- Writes `infrastructure/backups/output/nexora-postgres_YYYYMMDD_HHMMSS.sql.gz`.
- Keeps the newest **14** dumps.
- Logs every run to `infrastructure/backups/backup.log`.
- Optionally copies to `$env:OFFLOAD_DIR`.

### Scheduling (daily = RPO ≤ 24h for the dump tier)

**Windows — Task Scheduler (daily 03:00):**

```powershell
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\nexora-v1-g-ide\infrastructure\backups\backup.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
Register-ScheduledTask -TaskName 'Nexora DB Backup' -Action $action -Trigger $trigger `
  -Description 'Daily Nexora PostgreSQL dump (+retention)' -RunLevel Limited
```

**Linux / cron (equivalent for Linux hosts):**

```cron
0 3 * * * cd /opt/nexora-v1-g-ide && /usr/bin/pwsh -File infrastructure/backups/backup.ps1 >> infrastructure/backups/cron.log 2>&1
```

(Or run the equivalent `pg_dump ... | gzip` command for a non-container DB.)

**Verification of a scheduled run:** check `backup.log` each morning — a line
`===== Nexora DB backup complete =====` and a fresh file in `output/`.

## 2. Production backups (managed PostgreSQL)

Production runs on a managed provider (Supabase/Neon/RDS-style). The provider
**must** be configured with:

1. **Continuous PITR / automated daily snapshots** (primary).
   - RPO ≤ 24 h is met by the provider's PITR (typically minutes-to-hours).
   - Keep at least 7 days of PITR window; align retention with the NDPA
     retention schedule (see `docs/ndpa.md`).
2. **Regular logical dumps offsite** (secondary / independent-of-provider).
   - Weekly `pg_dump` export pulled to a separate storage (S3-compatible,
     another region/account). Restores must NOT depend only on the provider's
     own console.
3. **Backup access credentials** stored in a secrets manager, with the DB owner
   role reserved for migrations (never baked into app env).

> The `backup.ps1` script targets the compose container. For production,
> replace the `docker exec` layer with the managed provider's `pg_dump`
> equivalent using the connection string from the secrets manager. Do not run
> `backup.ps1` against production.

## 3. Recovery objectives

| Metric | Target | How |
|---|---|---|
| **RPO** | ≤ 24 h (dump tier); minutes for prod (PITR) | daily dumps + managed-PG PITR |
| **RTO** | ≤ 2 h | restore.ps1 against a pre-provisioned Postgres 16; runbook §4; quarterly drills |

## 4. Restore procedure

1. **Stop writers**: stop the API (`node apps/api/dist/main.js`) and any sync
   jobs so no new data lands mid-restore.
2. **Protect current state** (optional but recommended): run `backup.ps1` so the
   pre-restore state exists.
3. **Pick the backup**: newest by default, or pass `-BackupFile` explicitly:
   ```powershell
   # dry run first
   powershell -ExecutionPolicy Bypass -File infrastructure/backups/restore.ps1 -WhatIf

   # real restore (newest)
   powershell -ExecutionPolicy Bypass -File infrastructure/backups/restore.ps1 -Force

   # real restore (specific file)
   powershell -ExecutionPolicy Bypass -File infrastructure/backups/restore.ps1 `
     -BackupFile .\output\nexora-postgres_20260101_030000.sql.gz -Force
   ```
   `restore.ps1` prints destructive-operation warnings, asks you to type
   `restore`, and refuses to run without `-Force`.
4. **Verify** — this is mandatory, not optional:
   - `GET /api/v1/health/database` → `{ database: "connected" }`
   - Row counts: `SELECT count(*) FROM users;` `... teachers` `... attendance_events`
   - One end-to-end login + check-in.
5. **Restart** API + web, confirm a fresh `pnpm db:verify` passes (script owned
   by the infra/db workstream) to confirm schema matches expectations.
6. **Record** the event: what was restored, from which backup, at what time, and
   why — keep it with the audit trail.

## 5. Quarterly restore-drill checklist (Q1…Q4)

"Backups exist" means nothing until a restore has been proven. Do this every
quarter (or before every major release):

- [ ] Restore the **newest** backup into a scratch Postgres 16 container (never
      the live DB).
- [ ] Restore the **oldest retained** backup too (proves retention window works).
- [ ] Verify schema: `pnpm db:verify` passes on the restored DB.
- [ ] Verify data: users / schools / teachers / attendance rows make sense
      (counts vs. pre-backup expectation).
- [ ] Verify RLS: log in as a tenant app role; confirm cross-tenant isolation
      still holds on restored data (run tenant-isolation test suite).
- [ ] Verify one offline sync batch ingests correctly after restore.
- [ ] Time the drill. If restore → healthy took > 2 h, fix the procedure.
- [ ] For production: do one provider-side PITR restore to a point-in-time (e.g.
      T-30 min) into a scratch DB and spot-check.
- [ ] Update this runbook with any friction found; log the drill date + result.

## 6. Failure scenarios & first responses

| Scenario | First response |
|---|---|
| `backup.ps1` fails (container down) | Check `docker ps`; compose up the postgres service; re-run; verify `backup.log` |
| Backup file is tiny/empty | Do NOT restore it. Check pg_dump output; the DB may have been empty or the dump errored |
| Latest dump missing (someone pruned) | Recover from offsite copy / provider PITR; tighten access to `output/` |
| Volume deleted (`docker compose down -v`) | Restore newest dump via `restore.ps1 -Force`; run `pnpm db:migrate` afterward if schema drifted |
| Prod DB corrupted | Fail over to provider PITR at last good timestamp; then re-apply recent dumps if any |

## 7. Related

- `infrastructure/backups/backup.ps1` — dump + retention + offsite copy
- `infrastructure/backups/restore.ps1` — guarded restore
- `infrastructure/backups/backup.log` — run log
- `docs/deployment.md` — deployment & rollback runbook
- `docs/ndpa.md` — data retention schedule (legal alignment)
- `infrastructure/db/**` — migration/verify scripts (owned by the db agent)