import { createFileRoute } from "@tanstack/react-router";
import { Shield, BookOpen, AlertTriangle, BarChart3, Plane } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { DocIndicatorsDialog } from "@/components/doc-indicators-dialog";
import { loadReadSign } from "@/lib/read-sign-store";

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
  const nav = useNavigate();
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onFocus); };
  }, []);
  const events = useMemo(() => loadCurrentYearEvents(), [tick]);
  const safa = useMemo(() => loadSafa(SAFA_CURRENT_YEAR), [tick]);

  const open = events.filter((e) => e.statut === "EN COURS").length;
  const closed = events.filter((e) => e.statut === "CLÔTURÉ").length;
  const high = events.filter((e) => e.prob * e.grav >= 20).length;
  const safaOpen = safa.filter((s) => s.statut !== "CLÔTURÉ").length;
  const safaClosed = safa.filter((s) => s.statut === "CLÔTURÉ").length;

  const { acks, users, alerts, readsRequired, readsDone, acksRequired, acksDone, docsCount } = useMemo(() => {
    const acks = loadAcks();
    const users = loadKnownUsers().filter((u) => u.userType !== "admin");
    const dynamicAlerts = computeOverdueAlerts(users);
    const storedAlerts = loadAdminAlerts();
    const alertMap = new Map([...storedAlerts, ...dynamicAlerts].map((a) => [`${a.email}|${a.docId}`, a]));
    const alerts = Array.from(alertMap.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
    const docs = getAllDocs();

    // Reading requirements = for each (user, document the user is allowed to see)
    let readsRequired = 0, readsDone = 0;
    let acksRequired = 0, acksDone = 0;
    for (const u of users) {
      const reads = loadReads(u.email);
      for (const d of docs) {
        if (!canUserSeeReadSignDoc(d, u.userType)) continue;
        readsRequired++;
        if (reads[d.id]) readsDone++;
        if (d.requireAck !== false && requiresAckForCategory(d.category)) {
          acksRequired++;
          if (acks.some((a) => a.userEmail.toLowerCase() === u.email.toLowerCase() && a.docId === d.id)) acksDone++;
        }
      }
    }
    // Add Read & Sign assignments
    const rs = loadReadSign();
    for (const d of rs) {
      readsRequired += d.assignedEmails.length;
      acksRequired += d.assignedEmails.length;
      for (const e of d.assignedEmails) {
        if (acks.some((a) => a.userEmail.toLowerCase() === e && a.docId === d.id)) {
          acksDone++; readsDone++;
        }
      }
    }
    return { acks, users, alerts, readsRequired, readsDone, acksRequired, acksDone, docsCount: docs.length };
  }, [tick]);

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
  // Use X/Y display (no percent)
  const indicatorBars = [
    { label: "Utilisateurs suivis", display: String(users.length), value: users.length, color: "bg-indigo-500", max: Math.max(users.length, docsCount, 1) },
    { label: "Documents diffusés", display: String(docsCount), value: docsCount, color: "bg-blue-500", max: Math.max(users.length, docsCount, 1) },
    { label: "Accusés enregistrés", display: `${acksDone} / ${acksRequired}`, value: acksDone, color: "bg-emerald-500", max: Math.max(acksRequired, 1) },
    { label: "Lectures effectuées", display: `${readsDone} / ${readsRequired}`, value: readsDone, color: "bg-teal-500", max: Math.max(readsRequired, 1) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarPanel
          title="Sécurité — Événements"
          icon={<Shield className="h-4 w-4" />}
          tone="from-red-600 to-rose-600"
          bars={securityBars}
          onTitleClick={() => nav({ to: "/safety/events" })}
        />
        <BarPanel
          title="Écarts SAFA D03"
          icon={<Plane className="h-4 w-4" />}
          tone="from-blue-600 to-indigo-600"
          bars={safaBars}
          onTitleClick={() => nav({ to: "/safety/safa-d03" })}
        />
        <BarPanel
          title="Indicateurs Documentaires"
          icon={<BookOpen className="h-4 w-4" />}
          tone="from-emerald-600 to-teal-600"
          bars={indicatorBars}
          onTitleClick={() => setIndicatorsOpen(true)}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setAlertsOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-t-xl px-5 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertes Lectures en retard (J+8)
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{alerts.length}</span>
          <span className="ml-auto text-xs text-slate-500">{alertsOpen ? "▲ Masquer" : "▼ Afficher"}</span>
        </button>
        {alertsOpen && (
          <div className="border-t border-slate-100 p-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
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
          </div>
        )}
      </section>

      <DocIndicatorsDialog open={indicatorsOpen} onOpenChange={setIndicatorsOpen} />
      <GlobalReadingRateDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      {/* avoid unused-vars warning */}
      <span className="hidden">{acks.length}</span>
    </div>
  );
}

type Bar = { label: string; value: number; color: string; max: number; display?: string };

function BarPanel({
  title, icon, tone, bars, footer, onTitleClick,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  bars: Bar[];
  footer?: React.ReactNode;
  onTitleClick?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onTitleClick}
        disabled={!onTitleClick}
        className={"flex w-full items-center gap-2 bg-gradient-to-r px-4 py-2.5 text-white " + tone + (onTitleClick ? " cursor-pointer hover:brightness-110" : "")}
      >
        <span className="text-white/90">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <BarChart3 className="ml-auto h-3.5 w-3.5 text-white/70" />
      </button>
      <div className="space-y-2.5 p-4">
        {bars.map((b) => {
          const pct = b.max > 0 ? Math.max(4, Math.round((b.value / b.max) * 100)) : 0;
          return (
            <div key={b.label}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-slate-600">{b.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{b.display ?? b.value}</span>
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
