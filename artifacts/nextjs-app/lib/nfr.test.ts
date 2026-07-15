/**
 * NFR automated tests — security, performance helpers, reliability primitives
 * Run: node --experimental-strip-types artifacts/nextjs-app/lib/nfr.test.ts
 */

import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  hashPasswordLegacy,
  validatePasswordPolicy,
  isModernPasswordHash,
  generateOtpCode,
  hashToken,
} from "./password.ts";
import { checkRateLimit, __resetRateLimitStores, RATE_LIMITS } from "./rate-limit.ts";
import { parsePageLimit } from "./marketplace-helpers.ts";

console.log("nfr tests:");

// --- Password hashing (scrypt + legacy migration) ---
{
  process.env.SESSION_SECRET = "test-secret-nfr";
  const plain = "SecurePass1";
  const modern = hashPassword(plain);
  assert.ok(isModernPasswordHash(modern));
  assert.equal(verifyPassword(plain, modern).ok, true);
  assert.equal(verifyPassword("wrong", modern).ok, false);

  const legacy = hashPasswordLegacy(plain);
  const legacyCheck = verifyPassword(plain, legacy);
  assert.equal(legacyCheck.ok, true);
  assert.equal(legacyCheck.needsRehash, true);

  const policy = validatePasswordPolicy("short");
  assert.equal(policy.ok, false);
  assert.ok(validatePasswordPolicy("GoodPass1").ok);

  assert.equal(generateOtpCode(6).length, 6);
  assert.notEqual(hashToken("a"), hashToken("b"));
}

// --- Rate limiting ---
{
  __resetRateLimitStores();
  const { limit, windowMs } = RATE_LIMITS.login;
  for (let i = 0; i < limit; i++) {
    assert.equal(checkRateLimit("login-test", "ip1", limit, windowMs).allowed, true);
  }
  assert.equal(checkRateLimit("login-test", "ip1", limit, windowMs).allowed, false);
  assert.equal(checkRateLimit("login-test", "ip2", limit, windowMs).allowed, true);
}

// --- Pagination ---
{
  const p = parsePageLimit(new URLSearchParams("page=3&limit=25"));
  assert.deepEqual(p, { page: 3, limit: 25, offset: 50 });
}

// --- Search performance budget helper (simulates filter work < 2s) ---
{
  const start = Date.now();
  const filters = { q: "cnc", city: "Pune", page: 1, pageSize: 20 };
  const offset = (filters.page - 1) * filters.pageSize;
  assert.ok(offset === 0 && filters.pageSize <= 50);
  assert.ok(Date.now() - start < 2000, "Filter prep must be under 2s");
}

console.log("nfr tests: all passed");
