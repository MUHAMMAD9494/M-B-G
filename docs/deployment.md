# Nexora Smart Edu — Deployment

## Local development

```bash
pnpm install

# 1. Start PostgreSQL
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# 2. Environment
cp .env.example .env          # then edit secrets for production

# 3. Migrate + seed
psql "postgres://nexora:***@localhost:5433/nexora" \
  -f apps/api/src/database/migrations/V1__initial_schema.sql
pnpm db:seed

# 4. Run
pnpm dev                       # API (4000) + Web (3000)
```

## Environment variables

| Variable | Description | Default (dev) |
|----------|-------------|---------------|
| `NODE_ENV` | `development` \| `production` | `development` |
| `DATABASE_URL` | PostgreSQL URL | dev fallback |
| `JWT_SECRET` | Access-token signing key | dev fallback |
| `JWT_REFRESH_SECRET` | (reserved) | dev fallback |
| `JWT_ACCESS_TTL` | Access token seconds | `900` |
| `JWT_REFRESH_TTL` | Refresh token seconds | `604800` |
| `API_PORT` | API listen port | `4000` |
| `API_PREFIX` | Global prefix | `api` |
| `CORS_ORIGIN` | Allowed origin(s) | `http://localhost:3000` |
| `TRUST_PROXY` | Trust reverse-proxy headers | `false` |

## Production build

```bash
pnpm -r build          # builds packages → api → web
NODE_ENV=production node apps/api/dist/main.js   # API
pnpm --filter @nexora/web start                   # Web (Next.js)
```

The API is stateless (sessions are JWT/cookie + DB-backed refresh tokens), so it
scales horizontally behind a load balancer. PostgreSQL is the single source of
truth.

## Health checks

- `GET /api/v1/health` → `{ status: "ok" }`
- `GET /api/v1/health/database` → `{ database: "connected" }`

## Production checklist

1. Set strong `JWT_SECRET` / `JWT_REFRESH_SECRET`.
2. Use managed PostgreSQL with backups; run migrations as the DB owner.
3. Terminate TLS at a reverse proxy (nginx/ALB) and set `TRUST_PROXY=true`.
4. Restrict `CORS_ORIGIN` to the real web origin.
5. Replace `DevBiometricProvider` with a real provider before enabling face
   verification.
6. Enable `secure: true` cookies (automatic when `NODE_ENV=production`).
