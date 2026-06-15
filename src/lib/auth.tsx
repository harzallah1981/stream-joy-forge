import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "internal" | "external";
export type AuthUser = { email: string; username: string; role: Role; org: string };

const ACCOUNTS: Array<AuthUser & { password: string }> = [
  { email: "admin.ops@tunisair.com.tn", username: "admin_tunisair", password: "Admin2026!", role: "admin", org: "Tunisair Ground Ops" },
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `internal${i + 1}@tunisair.com.tn`,
    username: `internal${i + 1}`,
    password: "Tunisair2026!",
    role: "internal" as Role,
    org: "Tunisair Staff",
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `essair${i + 1}@essair.com.tn`,
    username: `essair${i + 1}`,
    password: "Essair2026!",
    role: "external" as Role,
    org: "Essair Handling",
  })),
];

export const TEST_CREDENTIALS = ACCOUNTS.map(({ password, ...u }) => ({ ...u, password }));

type Ctx = {
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  ready: boolean;
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "tunisair_auth_user_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const login: Ctx["login"] = (email, password) => {
    const acc = ACCOUNTS.find(
      (a) =>
        (a.email.toLowerCase() === email.toLowerCase() ||
          a.username.toLowerCase() === email.toLowerCase()) &&
        a.password === password,
    );
    if (!acc) return { ok: false, error: "Identifiants invalides / Invalid credentials" };
    const { password: _p, ...u } = acc;
    setUser(u);
    localStorage.setItem(KEY, JSON.stringify(u));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(KEY);
  };

  return <AuthCtx.Provider value={{ user, login, logout, ready }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function useIsAdmin() {
  return useAuth().user?.role === "admin";
}
