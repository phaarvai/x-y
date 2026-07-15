# Agent instructions — X!Y The Explorer Factory

## Definition of Done (mandatory)

Before marking any ticket, feature, bug fix, API, UI, or migration as complete:

1. Follow `.cursor/rules/definition-of-done.mdc` (always applied).
2. Use the full checklist in `docs/DEFINITION_OF_DONE.md`.
3. Maintain `docs/dod-status.md` (`pass` | `fail` | `n/a` per key).
4. Run `pnpm run dod:check` — exit code must be `0`.
5. If anything fails, remain **In Progress** and list **outstanding** items.

PRs must use `.github/pull_request_template.md` and keep OpenAPI in sync when APIs change (`artifacts/api-server/src/lib/openapi-spec.ts` / `@workspace/api-spec`).

## Compatibility

Prefer additive changes. Do not break existing APIs, schemas, or workflows unless explicitly approved.
