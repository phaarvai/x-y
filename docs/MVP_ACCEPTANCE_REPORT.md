# MVP Acceptance Test Report — X!Y The Explorer Factory

**Report date:** 2026-07-15  
**Execution mode:** STRUCTURAL (code + unit tests) — **live staging not available**  
**Harness:** `node scripts/mvp-acceptance.mjs` → `docs/mvp-acceptance-results.json`  
**Machine-readable results:** [mvp-acceptance-results.json](./mvp-acceptance-results.json)

---

## Executive recommendation

# **DO NOT RELEASE to production**

| Gate | Result |
|------|--------|
| All mandatory acceptance criteria | **FAIL** |
| End-to-end workflow verified on staging | **FAIL** (environment unavailable) |
| Blocker defects remaining | **2** |
| Major defects remaining | **5** |
| Unit smoke (NFR / marketplace / persona helpers) | **PASS** |

The product **demonstrates substantial progress** toward “visionaries discover manufacturers with capacity,” but the acceptance contract is **not satisfied**. Production deployment is **not recommended**.

---

## Environment & method

| Item | Status |
|------|--------|
| Staging URL (`MVP_BASE_URL` / `STAGING_BASE_URL`) | **Not configured** |
| Local Next.js (`localhost:3000`) | **Not running** (request timeout) |
| Local API server (`localhost:8080`) | **Not running** |
| Database reachable for E2E | **Not verified** (no `DATABASE_URL` in shell) |
| Migrations `0018`–`0020` | Present in repo; **not applied/verified** in this run |
| Automated unit helpers | `nfr`, `mvp-marketplace`, `persona-workflows` — **all passed** |

**Live re-run (when staging is ready):**

```bash
# After migrate + seed on staging, with app URL:
MVP_BASE_URL=https://<staging-host> node scripts/mvp-acceptance.mjs --live
```

---

## Step results (1–17)

| Step | Scenario | Status | Notes |
|------|----------|--------|-------|
| 1 | Admin configuration (categories) | **PARTIAL** | Admin categories API/UI exist; listing/search forms not fully taxonomy-driven |
| 2 | Manufacturer registration | **PARTIAL** | Works; email/OTP not gated before session |
| 3 | Manufacturer facility profile | **PASS** | `/provider-setup` + `POST /api/facilities` |
| 4 | Machinery listing | **PARTIAL** | Pricing/slots OK; images/labor/logistics/materials UI incomplete |
| 5 | Admin moderation approve | **PASS** | Approve API + `/admin/listings` |
| 6 | Visionary registration | **PARTIAL** | Same verify-gate caveat |
| 7 | Search manufacturers | **PARTIAL** | Keyword + machine type only; price/availability/ratings incomplete |
| 8 | View listing | **PARTIAL** | Core fields shown; images/availability/certs incomplete |
| 9 | Submit request | **PARTIAL** | Request + notify OK; no file attachments |
| 10 | Manufacturer counter-offer | **PASS** | Offers API + UI |
| 11 | Visionary accepts offer → booking | **PASS** | Auto-booking on accept |
| 12 | Booking completeness | **PARTIAL** | Booking created; **agreed price not copied** from offer |
| 13 | Transaction on accept | **FAIL** | **Blocker** — no auto transaction |
| 14 | Messaging | **PARTIAL** | Text OK; no attachments |
| 15 | Complete booking | **PASS** | `POST …/complete` |
| 16 | Review | **PASS** | `POST /api/bookings/[bookingId]/reviews` |
| 17 | Admin operations | **PARTIAL** | Users/listings/txns/reviews; no dedicated requests/bookings/audit UI |

**Totals:** PASS **7** · PARTIAL **10** · FAIL **2** (plus staging env fail)

---

## Defects log

### Blockers

| ID | Title | Severity | Reproduction |
|----|-------|----------|--------------|
| B1 | Staging unavailable — cannot execute live acceptance | Blocker | No `MVP_BASE_URL`; local servers timed out |
| B2 | No automatic transaction when booking is confirmed | Blocker | Accept counter-offer → no `transactions` row for booking |

### Majors

| ID | Title | Severity | Reproduction |
|----|-------|----------|--------------|
| M1 | Categories not fully wired into listing/search | Major | Create category → missing in browse/provider-setup filters |
| M2 | Machinery listing UI lacks image upload / support fields | Major | Provider setup step 2 |
| M3 | Search filters incomplete | Major | Browse: no location/price/availability/rating controls |
| M4 | Agreed pricing missing on booking from accepted offer | Major | Accept offer → inspect booking |
| M5 | Admin missing requests/bookings/audit UI | Major | Admin console navigation |

### Minors

| ID | Title | Severity |
|----|-------|----------|
| m1 | Email verification optional after register | Minor |
| m2 | No file attachments on listing requests / messages | Minor |

---

## Cross-cutting validation

| Area | Status | Evidence |
|------|--------|----------|
| Database integrity (live) | **NOT EXECUTED** | No DB session |
| API HTTP/RBAC (live) | **NOT EXECUTED** | Staging down; structural routes mapped |
| UI responsive / states | **NOT EXECUTED** on staging | Code uses LoadingSpinner/EmptyState patterns |
| Security (hashing, rate limits, file ownership) | **STRUCTURAL PASS** | NFR modules + unit tests |
| Performance (search &lt;2s, listing &lt;3s) | **NOT EXECUTED** | Needs live `--live` run |
| Automated helper tests | **PASS** | nfr / mvp / persona |

---

## Release readiness checklist

| Criterion | Met? |
|-----------|------|
| Admin configures categories end-to-end | No (partial) |
| Manufacturer onboarding + listing | Partial |
| Admin approves searchable listing | Structurally yes; not staging-verified |
| Visionary discovers via search | Partial filters |
| Request → counter-offer → accept → booking | Structurally yes |
| Transaction logged correctly | **No** |
| Messaging works | Partial |
| Complete + review | Structurally yes |
| Admin full operational views | Partial |
| No blockers | **No** |
| Staging green E2E | **No** |

---

## Core value proposition

> Connecting visionaries with manufacturers that have available production capacity through a secure, searchable, and collaborative manufacturing marketplace.

**Assessment:** The **happy path skeleton exists in code** (register → list → approve → search → request → counter → accept → booking → complete → review). It is **not production-proven**: staging was unreachable, payment/transaction automation is missing, and search/listing completeness gaps remain.

---

## Required before Ready for Release

1. Provision staging; apply migrations `0018`–`0020`; seed admin + taxonomy.
2. Run `MVP_BASE_URL=… node scripts/mvp-acceptance.mjs --live` and complete **manual** steps 1–17 with screenshots.
3. Fix **B2**: create transaction (platform fee) atomically on booking confirmation.
4. Close majors **M1–M5** (or formally waive with Product sign-off).
5. Re-run DoD gate (`pnpm run dod:check`) and staging verification.

---

## DoD verification (this acceptance activity)

- Feature (acceptance harness + report): **pass**
- Tests (structural harness + unit smoke): **pass**
- API live contracts: **fail** (staging unavailable)
- Staging verification: **fail**
- Backward compatible: **pass** (read-only validation; no product code changes required for this report beyond harness/docs)
- **Status:** In Progress (MVP release)
- **Outstanding:** staging E2E, B2 transaction auto-create, M1–M5 remediation or waivers
