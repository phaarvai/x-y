/**
 * Run: npx tsx artifacts/api-server/src/lib/admin-permissions.test.ts
 * Or: node --import tsx artifacts/api-server/src/lib/admin-permissions.test.ts
 */

function hasPermission(
  permissions: string[],
  module: string,
  action: string,
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin || permissions.includes("*:*")) return true;
  return (
    permissions.includes(`${module}:${action}`) ||
    permissions.includes(`${module}:manage`) ||
    (action === "read" && permissions.includes(`${module}:write`))
  );
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(hasPermission(["*:*"], "users", "suspend"), "*:* grants all");
assert(hasPermission([], "transactions", "export", true), "super admin bypass");
assert(hasPermission(["users:read"], "users", "read"), "exact permission");
assert(!hasPermission(["users:read"], "users", "suspend"), "deny escalate");
assert(hasPermission(["categories:manage"], "categories", "write"), "manage covers write");
assert(hasPermission(["support:write"], "support", "read"), "write implies read");
assert(!hasPermission(["finance:read"], "transactions", "read"), "no cross-module");
assert(hasPermission(["listings:approve"], "listings", "approve"), "moderation approve");
assert(!hasPermission(["listings:read"], "listings", "approve"), "read does not approve");

console.log("admin-permissions tests: all passed");
