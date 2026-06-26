import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Shield, BookOpen, AlertTriangle, BarChart3, Plane } from "lucide-react";
import { useMemo } from "react";
import { usePageTitle } from "@/lib/page-title";
import { events as DEFAULT_EVENTS, type SafetyEvent } from "@/lib/safety-data";
import { TEST_CREDENTIALS, useAuth } from "@/lib/auth";
import { UserDashboard } from "@/components/user-dashboard";
import { useI18n } from "@/lib/i18n";
import { loadAcks } from "@/lib/acknowledgements";
import { defaultModulesFor, loadUsers, type StoredUser, type UserType } from "@/lib/users-store";
import { loadAdminAlerts } from "@/lib/reminders";
import { canUserSeeReadSignDoc, getAllDocs, requiresAckForCategory } from "@/lib/documents";
import { loadReads } from "@/lib/notifications";
import { loadSafa, SAFA_CURRENT_YEAR } from "@/lib/safa-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de Bord — Tunisair Ground Ops" },
      { name: "description", content: "Vue d'ensemble des opérations sol & conformité." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  usePageTitle(t("welcome"), t("welcome_desc"));

  const isExternal = user?.role === "external" || user?.userType === "external";
  if (isExternal) {
    return <Navigate to="/read-sign" replace />;
  }
  if (user && user.role !== "admin") {
    return <UserDashboard />;
  }
  return <AdminDashboard />;
}

function loadCurrentYearEvents(): SafetyEvent[] {
  if (typeof window === "undefined") return DEFAULT_EVENTS;
  try {
    const raw = localStorage.getItem(`tunisair_events_${SAFA_CURRENT_YEAR}`);
    return raw ? JSON.parse(raw) : DEFAULT_EVENTS;
  } catch { return DEFAULT_EVENTS; }
}

function seededUserType(u: (typeof TEST_CREDENTIALS)[number]): UserType {
  return u.userType ?? (u.role === "admin" ? "admin" : u.role === "external" ? "external" : "internal_standard");
}

