// User reminders pushed by admin ("Remind All" in Acks page).
// Per-user queue stored in localStorage; surfaced in dashboard + bell.
export type UserReminder = {
  id: string;
  docId: string;
  docTitle: string;
  docReference: string;
  category: string;
  at: string;
  fromAdmin: string;
};

const KEY = "tunisair_user_reminders_v1";

type Store = Record<string, UserReminder[]>;
function load(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
function save(s: Store) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function pushReminder(email: string, r: Omit<UserReminder, "id" | "at">, fromAdmin = "admin") {
  const s = load();
  const list = s[email.toLowerCase()] ?? [];
  if (list.some((x) => x.docId === r.docId)) return;
  list.unshift({ ...r, id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), fromAdmin });
  s[email.toLowerCase()] = list.slice(0, 50);
  save(s);
}

export function getReminders(email: string): UserReminder[] {
  return load()[email.toLowerCase()] ?? [];
}

export function clearReminder(email: string, docId: string) {
  const s = load();
  const list = s[email.toLowerCase()] ?? [];
  s[email.toLowerCase()] = list.filter((r) => r.docId !== docId);
  save(s);
}
