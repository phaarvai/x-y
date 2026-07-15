"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

export type AdminMe = {
  id: number;
  name: string;
  email: string;
  preferredLanguage: string;
  primaryRole: string | null;
  adminRoles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
};

export function useAdminMe() {
  const { token } = useAuthContext();

  return useQuery<AdminMe>({
    queryKey: ["admin-me"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error(err.error || "Forbidden"), { status: res.status });
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });
}