function loadKnownUsers(): StoredUser[] {
  const byEmail = new Map<string, StoredUser>();
  for (const u of TEST_CREDENTIALS) {
    const userType = seededUserType(u);
    byEmail.set(u.email.toLowerCase(), {
      id: `seed-${u.email}`,
      email: u.email,
      emails: u.emails ?? [u.email],
      username: u.username,
      role: u.role,
      userType,
      modules: u.modules ?? defaultModulesFor(userType),
      org: u.org,
      workplace: u.workplace ?? u.org ?? "—",
      adminScope: u.adminScope,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  }
  for (const u of loadUsers()) byEmail.set(u.email.toLowerCase(), u);
  return Array.from(byEmail.values());
}

function computeOverdueAlerts(users: StoredUser[]) {
  const now = Date.now();
  const docs = getAllDocs().filter((d) => d.requireAck !== false && requiresAckForCategory(d.category));
  return users.flatMap((u) => {
    if (u.userType === "admin") return [];
    const reads = loadReads(u.email);
    return docs
      .filter((doc) => canUserSeeReadSignDoc(doc, u.userType))
      .map((doc) => ({ doc, daysOverdue: Math.floor((now - new Date(doc.date).getTime()) / 86400000) }))
      .filter(({ doc, daysOverdue }) => daysOverdue >= 8 && !reads[doc.id])
      .map(({ doc, daysOverdue }) => ({
        id: `dyn-${u.email}-${doc.id}`,
        at: new Date().toISOString(),
        email: u.email,
        username: u.username,
        docId: doc.id,
        docTitle: doc.title,
        daysOverdue,
      }));
  });
}

function AdminDashboard() {
  const events = useMemo(() => loadCurrentYearEvents(), []);
  const safa = useMemo(() => loadSafa(SAFA_CURRENT_YEAR), []);
  const open = events.filter((e) => e.statut === "EN COURS").length;
  const closed = events.filter((e) => e.statut === "CLÔTURÉ").length;
  const high = events.filter((e) => e.prob * e.grav >= 20).length;
  const safaOpen = safa.filter((s) => s.statut !== "CLÔTURÉ").length;
  const safaClosed = safa.filter((s) => s.statut === "CLÔTURÉ").length;

  const { acks, users, alerts, readingRate, totalRead, totalAssignments, docsCount } = useMemo(() => {
    const acks = loadAcks();
    const users = loadKnownUsers().filter((u) => u.userType !== "admin");
    const dynamicAlerts = computeOverdueAlerts(users);
    const storedAlerts = loadAdminAlerts();
    const alertMap = new Map([...storedAlerts, ...dynamicAlerts].map((a) => [`${a.email}|${a.docId}`, a]));
    const alerts = Array.from(alertMap.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
    const docs = getAllDocs();
    const totalAssignments = users.length * docs.length;
    let totalRead = 0;
    for (const u of users) {
      const reads = loadReads(u.email);
      totalRead += docs.filter((d) => reads[d.id]).length;
    }
    const readingRate = totalAssignments > 0 ? Math.round((totalRead / totalAssignments) * 100) : 0;
    return { acks, users, alerts, readingRate, totalRead, totalAssignments, docsCount: docs.length };
  }, []);

  // Build bar groups
  const securityBars = [
    { label: "Total événements", value: events.length, color: "bg-slate-500", max: Math.max(events.length, 1) },
    { label: "En cours", value: open, color: "bg-orange-500", max: Math.max(events.length, 1) },
    { label: "Clôturés", value: closed, color: "bg-emerald-500", max: Math.max(events.length, 1) },
    { label: "Sévérité ≥ 20", value: high, color: "bg-red-500", max: Math.max(events.length, 1) },
  ];
  const safaBars = [
    { label: "Total écarts D03", value: safa.length, color: "bg-blue-500", max: Math.max(safa.length, 1) },
    { label: "Non clôturés", value: safaOpen, color: "bg-orange-500", max: Math.max(safa.length, 1) },
    { label: "Clôturés", value: safaClosed, color: "bg-emerald-500", max: Math.max(safa.length, 1) },
  ];
  const indicatorBars = [
    { label: "Utilisateurs suivis", value: users.length, color: "bg-indigo-500", max: Math.max(users.length, docsCount, 1) },
    { label: "Documents diffusés", value: docsCount, color: "bg-blue-500", max: Math.max(users.length, docsCount, 1) },
    { label: "Accusés enregistrés", value: acks.length, color: "bg-emerald-500", max: Math.max(acks.length, totalAssignments, 1) },
    { label: "Lectures effectuées", value: totalRead, color: "bg-teal-500", max: Math.max(acks.length, totalAssignments, 1) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarPanel
          title="Sécurité — Événements"
          icon={<Shield className="h-4 w-4" />}
          tone="from-red-600 to-rose-600"
          bars={securityBars}
        />
        <BarPanel
          title="Écarts SAFA D03"
          icon={<Plane className="h-4 w-4" />}
          tone="from-blue-600 to-indigo-600"
          bars={safaBars}
        />
        <BarPanel
          title="Indicateurs Documentaires"
          icon={<BookOpen className="h-4 w-4" />}
          tone="from-emerald-600 to-teal-600"
          bars={indicatorBars}
          footer={
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Taux global de lecture</span>
                <span className="font-semibold text-emerald-700">{readingRate}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: readingRate + "%" }} />
              </div>
            </div>
          }
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertes Lectures en retard (J+8)
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            {alerts.length}
          </span>
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Utilisateur</th>
                <th className="px-4 py-2 text-left font-semibold">Document</th>
                <th className="px-4 py-2 text-right font-semibold">Jours de retard</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={3} className="py-6 text-center text-sm text-slate-500">Aucune alerte. ✓</td></tr>
              ) : alerts.slice(0, 25).map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2 text-slate-900">{a.username} <span className="text-xs text-slate-500">({a.email})</span></td>
                  <td className="px-4 py-2 text-slate-700">{a.docTitle}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-red-600">{a.daysOverdue} j</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type Bar = { label: string; value: number; color: string; max: number };

function BarPanel({
  title, icon, tone, bars, footer,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  bars: Bar[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={"flex items-center gap-2 bg-gradient-to-r px-4 py-2.5 text-white " + tone}>
        <span className="text-white/90">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <BarChart3 className="ml-auto h-3.5 w-3.5 text-white/70" />
      </div>
      <div className="space-y-2.5 p-4">
        {bars.map((b) => {
          const pct = b.max > 0 ? Math.max(4, Math.round((b.value / b.max) * 100)) : 0;
          return (
            <div key={b.label}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-slate-600">{b.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{b.value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={"h-full rounded-full " + b.color} style={{ width: pct + "%" }} />
              </div>
            </div>
          );
        })}
        {footer}
      </div>
    </div>
  );
}

