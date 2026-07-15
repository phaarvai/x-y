# X!Y – The Explorer Factory / AssistAI Workspace

## Overview

This pnpm monorepo contains two products:

1. **X!Y – The Explorer Factory** (`artifacts/nextjs-app/`) — A B2B manufacturing marketplace built with Next.js 15 (App Router) + TypeScript + Tailwind CSS v3. Fully serverless-ready for Vercel. Connects manufacturers, innovators, and investors.

2. **AssistAI** (`artifacts/main-app/` + `artifacts/api-server/`) — A full-stack AI assistant web app with voice search, multilingual support, and user authentication.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9

### X!Y Next.js App (`artifacts/nextjs-app/`)
- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v3 (PostCSS approach)
- **DB**: Drizzle ORM + `postgres` package (serverless-safe: max:1, idle_timeout:20)
- **Auth**: localStorage token `xiy_token`, React Context + React Query for `/api/auth/me`
- **Password hashing**: `sha256(password + SESSION_SECRET)`
- **Port**: 19344 (dev)
- **Preview path**: `/nextjs-app/`
- **Base path**: `NEXT_BASE_PATH=/nextjs-app` (Replit), empty for Vercel
- **Routing**: All client fetch calls use `apiUrl()` helper from `lib/api-url.ts`

### AssistAI (`artifacts/main-app/` + `artifacts/api-server/`)
- **Frontend**: React + Vite — port from `PORT` env
- **API server**: Express 5 — port 8080
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at lib/api-spec)
- **UI Components**: shadcn/ui + Tailwind CSS v4
- **Routing**: Wouter
- **State/data**: TanStack React Query

## Application Structure

```
artifacts/nextjs-app/       # X!Y Next.js 15 app (previewPath: /nextjs-app/)
  app/                      # Next.js App Router pages + API routes
  components/               # React components (Navbar, XiyLogo, ui/*)
  hooks/                    # use-auth.tsx, use-toast.ts
  lib/                      # db.ts, schema.ts, utils.ts, manufacturers.ts, api-url.ts
  next.config.ts            # basePath config
  tailwind.config.ts        # Tailwind v3 config
  postcss.config.mjs        # PostCSS config
artifacts/main-app/         # AssistAI React+Vite frontend (previewPath: /)
artifacts/api-server/       # AssistAI Express API server (previewPath: /api)
lib/api-spec/               # OpenAPI spec + codegen config
lib/api-client-react/       # Generated React Query hooks
lib/api-zod/                # Generated Zod schemas
lib/db/                     # Drizzle ORM schema + DB client
```

## X!Y Pages

| Path | Description |
|------|-------------|
| `/` | Home — hero, how it works, stakeholder sections |
| `/browse` | Browse manufacturers with filters |
| `/manufacturer/[id]` | Manufacturer detail + machine listing |
| `/booking/[manufacturerId]/[machineId]` | Booking form |
| `/booking-confirmation` | Booking confirmation |
| `/ai-assistant` | AI manufacturing assistant chat |
| `/login` | Login page |
| `/register` | Register page |
| `/for-business` | Landing for manufacturers to list their factory |
| `/provider-setup` | Manufacturer onboarding form |

## X!Y API Routes

| Path | Method | Description |
|------|--------|-------------|
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/me` | GET | Get current user |
| `/api/healthz` | GET | Health check |

## X!Y Database Schema

- `users` — id, name, email, password_hash, preferred_language, created_at, updated_at
- `sessions` — id, user_id, token, created_at, expires_at

## AssistAI Database Schema

- `users` — id, name, email, password_hash, preferred_language, created_at
- `sessions` — id, user_id, token, expires_at, created_at
- `conversations` — id, user_id, title, language, is_voice, message_count, created_at, updated_at
- `messages` — id, conversation_id, role, content, is_voice, created_at

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/nextjs-app run dev` — run X!Y Next.js app
- `pnpm --filter @workspace/nextjs-app run build` — production build
- `pnpm --filter @workspace/nextjs-app run typecheck` — typecheck X!Y app
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Vercel Deployment Notes (X!Y)

For Vercel deployment, set these env vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — secret for password hashing
- `NEXT_BASE_PATH` — leave empty (no basePath on Vercel)
- `NEXT_PUBLIC_BASE_PATH` — leave empty

For Replit:
- `NEXT_BASE_PATH=/nextjs-app`
- `NEXT_PUBLIC_BASE_PATH=/nextjs-app`
- `PORT=19344`
