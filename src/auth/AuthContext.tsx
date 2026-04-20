import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "vn_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email) {
      // TODO: replace with POST /api/auth/login
      await new Promise((r) => setTimeout(r, 300));
      const name = email.split("@")[0].toUpperCase();
      persist({ id: btoa(email).slice(0, 12), email, name });
    },
    async signup(email, _password, name) {
      // TODO: replace with POST /api/auth/signup
      await new Promise((r) => setTimeout(r, 300));
      persist({ id: btoa(email).slice(0, 12), email, name: name || email.split("@")[0].toUpperCase() });
    },
    logout() { persist(null); },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
