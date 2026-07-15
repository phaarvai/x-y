# X!Y — The Explorer Factory

## EPIC 1 — Authentication, Roles & User Onboarding

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-1  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Agile Backlog · Jira Stories · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace (foundational)

---

## Epic Summary

**EPIC 1 — Authentication, Roles & User Onboarding** establishes the identity foundation for **X!Y — The Explorer Factory**. It enables users to register and authenticate securely, select one or more marketplace roles, complete their profiles, and enter role-appropriate onboarding flows.

This epic is a prerequisite for all subsequent marketplace capabilities—listings, requirements, messaging, bookings, and administration—because every platform action must be attributable to a verified identity operating under defined roles and account status rules.

---

## Business Objective

Provide a secure, scalable, and friction-aware identity layer that:

- Onboards diverse manufacturing ecosystem participants through a single authentication system  
- Supports flexible primary and future multi-role participation  
- Establishes account status and profile-completion gates that protect marketplace quality  
- Creates auditable login history for trust, security, and operational insight  
- Positions the platform for progressive verification, OAuth expansion, and enterprise-grade identity controls  

---

## User Value

| Audience | Value |
|----------|-------|
| New users | Fast registration with familiar options (email/password, OTP, social login) |
| Returning users | Reliable login/logout with clear session behavior |
| Role-based participants | Clear role selection and guided profile completion toward productive dashboards |
| Administrators | Account status controls, auditability, and moderation-ready identity data |
| Platform | Trustworthy identity baseline for listings, transactions, and governance |

---

## Scope

EPIC 1 covers account creation, authentication methods, session/token lifecycle, role selection, profile completion, account status handling, login history, password security, and a **placeholder** for business verification—sufficient to support MVP onboarding for all defined platform roles.

---

## In Scope

- Email & password registration and login  
- Mobile OTP registration/login  
- Google, LinkedIn, and Facebook OAuth login  
- Secure login and logout with session/token invalidation  
- Primary role selection during onboarding  
- Multi-role support (data model + deferred UI for additional roles)  
- Profile completion with completion percentage and required-field gating  
- Login history recording  
- Business verification placeholder (schema + status hooks; no full KYB workflow)  
- Authentication tokens (JWT and/or session strategy as configured)  
- Password hashing/encryption at rest  
- Account status management (`PENDING_PROFILE`, `ACTIVE`, `SUSPENDED`, etc.)  

---

## Out of Scope

- Full KYB/KYC business verification adjudication workflows (placeholder only)  
- Payment method capture during onboarding  
- Manufacturer listing creation, visionary requirement posting, or marketplace transactions  
- Two-factor authentication (2FA), passkeys, biometrics, and enterprise SSO (future)  
- Organization multi-user invitations and team RBAC beyond primary user roles  
- Deep admin console features beyond account status fields required for auth  
- Mobile native SDKs beyond API contracts that mobile clients can later consume  

---

## Roles Supported

| Role Key | Display Name | MVP Onboarding Relevance |
|----------|--------------|--------------------------|
| `MANUFACTURER` | Manufacturer / Factory Owner | Primary MVP supply role |
| `VISIONARY` | Visionary / Ideator / Startup | Primary MVP demand role |
| `VENDOR` | Vendor / Raw Material Supplier | Ecosystem (profile ready) |
| `LABOR_SUPPLIER` | Labor Supplier | Ecosystem (profile ready) |
| `LOGISTICS_PROVIDER` | Logistics Provider | Ecosystem (profile ready) |
| `LEGAL_WRITER` | Legal Writer / Auditor | Ecosystem (profile ready) |
| `INVESTOR` | Investor | Ecosystem (profile ready) |
| `MARKET_LEAD` | Market Lead / Distribution Partner | Ecosystem (profile ready) |
| `PLATFORM_ADMIN` | Platform Administrator | Provisioned, not self-selected |

> **Note:** Self-service role selection presents marketplace participant roles. `PLATFORM_ADMIN` is assigned by privileged provisioning, not public signup.

---

# Features Included

## Feature F1 — Email & Password Registration

### Purpose

Enable users to create an account using name, email, phone, password, organization, industry, and primary role.

### User Benefits

- Standard, familiar signup path without third-party dependencies  
- Immediate access to continue role and profile onboarding  

### Business Benefits

- Primary acquisition channel with first-party identity ownership  
- Captures organization/industry context for marketplace segmentation  

### Functional Requirements

1. System shall accept registration with required identity and contextual fields.  
2. System shall enforce unique email and unique phone.  
3. System shall hash passwords before persistence; plaintext must never be stored.  
4. System shall set default account status to `PENDING_PROFILE` after registration.  
5. System shall return authentication credentials (JWT/session) per configuration policy.  
6. System shall return field-level validation messages for invalid payloads.  
7. Immediate authenticated session after registration may be enabled or disabled by configuration (`auto_login_after_register`).  

### Validation Rules

| Field | Rules |
|-------|-------|
| `name` | Required; 2–255 chars |
| `email` | Required; valid email format; unique; case-insensitive uniqueness |
| `phone` | Required; E.164 or platform-normalized format; unique |
| `password` | Required; min 8 chars; at least 1 letter and 1 number (configurable strength policy) |
| `organization` | Required; 2–255 chars |
| `industry` | Required; from allowed industry list or free text (configurable) |
| `primary_role` | Required; one of allowed self-service roles |

### Error Handling

| Condition | Response |
|-----------|----------|
| Invalid field format | `400` with field errors |
| Email already registered | `409` email conflict |
| Phone already registered | `409` phone conflict |
| Weak password | `400` password policy error |
| Server failure | `500` generic error (no stack leakage) |

### Future Enhancements

- Optional email verification gate before full activation  
- Disposable-email detection  
- Organization domain suggestions  

---

## Feature F2 — Mobile OTP Registration/Login

### Purpose

Allow users to register or authenticate using a mobile phone number and one-time password (OTP).

### User Benefits

- Passwordless convenience for mobile-first users  
- Faster re-authentication without remembering credentials  

### Business Benefits

- Higher conversion for users unwilling to set passwords  
- Phone-verified identity signal for trust scoring later  

### Functional Requirements

