# X!Y Developer Guide — EPIC 17

## Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL 14+

## Environment setup

1. Copy examples (never commit real secrets):

```bash
cp .env.example .env
cp artifacts/nextjs-app/.env.example artifacts/nextjs-app/.env.local
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

2. Required secrets:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Password hashing / signed local download URLs |
| `PORT` | api-server listen port (required for Express) |
| `CORS_ORIGINS` | Comma-separated origins or `*` |
| `STORAGE_PROVIDER` | `local` \| `s3` \| `azure` \| `gcs` |
| `STORAGE_LOCAL_PATH` | Local upload directory (MVP) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Sample admin (seed only) |

## Local development

```bash
pnpm install
pnpm --filter @workspace/db migrate
pnpm --filter @workspace/db seed

# Express API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Next.js X!Y app
pnpm --filter @workspace/nextjs-app run dev
```

## Database: migrations

Hand-written SQL migrations in `lib/db/migrations/`.

```bash
pnpm --filter @workspace/db migrate           # apply pending + repeatable
pnpm --filter @workspace/db migrate:status    # show applied/pending
pnpm --filter @workspace/db migrate:rollback  # rollback last (requires .down.sql)
pnpm --filter @workspace/db migrate:repeatable
pnpm --filter @workspace/db push              # drizzle-kit push (dev only)
```

Rollback for EPIC 17:

```bash
pnpm --filter @workspace/db migrate:rollback
# executes 0017_epic17_infrastructure.down.sql
```

## Seeding

```bash
pnpm --filter @workspace/db seed
```

Seeds:

- Platform roles (Admin, Manufacturer, Visionary, Vendor, Labor Supplier, Logistics, Legal, Investor, Market Lead)
- Permissions (view/create/update/delete/approve/moderate/export/manage_*)
- Categories (Industries, Machinery, Services, Raw Materials)
- Sample admin (`admin@explorerfactory.local` by default — change password immediately)

## API versioning & health

| Endpoint | Description |
|----------|-------------|
| `GET /api/healthz` | Legacy health |
| `GET /api/livez` | Liveness |
| `GET /api/readyz` | Readiness (DB) |
| `GET /api/v1/health` | Versioned health |
| `GET /api/v1/system` | System info |
| `GET /api/docs` | Swagger UI |
| `GET /api/openapi.json` | OpenAPI 3.1 spec |

## Files (XFY-086)

```
POST   /api/files/upload     JSON { fileBase64, fileName, mimeType, ... }
GET    /api/files/:id        metadata + download URL
DELETE /api/files/:id        soft-delete + remove blob
```

Also available under `/api/v1/files/*`.

Allowed: images, PDF, DOC/DOCX, XLSX, ZIP. Max size: `UPLOAD_MAX_BYTES` (default 10MB). Malware scanning is pluggable (`NoopMalwareScanner` by default).

## RBAC (XFY-087)

- Admin console RBAC: existing `admin-rbac` modules.
- Marketplace: `middlewares/rbac.ts` / `lib/platform-rbac.ts`.
- Unauthorized → **HTTP 403**.
- Ownership helpers reject non-owners; confidential resources need explicit auth.

## Audit logs (XFY-088)

```
GET /api/admin/audit-logs
GET /api/admin/audit-logs/:id
```

Filters: `userId`, `entityType`, `entityId`, `action`, `from`, `to`, pagination.

## Security

- CORS, rate limiting, security headers, compression hooks
- Input validation via Zod
- Output HTML escaping helper (`escapeHtml`)
- Parameterized SQL via Drizzle (SQLi prevention)
- Secrets via environment only

## Observability

- Structured logging (Pino on api-server)
- `X-Request-Id` tracing
- Metrics / job / cache / Sentry hooks in `lib/observability.ts`
- Health / ready / live probes for orchestration

## Testing

```bash
pnpm exec tsx artifacts/api-server/src/lib/admin-permissions.test.ts
pnpm exec tsx artifacts/api-server/src/lib/epic17.test.ts
pnpm exec tsx artifacts/nextjs-app/lib/analytics-utils.test.ts
pnpm run typecheck
```

## CI/CD (XFY-090)

Workflow: `.github/workflows/ci.yml`

Pipeline: Lint/typecheck → Unit tests → Build → Security checks → Migration check → Staging (auto on `develop`) → Production (approval environment).

**Fail on:** lint errors, failed tests, build failures, missing migration artifacts.

Production secrets live in GitHub Environments — never commit credentials.

## Coding standards

- pnpm workspaces; do not use npm/yarn
- Preserve existing APIs; prefer additive changes
- Validate inputs; return correct HTTP status codes
- Prefer small, focused modules (controllers/routes → services → repositories/db)
- Document new env vars in `.env.example`

## Frontend foundation (XFY-083)

Location: `artifacts/nextjs-app`

- UI: `components/ui/*` (barrel: `components/ui/index.ts`)
- Layouts: `components/layouts/*`
- Guards: `components/auth/ProtectedRoute.tsx`, `RoleGuard.tsx`
- Errors: `/403`, `not-found`, `error.tsx`
- Config: `lib/config/env.ts`, `lib/routes/guards.ts`
