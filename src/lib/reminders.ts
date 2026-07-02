// T6: Automated reminders for unread documents.
// Frontend-only demo: runs on each app load (per user).
// - J+3 / J+5 / J+7 → user reminder (toast + notification badge already covers UI)
// - J+8 → admin alert (logged in tunisair_admin_alerts_v1)
import { getAllDocs, requiresAckForCategory } from "./documents";
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

export async function runReminderCheck(currentUserEmail: string | undefined) {
  if (typeof window === "undefined") return;
  const fired = loadFired();
  const now = Date.now();
  const users = loadUsers();
  const docs = getAllDocs().filter((d) => d.requireAck !== false && requiresAckForCategory(d.category));

  // 1) Per-user in-app reminders, in English, one per stage (J+3 / J+5 / J+7).
  if (currentUserEmail) {
    const { pushReminder } = await import("./user-reminders");
    const currentUser = users.find((x) => x.email.toLowerCase() === currentUserEmail.toLowerCase());
    const displayName = currentUser?.username ?? currentUserEmail;
    const reads = loadReads(currentUserEmail);
    let toastedCount = 0;
    for (const doc of docs) {
      if (reads[doc.id]) continue;
      const days = daysBetween(doc.date, now);
      for (let i = 0; i < STAGES.length; i++) {
        const stage = STAGES[i];
        const k = `${currentUserEmail}|${doc.id}|${stage}`;
        if (days >= stage && !fired[k]) {
          fired[k] = new Date().toISOString();
          toastedCount++;
          pushReminder(
            currentUserEmail,
            {
              docId: doc.id,
              docTitle: doc.title,
              docReference: doc.reference ?? "",
              category: doc.category,
            },
            `System · Reminder ${i + 1} (J+${stage}) — Dear ${displayName}, you have a document to read: "${doc.title}". Please open it and acknowledge receipt.`,
          );
        }
      }
    }
    if (toastedCount > 0) {
      toast.warning(`${toastedCount} pending reading reminder(s)`, {
        description: "Open the bell icon to see the full list.",
      });
    }
  }

  // 2) J+8 admin alerts (for ALL stored users)
  for (const u of users) {
    if (u.userType === "admin") continue;
    const reads = loadReads(u.email);
    for (const doc of docs) {
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