1. System shall send OTP to a valid phone number.  
2. System shall verify OTP and create or authenticate the user.  
3. OTP shall expire after a configured TTL (e.g., 5 minutes).  
4. System shall enforce cooldown between send requests.  
5. System shall enforce rate limiting per phone and IP.  
6. Successful OTP auth shall create a `LoginHistory` entry.  
7. OTP secrets shall be hashed/stored securely and never returned in API responses.  

### Validation Rules

- Phone format valid and reachable via SMS provider  
- OTP length fixed (e.g., 6 digits)  
- Max verification attempts per OTP  
- Cooldown and daily send caps  

### Error Handling

| Condition | Response |
|-----------|----------|
| Invalid phone | `400` |
| OTP expired / invalid | `401` or `400` with generic message |
| Too many requests | `429` |
| Provider failure | `503` retryable |

### Future Enhancements

- WhatsApp / voice OTP channels  
- Device-bound OTP friction for risky logins  

---

## Feature F3 — Google OAuth Login

### Purpose

Authenticate users via Google identity provider.

### User Benefits

- One-click signup/login with an existing Google account  

### Business Benefits

- Reduced friction; lower password support burden  

### Functional Requirements

- OAuth 2.0 authorization code flow  
- Persist `provider`, `provider_user_id`, and linked `user_id`  
- Create user if new; login if existing OAuth link found  
- Prevent duplicate provider IDs  
- Offer account linking when email matches an existing local account (with consent rules)  

### Validation Rules / Error Handling

- Invalid/expired OAuth state → reject  
- Provider denial → cancel flow with user-friendly message  
- Email conflict without link intent → guided linking or `409`  

### Future Enhancements

- Google Workspace domain restrictions for enterprise cohorts  

---

## Feature F4 — LinkedIn OAuth Login

### Purpose

Authenticate professionals via LinkedIn, aligned with B2B positioning.

### User Benefits

- Professional identity continuity for manufacturing stakeholders  

### Business Benefits

- Higher-quality B2B signup signal; brand alignment  

### Functional Requirements

Same OAuth principles as Google, with LinkedIn provider configuration and profile field mapping (name, email where granted).

### Future Enhancements

- Import company page metadata for manufacturer onboarding hints  

---

## Feature F5 — Facebook OAuth Login

### Purpose

Authenticate users via Facebook identity provider for broader consumer/creator reach among ideators.

### User Benefits

- Familiar social login path  

### Business Benefits

- Expanded acquisition channel for Visionary/Ideator segments  

### Functional Requirements

Same OAuth principles as Google/LinkedIn with Facebook provider configuration.

### Future Enhancements

- Gradual deprecation option if platform policy reduces Facebook auth relevance  

---

## Feature F6 — Secure Login & Logout

### Purpose

Authenticate returning users and securely terminate sessions.

### User Benefits

- Predictable access control and clean logout behavior  

### Business Benefits

- Reduces credential abuse exposure; supports auditability  

### Functional Requirements

1. Email + password login  
2. Issue JWT and/or create server session  
3. Logout invalidates session/token according to strategy  
4. Return profile completion status and roles on login  
5. Record login history  

### Validation Rules

- Email/password required  
- Account must not be `SUSPENDED` or `DELETED`  

### Error Handling

- Always return **generic** invalid-credentials message (no email enumeration)  
- Suspended accounts return explicit lock message without revealing other account details  

### Future Enhancements

- Device management and remote session revoke  

---

## Feature F7 — Role Selection

### Purpose

Allow users to choose a primary marketplace role after signup.

### User Benefits

- Clear path into the correct onboarding experience  

### Business Benefits

- Correct product surface activation; cleaner analytics cohorts  

### Functional Requirements

- Present after signup (or when primary role not set)  
- Display role descriptions for all self-service roles  
- Persist one primary role  
- Selected role determines onboarding checklist and dashboard routing  

### Validation Rules

- Exactly one primary role  
- Role must be in allowed enum (excluding public self-assign of `PLATFORM_ADMIN`)  

### Error Handling

- Invalid role → `400`  
- Role change after listings exist → restricted or admin-mediated (edge policy)  

### Future Enhancements

- Smart role suggestion based on organization type  

---

## Feature F8 — Multi-role Support

### Purpose

Allow a user identity to hold additional roles over time (e.g., Manufacturer who is also Investor).

### User Benefits

- Participate in multiple ecosystem sides without duplicate accounts  

### Business Benefits

- Increases network density; reduces identity fragmentation  

### Functional Requirements

- Data model supports multiple `UserRole` rows per user  
- One role marked `is_primary = true`  
- UI for adding secondary roles may be deferred; API/schema ready in EPIC 1  

### Validation Rules

- Unique `(user_id, role)`  
- Exactly one primary role at all times  

### Future Enhancements

- Role-switcher in navigation; role-scoped dashboards  

---

## Feature F9 — Profile Completion

### Purpose

Collect complete profile data required for marketplace participation.

### User Benefits

- Transparent progress toward platform unlocks  

### Business Benefits

- Higher data quality; fewer incomplete/ghost listings  

### Functional Requirements

Users can manage: name, organization, industry, website, email, phone, address, city, state, country, location, profile image.

System shall:

- Compute **profile completion percentage**  
- Surface **missing required fields** (global + role-specific)  
- Block listing publication until required profile fields are complete  

### Validation Rules

- Email/phone uniqueness maintained on updates  
- Image type/size limits  
- URL format for website  

### Error Handling

- Partial updates allowed for optional fields  
- Attempt to publish listing with incomplete profile → `403` with missing fields payload  

### Future Enhancements

- Progressive profiling prompts; auto-fill from OAuth  

---

## Feature F10 — Login History

### Purpose

Record authentication events for security and compliance.

### User Benefits

- Visibility into recent account access (user-facing optional)  

### Business Benefits

- Incident investigation; anomaly detection foundation  

### Functional Requirements

Create `LoginHistory` on successful password, OTP, and OAuth logins (and optionally failed attempts—configurable).

Capture: user_id, method, IP, user agent, success flag, timestamp.

### Future Enhancements

- User-facing “recent devices” screen with revoke  

---

