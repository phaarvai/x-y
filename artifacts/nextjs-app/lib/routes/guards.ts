import {
  ADMIN_ROLE_ALIASES,
  LEGAL_SUITE_ROLES,
  PLATFORM_ROLES,
  isAdminRole,
  normalizeRole,
} from "@/lib/config/roles";
import type { Role } from "@/lib/types/platform";

/** Routes accessible without authentication */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/browse",
  "/pricing",
  "/legal",
  "/ai-assistant",
  "/for-business",
  "/provider-setup",
  "/booking-confirmation",
  "/403",
  "/forbidden",
  "/admin/login",
  "/admin/unauthorized",
] as const;

/** Path prefixes that require a signed-in user */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/bookings",
  "/booking",
  "/reviews",
  "/legal/dashboard",
] as const;

/** Default home dashboard per platform role */
export const ROLE_HOME_PATHS: Record<string, string> = {
  PLATFORM_ADMIN: "/admin",
  MANUFACTURER: "/dashboard/manufacturer",
  VISIONARY: "/dashboard/visionary",
  VENDOR: "/dashboard/provider",
  LABOR_SUPPLIER: "/dashboard/provider",
  LOGISTICS_PROVIDER: "/dashboard/provider",
  LEGAL_PROVIDER: "/legal/dashboard",
  INVESTOR: "/dashboard",
  MARKET_LEAD: "/dashboard",
};

/** Role-specific path prefixes (used by middleware soft guard + RoleGuard) */
export const ROLE_PATH_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: [...ADMIN_ROLE_ALIASES, "PLATFORM_ADMIN", "SUPER_ADMIN"] },
  { prefix: "/dashboard/manufacturer", roles: ["MANUFACTURER"] },
  { prefix: "/dashboard/visionary", roles: ["VISIONARY"] },
  { prefix: "/dashboard/provider", roles: ["VENDOR", "LABOR_SUPPLIER", "LOGISTICS_PROVIDER"] },
  {
    prefix: "/legal/dashboard",
    roles: ["LEGAL_PROVIDER", ...LEGAL_SUITE_ROLES],
  },
];

function stripBasePath(pathname: string, basePath = ""): string {
  const base = basePath.replace(/\/$/, "");
  if (!base) return pathname || "/";
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || "/";
  return pathname || "/";
}

export function normalizePath(pathname: string, basePath = ""): string {
  const path = stripBasePath(pathname, basePath);
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function isPublicRoute(pathname: string, basePath = ""): boolean {
  const path = normalizePath(pathname, basePath);
  if ((PUBLIC_ROUTES as readonly string[]).includes(path)) return true;
  if (path.startsWith("/manufacturer/")) return true;
  if (path.startsWith("/legal/") && !path.startsWith("/legal/dashboard")) return true;
  return false;
}

export function requiresAuth(pathname: string, basePath = ""): boolean {
  const path = normalizePath(pathname, basePath);
  if (isPublicRoute(path, "")) return false;
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function allowedRolesForPath(pathname: string, basePath = ""): Role[] | null {
  const path = normalizePath(pathname, basePath);

  for (const { prefix, roles } of ROLE_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return roles as Role[];
    }
  }

  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    return [...PLATFORM_ROLES] as Role[];
  }

  if (requiresAuth(path, "")) return null;
  return null;
}

export function userHasRoleAccess(
  userRole: string | null | undefined,
  allowedRoles: Role[] | null,
  options?: { isAdminUser?: boolean },
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;

  const normalized = normalizeRole(userRole);
  if (!normalized) return false;

  if (options?.isAdminUser && allowedRoles.some((r) => isAdminRole(r))) return true;
  if (isAdminRole(normalized) && allowedRoles.some((r) => isAdminRole(r))) return true;

  if (allowedRoles.includes(normalized as Role)) return true;

  if (
    normalized === "LEGAL_PROVIDER" &&
    allowedRoles.some((r) => (LEGAL_SUITE_ROLES as readonly string[]).includes(r))
  ) {
    return true;
  }

  if (
    (LEGAL_SUITE_ROLES as readonly string[]).includes(normalized) &&
    allowedRoles.includes("LEGAL_PROVIDER" as Role)
  ) {
    return true;
  }

  return false;
}

export function homePathForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  if (!normalized) return "/dashboard";
  return ROLE_HOME_PATHS[normalized] ?? "/dashboard";
}
