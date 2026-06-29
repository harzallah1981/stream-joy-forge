import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Shield, Pencil, Archive, Settings2, Trash2, FileDown, Paperclip, Download, X } from "lucide-react";
import { exportEventsPdf } from "@/lib/events-pdf";
import { usePageTitle } from "@/lib/page-title";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  events as DEFAULT_EVENTS,
  type Category,
  type SafetyEvent,
  type EventStatus,
  type EventAttachment,
} from "@/lib/safety-data";
import {
  loadEventsConfig, saveEventsConfig, categoryClass, statusClass, severityFor,
  COLOR_PRESETS, type EventsConfig, type ScaleDef, type SeverityBand,
} from "@/lib/events-config";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";


export const Route = createFileRoute("/safety/events")({
  head: () => ({ meta: [{ title: "Registre Evenements — Tunisair Ground Safety" }] }),
  component: EventsRegister,
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
});

const CURRENT_YEAR = 2026;
const storageKey = (y: number) => `tunisair_events_${y}`;

function loadEvents(year: number): SafetyEvent[] {
  try {
    const raw = localStorage.getItem(storageKey(year));
    if (raw) return JSON.parse(raw);
  } catch {}
  if (year === CURRENT_YEAR) return DEFAULT_EVENTS;
  return [];
}
function saveEvents(year: number, list: SafetyEvent[]) {
  localStorage.setItem(storageKey(year), JSON.stringify(list));
}
function listYears(): number[] {
  const found = new Set<number>([CURRENT_YEAR]);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("tunisair_events_")) {
      const y = Number(k.slice("tunisair_events_".length));
      if (!Number.isNaN(y)) found.add(y);
    }
  }
  return Array.from(found).sort((a, b) => b - a);
}

