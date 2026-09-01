# NEXORA Smart Edu — Privacy Policy (NDPA 2023 aligned)

> Status: **Product-level privacy notice template**. Each school (data controller)
> MUST adapt and publish this under its own name; NEXORA operates as processor.
> This document is not legal advice — obtain NDPC counsel review before go-live
> (see `docs/ndpa.md` for the full compliance mapping).

## 1. Who we are

NEXORA Smart Edu is a teacher attendance and workforce management platform
("the Service") operated by NEXORA. Schools subscribe as independent **data
controllers**; NEXORA processes personal data on their behalf as a **data
processor** under a Data Processing Agreement.

## 2. What we process

| Category | Data | Purpose | Legal basis |
|---|---|---|---|
| Identity | name, email, phone, employee ID | account, HR records | contract / legitimate interest |
| Attendance | check-in/out events, GPS coordinates, timestamps | accurate attendance records | contract; employer lawful basis |
| Biometric | face-verification frames (processed, not stored as images), liveness outcome, embedding hash (metadata only) | identity verification / anti-fraud | **explicit consent** (NDPA §2.2(1)(a)); biometric data = sensitive data |
| Device | deviceId (UUID), approximate location accuracy | offline queue correlation, security | legitimate interest / consent |
| Consent records | who, when, which version of policy | accountability (NDPA §2.2) | legal obligation |

We do **not** process special categories beyond face biometrics, and we never sell data.

## 3. Consent

- Explicit, specific, informed consent is captured **before** biometric enrollment;
  the receipt (subject, timestamp, policy version) is stored in `system_settings`
  and is exportable via the data-subject flow.
- Consent may be withdrawn at any time via `POST /data-subject/erasure` or by
  contacting the school. Withdrawal of biometric consent pauses biometric
  verification; alternative clock-in controls (e.g., PIN/deferred GPS) apply per
  school policy.
- Offline events: clock-in during connectivity loss is informed at capture time
  and events are tagged for deferred verification.

## 4. Retention

| Data | Retention |
|---|---|
| Attendance records | 5 years after the record (statutory payroll/HR norms) |
| Biometric verification metadata | 12 months after employment ends, or on subject erasure |
| Audit logs | 2 years |
| Consent receipts | 6 years (accountability) |
| Offline queue | purged automatically once synced and acknowledged |

## 5. Your rights (NDPA §34–35)

- **Access**: `GET /data-subject/export` returns the subject's full bundle (JSON, v1.0)
  excluding passwords and biometric images.
- **Rectification**: profile fields editable by the school admin (PATCH user/teacher).
- **Erasure**: `POST /data-subject/erasure` anonymizes the account, deletes biometric
  profiles and refresh tokens, records an erasure receipt, and blocks future login.
- **Portability / restriction / objection**: via the school (controller); NEXORA
  supports exports and provides the deletion flows above.

## 6. Security (NDPA §46 safeguards)

Transport TLS 1.2+, at-rest encryption on managed Postgres, bcrypt(12) password
hashing, httpOnly cookies + rotating refresh tokens, per-tenant row-level security
enforced at the database, audited admin actions, request tracing with IDs, and
rate limiting. Biometric images are never stored; only liveness results/embeddings
metadata are retained.

## 7. Data sharing & processors

School data is processed only under controller instructions. Sub-processors
(hosting, CDN, database, monitoring) are listed in the Data Processing Agreement;
each is bound by NDPA-compliant terms. No cross-border transfer occurs without
adequate safeguards.

## 8. Breach handling

Suspected breaches: notify the school controller immediately; NEXORA assists with
the **72-hour NDPC notification** and individual notification where high risk
(NDPA §31). Runbook and contact channels are maintained by the operator.

## 9. Contact

Data Protection Officer contact and the school's privacy contact: to be completed
by the school at go-live. See `docs/ndpa.md` for the full control mapping and the
pre-launch checklist.