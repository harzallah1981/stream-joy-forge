import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Users,
  Shield,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { usePageTitle } from "@/lib/page-title";
import { events } from "@/lib/safety-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de Bord — Tunisair Ground Ops" },
      { name: "description", content: "Vue d'ensemble des opérations sol & conformité." },
    ],
  }),
  component: Home,
});

interface Kpi {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

function Home() {
  usePageTitle("Tableau de Bord", "Vue d'ensemble des operations sol & conformite");

  const open = events.filter((e) => e.statut === "EN COURS").length;
  const closed = events.filter((e) => e.statut === "CLÔTURÉ").length;
  const total = events.length;

  const kpis: Kpi[] = [
    {
      label: "Documents en diffusion",
      value: "3",
      subtitle: "1 internes · 1 externes · 1 forms",
      icon: FileText,
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      label: "Personnel total",
      value: "2",
      subtitle: "1 formes · 0 perimees",
      icon: Users,
      iconBg: "bg-green-100 text-green-600",
    },
    {
      label: "Evenements securite",
      value: String(total),
      subtitle: `${open} en cours · ${closed} clotures`,
      icon: Shield,
      iconBg: "bg-red-100 text-red-600",
    },
    {
      label: "Prochaine formation",
      value: "28/06/2026",
      subtitle: "Planifiee par l'admin",
      icon: BookOpen,
      iconBg: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {k.label}
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{k.value}</div>
              </div>
              <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-lg " + k.iconBg}>
                <k.icon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-500">{k.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Conformité */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConformiteDocumentation />
        <ConformiteFormation />
      </div>

      {/* Résumé sécurité */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-red-500" />
          Resume Securite — Ground Safety 2026
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SafetyStat n={open} label="Evenements en cours" tone="red" />
          <SafetyStat n={closed} label="Evenements clotures" tone="green" />
          <SafetyStat n={total} label="Total evenements" tone="slate" />
        </div>
      </div>
    </div>
  );
}

function ConformiteDocumentation() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Conformite Documentation
      </h2>
      <div className="mt-4 space-y-4">
        <ProgressRow label="Documents internes - Taux de conformite" value={0} />
        <ProgressRow label="Documents externes - Taux de conformite" value={0} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center gap-2 text-green-700">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-green-100">✓</span>
          <span>0 recus</span>
        </div>
        <div className="flex items-center gap-2 text-orange-600">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-orange-100">⊘</span>
          <span>0 non recus</span>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-blue-500" style={{ width: value + "%" }} />
      </div>
    </div>
  );
}

function ConformiteFormation() {
  // Demo numbers matching the original screenshot: 1 valide, 0 others — 50%
  const valide = 1;
  const expirant = 0;
  const perimee = 0;
  const inconnu = 1;
  const totalP = valide + expirant + perimee + inconnu;
  const rate = totalP > 0 ? Math.round((valide / totalP) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Users className="h-5 w-5 text-blue-500" />
        Conformite Formation Personnel
      </h2>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-slate-700">Taux de conformite formation</span>
          <span className="font-semibold text-orange-600">{rate}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-orange-400" style={{ width: rate + "%" }} />
        </div>
      </div>
      <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
        <LegendRow color="bg-green-500" label="Valide" n={valide} />
        <LegendRow color="bg-orange-400" label="Expirant bientot" n={expirant} />
        <LegendRow color="bg-red-500" label="Perimee" n={perimee} />
        <LegendRow color="bg-slate-400" label="Inconnu" n={inconnu} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-700">
        <span className={"h-2.5 w-2.5 rounded-full " + color} />
        {label}
      </span>
      <span className="font-semibold text-slate-900">{n}</span>
    </div>
  );
}

function SafetyStat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "red" | "green" | "slate";
}) {
  const styles = {
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    slate: "bg-slate-50 text-slate-700",
  }[tone];
  return (
    <div className={"rounded-lg p-6 text-center " + styles}>
      <div className="text-4xl font-bold">{n}</div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  );
}
