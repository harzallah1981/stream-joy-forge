// Notifications + read-status helpers (localStorage backed)
import { SAMPLE_DOCS, type DocItem } from "@/lib/documents";

const READ_KEY = "tunisair_doc_reads_v1";

export type ReadMap = Record<string, string>; // docId -> ISO date

export function loadReads(userEmail: string): ReadMap {
  try {
    const raw = localStorage.getItem(`${READ_KEY}:${userEmail}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
export function markRead(userEmail: string, docId: string) {
  const m = loadReads(userEmail);
  m[docId] = new Date().toISOString();
  localStorage.setItem(`${READ_KEY}:${userEmail}`, JSON.stringify(m));
}
export function isRead(userEmail: string, docId: string): boolean {
  return !!loadReads(userEmail)[docId];
}

export function unreadDocs(userEmail: string): DocItem[] {
  const m = loadReads(userEmail);
  return SAMPLE_DOCS.filter((d) => !m[d.id]);
}
export function readDocs(userEmail: string): DocItem[] {
  const m = loadReads(userEmail);
  return SAMPLE_DOCS.filter((d) => !!m[d.id]);
}

// Notification list: recent docs + updated docs + unread (deduped)
export type Notif = {
  id: string;
  kind: "new" | "updated" | "unread";
  doc: DocItem;
};
export function buildNotifications(userEmail: string): Notif[] {
  const now = Date.now();
  const SEVEN = 7 * 86400000;
  const reads = loadReads(userEmail);
  const out: Notif[] = [];
  for (const d of SAMPLE_DOCS) {
    const t = new Date(d.date).getTime();
    const fresh = now - t < 60 * 86400000; // within ~2 months
    if (fresh && !reads[d.id]) out.push({ id: `new-${d.id}`, kind: "new", doc: d });
  }
  for (const d of SAMPLE_DOCS) {
    if (/Rev (1[0-9]|[7-9])/.test(d.version)) {
      out.push({ id: `upd-${d.id}`, kind: "updated", doc: d });
    }
  }
  for (const d of SAMPLE_DOCS) {
    if (!reads[d.id]) out.push({ id: `unr-${d.id}`, kind: "unread", doc: d });
  }
  // dedupe by doc id keeping first kind seen
  const seen = new Set<string>();
  return out.filter((n) => (seen.has(n.doc.id) ? false : seen.add(n.doc.id))).slice(0, 30);
}