## Feature F11 — Business Verification (Placeholder)

### Purpose

Reserve schema and status hooks for future business verification (KYB).

### User Benefits

- Early visibility that verification will unlock trust badges later  

### Business Benefits

- Avoids costly schema rework when verification launches  

### Functional Requirements

- `BusinessVerification` table with status (`UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`)  
- No full document adjudication in EPIC 1  
- Profile/API may expose read-only verification status  

### Future Enhancements

- Document upload, admin review queues, automated registry checks  

---

## Feature F12 — Authentication Tokens (JWT/Session)

### Purpose

Authorize authenticated API requests.

### User Benefits

- Seamless access across web app sessions  

### Business Benefits

- Scalable API security model  

### Functional Requirements

- Issue access token (JWT) on auth success  
- Optional refresh token rotation  
- Short-lived access tokens; secure storage strategy documented  
- Logout invalidates refresh/session store entries  

### Future Enhancements

- Token binding / DPoP for high-risk clients  

---

## Feature F13 — Password Encryption

### Purpose

Protect credentials at rest using strong one-way hashing.

### User Benefits

- Reduced impact if database is compromised  

### Business Benefits

- Security/compliance baseline  

### Functional Requirements

- Use modern KDF (e.g., bcrypt/argon2)  
- Never log passwords  
- Support password change with current-password confirmation (adjacent story if not in tickets below)  

---

## Feature F14 — Account Status Management

### Purpose

Control user lifecycle states affecting access.

### User Benefits

- Clear messaging when action is required (e.g., complete profile)  

### Business Benefits

- Governance lever for abuse control  

### Functional Requirements

Statuses include at minimum:

| Status | Meaning |
|--------|---------|
| `PENDING_PROFILE` | Registered; profile incomplete |
| `ACTIVE` | Eligible for core authenticated actions (subject to other gates) |
| `SUSPENDED` | Temporarily blocked |
| `DELETED` | Soft-deleted / deactivated |

Status transitions must be auditable for admin-driven changes.

---

# Developer Tickets

---

## Ticket XFY-001

### Ticket ID

`XFY-001`

### Ticket Name

Build User Registration API

### Priority

`P0 — Critical`

### Type

`Backend` · `API` · `Story`

### Story Points

`8`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As a new platform user, I want to register with my identity and business context so that I can begin onboarding into X!Y with a secure account.

### Business Value

Creates the primary acquisition funnel and first-party identity records required for marketplace participation and analytics.

### Description

Implement `POST /api/auth/register` to create a user with name, email, phone, password, organization, industry, and primary role. Persist hashed credentials, initialize account status to `PENDING_PROFILE`, create primary `UserRole` and base `UserProfile`, optionally issue JWT, and return structured validation errors.

### Functional Requirements

1. Accept registration payload with required fields.  
2. Normalize email (lowercase/trim) and phone (E.164).  
3. Enforce unique email and unique phone.  
4. Hash password with approved KDF before insert.  
5. Set `status = PENDING_PROFILE`.  
6. Insert `UserRole` with `is_primary = true`.  
7. Create empty/`partial` `UserProfile` seeded from registration fields.  
8. Create `BusinessVerification` row with `UNVERIFIED` (placeholder).  
9. Return JWT if `auto_login_after_register` is enabled; otherwise return success without requiring login immediately if configured off.  
10. Never return `password_hash` in responses.  

### Acceptance Criteria

- [ ] Email uniqueness enforced  
- [ ] Phone uniqueness enforced  
- [ ] Password stored only as hash  
- [ ] Status defaults to `PENDING_PROFILE`  
- [ ] JWT returned when auto-login configuration is enabled  
- [ ] Validation messages returned for invalid fields  
- [ ] Login not required immediately after registration unless configured  
- [ ] Primary role persisted and returned in response  

### Validation Rules

| Field | Rule |
|-------|------|
| name | required, 2–255 |
| email | required, email format, unique |
| phone | required, unique, normalized |
| password | min 8, policy checks |
| organization | required, 2–255 |
| industry | required |
| primary_role | required, allowed enum |

### API Endpoints (where applicable)

`POST /api/auth/register`

### Request Payload

```json
{
  "name": "Ananya Mehta",
  "email": "ananya@startup.example",
  "phone": "+919876543210",
  "password": "SecurePass1",
  "organization": "Mehta Labs",
  "industry": "Consumer Electronics",
  "primaryRole": "VISIONARY"
}
```

### Response Payload

**201 Created**

```json
{
  "user": {
    "id": "usr_01HZX...",
    "name": "Ananya Mehta",
    "email": "ananya@startup.example",
    "phone": "+919876543210",
    "organization": "Mehta Labs",
    "industry": "Consumer Electronics",
    "primaryRole": "VISIONARY",
    "roles": ["VISIONARY"],
    "status": "PENDING_PROFILE",
    "profileCompletionPercent": 35,
    "createdAt": "2026-07-15T06:30:00.000Z"
  },
  "token": {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "nextStep": "ROLE_SELECTION_OR_PROFILE_COMPLETION"
}
```

> If auto-login disabled, omit `token` and set `nextStep` to `LOGIN`.

### Error Responses

| Code | Body (example) |
|------|----------------|
| `400` | `{ "error": "VALIDATION_ERROR", "fields": { "password": ["Password must include a number"] } }` |
| `409` | `{ "error": "CONFLICT", "fields": { "email": ["Email already registered"] } }` |
| `500` | `{ "error": "INTERNAL_ERROR", "message": "Unable to register user" }` |

### Database Tables

`User`, `UserRole`, `UserProfile`, `BusinessVerification`

### Database Fields

**User:** `id`, `name`, `email`, `phone`, `password_hash`, `organization`, `industry`, `primary_role`, `status`, `created_at`, `updated_at`, `last_login_at`

### Backend Tasks

- Implement registration service and repository layer  
- Add uniqueness constraints and migrations  
- Integrate password hasher  
- Wire JWT issuance (config gated)  
- Seed related UserRole / UserProfile / BusinessVerification rows transactionally  

### Frontend Tasks

- Registration form UI with field-level error display  
- Map API errors to form state  
- Route user to role selection / profile completion / login based on response  

### Security Requirements

