# Nexora Smart Edu — Nigeria Data Protection Act (NDPA) 2023 Alignment Plan

> ⚖️ **NOT LEGAL ADVICE.** This document is an engineering/operational alignment
> plan for the Nigeria Data Protection Act 2023 (NDPA) and related NDPC
> regulations/guidance. It does not replace advice from a qualified Nigerian
> data-protection lawyer or your Data Protection Officer (DPO). Engage counsel
> before production launch, especially on lawful-basis choices per school,
> employee-consent procedures, and the retention schedule.
>
> Applicability: NSE processes personal data of teachers/employees (and
> potentially students/minors in future phases) for Nigerian schools. Under the
> NDPA, **the school is a Data Controller** and **Nexora Smart Edu is a Data
> Processor** (and a controller for its own operational data, e.g. account
> administrators). Both carry statutory obligations; both may be required to
> register with the Nigeria Data Protection Commission (NDPC).

---

## 1. Processing inventory (what NSE actually processes)

| Dataset | Examples | Category under NDPA | NSE handling |
|---|---|---|---|
| Identity & HR | name, email, phone, role, school, employment fields | personal data | `users`, `teachers`, `user_roles` tables |
| Attendance | check-in/out events, timestamps, client + server time | personal data (workforce management) | `attendance_events`, `attendance_records` |
| Location (GPS) | lat/lng + accuracy, geofence in/out | personal data (high-risk context) | `attendance_events.latitude/longitude` |
| **Biometric templates** | SHA-256 "pseudo-embedding" of face image (V1 dev adapter); real embeddings later | **sensitive personal data (NDPA §65)** | `biometric_profiles.embedding_hash` — hashes only, never raw images |
| Device identifiers | deviceId, platform | personal data (pseudonymous) | `devices` table |
| Audit trail | login, CRUD, biometric enroll/delete events | personal data (in context of an identifiable user) | `audit_logs` (append-only) |
| Offline queue | PENDING attendance events + GPS on the teacher's device (IndexedDB) | personal data at rest on user devices | `apps/web` local IndexedDB |
| Seed/demo data | `super@nexora.dev` etc. | synthetic — **dev only** | must never reach production |

**High-risk processing trigger:** biometric data + location tracking of staff
→ NDPA-sensitive data + likely DPIA territory. Plan a **DPIA** per deployment
with each school before biometric verification goes live (§8).

---

## 2. Lawful bases

Recommendation per dataset (confirm per school with counsel):

| Processing | Recommended lawful basis | Why / notes |
|---|---|---|
| Basic HR/identity + attendance | Contract necessity / legitimate interests | operation of employment; less impactful, well-noticed |
| **GPS location capture** | **Consent (recommended)** — with opt-out that does not defeat the attendance feature; fallback to manager-attested check-in | location of staff is intrusive; consent + transparency is the cleanest path; make the basis explicit in the privacy notice |
| **Biometric enrollment & verification** | **Explicit consent (recommended)** — granular, freely given, documented, revocable | biometric data is NDPA-sensitive (§65); explicit consent is the safest basis; alternative bases (contract necessity) must be legally tested per school |
| Automated status calculation (attendance status from events) | Contract/legitimate interests + notice; **no purely automated decisions with legal effect** | status feeds reports that managers act on; keep human review path, disclose logic |
| Offline queue on device | Consent-adjacent necessity (same purpose as attendance) | covered by attendance purpose + consent/notice; purge on sync (§5) |
| Admin user accounts (our ops) | Legitimate interests / contract | NSE as controller for its own staff accounts |

**Consent requirements when consent is the basis:**

- **Granular** — one consent per purpose (biometric ≠ GPS ≠ marketing).
- **Freely given** — no detriment for refusing; alternative attendance method
  (e.g., PIN + manager verification) must exist while biometric is in use.
- **Informed** — plain-language notice: what is collected, why, retention,
  rights, who to contact.
- **Documented evidence** — see §3. (V1 has consent-preference stubs
  (`notification_preferences`) but **not** a consent-record module — the
  data-subject/consent module is being added by another agent; wire this plan
  to it.)
- **Revocable** — withdrawal must be as easy as giving consent; on withdrawal,
  delete the biometric profile via `DELETE /biometrics/:teacherId` (deletion
  endpoint exists in the biometric module).

## 3. Consent capture & evidence records

Reference the **data-subject module** being added by the other agent; this plan
sets the requirements it must satisfy:

- **Consent record table** (recommended shape): `data_subject_id`, `purpose`,
  `basis`, `consent_text_version`, `captured_at`, `device_info`,
  `ip_address`, `method` (signed form / portal checkbox / HR attestation),
  `status` (granted/withdrawn), `withdrawn_at`.
- **Version the consent text** — changes to the notice must not retroactively
  invalidate earlier consent; keep the exact text + version in the record.
- **Evidence retention**: keep consent evidence as long as the processing it
  authorizes continues, plus any statutory limitation period (seek counsel;
  expect ≥ 3 years).
