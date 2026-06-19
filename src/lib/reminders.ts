// T6: Automated reminders for unread documents.
// Frontend-only demo: runs on each app load (per user).
// - J+3 / J+5 / J+7 → user reminder (toast + notification badge already covers UI)
// - J+8 → admin alert (logged in tunisair_admin_alerts_v1)
import { SAMPLE_DOCS } from "./documents";
import { loadReads } from "./notifications";
import { loadUsers } from "./users-store";
import { toast } from "sonner";

const FIRED_KEY = "tunisair_reminders_fired_v1"; // { "email|docId|stage": iso }
const ADMIN_ALERTS_KEY = "tunisair_admin_alerts_v1";

type FiredMap = Record<string, string>;
function loadFired(): FiredMap {
  try { return JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}"); } catch { return {}; }
}
function saveFired(m: FiredMap) { localStorage.setItem(FIRED_KEY, JSON.stringify(m)); }

export type AdminAlert = {
  id: string;
  at: string;
  email: string;
  username: string;
  docId: string;
  docTitle: string;
  daysOverdue: number;
};
export function loadAdminAlerts(): AdminAlert[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_ALERTS_KEY) ?? "[]"); } catch { return []; }
}
function pushAdminAlert(a: AdminAlert) {
  const list = loadAdminAlerts();
  if (list.some((x) => x.email === a.email && x.docId === a.docId)) return;
  list.unshift(a);
  localStorage.setItem(ADMIN_ALERTS_KEY, JSON.stringify(list.slice(0, 200)));
}

const STAGES = [3, 5, 7] as const;

function daysBetween(a: string, b: number): number {
  return Math.floor((b - new Date(a).getTime()) / 86400000);
}

export function runReminderCheck(currentUserEmail: string | undefined) {
  if (typeof window === "undefined") return;
  const fired = loadFired();
  const now = Date.now();
  const users = loadUsers();

  // 1) Per-user reminders for the *current* signed-in user (silent toast batch).
  if (currentUserEmail) {
    const reads = loadReads(currentUserEmail);
    let toastedCount = 0;
    for (const doc of SAMPLE_DOCS) {
      if (reads[doc.id]) continue;
      const days = daysBetween(doc.date, now);
      for (const stage of STAGES) {
        const k = `${currentUserEmail}|${doc.id}|${stage}`;
        if (days >= stage && !fired[k]) {
          fired[k] = new Date().toISOString();
          toastedCount++;
        }
      }
    }
    if (toastedCount > 0) {
      toast.warning(`${toastedCount} rappel(s) lecture en attente`, {
        description: "Consultez la cloche pour la liste complète.",
      });
    }
  }

  // 2) J+8 admin alerts (for ALL stored users)
  for (const u of users) {
    if (u.userType === "admin") continue;
    const reads = loadReads(u.email);
    for (const doc of SAMPLE_DOCS) {
      if (reads[doc.id]) continue;
      const days = daysBetween(doc.date, now);
      if (days >= 8) {
        pushAdminAlert({
          id: `al-${u.email}-${doc.id}`,
          at: new Date().toISOString(),
          email: u.email,
          username: u.username,
          docId: doc.id,
          docTitle: doc.title,
          daysOverdue: days,
        });
      }
    }
  }

  saveFired(fired);
}
