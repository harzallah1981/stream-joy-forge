// Acknowledgements (Accusés de réception) — local storage demo
export type Ack = {
  id: string;
  userEmail: string;
  userName: string;
  docId: string;
  docTitle: string;
  docReference: string;
  category: string;
  action: "view" | "download";
  date: string; // ISO
};

const KEY = "tunisair_ack_v1";

export function loadAcks(): Ack[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function addAck(a: Omit<Ack, "id" | "date">) {
  const items = loadAcks();
  items.push({ ...a, id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(items));
}