- **Enrollment gating**: biometric enrollment must fail closed when no valid
  consent record exists for that school+teacher+purpose.
- **Auditability**: consent grant/withdrawal events are written to the
  append-only audit log (`AUDIT` module) — consistent with existing
  `BIOMETRIC_ENROLLED` / `BIOMETRIC_DELETED` events.

## 4. Data-subject rights (mapped to endpoints)

| NDPA right | NSE mapping | Current state / action |
|---|---|---|
| **Access** (`§34(1)`) | Read endpoints (`/users`, `/teachers`, `/attendance/*`); CSV export on `/reports/*` | ✅ exists for authorized roles. **Gap:** a consolidated subject-access export (all data of one teacher) is needed — deliverable of the data-subject module |
| **Rectification** (`§34(2)`) | `PATCH/PUT /users/:id`, `/teachers/:id` | ✅ exists (RBAC + RLS scoped) |
| **Erasure** (`§34(3)`) | Biometric: `DELETE /biometrics/:teacherId` (hard). Teachers: soft delete (retention-friendly) | ⚠️ **Gap:** hard-erasure endpoint (auth identity + profile) for true erasure requests; soft delete alone is not erasure |
| **Portability** (`§34(4)`) | CSV export endpoints | ⚠️ **Gap:** machine-readable JSON export of the teacher's own data (data-subject module) |
| **Restriction / objection** | Manual ops path via school admin + support | ⚠️ document the process; consent-based processing auto-stops on consent withdrawal |
| **Automated decisions** | Status calculator feeds reports; no public-facing automated decisions | ✅ disclose logic in notice; human review path exists |

**Process:** school (controller) receives the request → NSE (processor) executes
within **1 month** (NDPC guidance) → records the request + outcome in the audit
log. Data-subject module must add request intake, ID verification, and SLA
tracking.

## 5. Data minimization & retention

### Minimization (already designed in)

- **Biometric: DB stores only `embedding_hash` (SHA-256 pseudo-embedding in V1;
  real embedding later) — never raw images.** ✅ per `docs/biometric.md`.
- GPS captured at check-in only; accuracy field allows risk-scoring; no
  continuous background location.
- Offline queue holds only the fields needed for the event; no images.
- Principle: **collect least, keep least, expose least** — applies to every new
  field request.

### Retention schedule (recommended; confirm with school policy + counsel)

| Dataset | Retention | Trigger for deletion | Notes |
|---|---|---|---|
| Attendance events/records | **5 years** (recommended; align to school/legal policy — some Nigerian labour/education record-keeping norms expect multi-year retention) | after retention period, or erasure request if no legal hold | aggregated/reporting may continue on anonymized data |
| Biometric profiles | **12 months post-employment**, or earlier of: erasure request / consent withdrawal / school termination | `DELETE /biometrics/:teacherId` + purge job | sensitive data — shortest defensible period; never indefinite |
| User accounts / teacher profiles | Term of employment + aligned with attendance retention for HR records | termination workflow + erasure endpoint | respect legal holds (litigation, inspection) |
| Audit logs | **2 years** | scheduled purge after 2 years | append-only; only OPS roles can read |
| Refresh tokens | TTL (`JWT_REFRESH_TTL`, 7 days) | rotation/expiry, logout | auto-handled by design |
| Consent records | Duration of processing + limitation period (counsel-advised, expect ≥ 3 y) | after limitation period | evidence of lawful basis — keep longest of these |
| **Offline queue (device IndexedDB)** | **Purged on successful sync** (`SYNCED` → delete locally) | immediate after sync ack; on logout/account wipes | design requirement: do not accumulate attendance+GPS on devices longer than needed; `FAILED` items retained only for retry window (≤ 48 h per server rule), then surfaced, not silently kept |

> Add purge jobs (SQL + scheduled task) for each row above; deletion is a *real*
> `DELETE` (hard), not soft delete, when the retention basis ends. Document each
> purge in the audit log (batch event).

## 6. Security controls mapping (NDPA §46-style accountability)

| NDPA control area | NSE control |
|---|---|
| Confidentiality / access control | RBAC (8 roles, 20 permissions), PostgreSQL RLS tenant isolation, least-privilege `nexora_app` runtime role; app role never runs DDL |
| Integrity | Append-only audit log; signed JWT (HS256, rotated); `SET LOCAL app.school_id` per transaction; server-authoritative timestamps |
| Availability & continuity | Managed-PG PITR + daily dumps (RPO ≤ 24 h, RTO ≤ 2 h — see `BACKUP_RUNBOOK.md`); horizontal API scaling (stateless) |
| Authentication & session security | bcrypt(12), HTTP-only `Secure` cookies, `SameSite=Lax`, refresh rotation, 5-attempt lockout, rate limiting (auth 10/min) |
| Data in transit / at rest | TLS everywhere prod (Cloudflare Full strict + `TRUST_PROXY=true`); managed-PG encryption at rest; secrets in platform env/secrets manager |
| Vulnerability management | `pnpm audit --prod --audit-level high` in CI (security job — fails builds); quarterly restore drills; patch cadence with dependabot-style updates |
| Incident readiness | Breach response runbook (§7), DPO contact, 72 h NDPC notification path |
| Privacy by design | Hashes not images; consent gating for biometrics; data-subject module; DPIA before biometric/global-GPS launch |

