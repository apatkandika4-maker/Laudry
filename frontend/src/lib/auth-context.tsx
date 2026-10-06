"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiRequest<{ user: User }>("/me")
      .then((res) => setUser(res.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ user: User; token: string }>("/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(res.token);
      setUser(res.user);
      router.replace("/pos");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch {
      // tetap keluar walau server tidak merespons
    }
    clearToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
