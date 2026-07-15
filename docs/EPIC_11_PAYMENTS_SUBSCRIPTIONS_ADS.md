# EPIC 11 — Payments, Subscription, Commission & Advertisements

**Tickets:** XFY-052 … XFY-058  
**Status:** Implemented (MVP gateway + manual admin tracking)

## Scope

| Ticket | Feature |
|--------|---------|
| XFY-052 | Transaction ledger (booking/request payments, fees, tax, commission) |
| XFY-053 | Admin manual payment status / reference tracking |
| XFY-054 | PaymentService abstraction + mock gateway, webhook, receipts |
| XFY-055 | SubscriptionPlan + UserSubscription models & APIs |
| XFY-056 | Pricing page + subscription dashboard UI |
| XFY-057 | CommissionService (flat / % / plan / admin override) + revenue reports |
| XFY-058 | Advertisement placement, moderation, impression/click analytics |

## Architecture

- **Shared DB** (`lib/db/src/schema/payments.ts`) + SQL migration `lib/db/migrations/0011_epic11_payments.sql`
- **API server** (`artifacts/api-server`): transactions, admin-transactions, payments, subscriptions, advertisements, commissions
- **Next.js** (`artifacts/nextjs-app`): mirrored `/api/*` routes for marketplace UI
- **PaymentGateway** interface with `MockPaymentGateway` (HMAC webhook). Swap via `PAYMENT_PROVIDER` without changing callers.
- Env: `PAYMENT_WEBHOOK_SECRET`, `APP_URL`, optional `ALLOW_MOCK_PAYMENTS`

## Key APIs

- `POST/GET /api/transactions`, `GET/PUT /api/transactions/:id`
- `GET /api/admin/transactions`, `PATCH .../status|reference|commission`
- `POST /api/payments/checkout`, `POST /api/payments/webhook`, `GET /api/payments/:transactionId[/receipt]`
- `CRUD /api/admin/subscription-plans`, `GET /api/subscription-plans`, `POST /api/subscriptions`, `GET /api/subscriptions/me`
- `POST /api/commissions/calculate`, `GET /api/admin/reports/revenue`
- Advertisement CRUD + `/impression` + `/click` + admin approve/reject/pause/resume

## Frontend

- `/pricing` — plan comparison & purchase
- `/dashboard/subscription` — current plan / history / cancel
- `/dashboard/payments` — user payment timeline + checkout
- `/admin/transactions` — manual status & references
- `/dashboard/ads` — create ads + admin moderation
- `SponsoredAds` component for homepage / search injection

## Business rules

- Amounts must be positive; currency required; statuses validated
- Only admin may manually update payment status; each update writes audit + notifications
- Webhooks verify HMAC signature; event IDs are idempotent
- Never store card/CVV/PIN — provider tokens/session IDs only
- Only ACTIVE subscription plans are purchasable; expired subs auto-downgrade
- Commission = admin override → active plan → platform default
- Ads expire automatically; clicks/impressions deduped per visitor hash

## Security & audit

RBAC on every endpoint, HTML escape on user text, upload/URL allowlists for ad images, audit actions for create/status/webhook/refund/subscription/commission/ad moderation.
