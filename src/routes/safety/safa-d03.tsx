import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Plane, Pencil, Archive, Paperclip, X, Download } from "lucide-react";
import { usePageTitle } from "@/lib/page-title";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  loadSafa, saveSafa, listSafaYears, SAFA_CURRENT_YEAR,
  type SafaRecord, type SafaStatus, type SafaAttachment,
} from "@/lib/safa-store";

export const Route = createFileRoute("/safety/safa-d03")({
  head: () => ({ meta: [{ title: "Suivi SAFA D03 — Tunisair Ground Safety" }] }),
  component: SafaD03Page,
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
});

function SafaD03Page() {
  usePageTitle("Suivi SAFA D03", "Déficiences SAFA — catégorie D03 · Ground Handling");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { focus } = Route.useSearch();
  const nav = Route.useNavigate();

  const [year, setYear] = useState(SAFA_CURRENT_YEAR);
  const [years, setYears] = useState<number[]>([SAFA_CURRENT_YEAR]);
  const [list, setList] = useState<SafaRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SafaRecord | null>(null);
  const [newYearOpen, setNewYearOpen] = useState(false);

  useEffect(() => { setYears(listSafaYears()); }, []);
  useEffect(() => { setList(loadSafa(year)); }, [year]);

  const persist = (next: SafaRecord[]) => { setList(next); saveSafa(year, next); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Non-admins only see records of their own escale (workplace).
    const escale = (user?.workplace ?? "").trim().toUpperCase();
    let base = list;
    if (!isAdmin && escale) {
      base = list.filter((r) => r.escale.toUpperCase() === escale);
    }
    if (!q) return base;
    return base.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.escale.toLowerCase().includes(q) ||
      r.vol.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.notification.toLowerCase().includes(q),
    );
  }, [list, search, isAdmin, user]);

  const ecarts = list.length;
  const inspections = 17; // synced with SPI seed; admin editable in SPI

  const addNew = () => {
    setEditing({
      id: `SAFA-${year}-${String(list.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString().slice(0, 10),
      category: "D03",
      escale: "TUN",
      vol: "",
      description: "",
      notification: "",
      statut: "EN COURS",
    });
  };

  const archiveAndNewYear = (ny: number) => {
    saveSafa(year, list);
    saveSafa(ny, []);
    setYears(listSafaYears().includes(ny) ? listSafaYears() : [...listSafaYears(), ny].sort((a, b) => b - a));
    setYear(ny);
    setNewYearOpen(false);
    toast.success(`Année ${ny} créée. Données ${year} archivées.`);
  };

  const focused = focus ? list.find((r) => r.id === focus) : null;
  if (!isAdmin && focused) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/" })} className="cursor-pointer">
            ← Retour au tableau de bord
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <Plane className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Écart SAFA {focused.id}</h2>
            <span className={"ml-auto inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + (focused.statut === "CLÔTURÉ" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
              {focused.statut}
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-slate-500">Date</dt><dd className="font-medium">{focused.date}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Catégorie</dt><dd>{focused.category}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Escale</dt><dd className="font-mono font-semibold">{focused.escale}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">N° Vol</dt><dd className="font-mono">{focused.vol}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">Description</dt><dd className="whitespace-pre-wrap text-slate-700">{focused.description}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-slate-500">Envoi / Notification</dt><dd className="whitespace-pre-wrap text-slate-700">{focused.notification || "—"}</dd></div>
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
            <Plane className="h-4 w-4 text-blue-600" />
            SUIVI DES DÉFICIENCES SAFA — CATÉGORIE D03 · GROUND HANDLING · {year}
          </h2>
          <div className="ml-auto flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold"
              title="Année"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}{y !== SAFA_CURRENT_YEAR ? " (archive)" : ""}</option>
              ))}
            </select>
            {isAdmin && (
              <Button variant="outline" onClick={() => setNewYearOpen(true)} className="h-9 cursor-pointer gap-1.5">
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
              <Button onClick={addNew} className="h-9 cursor-pointer gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="bg-slate-900 text-xs uppercase text-white">
                    <th className="px-3 py-3 text-left font-semibold">Date</th>
                    <th className="px-3 py-3 text-center font-semibold">Cat.</th>
                    <th className="px-3 py-3 text-left font-semibold">Escale</th>
                    <th className="px-3 py-3 text-left font-semibold">N° Vol</th>
                    <th className="px-3 py-3 text-left font-semibold">Description</th>
                    <th className="px-3 py-3 text-left font-semibold">Envoi / Notification</th>
                    <th className="px-3 py-3 text-center font-semibold">Statut</th>
                    <th className="px-3 py-3 text-center font-semibold">PJ</th>
                    {isAdmin && <th className="px-3 py-3 text-center font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{r.date}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{r.category}</span>
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-900">{r.escale}</td>
                      <td className="px-3 py-3 font-mono text-slate-700">{r.vol}</td>
                      <td className="max-w-[320px] px-3 py-3 text-slate-700">{r.description}</td>
                      <td className="max-w-[220px] px-3 py-3 text-slate-600">{r.notification}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={"inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + (r.statut === "CLÔTURÉ" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {r.attachments?.map((a, i) => (
                            <a key={i} href={a.dataUrl} download={a.name} title={a.name}
                               className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100">
                              <Download className="h-3 w-3 shrink-0" />
                              <span className="truncate">{a.name}</span>
                            </a>
                          ))}
                          {isAdmin && (
                            <label
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-blue-300 bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                              title="Ajouter des pièces jointes"
                            >
                              <Paperclip className="h-3 w-3" /> Ajouter PJ
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files ?? []);
                                  if (files.length === 0) return;
                                  const toDataUrl = (f: File) => new Promise<SafaAttachment>((resolve, reject) => {
                                    const fr = new FileReader();
                                    fr.onload = () => resolve({ name: f.name, dataUrl: String(fr.result) });
                                    fr.onerror = reject;
                                    fr.readAsDataURL(f);
                                  });
                                  const news = await Promise.all(files.map(toDataUrl));
                                  const updated = { ...r, attachments: [...(r.attachments ?? []), ...news] };
                                  persist(list.map((x) => (x.id === r.id ? updated : x)));
                                  e.currentTarget.value = "";
                                  toast.success(`${news.length} pièce(s) jointe(s) ajoutée(s)`);
                                }}
                              />
                            </label>
                          )}
                          {!isAdmin && (!r.attachments || r.attachments.length === 0) && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setEditing(r)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modifier
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-10 text-center text-sm text-slate-500">
                        Aucune déficience SAFA enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            📊 {ecarts} déficience(s) D03 enregistrée(s) · Taux SAFA : {inspections > 0 ? ((ecarts / inspections) * 100).toFixed(2) + "%" : "—"} ({ecarts} écarts / {inspections} inspections)
          </div>
        </div>
      </div>

      {editing && (
        <EditDialog
          rec={editing}
          onCancel={() => setEditing(null)}
          onSave={(r) => {
            const exists = list.some((x) => x.id === r.id);
            persist(exists ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]);
            setEditing(null);
            toast.success("Déficience enregistrée");
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

function EditDialog({ rec, onCancel, onSave }: { rec: SafaRecord; onCancel: () => void; onSave: (r: SafaRecord) => void; }) {
  const [r, setR] = useState<SafaRecord>(rec);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Déficience SAFA — {r.id}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} /></div>
          <div><Label>Catégorie</Label><Input value={r.category} onChange={(e) => setR({ ...r, category: e.target.value })} /></div>
          <div><Label>Escale</Label><Input value={r.escale} onChange={(e) => setR({ ...r, escale: e.target.value })} /></div>
          <div><Label>N° Vol</Label><Input value={r.vol} onChange={(e) => setR({ ...r, vol: e.target.value })} /></div>
          <div className="col-span-2"><Label>Description</Label><Input value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></div>
          <div className="col-span-2"><Label>Envoi / Notification</Label><Input value={r.notification} onChange={(e) => setR({ ...r, notification: e.target.value })} /></div>
          <div>
            <Label>Statut</Label>
            <select
              value={r.statut}
              onChange={(e) => setR({ ...r, statut: e.target.value as SafaStatus })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="EN COURS">EN COURS</option>
              <option value="CLÔTURÉ">CLÔTURÉ</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Pièces jointes (une ou plusieurs)</Label>
            <input
              type="file"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                const toDataUrl = (f: File) => new Promise<SafaAttachment>((resolve, reject) => {
                  const fr = new FileReader();
                  fr.onload = () => resolve({ name: f.name, dataUrl: String(fr.result) });
                  fr.onerror = reject;
                  fr.readAsDataURL(f);
                });
                const news = await Promise.all(files.map(toDataUrl));
                setR({ ...r, attachments: [...(r.attachments ?? []), ...news] });
                e.target.value = "";
              }}
              className="block w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-xs file:text-white"
            />
            {(r.attachments?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1">
                {r.attachments!.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                    <Paperclip className="h-3 w-3 text-slate-500" />
                    <span className="flex-1 truncate">{a.name}</span>
                    <button
                      onClick={() => setR({ ...r, attachments: r.attachments!.filter((_, j) => j !== i) })}
                      className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Retirer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(r)} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewYearDialog({ existingYears, onCancel, onConfirm }: { existingYears: number[]; onCancel: () => void; onConfirm: (y: number) => void; }) {
  const [y, setY] = useState<number>(Math.max(...existingYears) + 1);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Archiver et démarrer une nouvelle année</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">
          Les données de l'année en cours seront conservées et consultables via le sélecteur d'année.
        </p>
        <div><Label>Année</Label><Input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onConfirm(y)} className="bg-blue-600 hover:bg-blue-700">Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
