import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shield, BarChart3, Pencil, Archive } from "lucide-react";
import { usePageTitle } from "@/lib/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  QUARTERS,
  MONTHS,
  impactSolTunisie,
  impactSolEtranger,
  safaD03,
  opsSolMensuel,
  pct,
  type SafetyEvent,
} from "@/lib/safety-data";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const MONTH_INDEX: Record<string, number> = {
  JAN: 0, "FÉV": 1, MAR: 2, AVR: 3, MAI: 4, JUN: 5,
  JUL: 6, "AOÛ": 7, SEP: 8, OCT: 9, NOV: 10, "DÉC": 11,
};
function loadEventsForYear(year: number): SafetyEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`tunisair_events_${year}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function autoAnomaliesByMonth(year: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of loadEventsForYear(year)) {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) continue;
    const m = Object.keys(MONTH_INDEX).find((k) => MONTH_INDEX[k] === d.getMonth());
    if (m) out[m] = (out[m] ?? 0) + 1;
  }
  return out;
}

export const Route = createFileRoute("/safety/spi")({
  head: () => ({ meta: [{ title: "Indicateurs SPI — Tunisair Ground Safety" }] }),
  component: SpiDashboard,
});

const CURRENT_YEAR = 2026;
type SpiSnapshot = {
  impactSolTunisie: typeof impactSolTunisie;
  impactSolEtranger: typeof impactSolEtranger;
  safaD03: typeof safaD03;
  opsSolMensuel: typeof opsSolMensuel;
};

const storageKey = (y: number) => `tunisair_spi_${y}`;

function loadSpi(year: number): SpiSnapshot {
  try {
    const raw = localStorage.getItem(storageKey(year));
    if (raw) return JSON.parse(raw);
  } catch {}
  if (year === CURRENT_YEAR) {
    return { impactSolTunisie, impactSolEtranger, safaD03, opsSolMensuel };
  }
  // empty template
  const emptyQ = Object.fromEntries(QUARTERS.map((q) => [q, { vols: null, damages: null }])) as typeof impactSolTunisie;
  const emptySafa = Object.fromEntries(QUARTERS.map((q) => [q, { inspections: null, ecarts: null }])) as typeof safaD03;
  const emptyM = Object.fromEntries(MONTHS.map((m) => [m, { anomalies: null, vols: null }])) as typeof opsSolMensuel;
  return { impactSolTunisie: emptyQ, impactSolEtranger: { ...emptyQ }, safaD03: emptySafa, opsSolMensuel: emptyM };
}
function saveSpi(year: number, s: SpiSnapshot) {
  localStorage.setItem(storageKey(year), JSON.stringify(s));
}
function listYears(): number[] {
  const set = new Set<number>([CURRENT_YEAR]);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("tunisair_spi_")) {
      const y = Number(k.slice("tunisair_spi_".length));
      if (!Number.isNaN(y)) set.add(y);
    }
  }
  return Array.from(set).sort((a, b) => b - a);
}

function SpiDashboard() {
  usePageTitle("Indicateurs SPI", "KPIs securite — Ground Damage, SAFA, Taux ops · Multi-annee");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [year, setYear] = useState(CURRENT_YEAR);
  const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
  const [data, setData] = useState<SpiSnapshot>(() => loadSpi(CURRENT_YEAR));
  const [editing, setEditing] = useState<null | { table: keyof SpiSnapshot; key: string; labels: [string, string]; values: { a: number | null; b: number | null }; aKey: string; bKey: string }>(null);
  const [newYearOpen, setNewYearOpen] = useState(false);

  useEffect(() => { setYears(listYears()); }, []);
  useEffect(() => { setData(loadSpi(year)); }, [year]);

  const autoAnomalies = useMemo(() => autoAnomaliesByMonth(year), [year]);


  const persist = (next: SpiSnapshot) => {
    setData(next);
    saveSpi(year, next);
  };

  const archiveAndNewYear = (newYear: number) => {
    saveSpi(year, data);
    const empty = loadSpi(newYear);
    saveSpi(newYear, empty);
    setYears(listYears().includes(newYear) ? listYears() : [...listYears(), newYear].sort((a, b) => b - a));
    setYear(newYear);
    setNewYearOpen(false);
    toast.success(`Année ${newYear} créée. Données ${year} archivées.`);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-red-500" />
          Indicateurs de Performance Securite (SPI) — {year}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}{y !== CURRENT_YEAR ? " (archive)" : ""}</option>
            ))}
          </select>
          {isAdmin && (
            <Button variant="outline" onClick={() => setNewYearOpen(true)} className="h-9 cursor-pointer gap-1.5">
              <Archive className="h-4 w-4" /> Nouvelle année
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Taux Ground Damages — Tunisie" icon={<Shield className="h-4 w-4" />}>
          <QuarterTable
            data={data.impactSolTunisie}
            keys={["vols", "damages"]}
            labels={["Nbr vols", "Dommages au sol"]}
            isAdmin={isAdmin}
            onEdit={(q) => setEditing({
              table: "impactSolTunisie", key: q,
              labels: ["Nbr vols", "Dommages au sol"],
              values: { a: data.impactSolTunisie[q as keyof typeof impactSolTunisie].vols, b: data.impactSolTunisie[q as keyof typeof impactSolTunisie].damages },
              aKey: "vols", bKey: "damages",
            })}
            showTaux
          />
        </Panel>
        <Panel title="Taux Ground Damages — Etranger" icon={<Shield className="h-4 w-4" />}>
          <QuarterTable
            data={data.impactSolEtranger}
            keys={["vols", "damages"]}
            labels={["Nbr vols", "Dommages au sol"]}
            isAdmin={isAdmin}
            onEdit={(q) => setEditing({
              table: "impactSolEtranger", key: q,
              labels: ["Nbr vols", "Dommages au sol"],
              values: { a: data.impactSolEtranger[q as keyof typeof impactSolEtranger].vols, b: data.impactSolEtranger[q as keyof typeof impactSolEtranger].damages },
              aKey: "vols", bKey: "damages",
            })}
            showTaux
          />
        </Panel>
        <Panel title="Indicateur SAFA D03" icon={<BarChart3 className="h-4 w-4" />} className="lg:col-span-2">
          <QuarterTable
            data={data.safaD03}
            keys={["inspections", "ecarts"]}
            labels={["Nbr inspections SAFA", "SAFA Findings"]}
            isAdmin={isAdmin}
            onEdit={(q) => setEditing({
              table: "safaD03", key: q,
              labels: ["Nbr inspections SAFA", "SAFA Findings"],
              values: { a: data.safaD03[q as keyof typeof safaD03].inspections, b: data.safaD03[q as keyof typeof safaD03].ecarts },
              aKey: "inspections", bKey: "ecarts",
            })}
            showTaux
          />
        </Panel>
      </div>

      <Panel title={`TAUX DES EVENEMENTS OPS SOL / MOIS — ${year}`} icon={<BarChart3 className="h-4 w-4" />} className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-3 pl-2 pr-4 text-left font-semibold">Indicateur</th>
                {MONTHS.map((m) => (<th key={m} className="px-2 py-3 text-center font-semibold">{m}</th>))}
                {isAdmin && <th className="px-2 py-3 text-center font-semibold">Edit</th>}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 pl-2 pr-4 text-slate-700">Nbr Anomalies <span className="text-[10px] text-slate-400">(auto registre)</span></td>
                {MONTHS.map((m) => {
                  const manual = data.opsSolMensuel[m].anomalies;
                  const auto = autoAnomalies[m] ?? 0;
                  const isAuto = manual === null;
                  const val = isAuto ? auto : manual;
                  return (
                    <td key={m} className={"px-2 py-3 text-center tabular-nums " + (isAuto ? "italic text-blue-600" : "text-slate-700")} title={isAuto ? "Valeur auto depuis le registre des événements" : "Valeur saisie par l'admin"}>
                      {val ?? "—"}
                    </td>
                  );
                })}
                {isAdmin && <td />}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 pl-2 pr-4 text-slate-700">Nbr Vols/Mois</td>
                {MONTHS.map((m) => (<td key={m} className="px-2 py-3 text-center tabular-nums text-slate-700">{data.opsSolMensuel[m].vols ?? "—"}</td>))}
                {isAdmin && <td />}
              </tr>
              <tr>
                <td className="py-3 pl-2 pr-4 font-semibold text-slate-900">Taux (/vol)</td>
                {MONTHS.map((m) => {
                  const manual = data.opsSolMensuel[m].anomalies;
                  const eff = manual === null ? (autoAnomalies[m] ?? null) : manual;
                  return (<td key={m} className="px-2 py-3 text-center font-semibold tabular-nums text-blue-600">{pct(eff, data.opsSolMensuel[m].vols)}</td>);
                })}
                {isAdmin && <td />}
              </tr>

              {isAdmin && (
                <tr>
                  <td />
                  {MONTHS.map((m) => (
                    <td key={m} className="px-1 py-2 text-center">
                      <button
                        onClick={() => setEditing({
                          table: "opsSolMensuel", key: m,
                          labels: ["Anomalies", "Vols"],
                          values: { a: data.opsSolMensuel[m].anomalies, b: data.opsSolMensuel[m].vols },
                          aKey: "anomalies", bKey: "vols",
                        })}
                        className="cursor-pointer rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        title={`Modifier ${m}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  ))}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <Dialog open onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier — {editing.key}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{editing.labels[0]}</Label>
                <Input
                  type="number"
                  value={editing.values.a ?? ""}
                  onChange={(e) => setEditing({ ...editing, values: { ...editing.values, a: e.target.value === "" ? null : Number(e.target.value) } })}
                />
              </div>
              <div>
                <Label>{editing.labels[1]}</Label>
                <Input
                  type="number"
                  value={editing.values.b ?? ""}
                  onChange={(e) => setEditing({ ...editing, values: { ...editing.values, b: e.target.value === "" ? null : Number(e.target.value) } })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const next: SpiSnapshot = JSON.parse(JSON.stringify(data));
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (next as any)[editing.table][editing.key] = {
                    [editing.aKey]: editing.values.a,
                    [editing.bKey]: editing.values.b,
                  };
                  persist(next);
                  setEditing(null);
                  toast.success("Indicateur mis à jour");
                }}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {newYearOpen && (
        <NewYearDialog
          existingYears={years}
          onCancel={() => setNewYearOpen(false)}
          onConfirm={archiveAndNewYear}
        />
      )}
    </div>
  );
}

