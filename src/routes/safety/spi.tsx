import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shield, BarChart3, Pencil, Archive, Settings2 } from "lucide-react";
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
import { loadSafa, SAFA_CURRENT_YEAR, type SafaRecord } from "@/lib/safa-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const MONTH_INDEX: Record<string, number> = {
  JAN: 0, "FÉV": 1, MAR: 2, AVR: 3, MAI: 4, JUN: 5,
  JUL: 6, "AOÛ": 7, SEP: 8, OCT: 9, NOV: 10, "DÉC": 11,
};
const QUARTER_MONTHS: Record<string, number[]> = {
  T1: [0, 1, 2], T2: [3, 4, 5], T3: [6, 7, 8], T4: [9, 10, 11],
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
function eventsByMonth(year: number): Record<string, SafetyEvent[]> {
  const out: Record<string, SafetyEvent[]> = {};
  for (const e of loadEventsForYear(year)) {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) continue;
    const m = Object.keys(MONTH_INDEX).find((k) => MONTH_INDEX[k] === d.getMonth());
    if (m) (out[m] = out[m] ?? []).push(e);
  }
  return out;
}
function damagesByQuarter(year: number, scope: "tunisie" | "etranger"): Record<string, SafetyEvent[]> {
  const out: Record<string, SafetyEvent[]> = { T1: [], T2: [], T3: [], T4: [] };
  for (const e of loadEventsForYear(year)) {
    if (e.categorie !== "GSE/DAMAGE") continue;
    const d = new Date(e.date);
    if (d.getFullYear() !== year) continue;
    const isTun = e.escale.toUpperCase() === "TUN";
    if (scope === "tunisie" && !isTun) continue;
    if (scope === "etranger" && isTun) continue;
    const q = Object.entries(QUARTER_MONTHS).find(([, ms]) => ms.includes(d.getMonth()))?.[0];
    if (q) out[q].push(e);
  }
  return out;
}
function safaByQuarter(year: number): Record<string, SafaRecord[]> {
  const out: Record<string, SafaRecord[]> = { T1: [], T2: [], T3: [], T4: [] };
  for (const r of loadSafa(year)) {
    const d = new Date(r.date);
    if (d.getFullYear() !== year) continue;
    const q = Object.entries(QUARTER_MONTHS).find(([, ms]) => ms.includes(d.getMonth()))?.[0];
    if (q) out[q].push(r);
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
  const [details, setDetails] = useState<null | { title: string; columns: string[]; rows: (string | number)[][] }>(null);

  useEffect(() => { setYears(listYears()); }, []);
  useEffect(() => { setData(loadSpi(year)); }, [year]);

  const autoAnomalies = useMemo(() => autoAnomaliesByMonth(year), [year]);
  const damagesTunisie = useMemo(() => damagesByQuarter(year, "tunisie"), [year]);
  const damagesEtranger = useMemo(() => damagesByQuarter(year, "etranger"), [year]);
  const safaQ = useMemo(() => safaByQuarter(year), [year]);
  const eventsM = useMemo(() => eventsByMonth(year), [year]);

  const tipFor = <T extends { date: string; description: string; escale?: string; id?: string }>(items: T[]): string => {
    if (!items || items.length === 0) return "Aucun élément";
    return items.map((it) => `• [${it.date}${it.escale ? " · " + it.escale : ""}] ${it.description}`).join("\n");
  };

  const openEventsDetails = (title: string, items: SafetyEvent[]) => {
    setDetails({
      title,
      columns: ["Date", "Escale", "Vol", "Catégorie", "Description"],
      rows: items.map((e) => [e.date, e.escale, (e as unknown as { vol?: string }).vol ?? "—", e.categorie ?? "—", e.description]),
    });
  };
  const openSafaDetails = (title: string, items: SafaRecord[]) => {
    setDetails({
      title,
      columns: ["Date", "Escale", "Vol", "Catégorie", "Description", "Statut"],
      rows: items.map((r) => [r.date, r.escale, r.vol, r.category, r.description, r.statut]),
    });
  };


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
    <div className="p-3 md:p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Shield className="h-4 w-4 text-red-500" />
          Indicateurs de Performance Sécurité (SPI) — {year}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}{y !== CURRENT_YEAR ? " (archive)" : ""}</option>
            ))}
          </select>
          {isAdmin && (
            <Button variant="outline" onClick={() => setNewYearOpen(true)} className="h-8 cursor-pointer gap-1.5 text-xs">
              <Archive className="h-3.5 w-3.5" /> Nouvelle année
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Taux Ground Damages — Tunisie" icon={<Shield className="h-3.5 w-3.5" />} tone="from-blue-600 to-blue-700">
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
            accent="blue"
            row2Tooltip={(q) => tipFor(damagesTunisie[q] ?? [])}
            onRow2Click={(q) => openEventsDetails(`Dommages au sol — Tunisie · ${q} ${year}`, damagesTunisie[q] ?? [])}
          />
        </Panel>
        <Panel title="Taux Ground Damages — Étranger" icon={<Shield className="h-3.5 w-3.5" />} tone="from-emerald-600 to-emerald-700">
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
            accent="emerald"
            row2Tooltip={(q) => tipFor(damagesEtranger[q] ?? [])}
            onRow2Click={(q) => openEventsDetails(`Dommages au sol — Étranger · ${q} ${year}`, damagesEtranger[q] ?? [])}
          />
        </Panel>
        <Panel title="Indicateur SAFA D03" icon={<BarChart3 className="h-3.5 w-3.5" />} tone="from-amber-600 to-orange-600" className="lg:col-span-2">
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
            accent="amber"
            row2Tooltip={(q) => tipFor(safaQ[q] ?? [])}
            onRow2Click={(q) => openSafaDetails(`SAFA Findings · ${q} ${year}`, safaQ[q] ?? [])}
          />
        </Panel>
      </div>

      <Panel title={`TAUX DES ÉVÉNEMENTS OPS SOL / MOIS — ${year}`} icon={<BarChart3 className="h-3.5 w-3.5" />} tone="from-indigo-600 to-purple-600" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-indigo-50 text-[10px] uppercase text-indigo-700">
                <th className="py-2 pl-2 pr-3 text-left font-semibold">Indicateur</th>
                {MONTHS.map((m) => (<th key={m} className="px-1.5 py-2 text-center font-semibold">{m}</th>))}
                {isAdmin && <th className="px-1.5 py-2 text-center font-semibold">Edit</th>}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pl-2 pr-3 text-slate-700">Nbr Anomalies <span className="text-[9px] text-slate-400">(auto)</span></td>
                {MONTHS.map((m) => {
                  const manual = data.opsSolMensuel[m].anomalies;
                  const auto = autoAnomalies[m] ?? 0;
                  const isAuto = manual === null;
                  const val = isAuto ? auto : manual;
                  const list = eventsM[m] ?? [];
                  const tip = list.length > 0
                    ? list.map((e) => `• [${e.date} · ${e.escale}] ${e.description}`).join("\n")
                    : (isAuto ? "Auto depuis le registre" : "Saisie admin");
                  const clickable = list.length > 0;
                  return (
                    <td key={m} className={"px-1.5 py-2 text-center tabular-nums " + (isAuto ? "italic text-blue-600" : "text-slate-700")} title={tip}>
                      {clickable ? (
                        <button
                          type="button"
                          onClick={() => openEventsDetails(`Anomalies OPS SOL · ${m} ${year}`, list)}
                          className="cursor-pointer rounded px-1.5 py-0.5 font-semibold text-indigo-700 underline decoration-dotted underline-offset-2 hover:bg-indigo-50"
                        >
                          {val}
                        </button>
                      ) : (val ?? "—")}
                    </td>
                  );
                })}
                {isAdmin && <td />}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pl-2 pr-3 text-slate-700">Nbr Vols/Mois</td>
                {MONTHS.map((m) => (<td key={m} className="px-1.5 py-2 text-center tabular-nums text-slate-700">{data.opsSolMensuel[m].vols ?? "—"}</td>))}
                {isAdmin && <td />}
              </tr>
              <tr className="bg-indigo-50/50">
                <td className="py-2 pl-2 pr-3 font-semibold text-indigo-900">Taux (/vol)</td>
                {MONTHS.map((m) => {
                  const manual = data.opsSolMensuel[m].anomalies;
                  const eff = manual === null ? (autoAnomalies[m] ?? null) : manual;
                  return (<td key={m} className="px-1.5 py-2 text-center font-semibold tabular-nums text-indigo-700">{pct(eff, data.opsSolMensuel[m].vols)}</td>);
                })}
                {isAdmin && <td />}
              </tr>

              {isAdmin && (
                <tr>
                  <td />
                  {MONTHS.map((m) => (
                    <td key={m} className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => setEditing({
                          table: "opsSolMensuel", key: m,
                          labels: ["Anomalies", "Vols"],
                          values: { a: data.opsSolMensuel[m].anomalies, b: data.opsSolMensuel[m].vols },
                          aKey: "anomalies", bKey: "vols",
                        })}
                        className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                        title={`Modifier ${m}`}
                      >
                        <Pencil className="h-3 w-3" />
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

      {details && (
        <Dialog open onOpenChange={(v) => !v && setDetails(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{details.title}</DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-slate-500">📋 Affichage uniquement — lecture seule, non modifiable et non téléchargeable.</p>
            <div className="max-h-[60vh] overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-white">
                  <tr>
                    {details.columns.map((c) => (
                      <th key={c} className="px-2 py-2 text-left font-semibold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {details.rows.length === 0 ? (
                    <tr><td colSpan={details.columns.length} className="py-6 text-center text-slate-500">Aucun élément.</td></tr>
                  ) : details.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className="px-2 py-1.5 align-top text-slate-700">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetails(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Panel({ title, icon, children, className, tone }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; tone?: string; }) {
  const grad = tone ?? "from-slate-800 to-slate-900";
  return (
    <div className={"overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm " + (className ?? "")}>
      <div className={"flex items-center gap-2 bg-gradient-to-r px-3 py-2 text-white " + grad}>
        <span className="text-white/90">{icon}</span>
        <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

const ACCENTS: Record<string, { head: string; head_text: string; taux: string; row: string }> = {
  blue:    { head: "bg-blue-50",    head_text: "text-blue-700",    taux: "text-blue-700 bg-blue-50/60",       row: "bg-blue-50/40" },
  emerald: { head: "bg-emerald-50", head_text: "text-emerald-700", taux: "text-emerald-700 bg-emerald-50/60", row: "bg-emerald-50/40" },
  amber:   { head: "bg-amber-50",   head_text: "text-amber-700",   taux: "text-amber-700 bg-amber-50/60",     row: "bg-amber-50/40" },
};

function QuarterTable({
  data, keys, labels, showTaux, isAdmin, onEdit, accent = "blue", row2Tooltip, onRow2Click,
}: {
  data: Record<string, Record<string, number | null>>;
  keys: [string, string];
  labels: [string, string];
  showTaux?: boolean;
  isAdmin: boolean;
  onEdit: (q: string) => void;
  accent?: string;
  row2Tooltip?: (q: string) => string;
  onRow2Click?: (q: string) => void;
}) {
  const a = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className={"border-b border-slate-200 text-[10px] uppercase " + a.head + " " + a.head_text}>
          <th className="py-2 pl-2 pr-3 text-left font-semibold" />
          {QUARTERS.map((q) => (<th key={q} className="px-2 py-2 text-center font-semibold">{q}</th>))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-slate-100">
          <td className="py-1.5 pl-2 pr-3 text-slate-700">{labels[0]}</td>
          {QUARTERS.map((q) => (<td key={q} className="px-2 py-1.5 text-center tabular-nums text-slate-700">{data[q][keys[0]] ?? "—"}</td>))}
        </tr>
        <tr className={showTaux ? "border-b border-slate-100" : ""}>
          <td className="py-1.5 pl-2 pr-3 text-slate-700">{labels[1]}</td>
          {QUARTERS.map((q) => {
            const tip = row2Tooltip ? row2Tooltip(q) : undefined;
            const val = data[q][keys[1]];
            const clickable = !!onRow2Click && (val ?? 0) > 0;
            return (
              <td key={q} className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                {clickable ? (
                  <button
                    type="button"
                    title={tip}
                    onClick={() => onRow2Click!(q)}
                    className="cursor-pointer rounded px-1.5 py-0.5 font-semibold text-blue-700 underline decoration-dotted underline-offset-2 hover:bg-blue-50"
                  >
                    {val}
                  </button>
                ) : (
                  <span title={tip} className={tip ? "cursor-help underline decoration-dotted decoration-slate-300" : ""}>{val ?? "—"}</span>
                )}
              </td>
            );
          })}
        </tr>
        {showTaux && (
          <tr className={(isAdmin ? "border-b border-slate-100 " : "") + a.row}>
            <td className="py-1.5 pl-2 pr-3 font-semibold text-slate-900">Taux</td>
            {QUARTERS.map((q) => (<td key={q} className={"px-2 py-1.5 text-center font-semibold tabular-nums " + a.taux}>{pct(data[q][keys[1]] ?? null, data[q][keys[0]] ?? null)}</td>))}
          </tr>
        )}
        {isAdmin && (
          <tr>
            <td className="py-1 pl-2 pr-3 text-[10px] text-slate-400">Actions</td>
            {QUARTERS.map((q) => (
              <td key={q} className="px-1 py-1 text-center">
                <button
                  onClick={() => onEdit(q)}
                  className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                  title={`Modifier ${q}`}
                >
                  <Pencil className="h-3 w-3" />
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
