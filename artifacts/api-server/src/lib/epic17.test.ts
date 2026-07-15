/**
 * EPIC 17 unit tests — run:
 *   pnpm exec tsx artifacts/api-server/src/lib/epic17.test.ts
 */

import assert from "node:assert/strict";
import { ALLOWED_MIME_TYPES, checksumBuffer, validateUploadMeta } from "./storage/upload-validation";
import { AppError } from "../middlewares/error-handler";
import { normalizeRole, assertOwnership, FALLBACK_EXPORT } from "./epic17-test-helpers";
import { openApiSpec } from "./openapi-spec";
import { config } from "../config/env";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log("epic17 tests:");

run("env config has storage defaults", () => {
  assert.equal(typeof config.storageProvider, "string");
  assert.ok(config.uploadMaxBytes > 0);
  assert.ok(config.rateLimitMax > 0);
});

run("MIME allowlist includes PDF and images", () => {
  assert.ok(ALLOWED_MIME_TYPES.has("application/pdf"));
  assert.ok(ALLOWED_MIME_TYPES.has("image/png"));
  assert.ok(ALLOWED_MIME_TYPES.has("application/zip"));
});

run("validateUploadMeta rejects exe", () => {
  assert.throws(
    () => validateUploadMeta("malware.exe", "application/octet-stream", 100),
    (e: unknown) => e instanceof AppError && e.statusCode === 400,
  );
});

run("validateUploadMeta accepts png", () => {
  validateUploadMeta("photo.png", "image/png", 1024);
});

run("checksum is stable sha256", () => {
  const a = checksumBuffer(Buffer.from("hello"));
  const b = checksumBuffer(Buffer.from("hello"));
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

run("RBAC normalizeRole maps legal suite", () => {
  assert.equal(normalizeRole("CORPORATE_LAWYER"), "LEGAL_PROVIDER");
  assert.equal(normalizeRole("MANUFACTURER"), "MANUFACTURER");
  assert.equal(normalizeRole(null), null);
});

run("ownership denies non-owner", () => {
  assert.throws(
    () =>
      assertOwnership({
        user: { id: 1, isAdminUser: false, primaryRole: "VISIONARY" },
        ownerUserId: 2,
      }),
    (e: unknown) => e instanceof AppError && e.statusCode === 403,
  );
});

run("ownership allows owner", () => {
  assertOwnership({
    user: { id: 5, isAdminUser: false, primaryRole: "MANUFACTURER" },
    ownerUserId: 5,
  });
});

run("ownership allows admin", () => {
  assertOwnership({
    user: { id: 1, isAdminUser: true, primaryRole: "PLATFORM_ADMIN" },
    ownerUserId: 99,
  });
});

run("OpenAPI docs include health and files", () => {
  assert.ok(openApiSpec.paths["/v1/health"]);
  assert.ok(openApiSpec.paths["/v1/system"]);
  assert.ok(openApiSpec.paths["/files/upload"]);
  assert.ok(openApiSpec.paths["/admin/audit-logs"]);
  assert.ok(openApiSpec.components.securitySchemes.BearerAuth);
});

run("fallback permissions export non-empty", () => {
  assert.ok(FALLBACK_EXPORT.PLATFORM_ADMIN.includes("manage_users"));
  assert.ok(FALLBACK_EXPORT.VISIONARY.includes("view"));
  assert.ok(!FALLBACK_EXPORT.VISIONARY.includes("manage_users"));
});

console.log("epic17 tests: all passed");
