# EPIC 17 — Data Architecture, APIs, Security, and Infrastructure

Production foundation for X!Y (The Explorer Factory): API layering, migrations, file storage, RBAC, audit logs, OpenAPI, CI/CD, and observability.

## Tickets

| ID | Scope |
|----|--------|
| XFY-083 | Frontend foundation (UI kit, layouts, guards, env) |
| XFY-084 | Backend API foundation (`/api/v1`, middleware, health) |
| XFY-085 | Database migrations + seeds |
| XFY-086 | Secure file storage |
| XFY-087 | Marketplace RBAC |
| XFY-088 | Audit logging APIs |
| XFY-089 | OpenAPI / Swagger at `/api/docs` |
| XFY-090 | CI/CD pipeline |

## Compatibility

- Existing `/api/*` routes and schemas are preserved.
- New versioned endpoints are mounted under `/api/v1/*`.
- Audit log table gains additive columns (`old_value`, `new_value`, `user_agent`).
- Session-token auth remains the default (Bearer). JWT refresh is not required for MVP; invalid sessions still clear client tokens.

## Quick links

- [Developer guide](./EPIC_17_DEVELOPER_GUIDE.md)
- Migration SQL: `lib/db/migrations/0017_epic17_infrastructure.sql`
- CI: `.github/workflows/ci.yml`
