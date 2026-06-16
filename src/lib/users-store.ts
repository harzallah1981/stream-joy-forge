// Local users store (demo) — admin can add internal/external accounts.
export type StoredUser = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "internal" | "external";
  org: string;
  createdAt: string;
};

const KEY = "tunisair_users_v1";

export function loadUsers(): StoredUser[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function saveUsers(u: StoredUser[]) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
export function addUser(u: Omit<StoredUser, "id" | "createdAt">) {
  const users = loadUsers();
  users.push({ ...u, id: `u-${Date.now()}`, createdAt: new Date().toISOString() });
  saveUsers(users);
  // New admin-created accounts must change their password on first login.
  try {
    // dynamic import avoids a circular dependency in some bundlers
    import("./auth").then((m) => m.markMustChange(u.email));
  } catch {}
}
export function removeUser(id: string) {
  saveUsers(loadUsers().filter((u) => u.id !== id));
}
