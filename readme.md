# Nexora Smart Edu (NSE) V1

Multi-tenant teacher attendance & workforce management platform.
Designed for Nigerian schools, extensible across Africa.

> ⚠️ **PRODUCTION-READINESS WARNING**
>
> - **Demo credentials are DEVELOPMENT-ONLY.** `super@nexora.dev`,
>   `admin@nexorademo.edu.ng`, etc. exist only in seed/dev data. Create fresh,
>   per-school accounts with strong secrets in production — never reuse demo
>   creds or dev `.env` values.
> - **Biometric verification is DEV-ONLY.** The `DevBiometricProvider`
>   (SHA-256 pseudo-embedding) is a plumbing stand-in, **not** face
>   recognition, and is **hard-blocked for production** — a real provider must
>   be integrated and `BIOMETRIC_PROVIDER` set accordingly. See
>   [docs/biometric.md](docs/biometric.md).
> - **CI requires committing the working tree.** GitHub Actions runs on the
>   *committed* tree (not your local working tree). If you validate locally
>   with uncommitted changes (e.g. `apps/web/next.config.js` vs the committed
>   `next.config.mjs`), CI will not match — commit first; the mainline will not
>   push for you.
> - **Before go-live** read the [deployment runbook](docs/deployment.md)
>   (DNS/TLS, cookie domain, env matrix, migrations, rollback, monitoring) and
>   the [Nigeria Data Protection Act 2023 alignment plan](docs/ndpa.md)
>   (consent, retention, data-subject rights, breach response).
> - **Rename the generic remote.** If this repo was cloned from a boilerplate
>   remote (e.g. `origin` pointing at a template), rename/update it to the real
>   project repository before pushing anything sensitive.

## Architecture

- **Backend**: NestJS modular monolith, TypeScript, PostgreSQL 16, TypeORM
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, IndexedDB offline-first
- **Monorepo**: pnpm workspaces (`apps/api`, `apps/web`, `packages/*`)
- **Multi-tenancy**: PostgreSQL RLS via `nexora_app` least-privilege role + `SET LOCAL app.school_id`
- **Auth**: JWT (HTTP-only cookies + Bearer fallback), refresh rotation, bcrypt hashing

## Prerequisites

- Node.js >= 20
- pnpm 9
- Docker (for PostgreSQL)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd nexora-v1-g-ide
pnpm install

# 2. Start PostgreSQL
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# 3. Create .env from example
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET for production

# 4. Run migration
postgres://<user>:<password>@<host>:<port>/<database>

# 5. Seed demo data
pnpm db:seed

# 6. Start development servers
pnpm dev
```

API runs at http://localhost:4000 (Swagger at /api/docs)
Web runs at http://localhost:3000

## Demo Credentials

> ⚠️ These are placeholder credentials for local development only.
> Change them before any shared or production environment.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@nexora.dev | *(set in your `.env`)* |
| School Admin | admin@nexorademo.edu.ng | *(set in your `.env`)* |
| Teacher | ibrahim@nexorademo.edu.ng | *(set in your `.env`)* |

## Commands

```bash
pnpm dev              # Start both API + Web in watch mode
pnpm build            # Build all packages
pnpm lint             # ESLint across all packages
pnpm typecheck        # TypeScript type checking
pnpm test             # Unit + integration tests
pnpm test:e2e         # E2E tests (requires running DB)
pnpm db:migrate        # Run pending migrations
pnpm db:seed          # Seed demo data
```

## API Modules

| Module | Path | Description |
|--------|------|-------------|
| Auth | /api/v1/auth/* | Login, logout, refresh, password change |
| Users | /api/v1/users/* | User CRUD (tenant-scoped) |
| Schools | /api/v1/schools/* | School config (own school only) |
| Branches | /api/v1/branches/* | Branch/campus management |
| Teachers | /api/v1/teachers/* | Teacher profiles and assignments |
| Attendance | /api/v1/attendance/* | Check-in/out, offline sync, corrections |
| Geofences | /api/v1/geofences/* | Geofence configuration |
| Biometrics | /api/v1/biometrics/* | Enrollment/verification (dev adapter) |
| Devices | /api/v1/devices/* | Device registration |
| Reports | /api/v1/reports/* | Daily/weekly/monthly reports, CSV export |
| Audit | /api/v1/audit/* | Audit log viewer |
| Settings | /api/v1/settings/* | System settings key-value |
| Health | /api/health | Liveness + DB connectivity |

## Project Structure

```
nexora-v1-g-ide/
├── apps/
│   ├── api/                  # NestJS backend
│   │   └── src/
│   │       ├── auth/          # Authentication
│   │       ├── users/         # User management
│   │       ├── schools/       # School config
│   │       ├── branches/      # Branch/campus
│   │       ├── teachers/      # Teacher profiles
│   │       ├── attendance/    # Core attendance
│   │       ├── geofencing/    # GPS + geofence
│   │       ├── biometric/     # Biometric abstraction
│   │       ├── devices/       # Device management
│   │       ├── reports/       # Reporting + CSV
│   │       ├── audit/         # Audit logging
│   │       ├── settings/      # System settings
│   │       ├── health/        # Health checks
│   │       ├── notifications/ # Notification preferences
│   │       ├── common/        # Guards, decorators, filters
│   │       ├── entities/      # 16 TypeORM entities
│   │       └── database/      # Migration + seed
│   └── web/                  # Next.js 14 frontend
├── packages/
│   ├── types/                # Shared enums + interfaces
│   ├── config/               # Shared config
│   ├── utils/                # Shared utilities
│   └── validation/           # Shared validation schemas
├── infrastructure/
│   └── docker/
│       └── docker-compose.dev.yml
├── docs/                     # Architecture, API, Security, etc.
├── .github/workflows/        # CI pipeline
└── .env.example             # Environment template
```

## Security

- RBAC with 8 roles and 19 granular permissions
- PostgreSQL RLS with least-privilege `nexora_app` role
- JWT access/refresh tokens with rotation
- HTTP-only, SameSite=Lax, Secure cookies
- Rate limiting (10/min auth, 300/min standard)
- bcryptjs password hashing (12 rounds)
- Helmet security headers
- CORS configuration
- Append-only audit logging
- Biometric data privacy by design

See [docs/SECURITY.md](docs/SECURITY.md) for full details.

## Testing

```bash
pnpm test             # Unit + integration tests
pnpm test:e2e         # E2E tests
```

Critical: tenant isolation security test must pass before any release.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Offline Sync](docs/OFFLINE_SYNC.md)
- [Biometric Architecture](docs/BIOMETRIC.md)
- [Testing](docs/TESTING.md)

## Known Limitations (V1)

- Biometric verification uses a dev-only SHA-256 adapter (not production biometrics)
- No PostGIS (uses haversine distance; schema is migration-ready for PostGIS)
- Redis is not used in V1
- No email/SMS/push notification delivery (preferences stored, architecture ready)
- Frontend is built as a parallel subagent deliverable

## License

Private — all rights reserved.