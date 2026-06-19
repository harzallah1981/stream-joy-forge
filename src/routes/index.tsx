import { createFileRoute } from "@tanstack/react-router";
import { Shield, BookOpen, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { useMemo } from "react";
import { usePageTitle } from "@/lib/page-title";
import { events as DEFAULT_EVENTS } from "@/lib/safety-data";
import { useAuth } from "@/lib/auth";
import { UserDashboard } from "@/components/user-dashboard";
import { useI18n } from "@/lib/i18n";
import { loadAcks } from "@/lib/acknowledgements";
import { loadUsers } from "@/lib/users-store";
import { loadAdminAlerts } from "@/lib/reminders";
import { SAMPLE_DOCS } from "@/lib/documents";
import { loadReads } from "@/lib/notifications";

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

function AdminDashboard() {
  const events = DEFAULT_EVENTS;
  const open = events.filter((e) => e.statut === "EN COURS").length;
  const closed = events.filter((e) => e.statut === "CLÔTURÉ").length;
  const high = events.filter((e) => e.prob * e.grav >= 20).length;

  const { acks, users, alerts, readingRate } = useMemo(() => {
    const acks = loadAcks();
    const users = loadUsers().filter((u) => u.userType !== "admin");
    const alerts = loadAdminAlerts();
    const totalAssignments = users.length * SAMPLE_DOCS.length;
    let totalRead = 0;
    for (const u of users) {
      const reads = loadReads(u.email);
      totalRead += SAMPLE_DOCS.filter((d) => reads[d.id]).length;
    }
    const readingRate = totalAssignments > 0 ? Math.round((totalRead / totalAssignments) * 100) : 0;
    return { acks, users, alerts, readingRate };
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Résumé Sécurité */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-red-500" />
          Résumé Sécurité — Ground Safety 2026
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Stat n={events.length} label="Événements total" tone="slate" />
          <Stat n={open} label="En cours" tone="orange" />
          <Stat n={closed} label="Clôturés" tone="green" />
          <Stat n={high} label="Sévérité ≥ 20" tone="red" />
        </div>
      </section>

      {/* Résumé Lectures */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Résumé Lectures Documentaires
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Stat n={users.length} label="Utilisateurs suivis" tone="slate" icon={Users} />
          <Stat n={SAMPLE_DOCS.length} label="Documents diffusés" tone="blue" icon={BookOpen} />
          <Stat n={acks.length} label="Accusés enregistrés" tone="green" icon={CheckCircle2} />
          <Stat n={readingRate} label="Taux global de lecture" tone="blue" suffix="%" />
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-700">Progression globale</span>
            <span className="font-semibold text-blue-700">{readingRate}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-blue-500" style={{ width: readingRate + "%" }} />
          </div>
        </div>
      </section>

      {/* Alertes Admin J+8 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
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

function Stat({
  n, label, tone, suffix, icon: Icon,
}: {
  n: number; label: string;
  tone: "red" | "green" | "slate" | "orange" | "blue";
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const styles = {
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <div className={"flex items-center gap-3 rounded-lg p-4 " + styles}>
      {Icon && <Icon className="h-6 w-6 opacity-70" />}
      <div>
        <div className="text-3xl font-bold leading-none">{n}{suffix ?? ""}</div>
        <div className="mt-1 text-xs">{label}</div>
      </div>
    </div>
  );
}
