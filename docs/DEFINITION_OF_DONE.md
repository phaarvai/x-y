# Definition of Done — X!Y The Explorer Factory

A ticket, feature, bug fix, enhancement, API, UI component, or database change is **Done** only when every applicable item below is satisfied.

If any item is incomplete, the work remains **In Progress**. Generate an outstanding-items list for the developer.

Canonical enforcement: Cursor rule `.cursor/rules/definition-of-done.mdc`, PR template `.github/pull_request_template.md`, script `pnpm run dod:check`.

---

## 1. Feature implementation

- [ ] Business logic completed per user story / acceptance criteria
- [ ] Backend implementation completed (if applicable)
- [ ] Frontend implementation completed (if applicable)
- [ ] Database changes completed (migrations + schema sync, if applicable)
- [ ] Existing functionality unaffected (no regressions)
- [ ] No placeholders, stubs, or incomplete code on shipped paths

## 2. Code quality

- [ ] Clean architecture / existing project patterns followed
- [ ] SOLID and DRY respected; modular reusable code
- [ ] Meaningful names; consistent formatting
- [ ] No dead/unused code or unnecessary duplication
- [ ] Comments only where they add non-obvious value

## 3. Testing

- [ ] Unit tests where applicable
- [ ] Integration or workflow tests for critical paths
- [ ] API tests for new/changed endpoints
- [ ] Component/UI tests where appropriate
- [ ] At least **one happy-path** test
- [ ] At least **one failure-path** test (validation, authz, conflict, empty, etc.)

## 4. API contracts

For every new or modified API:

- [ ] Endpoint, method, auth requirements documented
- [ ] Request / response schemas and validation rules
- [ ] Error responses and status codes
- [ ] Example request and response
- [ ] OpenAPI/Swagger updated (`artifacts/api-server/src/lib/openapi-spec.ts` and/or `@workspace/api-spec`)

## 5. UI quality

- [ ] Desktop, tablet, and mobile layouts work
- [ ] Design system / existing UI patterns followed
- [ ] Accessibility: labels, keyboard focus, semantic HTML, contrast where feasible

## 6. Authorization & security

- [ ] RBAC enforced server-side
- [ ] Ownership checks where resources are user-scoped
- [ ] Authentication required on protected routes
- [ ] Unauthorized → `401`; Forbidden → `403`
- [ ] Sensitive data protected (no secrets in logs/client)
- [ ] Input validation + output encoding
- [ ] Secure/private file access for confidential uploads

## 7. State handling

- [ ] Loading state
- [ ] Success state / feedback
- [ ] Empty state
- [ ] Error state with user-friendly message

## 8. Data validation

- [ ] Frontend: required fields, format, length, clear errors
- [ ] Backend: Zod/schema + business rules + constraints
- [ ] Frontend validation does **not** replace backend validation

## 9. Functional / manual testing

- [ ] Happy path verified
- [ ] Failure path verified
- [ ] Permission validation verified
- [ ] Validation errors verified
- [ ] Relevant edge cases verified

## 10. Code review

- [ ] Reviewed (or ready for review with DoD checklist filled)
- [ ] Review comments addressed
- [ ] Security and performance considerations checked

## 11. Staging verification

- [ ] Build succeeds
- [ ] Migrations succeed
- [ ] APIs and UI work in staging
- [ ] No console/server errors; integrations checked

## 12. Backward compatibility

- [ ] Existing APIs still function
- [ ] Existing data intact
- [ ] Existing workflows operational
- [ ] No breaking changes unless explicitly approved

## 13. Performance

- [ ] Efficient queries; indexes considered
- [ ] Pagination where lists can grow
- [ ] Lazy loading / asset optimization where appropriate
- [ ] Acceptable API response times (no obvious regressions)

## 14. Logging & auditing

- [ ] Error logging for failures
- [ ] Audit / security / business event logging where applicable (admin, payments, bookings, auth)

## 15. Documentation

- [ ] API docs / OpenAPI updated if APIs changed
- [ ] Migration notes if schema changed
- [ ] README/setup updated if setup changed
- [ ] Feature doc updated when behavior is non-obvious

## 16. Final acceptance

- [ ] Acceptance criteria fully met
- [ ] Tests include happy + failure paths
- [ ] Merged only after review approval
- [ ] Staging verified
- [ ] No critical security issues; no regression

---

## Machine-readable gate

Run locally before marking Done:

```bash
pnpm run dod:check
```

Provide a filled checklist path (default `docs/dod-status.md`) or use the interactive generator:

```bash
pnpm run dod:init -- --ticket XFY-000 --title "Short title"
```

Then edit `docs/dod-status.md` and re-run `pnpm run dod:check`.