- Hash passwords (bcrypt/argon2)  
- HTTPS only  
- Rate limit registration by IP  
- Do not log PII passwords  
- Constant-time comparisons not applicable at register; ensure safe error messages  

### Edge Cases

- Concurrent registrations with same email  
- Phone/email already used by OAuth-only account  
- Missing optional vs required fields  
- Role `PLATFORM_ADMIN` attempted via public register → reject  

### Dependencies

- Database migrations for auth tables  
- JWT secrets / session store configuration  
- Industry/role enum configuration  

### Testing Checklist

- [ ] Happy-path register  
- [ ] Duplicate email/phone  
- [ ] Weak password  
- [ ] Invalid role  
- [ ] Transaction rollback if profile seed fails  
- [ ] Token presence/absence per config  
- [ ] Response never includes password hash  

### Definition of Done

- Code merged with tests passing  
- OpenAPI/spec updated  
- Migrations applied in target environments  
- Acceptance criteria verified by QA  
- Security review checklist completed for credential handling  

---

## Ticket XFY-002

### Ticket ID

`XFY-002`

### Ticket Name

Build Login & Logout API

### Priority

`P0 — Critical`

### Type

`Backend` · `API` · `Story`

### Story Points

`5`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As a registered user, I want to log in with email and password and log out securely so that I can access my account and end my session when finished.

### Business Value

Enables returning-user engagement and establishes session integrity for all authenticated marketplace actions.

### Description

Implement email/password login, logout with session/token invalidation, and login history capture. Login responses must include role and profile completion status without leaking whether an email exists when credentials are wrong.

### Functional Requirements

1. Authenticate via email + password.  
2. Issue JWT/session on success.  
3. Update `last_login_at`.  
4. Create `LoginHistory` record.  
5. Return primary role, roles list, status, and profile completion percentage.  
6. Logout invalidates active session/refresh token.  
7. Suspended users cannot authenticate.  

### Acceptance Criteria

- [ ] Generic login error for invalid credentials  
- [ ] `LoginHistory` record created on successful login  
- [ ] JWT returned on success  
- [ ] Profile completion status returned  
- [ ] User role(s) returned  
- [ ] Logout invalidates session/token for subsequent authenticated calls  

### Validation Rules

- Email and password required  
- Email format validated (but error message remains generic on auth failure)  

### API Endpoints (where applicable)

| Endpoint | Method |
|----------|--------|
| `/api/auth/login` | `POST` |
| `/api/auth/logout` | `POST` |
| `/api/auth/me` | `GET` (supporting) |

### Request Payload

**Login**

```json
{
  "email": "ananya@startup.example",
  "password": "SecurePass1"
}
```

**Logout**

```json
{}
```

*(Logout uses Authorization header / session cookie.)*

### Response Payload

**200 Login**