function EventsRegister() {
  usePageTitle("Registre Evenements", "Suivi des evenements securite au sol — Multi-annee");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { focus } = Route.useSearch();
  const nav = Route.useNavigate();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
  const [list, setList] = useState<SafetyEvent[]>([]);
  const [search, setSearch] = useState("");
  const [fEscale, setFEscale] = useState("");
  const [fSeverite, setFSeverite] = useState<string>("");
  const [fStatut, setFStatut] = useState("");
  const [fCategorie, setFCategorie] = useState("");
  const [fMois, setFMois] = useState<string>(""); // "01".."12"
  const [fTrim, setFTrim] = useState<string>(""); // "1".."4"
  const [editing, setEditing] = useState<SafetyEvent | null>(null);
  const [newYearOpen, setNewYearOpen] = useState(false);
  const [cfg, setCfg] = useState<EventsConfig>(() => loadEventsConfig());
  const [cfgOpen, setCfgOpen] = useState(false);


  useEffect(() => { setYears(listYears()); }, []);
  useEffect(() => { setList(loadEvents(year)); }, [year]);

  const persist = (next: SafetyEvent[]) => {
    setList(next);
    saveEvents(year, next);
  };

  const escales = useMemo(
    () => Array.from(new Set(list.map((e) => e.escale).filter(Boolean))).sort(),
    [list],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const userEscale = (user?.workplace ?? "").trim().toUpperCase();
    return list.filter((e) => {
      // Non-admins only see events for their own escale.
      if (!isAdmin && userEscale && e.escale.toUpperCase() !== userEscale) return false;
      if (q && !(
        e.id.toLowerCase().includes(q) ||
        e.escale.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.categorie.toLowerCase().includes(q)
      )) return false;
      if (fEscale && e.escale !== fEscale) return false;
      if (fStatut && e.statut !== fStatut) return false;
      if (fCategorie && e.categorie !== fCategorie) return false;
      if (fSeverite) {
        const s = e.prob * e.grav;
        const band = severityFor(cfg, s);
        if (band.name.toLowerCase() !== fSeverite) return false;
      }
      if (fMois || fTrim) {
        const m = Number((e.date || "").slice(5, 7));
        if (fMois && String(m).padStart(2, "0") !== fMois) return false;
        if (fTrim) {
          const t = Math.ceil(m / 3);
          if (String(t) !== fTrim) return false;
        }
      }
      return true;
    });
  }, [list, search, fEscale, fStatut, fCategorie, fSeverite, fMois, fTrim, isAdmin, user, cfg]);

  // When ?focus=<id> is set and the user is not admin, hide the full table and show only that event.
  const focused = focus ? list.find((e) => e.id === focus) : null;

  const resetFilters = () => {
    setSearch(""); setFEscale(""); setFSeverite(""); setFStatut("");
    setFCategorie(""); setFMois(""); setFTrim("");
  };
  const hasFilters = !!(search || fEscale || fSeverite || fStatut || fCategorie || fMois || fTrim);

  const addEvent = () => {
    const id = `GS-${year}-${String(list.length + 1).padStart(3, "0")}`;
    setEditing({
      id, date: new Date().toISOString().slice(0, 10),
      source: "", escale: "", description: "",
      prob: 1, grav: 1, sev: "Mineur",
      action: "", statut: "EN COURS", categorie: "ARRIMAGE",
    });
  };

  const archiveAndNewYear = (newYear: number) => {
    saveEvents(year, list); // ensure current saved
    saveEvents(newYear, []); // create empty slot
    setYears(listYears().concat(years.includes(newYear) ? [] : [newYear]));
    setYears(listYears());
    setYear(newYear);
    setNewYearOpen(false);
    toast.success(`Année ${newYear} créée. Données ${year} archivées.`);
  };

  // Non-admin arriving from a dashboard alert: render only the focused event detail.
  if (!isAdmin && focused) {
    const sev = focused.prob * focused.grav;
    const band = severityFor(cfg, sev);
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/" })} className="cursor-pointer">
            ← Retour au tableau de bord
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <Shield className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-900">Événement {focused.id}</h2>
            <span className={"ml-auto inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + statusClass(cfg, focused.statut)}>
              {focused.statut}
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-slate-500">Date</dt><dd className="font-medium">{focused.date}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Escale</dt><dd className="font-mono font-semibold">{focused.escale}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Source</dt><dd>{focused.source}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Catégorie</dt><dd className={"inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold " + categoryClass(cfg, focused.categorie as Category)}>{focused.categorie}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Probabilité</dt><dd>{focused.prob}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Gravité</dt><dd>{focused.grav}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Sévérité</dt><dd><span className={"inline-flex rounded px-2 py-0.5 text-xs font-bold " + band.color}>{sev} · {band.name}</span></dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">Description</dt><dd className="whitespace-pre-wrap text-slate-700">{focused.description}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">Action / Réponse</dt><dd className="whitespace-pre-wrap text-slate-700">{focused.action || "—"}</dd></div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-red-500" />
            REGISTRE DES EVENEMENTS — GROUND SAFETY · TUNISAIR
          </h2>
          <div className="ml-auto flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold"
              title="Année"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}{y !== CURRENT_YEAR ? " (archive)" : ""}</option>
              ))}
            </select>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setCfgOpen(true)}
                className="h-9 cursor-pointer gap-1.5"
                title="Configurer catégories & statuts"
              >
                <Settings2 className="h-4 w-4" /> Configurer
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => exportEventsPdf({ year, events: filtered, userName: user?.email })}
              className="h-9 cursor-pointer gap-1.5"
              title="Exporter en PDF (A4 paysage)"
            >
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setNewYearOpen(true)}
                className="h-9 cursor-pointer gap-1.5"
                title="Archiver et créer une nouvelle année"
              >
                <Archive className="h-4 w-4" /> Nouvelle année
              </Button>
            )}
            <div className="relative flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            {isAdmin && (
              <Button onClick={addEvent} className="h-9 cursor-pointer gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs">
          <span className="font-semibold text-slate-600">Filtres :</span>
          <select value={fEscale} onChange={(e) => setFEscale(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Escale">
            <option value="">Escale (toutes)</option>
            {escales.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={fSeverite} onChange={(e) => setFSeverite(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Sévérité">
            <option value="">Sévérité (toutes)</option>
            {cfg.severities.map((s) => (
              <option key={s.name} value={s.name.toLowerCase()}>{s.name} ({s.min}-{s.max})</option>
            ))}
          </select>
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Statut de clôture">
            <option value="">Statut (tous)</option>
            {cfg.statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <select value={fCategorie} onChange={(e) => setFCategorie(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Catégorie">
            <option value="">Catégorie (toutes)</option>
            {cfg.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select value={fTrim} onChange={(e) => setFTrim(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Trimestre">
            <option value="">Trimestre (tous)</option>
            <option value="1">T1 (Jan-Mar)</option>
            <option value="2">T2 (Avr-Juin)</option>
            <option value="3">T3 (Juil-Sep)</option>
            <option value="4">T4 (Oct-Déc)</option>
          </select>
          <select value={fMois} onChange={(e) => setFMois(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs" title="Mois">
            <option value="">Mois (tous)</option>
            {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="ml-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
              <X className="h-3 w-3" /> Réinitialiser
            </button>
          )}
          <span className="ml-auto text-slate-500">{filtered.length} / {list.length} événement(s)</span>
        </div>

        <div className="bg-slate-50 p-4">

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="bg-slate-900 text-xs uppercase text-white">
                    <th className="px-3 py-3 text-left font-semibold">Date</th>
                    <th className="px-3 py-3 text-left font-semibold">Source</th>
                    <th className="px-3 py-3 text-left font-semibold">Escale</th>
                    <th className="px-3 py-3 text-left font-semibold">Description</th>
                    <th className="px-3 py-3 text-center font-semibold">Prob.</th>
                    <th className="px-3 py-3 text-center font-semibold">Grav.</th>
                    <th className="px-3 py-3 text-center font-semibold">Sev.</th>
                    <th className="px-3 py-3 text-center font-semibold">PJ</th>
                    <th className="px-3 py-3 text-left font-semibold">Reponse / Action</th>
                    <th className="px-3 py-3 text-center font-semibold">Statut</th>
                    <th className="px-3 py-3 text-center font-semibold">Categorie</th>
                    {isAdmin && <th className="px-3 py-3 text-center font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const sev = e.prob * e.grav;
                    return (
                      <tr key={e.id} className="border-b border-slate-100 align-top last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{e.date}</td>
                        <td className="px-3 py-3 text-slate-700">{e.source}</td>
                        <td className="px-3 py-3 font-mono font-semibold text-slate-900">{e.escale}</td>
                        <td className="max-w-[240px] px-3 py-3 text-slate-700">{e.description}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-slate-700">{e.prob}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-slate-700">{e.grav}</td>
                        <td className="px-3 py-3 text-center font-semibold tabular-nums">
                          <span className={"inline-flex min-w-[2rem] rounded px-1.5 py-0.5 " + severityFor(cfg, sev).color} title={severityFor(cfg, sev).name}>{sev}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <AttachmentsCell
                            event={e}
                            isAdmin={isAdmin}
                            onUpload={(atts) => {
                              const next = list.map((x) =>
                                x.id === e.id ? { ...x, attachments: [...(x.attachments ?? []), ...atts] } : x,
                              );
                              persist(next);
                            }}
                            onRemove={(attId) => {
                              const next = list.map((x) =>
                                x.id === e.id
                                  ? { ...x, attachments: (x.attachments ?? []).filter((a) => a.id !== attId) }
                                  : x,
                              );
                              persist(next);
                            }}
                          />
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-slate-600">{e.action}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={"inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + statusClass(cfg, e.statut)}>
                            {e.statut}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={"inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold " + categoryClass(cfg, e.categorie)}>
                            {e.categorie}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditing(e)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                title="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Modifier
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Supprimer définitivement l'événement ${e.id} ?`)) {
                                    persist(list.filter((x) => x.id !== e.id));
                                    toast.success("Événement supprimé");
                                  }
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-red-50 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Supprimer
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 12 : 11} className="py-10 text-center text-sm text-slate-500">
                        Aucun evenement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 px-2 text-xs text-slate-600">
            <span className="font-semibold">Légende sévérité :</span>
            {cfg.severities.map((b) => (
              <span key={b.name} className={"inline-flex items-center gap-1.5 rounded px-2 py-0.5 " + b.color}>
                <span className="font-semibold">{b.min}-{b.max}</span> · {b.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <EditDialog
          event={editing}
          cfg={cfg}
          onCancel={() => setEditing(null)}
          onSave={(ev) => {
            const exists = list.some((x) => x.id === ev.id);
            const next = exists ? list.map((x) => (x.id === ev.id ? ev : x)) : [...list, ev];
            persist(next);
            setEditing(null);
            toast.success("Événement enregistré");
          }}
        />
      )}

      {newYearOpen && (
        <NewYearDialog
          existingYears={years}
          onCancel={() => setNewYearOpen(false)}
          onConfirm={archiveAndNewYear}
        />
      )}

      {cfgOpen && (
        <ConfigDialog
          cfg={cfg}
          onCancel={() => setCfgOpen(false)}
          onSave={(next) => { setCfg(next); saveEventsConfig(next); setCfgOpen(false); toast.success("Configuration enregistrée"); }}
        />
      )}
    </div>
  );
}


function EditDialog({
  event, cfg, onCancel, onSave,
}: {
  event: SafetyEvent;
  cfg: EventsConfig;
  onCancel: () => void;
  onSave: (e: SafetyEvent) => void;
}) {
  const [e, setE] = useState<SafetyEvent>(event);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Modifier l'événement {e.id}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={e.date} onChange={(ev) => setE({ ...e, date: ev.target.value })} /></div>
          <div><Label>Source</Label><Input value={e.source} onChange={(ev) => setE({ ...e, source: ev.target.value })} /></div>
          <div><Label>Escale</Label><Input value={e.escale} onChange={(ev) => setE({ ...e, escale: ev.target.value })} /></div>
          <div>
            <Label>Probabilité</Label>
            <select
              value={e.prob}
              onChange={(ev) => setE({ ...e, prob: Number(ev.target.value) })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              {cfg.probabilities.map((p) => (
                <option key={p.value} value={p.value}>{p.value} — {p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Gravité</Label>
            <select
              value={e.grav}
              onChange={(ev) => setE({ ...e, grav: Number(ev.target.value) })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              {cfg.gravities.map((g) => (
                <option key={g.value} value={g.value}>{g.value} — {g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Statut</Label>
            <select
              value={e.statut}
              onChange={(ev) => setE({ ...e, statut: ev.target.value as EventStatus })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              {cfg.statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <select
              value={e.categorie}
              onChange={(ev) => setE({ ...e, categorie: ev.target.value as Category })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              {cfg.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Sévérité (auto = Prob × Grav)</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">
              {(() => {
                const s = e.prob * e.grav;
                const band = severityFor(cfg, s);
                return <><span className={"inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 font-bold " + band.color}>{s}</span><span className="text-slate-700">{band.name}</span></>;
              })()}
            </div>
          </div>
          <div className="col-span-2"><Label>Description</Label><Input value={e.description} onChange={(ev) => setE({ ...e, description: ev.target.value })} /></div>
          <div className="col-span-2">
            <Label>Pièces jointes (plusieurs fichiers possibles)</Label>
            <AttachmentsEditor
              value={e.attachments ?? []}
              onChange={(att) => setE({ ...e, attachments: att })}
            />
          </div>
          <div className="col-span-2"><Label>Réponse / Action</Label><Input value={e.action} onChange={(ev) => setE({ ...e, action: ev.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(e)} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewYearDialog({
  existingYears, onCancel, onConfirm,
}: {
  existingYears: number[];
  onCancel: () => void;
  onConfirm: (y: number) => void;
}) {
  const [y, setY] = useState<number>(Math.max(...existingYears) + 1);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Archiver et démarrer une nouvelle année</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">
          Les données de l'année en cours seront conservées et restent consultables par l'admin
          via le sélecteur d'année.
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

function ConfigDialog({
  cfg, onCancel, onSave,
}: {
  cfg: EventsConfig;
  onCancel: () => void;
  onSave: (next: EventsConfig) => void;
}) {
  const [draft, setDraft] = useState<EventsConfig>(() => JSON.parse(JSON.stringify(cfg)));
  const [newCat, setNewCat] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0].cat);
  const [newStatus, setNewStatus] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(COLOR_PRESETS[0].status);

  const addCat = () => {
    const n = newCat.trim().toUpperCase();
    if (!n) return;
    if (draft.categories.some((c) => c.name === n)) { toast.error("Catégorie déjà existante"); return; }
    setDraft({ ...draft, categories: [...draft.categories, { name: n, color: newCatColor }] });
    setNewCat("");
  };
  const removeCat = (name: string) =>
    setDraft({ ...draft, categories: draft.categories.filter((c) => c.name !== name) });
  const setCatColor = (name: string, color: string) =>
    setDraft({ ...draft, categories: draft.categories.map((c) => c.name === name ? { ...c, color } : c) });

  const addStatus = () => {
    const n = newStatus.trim().toUpperCase();
    if (!n) return;
    if (draft.statuses.some((s) => s.name === n)) { toast.error("Statut déjà existant"); return; }
    setDraft({ ...draft, statuses: [...draft.statuses, { name: n, color: newStatusColor }] });
    setNewStatus("");
  };
  const removeStatus = (name: string) =>
    setDraft({ ...draft, statuses: draft.statuses.filter((s) => s.name !== name) });
  const setStatusColor = (name: string, color: string) =>
    setDraft({ ...draft, statuses: draft.statuses.map((s) => s.name === name ? { ...s, color } : s) });

  // Probabilities
  const [newProbLabel, setNewProbLabel] = useState("");
  const addProb = () => {
    const label = newProbLabel.trim();
    if (!label) return;
    const value = (draft.probabilities.reduce((m, p) => Math.max(m, p.value), 0) || 0) + 1;
    setDraft({ ...draft, probabilities: [...draft.probabilities, { value, label }] });
    setNewProbLabel("");
  };
  const setProb = (i: number, patch: Partial<ScaleDef>) =>
    setDraft({ ...draft, probabilities: draft.probabilities.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  const removeProb = (i: number) =>
    setDraft({ ...draft, probabilities: draft.probabilities.filter((_, idx) => idx !== i) });

  // Gravities
  const [newGravLabel, setNewGravLabel] = useState("");
  const addGrav = () => {
    const label = newGravLabel.trim();
    if (!label) return;
    const value = (draft.gravities.reduce((m, p) => Math.max(m, p.value), 0) || 0) + 1;
    setDraft({ ...draft, gravities: [...draft.gravities, { value, label }] });
    setNewGravLabel("");
  };
  const setGrav = (i: number, patch: Partial<ScaleDef>) =>
    setDraft({ ...draft, gravities: draft.gravities.map((g, idx) => idx === i ? { ...g, ...patch } : g) });
  const removeGrav = (i: number) =>
    setDraft({ ...draft, gravities: draft.gravities.filter((_, idx) => idx !== i) });

  // Severity bands
  const [newSev, setNewSev] = useState<SeverityBand>({ name: "", min: 1, max: 5, color: COLOR_PRESETS[0].status });
  const addSev = () => {
    const n = newSev.name.trim();
    if (!n) return;
    if (draft.severities.some((s) => s.name === n)) { toast.error("Bande déjà existante"); return; }
    setDraft({ ...draft, severities: [...draft.severities, { ...newSev, name: n }] });
    setNewSev({ name: "", min: 1, max: 5, color: COLOR_PRESETS[0].status });
  };
  const setSev = (i: number, patch: Partial<SeverityBand>) =>
    setDraft({ ...draft, severities: draft.severities.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  const removeSev = (i: number) =>
    setDraft({ ...draft, severities: draft.severities.filter((_, idx) => idx !== i) });

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configurer le registre (catégories, statuts, probabilités, gravités, sévérités)</DialogTitle></DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Categories */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Catégories</h4>
            <ul className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {draft.categories.map((c) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className={"inline-flex min-w-[6rem] justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold " + c.color}>{c.name}</span>
                  <select value={c.color} onChange={(e) => setCatColor(c.name, e.target.value)} className="h-7 flex-1 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                    {COLOR_PRESETS.map((p) => <option key={p.label} value={p.cat}>{p.label}</option>)}
                  </select>
                  <button onClick={() => removeCat(c.name)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {draft.categories.length === 0 && <li className="text-xs text-slate-400">Aucune catégorie</li>}
            </ul>
            <div className="flex gap-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nouvelle catégorie" className="h-8 flex-1 text-xs" />
              <select value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="h-8 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                {COLOR_PRESETS.map((p) => <option key={p.label} value={p.cat}>{p.label}</option>)}
              </select>
              <Button size="sm" onClick={addCat} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Statuses */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Statuts</h4>
            <ul className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {draft.statuses.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className={"inline-flex min-w-[6rem] justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + s.color}>{s.name}</span>
                  <select value={s.color} onChange={(e) => setStatusColor(s.name, e.target.value)} className="h-7 flex-1 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                    {COLOR_PRESETS.map((p) => <option key={p.label} value={p.status}>{p.label}</option>)}
                  </select>
                  <button onClick={() => removeStatus(s.name)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {draft.statuses.length === 0 && <li className="text-xs text-slate-400">Aucun statut</li>}
            </ul>
            <div className="flex gap-2">
              <Input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="Nouveau statut" className="h-8 flex-1 text-xs" />
              <select value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="h-8 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                {COLOR_PRESETS.map((p) => <option key={p.label} value={p.status}>{p.label}</option>)}
              </select>
              <Button size="sm" onClick={addStatus} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Probabilities */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Probabilités (échelle)</h4>
            <ul className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {draft.probabilities.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input type="number" value={p.value} onChange={(e) => setProb(i, { value: Number(e.target.value) })} className="h-7 w-14 text-xs" />
                  <Input value={p.label} onChange={(e) => setProb(i, { label: e.target.value })} className="h-7 flex-1 text-xs" />
                  <button onClick={() => removeProb(i)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={newProbLabel} onChange={(e) => setNewProbLabel(e.target.value)} placeholder="Nouveau libellé probabilité" className="h-8 flex-1 text-xs" />
              <Button size="sm" onClick={addProb} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Gravities */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Gravités (échelle)</h4>
            <ul className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {draft.gravities.map((g, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input type="number" value={g.value} onChange={(e) => setGrav(i, { value: Number(e.target.value) })} className="h-7 w-14 text-xs" />
                  <Input value={g.label} onChange={(e) => setGrav(i, { label: e.target.value })} className="h-7 flex-1 text-xs" />
                  <button onClick={() => removeGrav(i)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={newGravLabel} onChange={(e) => setNewGravLabel(e.target.value)} placeholder="Nouveau libellé gravité" className="h-8 flex-1 text-xs" />
              <Button size="sm" onClick={addGrav} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Severity bands */}
          <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Sévérités (bandes Prob × Grav)</h4>
            <ul className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {draft.severities.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={"inline-flex min-w-[7rem] justify-center rounded px-2 py-0.5 text-xs font-bold " + s.color}>{s.name}</span>
                  <Input value={s.name} onChange={(e) => setSev(i, { name: e.target.value })} className="h-7 flex-1 text-xs" placeholder="Nom" />
                  <Input type="number" value={s.min} onChange={(e) => setSev(i, { min: Number(e.target.value) })} className="h-7 w-16 text-xs" placeholder="min" />
                  <Input type="number" value={s.max} onChange={(e) => setSev(i, { max: Number(e.target.value) })} className="h-7 w-16 text-xs" placeholder="max" />
                  <select value={s.color} onChange={(e) => setSev(i, { color: e.target.value })} className="h-7 w-28 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                    {COLOR_PRESETS.map((p) => <option key={p.label} value={p.status}>{p.label}</option>)}
                  </select>
                  <button onClick={() => removeSev(i)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={newSev.name} onChange={(e) => setNewSev({ ...newSev, name: e.target.value })} placeholder="Nom bande" className="h-8 flex-1 text-xs" />
              <Input type="number" value={newSev.min} onChange={(e) => setNewSev({ ...newSev, min: Number(e.target.value) })} className="h-8 w-16 text-xs" placeholder="min" />
              <Input type="number" value={newSev.max} onChange={(e) => setNewSev({ ...newSev, max: Number(e.target.value) })} className="h-8 w-16 text-xs" placeholder="max" />
              <select value={newSev.color} onChange={(e) => setNewSev({ ...newSev, color: e.target.value })} className="h-8 cursor-pointer rounded border border-slate-200 px-2 text-xs">
                {COLOR_PRESETS.map((p) => <option key={p.label} value={p.status}>{p.label}</option>)}
              </select>
              <Button size="sm" onClick={addSev} className="h-8 cursor-pointer"><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Astuce : les événements existants conservent leur catégorie/statut texte ; les nouvelles valeurs sont disponibles immédiatement à la création ou modification.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(draft)} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ============================================================
// Attachments
// ============================================================

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

function downloadAttachment(a: EventAttachment) {
  const link = document.createElement("a");
  link.href = a.dataUrl;
  link.download = a.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const ATTACH_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/webp";

async function filesToAttachments(files: FileList | null): Promise<EventAttachment[]> {
  if (!files || files.length === 0) return [];
  const added: EventAttachment[] = [];
  for (const f of Array.from(files)) {
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`${f.name} dépasse 5 Mo`);
      continue;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(f);
    });
    added.push({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      dataUrl,
      addedAt: new Date().toISOString(),
    });
  }
  return added;
}

function AttachmentsCell({
  event,
  isAdmin,
  onUpload,
  onRemove,
}: {
  event: SafetyEvent;
  isAdmin: boolean;
  onUpload: (atts: EventAttachment[]) => void;
  onRemove: (id: string) => void;
}) {
  const list = event.attachments ?? [];
  const inputId = `att-${event.id}`;

  const handleChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const added = await filesToAttachments(ev.target.files);
    ev.target.value = "";
    if (added.length) {
      onUpload(added);
      toast.success(`${added.length} pièce(s) ajoutée(s)`);
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      {list.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              title={`${list.length} pièce(s) jointe(s)`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              {list.length}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Pièces jointes · {event.id}
            </div>
            <ul className="space-y-1">
              {list.map((a) => (
                <li key={a.id} className="flex items-center gap-1">
                  <button
                    onClick={() => downloadAttachment(a)}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                  >
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span className="flex-1 truncate font-medium text-slate-700">{a.name}</span>
                    <span className="text-[10px] text-slate-400">{formatBytes(a.size)}</span>
                    <Download className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onRemove(a.id)}
                      className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : (
        !isAdmin && <span className="text-xs text-slate-300">—</span>
      )}
      {isAdmin && (
        <>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            title="Joindre un fichier (PDF, Word, Excel, PowerPoint, image)"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            accept={ATTACH_ACCEPT}
            className="hidden"
            onChange={handleChange}
          />
        </>
      )}
    </div>
  );
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

function AttachmentsEditor({
  value,
  onChange,
}: {
  value: EventAttachment[];
  onChange: (next: EventAttachment[]) => void;
}) {
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: EventAttachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${f.name} dépasse 5 Mo`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(f);
      });
      added.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        dataUrl,
        addedAt: new Date().toISOString(),
      });
    }
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(`${added.length} pièce(s) ajoutée(s)`);
    }
  };

  return (
    <div className="space-y-2">
      <label
        className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        title="Joindre un document (PDF, Word, Excel, PowerPoint, image)"
      >
        <Paperclip className="h-4 w-4" />
        <span>Joindre un fichier — PDF, Word, Excel, PowerPoint, JPEG, PNG, GIF (max 5 Mo)</span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(ev) => {
            handleFiles(ev.target.files);
            ev.target.value = "";
          }}
        />
      </label>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
            >
              <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span className="flex-1 truncate font-medium text-slate-700">{a.name}</span>
              <span className="text-[10px] text-slate-400">{formatBytes(a.size)}</span>
              <button
                type="button"
                onClick={() => downloadAttachment(a)}
                className="cursor-pointer rounded p-1 text-blue-600 hover:bg-blue-50"
                title="Télécharger"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== a.id))}
                className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50"
                title="Supprimer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


