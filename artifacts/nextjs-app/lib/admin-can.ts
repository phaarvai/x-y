export function can(
  permissions: string[],
  module: string,
  action = "read",
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin || permissions.includes("*:*")) return true;
  return (
    permissions.includes(`${module}:${action}`) ||
    permissions.includes(`${module}:manage`) ||
    (action === "read" && permissions.includes(`${module}:write`))
  );
}