```json
{
  "user": {
    "id": "usr_01HZX...",
    "name": "Ananya Mehta",
    "email": "ananya@startup.example",
    "primaryRole": "VISIONARY",
    "roles": ["VISIONARY"],
    "status": "PENDING_PROFILE",
    "profileCompletionPercent": 35,
    "missingRequiredFields": ["address", "city", "country"]
  },
  "token": {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

**200 Logout**

```json
{
  "message": "Logged out successfully"
}
```

### Error Responses

| Code | Body |
|------|------|
| `401` | `{ "error": "INVALID_CREDENTIALS", "message": "Invalid email or password" }` |
| `403` | `{ "error": "ACCOUNT_SUSPENDED", "message": "Your account is suspended" }` |
| `429` | `{ "error": "RATE_LIMITED", "message": "Too many login attempts" }` |

### Database Tables

`User`, `UserRole`, `UserProfile`, `LoginHistory`, `Session` (if server sessions used)

### Database Fields

**LoginHistory:** `id`, `user_id`, `method`, `ip_address`, `user_agent`, `success`, `created_at`  
**User:** updates to `last_login_at`

### Backend Tasks

- Implement credential verification  
- Issue/invalidate tokens or sessions  
- Persist login history  
- Account status gate  
- Rate limiting hooks  

### Frontend Tasks

- Login form with generic error display  
- Persist token/session per security policy  
- Logout control clearing client auth state  
- Route by profile completion / role  

### Security Requirements

- Generic auth failure messages  
- Account lockout / rate limiting after repeated failures  
- Secure cookie flags if cookie sessions (`HttpOnly`, `Secure`, `SameSite`)  
- CSRF protection for cookie-based auth  
- Audit logging for login/logout events  

### Edge Cases

- User registered via OAuth attempting password login without password set  
- Soft-deleted accounts  
- Concurrent logout across devices (strategy-dependent)  
- Clock skew on JWT expiry  

### Dependencies

- XFY-001 User table and hashing  
- Token/session infrastructure  

### Testing Checklist

- [ ] Valid login  
- [ ] Invalid password/email (generic error)  
- [ ] Suspended user blocked  
- [ ] LoginHistory written  
- [ ] Logout rejects subsequent `/auth/me`  
- [ ] Rate limit triggers  

### Definition of Done

- APIs documented and tested  
- Security criteria for auth errors verified  
- QA sign-off on acceptance criteria  

---

## Ticket XFY-003

### Ticket ID

`XFY-003`

### Ticket Name

Role Selection Screen

### Priority

`P0 — Critical`

### Type

`Frontend` · `UX` · `Story` (with supporting API)

### Story Points

`5`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As a newly registered user, I want to select my primary role with clear descriptions so that the platform can route me into the correct onboarding experience.

### Business Value

Ensures users enter the correct product surface, improving activation and reducing mis-categorized accounts.

### Description

Build a post-signup Role Selection experience that presents marketplace roles with descriptions, allows selecting exactly one primary role, persists selection, and determines the subsequent onboarding flow. Multi-role additions are supported by data model later; this ticket focuses on primary role selection UX and API.

### Functional Requirements

1. Screen appears after signup when primary role is unset or confirmation is required.  
2. Show roles: Manufacturer, Visionary, Vendor, Labor Supplier, Logistics Provider, Investor, Market Lead, Legal Writer / Auditor.  
3. Display concise role descriptions.  
4. Persist one primary role.  
5. Selected role determines onboarding flow and dashboard destination.  
6. Prevent selection of Platform Admin.  

### Acceptance Criteria

- [ ] Appears after signup  
- [ ] One primary role selectable  
- [ ] Additional roles supported later (schema/API acknowledges multi-role; UI may show “coming soon” or hide add secondary)  
- [ ] Role descriptions displayed  
- [ ] Selected role determines onboarding flow  

### Validation Rules

- Required selection before continuing  
- Role must be in allowed self-service list  

### API Endpoints (where applicable)

`PUT /api/auth/roles/primary`  
`GET /api/auth/roles/options` (optional static/config endpoint)

### Request Payload

```json
{
  "primaryRole": "MANUFACTURER"
}
```

### Response Payload

```json
{
  "primaryRole": "MANUFACTURER",
  "roles": ["MANUFACTURER"],
  "onboardingFlow": "MANUFACTURER_PROFILE",
  "nextStep": "PROFILE_COMPLETION"
}
```

### Error Responses

| Code | Body |
|------|------|
| `400` | `{ "error": "VALIDATION_ERROR", "fields": { "primaryRole": ["Invalid role"] } }` |
| `401` | `{ "error": "UNAUTHORIZED" }` |

### Database Tables

`User`, `UserRole`

### Database Fields

`User.primary_role`  
`UserRole.user_id`, `UserRole.role`, `UserRole.is_primary`, `UserRole.created_at`

### Backend Tasks

- Endpoint to set/update primary role  
- Enforce exactly one primary role  
- Return onboarding flow key  

### Frontend Tasks

- Role selection UI with descriptions and selection state  
- Persist and navigate to role-specific profile completion  
- Accessibility: keyboard selection, clear focus states  

### Security Requirements

- Authenticated endpoint only  
- Reject privilege escalation to `PLATFORM_ADMIN`  
- Audit role changes  

### Edge Cases

- User refreshes mid-selection  
- User already has primary role (edit vs locked policy)  
- Changing role after partial profile completion  

### Dependencies

- XFY-001 registration (may preselect role; screen still confirms or skips if already set)  
- Profile completion routing (XFY-006)  

### Testing Checklist

- [ ] All eight roles render with descriptions  
- [ ] Cannot proceed without selection  
- [ ] Correct onboarding route per role  
- [ ] Admin role not listed  
- [ ] API persists primary role  

### Definition of Done

- UX reviewed and accepted  
- API + UI integrated  
- Analytics event for role selected instrumented (optional but recommended)  

---

## Ticket XFY-004

### Ticket ID

`XFY-004`

### Ticket Name

OAuth Integration (Google, LinkedIn, Facebook)

### Priority

`P1 — High`

### Type

`Full-stack` · `Story`

### Story Points

`13`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As a user, I want to sign up or log in with Google, LinkedIn, or Facebook so that I can access X!Y without creating a password.

### Business Value

Reduces signup friction and increases conversion while capturing provider-verified identity signals.

### Description

Integrate OAuth 2.0 for Google, LinkedIn, and Facebook. Store provider and provider user ID, prevent duplicate provider identities, link to existing accounts when appropriate, issue platform tokens post-success, and record login history.

### Functional Requirements

1. Support Google, LinkedIn, Facebook OAuth.  
2. Store `provider` and `provider_user_id` in `OAuthAccount`.  
3. Prevent duplicate provider identities.  
4. Link existing accounts when email matches and linking policy allows.  
5. Create user shell when no account exists (status `PENDING_PROFILE`).  
6. Issue JWT/session after success.  
7. Record `LoginHistory` with method `OAUTH_<PROVIDER>`.  

### Acceptance Criteria

- [ ] OAuth authentication works for Google, LinkedIn, Facebook  
- [ ] Store provider  
- [ ] Store provider ID  
- [ ] Prevent duplicates  
- [ ] Link existing accounts per policy  

### Validation Rules

- Valid OAuth `state` parameter  
- Provider callback must include expected scopes (email minimum where available)  
- Unique constraint on `(provider, provider_user_id)`  

### API Endpoints (where applicable)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/oauth/{provider}/start` | `GET` | Begin OAuth redirect |
| `/api/auth/oauth/{provider}/callback` | `GET` | Handle provider callback |
| `/api/auth/oauth/link` | `POST` | Explicit link confirm (if needed) |

`provider` ∈ `google` | `linkedin` | `facebook`

### Request Payload

**Link confirm (example)**

```json
{
  "provider": "google",
  "authorizationCode": "4/0A...",
  "linkToken": "lnk_..."
}
```

### Response Payload

```json
{
  "user": {
    "id": "usr_01HZX...",
    "email": "user@gmail.com",
    "status": "PENDING_PROFILE",
    "primaryRole": null,
    "profileCompletionPercent": 20
  },
  "token": {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "nextStep": "ROLE_SELECTION"
}
```

### Error Responses

| Code | Body |
|------|------|
| `400` | `{ "error": "OAUTH_INVALID_STATE" }` |
| `401` | `{ "error": "OAUTH_DENIED" }` |
| `409` | `{ "error": "OAUTH_ACCOUNT_CONFLICT", "message": "Provider identity already linked" }` |

### Database Tables

`User`, `OAuthAccount`, `LoginHistory`, `UserProfile`

### Database Fields

**OAuthAccount:** `id`, `user_id`, `provider`, `provider_user_id`, `email`, `access_token_encrypted` (optional), `refresh_token_encrypted` (optional), `created_at`, `updated_at`

### Backend Tasks

- Provider client configuration (client IDs/secrets)  
- State/nonce management  
- Account create/link logic  
- Token issuance  
- Secure storage of any retained provider tokens  

### Frontend Tasks

- Social login buttons on register/login  
- Handle callback landing / deep-link errors  
- Continue to role selection when role missing  

### Security Requirements

- Validate state/CSRF on callbacks  
- Encrypt any stored provider tokens  
- Minimal scopes  
- Do not trust client-supplied provider IDs without server token exchange  

### Edge Cases

- Provider email not shared  
- Existing password account with same email  
- User cancels consent screen  
- Provider outage  

### Dependencies

