/**
 * API-server NFR password + rate-limit smoke tests
 * Run: pnpm --filter @workspace/api-server exec tsx ./src/lib/nfr.test.ts
 */

import assert from "node:assert/strict";
import { hashPassword, verifyPassword, validatePasswordPolicy, hashPasswordLegacy } from "./password.ts";
import { checkRateLimit, __resetRateLimitStores, RATE_LIMITS } from "./rate-limit.ts";

console.log("api-server nfr tests:");

process.env.SESSION_SECRET = "api-nfr-secret";
const hashed = hashPassword("ApiSecure1");
assert.equal(verifyPassword("ApiSecure1", hashed).ok, true);
assert.equal(verifyPassword("ApiSecure1", hashPasswordLegacy("ApiSecure1")).needsRehash, true);
assert.equal(validatePasswordPolicy("weak").ok, false);

__resetRateLimitStores();
const { limit, windowMs } = RATE_LIMITS.register;
for (let i = 0; i < limit; i++) assert.ok(checkRateLimit("reg", "x", limit, windowMs).allowed);
assert.equal(checkRateLimit("reg", "x", limit, windowMs).allowed, false);

console.log("api-server nfr tests: all passed");
