import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/types";
import { authApi } from "@/api/authApi";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_USER = "vn_auth_user";
const STORAGE_TOKEN = "vn_auth_token";
const STORAGE_REFRESH = "vn_auth_refresh";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN);
    const cachedRaw = localStorage.getItem(STORAGE_USER);
    if (!token) { setLoading(false); return; }

    // Hydrate cached user immediately for snappy UI, then verify with backend.
    if (cachedRaw) {
      try { setUser(JSON.parse(cachedRaw)); } catch { /* ignore */ }
    }
    authApi.me(token)
      .then((u) => {
        setUser(u);
        localStorage.setItem(STORAGE_USER, JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_REFRESH);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = (u: User, token: string, refreshToken: string) => {
    setUser(u);
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_REFRESH);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const res = await authApi.login(email, password);
      persistSession(res.user, res.token, res.refreshToken);
    },
    async signup(email, password, name) {
      const res = await authApi.signup(email, password, name);
      persistSession(res.user, res.token, res.refreshToken);
    },
    logout() {
      const token = localStorage.getItem(STORAGE_TOKEN);
      if (token) void authApi.logout(token).catch(() => { /* ignore */ });
      clearSession();
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