- Provider developer apps configured  
- XFY-001 user model  
- XFY-002 token/session issuance  

### Testing Checklist

- [ ] New user via each provider  
- [ ] Returning OAuth user login  
- [ ] Duplicate provider ID blocked  
- [ ] Email-match linking path  
- [ ] Cancelled OAuth flow  

### Definition of Done

- All three providers verified in staging  
- Secrets managed via environment config  
- Security review complete  

---

## Ticket XFY-005

### Ticket ID

`XFY-005`

### Ticket Name

Mobile OTP Login

### Priority

`P1 — High`

### Type

`Full-stack` · `Story`

### Story Points

`8`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As a user, I want to log in or register using my mobile number and OTP so that I can access X!Y without a password.

### Business Value

Improves conversion for mobile-first users and strengthens phone-verified identity.

### Description

Implement OTP send and verify flows with expiration, cooldown, rate limiting, secure OTP validation, user create-or-login behavior, JWT issuance, and login history entries.

### Functional Requirements

1. Send OTP to phone.  
2. Verify OTP and authenticate/register.  
3. Enforce expiration TTL.  
4. Enforce send cooldown.  
5. Enforce rate limiting (phone + IP).  
6. Create `LoginHistory` on success.  
7. Store only hashed OTP codes.  
8. Limit verification attempts per OTP.  

### Acceptance Criteria

- [ ] Send OTP  
- [ ] Verify OTP  
- [ ] Expiration enforced  
- [ ] Cooldown enforced  
- [ ] Rate limiting enforced  
- [ ] LoginHistory entry created  
- [ ] Secure OTP validation (hash compare; no OTP in logs/responses)  

### Validation Rules

| Rule | Example default |
|------|-----------------|
| OTP length | 6 digits |
| TTL | 5 minutes |
| Cooldown | 30–60 seconds between sends |
| Max sends / hour / phone | configurable (e.g., 5) |
| Max verify attempts | e.g., 5 |

### API Endpoints (where applicable)

| Endpoint | Method |
|----------|--------|
| `/api/auth/otp/send` | `POST` |
| `/api/auth/otp/verify` | `POST` |

### Request Payload

**Send**

```json
{
  "phone": "+919876543210",
  "purpose": "LOGIN"
}
```

**Verify**

```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "purpose": "LOGIN"
}
```

### Response Payload

**Send 200**

```json
{
  "message": "OTP sent",
  "expiresInSeconds": 300,
  "cooldownSeconds": 45,
  "maskedPhone": "+91******3210"
}
```

**Verify 200**

```json
{
  "user": {
    "id": "usr_01HZX...",
    "phone": "+919876543210",
    "status": "PENDING_PROFILE",
    "primaryRole": null,
    "isNewUser": true
  },
  "token": {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "nextStep": "ROLE_SELECTION"
}
```

### Error Responses

| Code | Body |
|------|------|
| `400` | `{ "error": "INVALID_OTP" }` |
| `429` | `{ "error": "OTP_RATE_LIMITED" }` |
| `503` | `{ "error": "SMS_PROVIDER_UNAVAILABLE" }` |

### Database Tables

`OTPVerification`, `User`, `LoginHistory`

### Database Fields

**OTPVerification:** `id`, `phone`, `otp_hash`, `purpose`, `attempts`, `expires_at`, `consumed_at`, `created_at`, `ip_address`

### Backend Tasks

- OTP generation + hashing  
- SMS provider integration  
- Verify/consume logic  
- Auto-provision user on first success  
- Rate limit middleware  

### Frontend Tasks

- Phone entry + OTP entry screens  
- Resend with cooldown timer  
- Error states for expired/invalid OTP  

### Security Requirements

- Hash OTPs at rest  
- Generic errors where possible  
- Rate limiting + attempt caps  
- Do not return OTP in API  
- Audit send/verify events without logging OTP plaintext  

### Edge Cases

- Phone already registered to another auth method  
- Clock skew expiry  
- SMS delayed beyond TTL  
- Multiple active OTPs for same phone (invalidate previous)  

### Dependencies

- SMS provider credentials  
- User uniqueness on phone  
- Token issuance (XFY-002)  

### Testing Checklist

- [ ] Send/verify happy path  
- [ ] Expired OTP  
- [ ] Wrong OTP attempts  
- [ ] Cooldown and rate limit  
- [ ] LoginHistory written  
- [ ] New vs existing user paths  

### Definition of Done

- Staging OTP verified with test numbers  
- Security checklist signed  
- Runbooks for SMS provider failures documented  

---

## Ticket XFY-006

### Ticket ID

`XFY-006`

### Ticket Name

User Profile Completion

### Priority

`P0 — Critical`

### Type

`Full-stack` · `Story`

### Story Points

`8`

### Epic

`EPIC-1 — Authentication, Roles & User Onboarding`

### User Story

As an authenticated user, I want to complete my profile and see my completion progress so that I can unlock marketplace actions like publishing listings.

### Business Value

Improves data quality and protects marketplace trust by gating listing publication on required profile completeness.

### Description

Implement profile read/update APIs and UI allowing users to manage identity and location fields, compute completion percentage, show missing required fields (including role-specific requirements), transition status from `PENDING_PROFILE` to `ACTIVE` when requirements are met, and enforce listing publish restrictions until complete.

### Functional Requirements

1. Allow manage/update of: name, organization, industry, website, email, phone, address, city, state, country, location, profile image.  
2. Compute profile completion percentage.  
3. Return missing required fields.  
4. Apply role-specific required fields.  
5. Block listing publication until required profile information is completed.  
6. Update account `status` to `ACTIVE` when completion criteria satisfied.  

### Acceptance Criteria

- [ ] Users can manage listed profile fields  
- [ ] Profile completion percentage displayed  
- [ ] Missing required fields displayed  
- [ ] Role-specific required fields enforced  
- [ ] Listings cannot be published until required profile information is completed  

### Validation Rules

**Global required (example):** name, email, phone, organization, industry, country  

**Role-specific (examples):**

| Role | Additional required |
|------|---------------------|
| Manufacturer | address, city, state, country |
| Visionary | organization, industry |
| Vendor | organization, address, country |
| Logistics | service coverage country/city |
| Others | organization + country minimum |

