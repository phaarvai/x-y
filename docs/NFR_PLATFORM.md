# Non-Functional Requirements (Platform Standards)

Enterprise NFR layer for X!Y — security, performance, reliability, usability, scalability, and observability. Additive and backward-compatible.

## Migration

Apply `lib/db/migrations/0020_nfr_platform.sql`:

- `auth_tokens` — password reset, email verify, OTP (hashed secrets only)
- `background_jobs` — async notifications / email / image / analytics
- `file_derivatives` — thumbnails / optimized variants
- User prefs: `email_verified_at`, currency/country/region/city
- Unique partial index on availability slots (double-booking prevention)
- Search/listing indexes
- Taxonomy seed rows (MACHINERY, INDUSTRY, CERTIFICATION, CURRENCY)

## Security

| Control | Implementation |
|---|---|
| Password hashing | **scrypt** (`lib/password.ts`) with lazy upgrade from legacy SHA-256 on login |
| Password policy | min 8, upper+lower+digit (`validatePasswordPolicy`) |
| Reset / verify / OTP | `/api/auth/forgot-password`, `/reset-password`, `/verify-email` |
| Sessions | Opaque Bearer tokens in `sessions` (unchanged); reset invalidates sessions |
| Rate limits | Named buckets: login, register, reset, OTP, upload, messaging, search, payment |
| Headers | Middleware + API-server Helmet-like headers |
| Confidential files | Owner/admin-only download via `getOwnedFile`; confidential cannot be public |
| Payments | No card PAN storage; provider refs only (PCI outsourced) |
| Admin audit | Existing `writeAuditLog` / `logAdminAction` |

## Performance

- Search returns `X-Response-Time-Ms` / `Server-Timing`
- Pagination + indexed filters
- DB pool via `DB_POOL_MAX` (Next.js `lib/db.ts`)
- Image pipeline queues `PROCESS_IMAGE` jobs; `sharp` optional for WebP thumbnails
- Taxonomy-driven machine types on Browse (`/api/taxonomy`)

## Reliability

- Request **accept** wrapped in `db.transaction` with optimistic status guard → **409** on race
- Slot unique index prevents overlapping active bookings
- Payment webhook idempotency (existing `payment_webhook_events`)
- Background job table with idempotency keys
- Consistent `{ error, code? }` API errors (`lib/api-errors.ts`)

## Usability

- `FormField` — labels, hints, errors, counters, ARIA
- `useDraftAutosave` — localStorage draft + optional remote save
- Responsive layouts preserved via existing Tailwind breakpoints

## Scalability

- Public `/api/taxonomy?type=MACHINERY|INDUSTRY|...`
- Generic `service_provider_profiles` model (unchanged) for all provider types
- Multi-region / multi-currency user preference columns

## Observability

- Existing `/livez`, `/readyz`, `/api/v1/*`, pino, metrics hooks
- Search timing headers for monitoring

## Tests

```bash
node --experimental-strip-types artifacts/nextjs-app/lib/nfr.test.ts
pnpm --filter @workspace/api-server exec tsx ./src/lib/nfr.test.ts
```

## Auth compatibility notes

- Existing SHA-256 password hashes still verify and are **rehashed to scrypt on successful login**.
- New registrations always store scrypt hashes.
- Registration password minimum is now **8 characters** with complexity rules (breaking only for weak passwords that already failed soft policies).
