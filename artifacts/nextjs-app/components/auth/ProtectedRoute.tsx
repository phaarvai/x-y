"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type ProtectedRouteProps = {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
};

/**
 * Client-side auth guard. Middleware cannot read localStorage tokens;
 * wrap protected page trees with this component.
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const separator = redirectTo.includes("?") ? "&" : "?";
    router.replace(`${redirectTo}${separator}redirect=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, isLoading, pathname, redirectTo, router]);

  if (isLoading) {
    return (
      fallback ?? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Checking authentication" />
        </div>
      )
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