## 7. Breach response (31 days of NDPA §30 notice / 72 h regulatory)

The NDPA requires notification to the NDPC **without undue delay (target: within
72 hours)** of a breach compromising personal data, and communication to data
subjects where the breach creates a high risk to their rights.

| Step | Action | Owner |
|---|---|---|
| 1. Detect & contain | stop the bleeding (rotate secrets, kill sessions, revoke tokens, snapshot evidence, take affected service offline if needed) | on-call engineer |
| 2. Assess | scope: datasets (biometric/GPS/HR?), records affected, root cause, risk to subjects | DPO + engineering lead |
| 3. Notify NDPC | within 72 h: nature, categories + approximate numbers, likely consequences, measures taken; update as facts solidify | DPO / counsel |
| 4. Notify subjects | if high risk: plain-language notice with what happened, what they can do; coordinate with school (controller) — schools are the primary contact with teachers | DPO + school contact |
| 5. Remediate | fix root cause, add monitoring, run post-incident review | engineering |
| 6. Record | incident register: timeline, decisions, notifications, evidence (retain per audit policy; privileged legal review) | DPO |

**In production, NSE must have**: a named incident contact reachable 24/7, the
school's incident point of contact per tenant, and a template notice (subject
facing) pre-drafted.

## 8. DPO & organizational measures

- **Appoint a DPO** (NSE and/or the school; NDPA requires/encourages DPO for
  higher-risk processing; counsel to confirm statutory specifics for
  controllers of major importance).
- DPO responsibilities here: lawful-basis sign-off per school, DPIA ownership,
  breach notification, data-subject request oversight, processor/vendor review.
- **DPIA before launch** of: biometric verification (real provider), GPS-based
  attendance at scale, any student/minor data (future phases) — minors' data
  requires heightened care (parental consent where applicable) and is **not** in
  V1 scope.
- **Training & accountability**: runbook → internal team; keep a control
  register mapping the §6 table to evidence (configs, tests, drill logs).

## 9. Vendors & DPAs (processor chain)

NSE (processor for the school) engages subprocessors — each needs a DPA with
NSE and alignment with the school's DPA:

| Vendor | Role | Data touched | Action |
|---|---|---|---|
| Vercel / Railway / Render / Fly | hosting | app code, logs, cookies | DPA; region choice; log retention limit |
| Supabase / Neon (managed PG) | database | **all personal data incl. biometric hashes** | DPA; encryption; PITR; region choice (consider data-residency expectations) |
| Cloudflare | DNS/CDN/WAF | request metadata | DPA available; proxy data only |
| Sentry (optional) | error monitoring | stack/request context — **configure PII scrubbing** | DPA; strip biometric/location before it leaves the API |
| Email/SMS provider (future) | notifications | email/phone | DPA before wiring |
| AI/OCR providers (future biometric engine) | template extraction | face images in flight | **not in V1**; require DPA + no training on data before use |

**Processor terms**: make standard NSE processor terms (Article 28-style)
available to schools covering: instructions, confidentiality, security
measures, subprocessor authorization, assistance with subject rights/breaches,
deletion on termination.

## 10. Pre-launch compliance checklist

- [ ] Lawful basis per dataset documented for **each** school contract (consent
      for biometric + GPS recommended).
- [ ] Consent module live: capture, evidence records, withdrawal, enrollment
      gating (data-subject module — owner: other agent).
- [ ] Privacy notice (school-facing + teacher-facing) written in plain English,
      versioned, linked from login/enrollment.
- [ ] Retention jobs implemented (attendance 5 y, biometric 12 mo / erasure,
      audit 2 y, offline queue purge on sync) + documented.
- [ ] Erasure + portability endpoints exist and are tested (data-subject module).
- [ ] Security baseline: CI audit job green, RLS tenant-isolation tests passing,
      TLS/TRUST_PROXY/cookie config verified in staging.
- [ ] DPIA reviewed by DPO/counsel (biometric + GPS processing).
- [ ] DPO contact published + incident runbook rehearsed (tabletop).
- [ ] Vendor DPAs in place (hosting, DB, CDN, error monitoring).
- [ ] Demo/seed accounts absent from production; `BIOMETRIC_PROVIDER` is not
      `dev` in prod.
- [ ] Breach templates drafted (NDPC 72 h + data-subject notice).

## 11. Related

- `docs/deployment.md` — env matrix, security controls in deployment context
- `docs/security.md` — technical security architecture
- `docs/biometric.md` — biometric data handling (hashes only)
- `docs/offline_sync.md` — offline queue lifecycle (purge on sync)
- `infrastructure/backups/BACKUP_RUNBOOK.md` — retention/DR alignment
- Data-subject/consent module (being added by another agent — reference it in
  tests and dashboards)