function Panel({ title, icon, children, className }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; }) {
  return (
    <div className={"overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm " + (className ?? "")}>
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 text-white">
        <span className="text-blue-300">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QuarterTable({
  data, keys, labels, showTaux, isAdmin, onEdit,
}: {
  data: Record<string, Record<string, number | null>>;
  keys: [string, string];
  labels: [string, string];
  showTaux?: boolean;
  isAdmin: boolean;
  onEdit: (q: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <th className="py-3 pl-2 pr-4 text-left font-semibold" />
          {QUARTERS.map((q) => (<th key={q} className="px-3 py-3 text-center font-semibold">{q}</th>))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-slate-100">
          <td className="py-3 pl-2 pr-4 text-slate-700">{labels[0]}</td>
          {QUARTERS.map((q) => (<td key={q} className="px-3 py-3 text-center tabular-nums text-slate-700">{data[q][keys[0]] ?? "—"}</td>))}
        </tr>
        <tr className={showTaux ? "border-b border-slate-100" : ""}>
          <td className="py-3 pl-2 pr-4 text-slate-700">{labels[1]}</td>
          {QUARTERS.map((q) => (<td key={q} className="px-3 py-3 text-center tabular-nums text-slate-700">{data[q][keys[1]] ?? "—"}</td>))}
        </tr>
        {showTaux && (
          <tr className={isAdmin ? "border-b border-slate-100" : ""}>
            <td className="py-3 pl-2 pr-4 font-semibold text-slate-900">Taux</td>
            {QUARTERS.map((q) => (<td key={q} className="px-3 py-3 text-center font-semibold tabular-nums text-blue-600">{pct(data[q][keys[1]] ?? null, data[q][keys[0]] ?? null)}</td>))}
          </tr>
        )}
        {isAdmin && (
          <tr>
            <td className="py-2 pl-2 pr-4 text-xs text-slate-400">Actions</td>
            {QUARTERS.map((q) => (
              <td key={q} className="px-1 py-2 text-center">
                <button
                  onClick={() => onEdit(q)}
                  className="cursor-pointer rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                  title={`Modifier ${q}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

function NewYearDialog({ existingYears, onCancel, onConfirm }: { existingYears: number[]; onCancel: () => void; onConfirm: (y: number) => void; }) {
  const [y, setY] = useState<number>(Math.max(...existingYears) + 1);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Archiver et démarrer une nouvelle année</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">
          Les indicateurs de l'année en cours sont conservés et accessibles via le sélecteur d'année.
        </p>
        <div>
          <Label>Année</Label>
          <Input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onConfirm(y)} className="bg-blue-600 hover:bg-blue-700">Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
