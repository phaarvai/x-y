"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { allowedRolesForPath, userHasRoleAccess } from "@/lib/routes/guards";
import type { Role } from "@/lib/types/platform";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

type RoleGuardProps = {
  children: ReactNode;
  /** Explicit allow-list; defaults to roles required for current path */
  allowedRoles?: Role[];
  forbiddenPath?: string;
  loginPath?: string;
  fallback?: ReactNode;
};

/**
 * Client-side role guard. Pair with ProtectedRoute semantics:
 * unauthenticated users → login; wrong role → /403.
 */
export function RoleGuard({
  children,
  allowedRoles,
  forbiddenPath = "/403",
  loginPath = "/login",
  fallback,
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  const requiredRoles = allowedRoles ?? allowedRolesForPath(pathname);
  const isAdminUser = !!(user as { isAdminUser?: boolean } | null)?.isAdminUser;

  const hasAccess =
    isAuthenticated &&
    userHasRoleAccess(user?.primaryRole, requiredRoles, { isAdminUser });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (!requiredRoles || requiredRoles.length === 0) return;
    if (!hasAccess) router.replace(forbiddenPath);
  }, [forbiddenPath, hasAccess, isAuthenticated, isLoading, requiredRoles, router]);

  return (
    <ProtectedRoute redirectTo={loginPath} fallback={fallback}>
      {isLoading ? (
        fallback ?? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" label="Verifying access" />
          </div>
        )
      ) : requiredRoles && requiredRoles.length > 0 && !hasAccess ? null : (
        children
      )}
    </ProtectedRoute>
  );
}
