"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

interface User {
  id: number;
  name: string;
  email: string;
  preferredLanguage: string;
  primaryRole?: string | null;
  createdAt: string;
}

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("xiy_token");
    return null;
  });
  const queryClient = useQueryClient();

  const login = useCallback((newToken: string) => {
    localStorage.setItem("xiy_token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("xiy_token");
    setToken(null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}

export function useAuth() {
  const { token, logout } = useAuthContext();

  const { data: user, isLoading, isError, error } = useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error("Unauthorized"), { status: res.status, data: err });
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (isError && (error as any)?.status === 401) logout();
  }, [isError, error, logout]);

  return {
    user: user ?? null,
    isLoading: !!token && isLoading,
    isAuthenticated: !!token && !!user,
  };
}
