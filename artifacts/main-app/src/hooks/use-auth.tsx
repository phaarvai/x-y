import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("assistai_token");
    }
    return null;
  });
  
  const queryClient = useQueryClient();

  const login = useCallback((newToken: string) => {
    localStorage.setItem("assistai_token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("assistai_token");
    setToken(null);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function useAuth() {
  const { token, logout } = useAuthContext();
  
  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (isError && (error as any)?.status === 401) {
      logout();
    }
  }, [isError, error, logout]);

  return {
    user: user ?? null,
    isLoading: !!token && isLoading,
    isAuthenticated: !!token && !!user,
  };
}
