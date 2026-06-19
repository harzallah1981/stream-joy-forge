import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Shield, Pencil, Archive } from "lucide-react";
import { usePageTitle } from "@/lib/page-title";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  events as DEFAULT_EVENTS,
  categoryColor,
  CATEGORIES,
  type Category,
  type SafetyEvent,
  type EventStatus,
} from "@/lib/safety-data";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/safety/events")({
  head: () => ({ meta: [{ title: "Registre Evenements — Tunisair Ground Safety" }] }),
  component: EventsRegister,
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
  const [year, setYear] = useState(CURRENT_YEAR);
  const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
  const [list, setList] = useState<SafetyEvent[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SafetyEvent | null>(null);
  const [newYearOpen, setNewYearOpen] = useState(false);

  useEffect(() => { setYears(listYears()); }, []);
  useEffect(() => { setList(loadEvents(year)); }, [year]);

  const persist = (next: SafetyEvent[]) => {
    setList(next);
    saveEvents(year, next);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.escale.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.categorie.toLowerCase().includes(q),
    );
  }, [list, search]);

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
                          <span className={"inline-flex min-w-[2rem] rounded px-1.5 py-0.5 " + (sev >= 20 ? "bg-red-100 text-red-700" : sev >= 9 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700")}>{sev}</span>
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-slate-600">{e.action}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={"inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + (e.statut === "CLÔTURÉ" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                            {e.statut}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={"inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold " + categoryColor[e.categorie]}>
                            {e.categorie}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => setEditing(e)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              title="Modifier"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} className="py-10 text-center text-sm text-slate-500">
                        Aucun evenement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 px-2 text-xs text-slate-600">
            <span className="font-semibold">Legende severite :</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />20-25 : Non acceptable</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />9-19 : Moyen</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500" />1-8 : Acceptable</span>
          </div>
        </div>
      </div>

      {editing && (
        <EditDialog
          event={editing}
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
    </div>
  );
}

function EditDialog({
  event, onCancel, onSave,
}: {
  event: SafetyEvent;
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
          <div><Label>Probabilité (1-5)</Label><Input type="number" min={1} max={5} value={e.prob} onChange={(ev) => setE({ ...e, prob: Number(ev.target.value) })} /></div>
          <div><Label>Gravité (1-5)</Label><Input type="number" min={1} max={5} value={e.grav} onChange={(ev) => setE({ ...e, grav: Number(ev.target.value) })} /></div>
          <div>
            <Label>Statut</Label>
            <select
              value={e.statut}
              onChange={(ev) => setE({ ...e, statut: ev.target.value as EventStatus })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="EN COURS">EN COURS</option>
              <option value="CLÔTURÉ">CLÔTURÉ</option>
            </select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <select
              value={e.categorie}
              onChange={(ev) => setE({ ...e, categorie: ev.target.value as Category })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Sévérité (auto = Prob × Grav)</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">
              {(() => {
                const s = e.prob * e.grav;
                const tone = s >= 20 ? "bg-red-100 text-red-700" : s >= 9 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700";
                const lib = s >= 20 ? "Non acceptable" : s >= 9 ? "Moyen" : "Acceptable";
                return <><span className={"inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 font-bold " + tone}>{s}</span><span className="text-slate-700">{lib}</span></>;
              })()}
            </div>
          </div>
          <div className="col-span-2"><Label>Description</Label><Input value={e.description} onChange={(ev) => setE({ ...e, description: ev.target.value })} /></div>
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
