import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadUsers, type UserType } from "./users-store";

export type Role = "admin" | "internal" | "external";
export type AuthUser = {
  email: string;
  username: string;
  role: Role;
  org: string;
  userType?: UserType;
  modules?: string[];
};

function hydrateFromStore(u: AuthUser): AuthUser {
  try {
    const stored = loadUsers().find((s) => s.email.toLowerCase() === u.email.toLowerCase());
    if (stored) return { ...u, userType: stored.userType, modules: stored.modules, org: stored.org || u.org };
  } catch {}
  // Derive sensible default from legacy role
  const fallback: UserType = u.role === "admin" ? "admin" : u.role === "external" ? "external" : "internal_standard";
  const defaultMods = fallback === "admin" ? ["documentation","forms","safety","admin"] : ["documentation"];
  return { ...u, userType: u.userType ?? fallback, modules: u.modules ?? defaultMods };
}

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

// ---- local password store (overrides for demo auth) ----
const PW_KEY = "tunisair_pw_overrides_v1";
const MUST_CHANGE_KEY = "tunisair_must_change_v1";
const RESET_LOG_KEY = "tunisair_pw_reset_log_v1";

function loadMap(k: string): Record<string, string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveMap(k: string, v: Record<string, string>) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
function loadSet(k: string): string[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveSet(k: string, v: string[]) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

function findAccount(idOrEmail: string) {
  return ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === idOrEmail.toLowerCase() ||
      a.username.toLowerCase() === idOrEmail.toLowerCase(),
  );
}

export function findAccountByEmail(email: string) {
  return ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function getEffectivePassword(email: string): string | null {
  const acc = findAccountByEmail(email);
  if (!acc) return null;
  const overrides = loadMap(PW_KEY);
  return overrides[acc.email.toLowerCase()] ?? acc.password;
}

export function resetPassword(email: string, newPassword: string): boolean {
  const acc = findAccountByEmail(email);
  if (!acc) return false;
  const overrides = loadMap(PW_KEY);
  overrides[acc.email.toLowerCase()] = newPassword;
  saveMap(PW_KEY, overrides);
  // log reset for admin visibility
  const log = (() => {
    try {
      const raw = localStorage.getItem(RESET_LOG_KEY);
      return raw ? (JSON.parse(raw) as Array<{ email: string; at: string }>) : [];
    } catch { return []; }
  })();
  log.unshift({ email: acc.email, at: new Date().toISOString() });
  try { localStorage.setItem(RESET_LOG_KEY, JSON.stringify(log.slice(0, 50))); } catch {}
  // clear must-change flag after successful reset
  const ms = loadSet(MUST_CHANGE_KEY).filter((e) => e !== acc.email.toLowerCase());
  saveSet(MUST_CHANGE_KEY, ms);
  return true;
}

export function getResetLog(): Array<{ email: string; at: string }> {
  try {
    const raw = localStorage.getItem(RESET_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function markMustChange(email: string) {
  const ms = new Set(loadSet(MUST_CHANGE_KEY));
  ms.add(email.toLowerCase());
  saveSet(MUST_CHANGE_KEY, [...ms]);
}

export function isMustChange(email: string): boolean {
  return loadSet(MUST_CHANGE_KEY).includes(email.toLowerCase());
}

export function clearMustChange(email: string) {
  saveSet(MUST_CHANGE_KEY, loadSet(MUST_CHANGE_KEY).filter((e) => e !== email.toLowerCase()));
}

export function validateStrongPassword(pw: string): string | null {
  if (pw.length < 8) return "min_8";
  if (!/[A-Z]/.test(pw)) return "need_upper";
  if (!/[a-z]/.test(pw)) return "need_lower";
  if (!/[0-9]/.test(pw)) return "need_digit";
  if (!/[^A-Za-z0-9]/.test(pw)) return "need_special";
  return null;
}

type Ctx = {
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: true; mustChange: boolean } | { ok: false; error: string };
  logout: () => void;
  ready: boolean;
  mustChange: boolean;
  changePassword: (currentPassword: string, newPassword: string) => { ok: true } | { ok: false; error: string };
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "tunisair_auth_user_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        setUser(u);
        setMustChange(isMustChange(u.email));
      }
    } catch {}
    setReady(true);
  }, []);

  const login: Ctx["login"] = (email, password) => {
    const acc = findAccount(email);
    if (!acc) return { ok: false, error: "Identifiants invalides / Invalid credentials" };
    const effective = getEffectivePassword(acc.email);
    if (effective !== password) return { ok: false, error: "Identifiants invalides / Invalid credentials" };
    const { password: _p, ...u } = acc;
    setUser(u);
    localStorage.setItem(KEY, JSON.stringify(u));
    const mc = isMustChange(u.email);
    setMustChange(mc);
    return { ok: true, mustChange: mc };
  };

  const logout = () => {
    setUser(null);
    setMustChange(false);
    localStorage.removeItem(KEY);
  };

  const changePassword: Ctx["changePassword"] = (currentPassword, newPassword) => {
    if (!user) return { ok: false, error: "not_logged_in" };
    const effective = getEffectivePassword(user.email);
    if (effective !== currentPassword) return { ok: false, error: "wrong_current" };
    const v = validateStrongPassword(newPassword);
    if (v) return { ok: false, error: v };
    resetPassword(user.email, newPassword);
    clearMustChange(user.email);
    setMustChange(false);
    return { ok: true };
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, ready, mustChange, changePassword }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function useIsAdmin() {
  return useAuth().user?.role === "admin";
}
