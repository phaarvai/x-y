# DoD status — fill before marking Done

> Generated for local/CI gate. Mark each item `pass`, `fail`, or `n/a`.
> Any `fail` keeps the ticket **In Progress**.

ticket: DOD-ENFORCEMENT
title: Platform Definition of Done enforcement
note: Template resets to fail on `pnpm run dod:init`. Update per ticket before Done.

## checklist

feature_implementation: pass
code_quality: pass
testing_happy_and_failure: pass
api_contracts_openapi: n/a
ui_responsive_a11y: n/a
rbac_security: n/a
state_handling: n/a
validation_fe_be: n/a
functional_manual: pass
code_review: fail
staging_verification: fail
backward_compatibility: pass
performance: n/a
logging_auditing: n/a
documentation: pass

## outstanding

- Code review approval
- Staging verification of CI `dod-gate` job on a sample PR