Website optional but must be valid URL if present.  
Profile image: allowed MIME types; max size (e.g., 5MB).

### API Endpoints (where applicable)

| Endpoint | Method |
|----------|--------|
| `/api/profile` | `GET` |
| `/api/profile` | `PUT` / `PATCH` |
| `/api/profile/image` | `POST` |
| `/api/profile/completion` | `GET` |

### Request Payload

```json
{
  "name": "Ravi Deshmukh",
  "organization": "Deshmukh Precision Works",
  "industry": "Industrial Manufacturing",
  "website": "https://deshmukh.example",
  "email": "ravi@deshmukh.example",
  "phone": "+919811122233",
  "address": "12 Industrial Estate",
  "city": "Pune",
  "state": "Maharashtra",
  "country": "IN",
  "location": {
    "lat": 18.5204,
    "lng": 73.8567
  }
}
```

### Response Payload

```json
{
  "profile": {
    "name": "Ravi Deshmukh",
    "organization": "Deshmukh Precision Works",
    "industry": "Industrial Manufacturing",
    "website": "https://deshmukh.example",
    "email": "ravi@deshmukh.example",
    "phone": "+919811122233",
    "address": "12 Industrial Estate",
    "city": "Pune",
    "state": "Maharashtra",
    "country": "IN",
    "location": { "lat": 18.5204, "lng": 73.8567 },
    "profileImageUrl": "https://cdn.example/u/ravi.jpg"
  },
  "completion": {
    "percent": 92,
    "missingRequiredFields": ["profileImage"],
    "canPublishListings": false,
    "status": "PENDING_PROFILE"
  }
}
```

### Error Responses

| Code | Body |
|------|------|
| `400` | `{ "error": "VALIDATION_ERROR", "fields": { "website": ["Invalid URL"] } }` |
| `403` | `{ "error": "PROFILE_INCOMPLETE", "missingRequiredFields": ["address", "city"] }` *(listing publish gate)* |
| `409` | `{ "error": "CONFLICT", "fields": { "phone": ["Phone already in use"] } }` |

### Database Tables

`User`, `UserProfile`

### Database Fields

**UserProfile:** `user_id`, `website`, `address`, `city`, `state`, `country`, `location_lat`, `location_lng`, `profile_image_url`, `completion_percent`, `updated_at`  
*(Core identity fields may live on User and be mirrored/updated transactionally.)*

### Backend Tasks

- Profile CRUD  
- Completion calculator service (global + role rules)  
- Image upload to object storage  
- Publish-gate helper/middleware for listing APIs  
- Status transition to `ACTIVE`  

### Frontend Tasks

- Profile completion form  
- Progress indicator (% + missing fields checklist)  
- Role-aware required field markers  
- Image upload UX  
- Block/CTA when user attempts gated actions  

### Security Requirements

- Authenticated access only to own profile  
- Sanitize URLs and text inputs  
- Virus/content scan for images (recommended)  
- Authorization checks prevent profile IDOR  

### Edge Cases

- Changing email/phone to colliding values  
- Partial saves  
- Manufacturer trying to publish factory listing with incomplete address  
- OAuth users with read-only email  

### Dependencies

- XFY-001 / XFY-003 roles  
- Object storage for images  
- Future listing APIs consume `canPublishListings` gate  

### Testing Checklist

- [ ] Update all fields  
- [ ] Completion % calculation correctness  
- [ ] Role-specific required fields  
- [ ] Status flips to ACTIVE when complete  
- [ ] Listing publish blocked when incomplete  
- [ ] Image validation failures  

### Definition of Done

- Completion rules documented per role  
- API + UI verified  
- Gate contract agreed with listings epic owners  

---

# API Summary Table

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/auth/register` | `POST` | Email/password registration | Public |
| `/api/auth/login` | `POST` | Email/password login | Public |
| `/api/auth/logout` | `POST` | Invalidate session/token | Required |
| `/api/auth/me` | `GET` | Current authenticated user | Required |
| `/api/auth/roles/primary` | `PUT` | Set primary role | Required |
| `/api/auth/roles/options` | `GET` | List selectable roles/descriptions | Public or Required |
| `/api/auth/oauth/{provider}/start` | `GET` | Start OAuth flow | Public |
| `/api/auth/oauth/{provider}/callback` | `GET` | OAuth callback handler | Public (state-protected) |
| `/api/auth/oauth/link` | `POST` | Confirm OAuth account link | Conditional |
| `/api/auth/otp/send` | `POST` | Send mobile OTP | Public (rate-limited) |
| `/api/auth/otp/verify` | `POST` | Verify OTP and authenticate | Public (rate-limited) |
| `/api/profile` | `GET` | Get profile + completion | Required |
| `/api/profile` | `PUT`/`PATCH` | Update profile | Required |
| `/api/profile/image` | `POST` | Upload profile image | Required |
| `/api/profile/completion` | `GET` | Completion details only | Required |

---

# Database Schema

## Entity Relationship (logical)

```
User 1──* UserRole
User 1──1 UserProfile
User 1──1 BusinessVerification
User 1──* OAuthAccount
User 1──* LoginHistory
Phone/IP ──* OTPVerification
User 1──* Session (optional)
```

## Table: `User`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID/PK | Surrogate key |
| `name` | varchar(255) | Required |
| `email` | varchar(255) | Unique, required |
| `phone` | varchar(32) | Unique, required (may relax for some OAuth-only interim states—policy decision) |
| `password_hash` | text | Nullable for OAuth/OTP-only users |
| `organization` | varchar(255) | |
| `industry` | varchar(255) | |
| `primary_role` | varchar(64) | Denormalized convenience |
| `status` | varchar(32) | `PENDING_PROFILE`, `ACTIVE`, `SUSPENDED`, `DELETED` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `last_login_at` | timestamp | Nullable |

## Table: `UserRole`

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `user_id` | FK → User | |
| `role` | varchar(64) | Enum |
| `is_primary` | boolean | Exactly one true per user |
| `created_at` | timestamp | |
| Unique | `(user_id, role)` | |

## Table: `UserProfile`

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | PK/FK | |
| `website` | varchar | Nullable |
| `address` | text | |
| `city` | varchar | |
| `state` | varchar | |
| `country` | varchar(2/64) | |
| `location_lat` | decimal | Nullable |
| `location_lng` | decimal | Nullable |
| `profile_image_url` | text | Nullable |
| `completion_percent` | int | Cached |
| `updated_at` | timestamp | |

## Table: `LoginHistory`

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `user_id` | FK | Nullable for failed unknowns if stored |
| `method` | varchar | `PASSWORD`, `OTP`, `OAUTH_GOOGLE`, … |
| `ip_address` | varchar | |
| `user_agent` | text | |
| `success` | boolean | |
| `created_at` | timestamp | |

## Table: `BusinessVerification`

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `user_id` | FK unique | |
| `status` | varchar | `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` |
| `notes` | text | Internal placeholder |
| `submitted_at` | timestamp | Nullable |
| `reviewed_at` | timestamp | Nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

## Table: `OAuthAccount`

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `user_id` | FK | |
| `provider` | varchar | `google`, `linkedin`, `facebook` |
| `provider_user_id` | varchar | |
| `email` | varchar | From provider if available |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| Unique | `(provider, provider_user_id)` | |

## Table: `OTPVerification`

| Field | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `phone` | varchar | Indexed |
| `otp_hash` | text | |
| `purpose` | varchar | `LOGIN`, `REGISTER`, etc. |
| `attempts` | int | |
| `expires_at` | timestamp | |
| `consumed_at` | timestamp | Nullable |
| `ip_address` | varchar | |
| `created_at` | timestamp | |

---

# Authentication Flow Diagram (text format)

```
Registration (Email/Password | OAuth | OTP)
                ↓
   Email Verification (optional / future)
                ↓
          Role Selection
 tre (primary marketplace role)
                ↓
        Profile Completion
   (%, missing fields, role rules)
                ↓
     Status → ACTIVE (when complete)
                ↓
     Role-specific Dashboard
