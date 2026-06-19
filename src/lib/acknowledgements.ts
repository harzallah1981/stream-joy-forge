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
  // T24: one ack per (user, doc) — do not re-record if already present.
  if (items.some((x) => x.userEmail.toLowerCase() === a.userEmail.toLowerCase() && x.docId === a.docId)) {
    return;
  }
  items.push({ ...a, id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(items));
}

// T24: helper — has this user already acknowledged this document?
export function hasAcked(userEmail: string, docId: string): boolean {
  return loadAcks().some(
    (a) => a.userEmail.toLowerCase() === userEmail.toLowerCase() && a.docId === docId,
  );
}
