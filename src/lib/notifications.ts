// Notifications + read-status helpers (localStorage backed)
//
// Logic: the bell indicator must only light up when a *new* document
// (or a new revision of an existing one) appears AFTER the user has
// already discovered the existing catalogue. We snapshot the document
// list the first time a user opens the app ("baseline"); only docs
// added or revised relative to that baseline are notified. The
// indicator clears for a given doc only when the user performs a
// real access (view / download), which calls `markRead`.
import { SAMPLE_DOCS, type DocItem } from "@/lib/documents";

const READ_KEY = "tunisair_doc_reads_v1";
const BASELINE_KEY = "tunisair_doc_baseline_v1";

export type ReadMap = Record<string, string>; // docId -> ISO date
export type BaselineMap = Record<string, string>; // docId -> version known at baseline

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
  // Also refresh the baseline entry for that doc so a later revision
  // re-triggers a notification.
  const b = loadBaseline(userEmail);
  const cur = SAMPLE_DOCS.find((d) => d.id === docId);
  if (cur) {
    b[docId] = cur.version;
    localStorage.setItem(`${BASELINE_KEY}:${userEmail}`, JSON.stringify(b));
  }
}
export function isRead(userEmail: string, docId: string): boolean {
  return !!loadReads(userEmail)[docId];
}

function loadBaselineRaw(userEmail: string): BaselineMap | null {
  try {
    const raw = localStorage.getItem(`${BASELINE_KEY}:${userEmail}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function loadBaseline(userEmail: string): BaselineMap {
  const existing = loadBaselineRaw(userEmail);
  if (existing) return existing;
  // First visit: snapshot the current catalogue so nothing is flagged
  // as "new" until something actually changes server-side.
  const seed: BaselineMap = {};
  for (const d of SAMPLE_DOCS) seed[d.id] = d.version;
  localStorage.setItem(`${BASELINE_KEY}:${userEmail}`, JSON.stringify(seed));
  return seed;
}

export function unreadDocs(userEmail: string): DocItem[] {
  const m = loadReads(userEmail);
  return SAMPLE_DOCS.filter((d) => !m[d.id]);
}
export function readDocs(userEmail: string): DocItem[] {
  const m = loadReads(userEmail);
  return SAMPLE_DOCS.filter((d) => !!m[d.id]);
}

export type Notif = {
  id: string;
  kind: "new" | "updated";
  doc: DocItem;
};

// Only surface docs whose id/version differs from the per-user baseline
// AND that have not yet been opened (markRead). Legacy "unread backlog"
// is intentionally not shown — the bell flags genuine novelty only.
export function buildNotifications(userEmail: string): Notif[] {
  const baseline = loadBaseline(userEmail);
  const reads = loadReads(userEmail);
  const out: Notif[] = [];
  for (const d of SAMPLE_DOCS) {
    if (reads[d.id]) continue;
    const known = baseline[d.id];
    if (known === undefined) {
      out.push({ id: `new-${d.id}`, kind: "new", doc: d });
    } else if (known !== d.version) {
      out.push({ id: `upd-${d.id}`, kind: "updated", doc: d });
    }
  }
  return out.slice(0, 30);
}