```

### Login (returning user)

```
Login (Password | OAuth | OTP)
        ↓
  Account status check
        ↓
 Issue token + LoginHistory
        ↓
 If profile incomplete → Profile Completion
 Else → Dashboard
```

### Logout

```
Authenticated Logout request
        ↓
 Invalidate session / refresh token
        ↓
 Clear client auth state
        ↓
 Public landing / login
```

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Password hashing | Modern KDF (bcrypt/argon2); no plaintext storage |
| JWT authentication | Signed access tokens; short TTL; validated on protected routes |
| Refresh tokens (optional) | Rotating refresh tokens stored server-side; revoke on logout |
| Rate limiting | Register, login, OTP send/verify, OAuth callback abuse protections |
| Account lockout | Temporary lock after repeated failed password attempts |
| Secure cookies | `HttpOnly`, `Secure`, `SameSite` when cookie sessions used |
| CSRF protection | Required for cookie-based session mutations |
| Input validation | Strict server-side validation for all auth/profile inputs |
| Audit logging | Login, logout, role changes, status changes |
| HTTPS-only | TLS required in all non-local environments |
| Secrets management | OAuth client secrets and JWT keys in secure config stores |
| PII minimization | Do not log passwords, OTPs, or full tokens |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Auth endpoints p95 < 500ms excluding external SMS/OAuth provider latency |
| **Scalability** | Stateless access-token validation; horizontal scale of API nodes |
| **Reliability** | Transactional user creation; graceful degradation if SMS provider fails |
| **Security** | OWASP ASVS-aligned controls for authentication and session management |
| **Accessibility** | WCAG 2.1 AA for registration, login, role selection, and profile forms |
| **Mobile responsiveness** | Auth and onboarding usable on mobile web; API-ready for future native apps |

---

# Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Credential stuffing / brute force | Account takeover | Rate limits, lockout, generic errors, monitoring |
| SMS OTP interception / SIM swap | Account takeover | Attempt caps, anomaly flags, future 2FA |
| OAuth account confusion/linking abuse | Wrong account merge | Explicit link confirmation; audit trail |
| Incomplete profiles publishing junk supply | Marketplace quality drop | Hard publish gates (XFY-006) |
| Multi-role complexity too early | UX/engineering sprawl | Primary role UX now; secondary roles schema-ready |
| Phone uniqueness vs OAuth email-only users | Onboarding dead-ends | Clear data policies; progressive phone capture |
| Provider outages (SMS/OAuth) | Signup conversion drop | Multiple auth methods; status messaging |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points | Type |
|--------|------|----------|--------|------|
| XFY-001 | Build User Registration API | P0 | 8 | Backend |
| XFY-002 | Build Login & Logout API | P0 | 5 | Backend |
| XFY-003 | Role Selection Screen | P0 | 5 | Frontend + API |
| XFY-004 | OAuth Integration | P1 | 13 | Full-stack |
| XFY-005 | Mobile OTP Login | P1 | 8 | Full-stack |
| XFY-006 | User Profile Completion | P0 | 8 | Full-stack |
| | **Total** | | **47** | |

**Suggested sprint sequencing**

1. XFY-001 → XFY-002 → XFY-003 → XFY-006 (MVP critical path)  
2. XFY-005 and XFY-004 in parallel once core password auth is stable  

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| Two-factor authentication | TOTP/SMS step-up for sensitive actions |
| Passkeys | WebAuthn passwordless authentication |
| Biometric login | Native app biometrics over secure session unlock |
| Enterprise SSO | SAML/OIDC for large manufacturers and organizations |
| Organization invitations | Invite team members under a company account |
| Email verification mandatory gate | Require verified email before ACTIVE |
| Full KYB business verification | Document upload + admin adjudication |
| Session device manager | View/revoke active sessions |
| Risk-based authentication | Step-up challenges on anomalous login |

---

## Traceability

| Downstream artifact | Use of this epic |
|---------------------|------------------|
| PRD | Auth scope and acceptance boundaries |
| SRS | Functional + non-functional requirements |
| Technical Design | Schema, API contracts, security controls |
| Jira / Azure DevOps | Import tickets XFY-001–XFY-006 |
| Release 1 Roadmap | Prerequisite for manufacturer/visionary marketplace modules |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
