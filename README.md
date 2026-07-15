# X!Y / AssistAI Workspace

pnpm monorepo for **X!Y – The Explorer Factory** (`artifacts/nextjs-app`) and AssistAI (`artifacts/main-app` + `artifacts/api-server`).

## Quick start

```bash
pnpm install
cp .env.example .env
# set DATABASE_URL and SESSION_SECRET

pnpm --filter @workspace/db migrate
pnpm --filter @workspace/db seed

PORT=8080 pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/nextjs-app run dev
```

API docs (when api-server is running): [http://localhost:8080/api/docs](http://localhost:8080/api/docs)

## Deploy (Vercel)

Deploy the X!Y Next.js app from `artifacts/nextjs-app`. See **[docs/VERCEL_DEPLOY.md](./docs/VERCEL_DEPLOY.md)** for Root Directory, install/build commands, and required env vars (`DATABASE_URL`, `SESSION_SECRET`).

## Documentation

- [Vercel deploy](./docs/VERCEL_DEPLOY.md) — GitHub → Vercel settings for this monorepo
- [MVP acceptance report](./docs/MVP_ACCEPTANCE_REPORT.md) — release gate results (`node scripts/mvp-acceptance.mjs`)
- [Definition of Done](./docs/DEFINITION_OF_DONE.md) — mandatory checklist before Done/merge (`pnpm run dod:check`)
- [EPIC 17 overview](./docs/EPIC_17_DATA_ARCHITECTURE_INFRASTRUCTURE.md)
- [EPIC 17 developer guide](./docs/EPIC_17_DEVELOPER_GUIDE.md) — migrations, seeding, security, CI/CD
- [MVP implementation](./docs/MVP_IMPLEMENTATION.md) — manufacturer ↔ visionary marketplace loop
- [NFR platform standards](./docs/NFR_PLATFORM.md)
- [Persona workflows](./docs/PERSONA_WORKFLOWS.md)
- [replit.md](./replit.md) — stack notes

## Packages

| Package | Role |
|---------|------|
| `@workspace/nextjs-app` | X!Y Next.js 15 app + BFF APIs |
| `@workspace/api-server` | Express 5 API |
| `@workspace/db` | Drizzle schema, migrate, seed |
| `@workspace/api-spec` | OpenAPI + Orval codegen |

## Environments

Supports **development**, **staging**, and **production** via `APP_ENV` / `NODE_ENV` and environment-specific secrets (see `.env.example`).
