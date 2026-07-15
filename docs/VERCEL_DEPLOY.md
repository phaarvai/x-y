# Deploy X!Y to Vercel

## GitHub

1. Push this repo to GitHub (see README Quick start / Agent push).
2. Connect the repo in the Vercel dashboard.

## Vercel project settings (required)

| Setting | Value |
|--------|--------|
| **Root Directory** | `artifacts/nextjs-app` |
| **Framework** | Next.js |
| **Install Command** | `cd ../.. && pnpm install --no-frozen-lockfile` |
| **Build Command** | `cd ../.. && pnpm --filter @workspace/nextjs-app run build` |
| **Package Manager** | pnpm |
| **Node.js** | 20.x or 22.x |

Leave **Output Directory** empty (Next.js manages it).

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | **Required.** Hosted Postgres URL (Neon, Supabase, or Vercel Postgres). Must not be localhost. |
| `SESSION_SECRET` | Long random string (32+ chars) — already set on `x-y--main` |
| `APP_ENV` | `production` — already set |
| `NODE_ENV` | `production` — already set |
| `NEXT_PUBLIC_BASE_PATH` | *(leave empty for `*.vercel.app`)* |
| `STORAGE_PROVIDER` | `local` for MVP, or `s3`/`gcs`/`azure` when configured |
| `FF_FILE_UPLOADS` | `true` |
| `FF_AUDIT_API` | `true` |

## Live production URL

After deploy: **https://x-y-main.vercel.app**

## Database after first deploy

Without `DATABASE_URL`, the UI may load but **login/register/API routes will fail**. Add a hosted Postgres URL, then from your machine:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db migrate
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db seed
```

## Common failures

- **Wrong app / SPA rewrites** — Root Directory must be `artifacts/nextjs-app`, not repo root defaults for `main-app`.
- **`Use pnpm instead`** — Enable pnpm; do not let Vercel use npm.
- **DB connection errors at runtime** — Set a real hosted `DATABASE_URL` and run migrations.
- **404 assets** — Do not set `NEXT_PUBLIC_BASE_PATH=/x-y` unless you intentionally deploy under a subpath.
