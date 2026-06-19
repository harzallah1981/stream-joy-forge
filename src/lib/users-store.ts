// Local users store (demo) — admin can add internal/external accounts.
export type UserType = "admin" | "internal_standard" | "internal_manager" | "external";

// Module keys an admin can grant/revoke for "internal_standard" users.
// (admin/manager/external have fixed defaults — see permissions.ts)
export const AVAILABLE_MODULES: { key: string; label: string }[] = [
  { key: "documentation", label: "Documentation" },
  { key: "forms", label: "Formulaires" },
  { key: "safety", label: "Safety (Événements & SPI)" },
  { key: "admin", label: "Administration" },
];

export type StoredUser = {
  id: string;
  email: string;          // primary email (login)
  emails: string[];       // T5: up to 3 emails (notifications/relances)
  username: string;
  // Legacy role kept for back-compat with existing auth code.
  role: "admin" | "internal" | "external";
  userType: UserType;
  modules: string[];
  org: string;
  workplace: string;      // T18: required at user creation
  // T29: principal admin (super) vs specific admin (limited)
  adminScope?: "principal" | "specific";
  createdAt: string;
};

const KEY = "tunisair_users_v1";

function roleFromType(t: UserType): StoredUser["role"] {
  if (t === "admin") return "admin";
  if (t === "external") return "external";
  return "internal";
}

export function defaultModulesFor(t: UserType): string[] {
  if (t === "internal_standard") return ["documentation"];
  return [];
}

function normalize(u: Partial<StoredUser> & Pick<StoredUser, "email" | "username">): StoredUser {
  const userType: UserType =
    (u.userType as UserType | undefined) ??
    (u.role === "admin" ? "admin" : u.role === "external" ? "external" : "internal_standard");
  const emails = (u.emails ?? [u.email]).filter(Boolean).slice(0, 3);
  if (!emails.includes(u.email)) emails.unshift(u.email);
  return {
    id: u.id ?? `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: u.email,
    emails: emails.slice(0, 3),
    username: u.username,
    userType,
    role: roleFromType(userType),
    modules: u.modules ?? defaultModulesFor(userType),
    org: u.org ?? "",
    workplace: u.workplace ?? "",
    adminScope: userType === "admin" ? (u.adminScope ?? "specific") : undefined,
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

export function loadUsers(): StoredUser[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const arr = raw ? (JSON.parse(raw) as Partial<StoredUser>[]) : [];
    return arr.map((u) => normalize(u as never));
  } catch {
    return [];
  }
}
export function saveUsers(u: StoredUser[]) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
export function addUser(u: Omit<StoredUser, "id" | "createdAt" | "role"> & { role?: StoredUser["role"] }) {
  const users = loadUsers();
  const next = normalize(u as never);
  users.push(next);
  saveUsers(users);
  try { import("./auth").then((m) => m.markMustChange(next.email)); } catch {}
  return next;
}
export function updateUser(id: string, patch: Partial<StoredUser>) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return;
  const merged = { ...users[idx], ...patch } as StoredUser;
  if (patch.userType) merged.role = roleFromType(merged.userType);
  users[idx] = merged;
  saveUsers(users);
}
export function removeUser(id: string) {
  saveUsers(loadUsers().filter((u) => u.id !== id));
}
