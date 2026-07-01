import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Save, Plus, X, Pencil, Trash2, RotateCcw, Eye, FilePlus2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/page-title";
import {
  getFormTypes,
  loadRecipientsConfig,
  saveRecipientsConfig,
  resetRecipientsFor,
  MAX_RECIPIENTS,
  type RecipientsConfig,
} from "@/lib/forms/recipients-config";
import {
  loadForms, setFormLabel, restoreForm, deleteForm, addCustomForm, updateFormFields,
  type FormDef, type FormField, type FormFieldType,
} from "@/lib/forms-store";
import { archive } from "@/lib/archives-store";


export const Route = createFileRoute("/admin/recipients")({
  head: () => ({ meta: [{ title: "Formulaires & destinataires — Admin" }] }),
  component: RecipientsAdmin,
});

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function RecipientsAdmin() {
  usePageTitle("Formulaires & destinataires", "Gestion des formulaires et de leurs destinataires");
  const { user } = useAuth();
  const [cfg, setCfg] = useState<RecipientsConfig>({});
  const [forms, setForms] = useState<FormDef[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [renameTarget, setRenameTarget] = useState<FormDef | null>(null);

  useEffect(() => {
    setCfg(loadRecipientsConfig());
    setForms(loadForms());
  }, [refresh]);

  if (user?.role !== "admin") {
    return <div className="p-8"><p className="text-sm text-slate-600">Accès réservé aux administrateurs.</p></div>;
  }

  const visible = forms.filter((f) => !f.hidden);
  const hidden = forms.filter((f) => f.hidden);

  const update = (id: string, key: "to" | "cc", i: number, v: string) => {
    setCfg((c) => {
      const cur = c[id] ?? { to: [], cc: [] };
      const list = [...(cur[key] ?? [])];
      list[i] = v;
      return { ...c, [id]: { ...cur, [key]: list } };
    });
  };
  const addRow = (id: string, key: "to" | "cc") => {
    setCfg((c) => {
      const cur = c[id] ?? { to: [], cc: [] };
      const list = cur[key] ?? [];
      if (list.length >= MAX_RECIPIENTS) return c;
      return { ...c, [id]: { ...cur, [key]: [...list, ""] } };
    });
  };
  const removeRow = (id: string, key: "to" | "cc", i: number) => {
    setCfg((c) => {
      const cur = c[id] ?? { to: [], cc: [] };
      return { ...c, [id]: { ...cur, [key]: (cur[key] ?? []).filter((_, idx) => idx !== i) } };
    });
  };

  const save = () => {
    const clean: RecipientsConfig = {};
    for (const ft of getFormTypes()) {
      const cur = cfg[ft.id] ?? { to: [], cc: [] };
      const to = (cur.to ?? []).map((s) => s.trim()).filter(Boolean);
      const cc = (cur.cc ?? []).map((s) => s.trim()).filter(Boolean);
      const bad = [...to, ...cc].find((s) => !isEmail(s));
      if (bad) { toast.error(`Email invalide : ${bad}`); return; }
      clean[ft.id] = { to: to.slice(0, MAX_RECIPIENTS), cc: cc.slice(0, MAX_RECIPIENTS) };
    }
    saveRecipientsConfig(clean);
    setCfg(clean);
    toast.success("Configuration enregistrée");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-blue-600" />
            FORMULAIRES & DESTINATAIRES
          </h2>
          <Button onClick={save} className="ml-auto h-9 cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4" /> Enregistrer destinataires
          </Button>
        </div>

        <div className="space-y-4 bg-slate-50 p-4">
          {visible.map((ft) => {
            const cur = cfg[ft.id] ?? { to: [], cc: [] };
            return (
              <div key={ft.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{ft.label}</h3>
                  {ft.custom && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Personnalisé</span>}
                  <Link to={ft.custom ? "/forms/c/$slug" : ("/forms/" + ft.slug) as any} params={ft.custom ? { slug: ft.slug } as any : undefined as any} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50">
                    <Eye className="h-3 w-3" /> Ouvrir
                  </Link>
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setRenameTarget(ft)}>
                      <Pencil className="h-3 w-3" /> Renommer
                    </Button>
                    {ft.custom && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setFieldsTarget(ft)}>
                        <Settings2 className="h-3 w-3" /> Modifier les champs
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => {
                      resetRecipientsFor(ft.id);
                      setRefresh((r) => r + 1);
                      toast.success("Destinataires réinitialisés");
                    }}>
                      <RotateCcw className="h-3 w-3" /> Refaire
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50" onClick={() => {
                      const msg = ft.custom
                        ? `Supprimer définitivement le formulaire personnalisé « ${ft.label} » ?`
                        : `Supprimer le formulaire « ${ft.label} » ? Il sera archivé.`;
                      if (!window.confirm(msg)) return;
                      archive({ kind: "form", category: "form", title: ft.label, reference: ft.id, archivedBy: user?.email ?? "admin", payload: ft });
                      deleteForm(ft.id);
                      setRefresh((r) => r + 1);
                      toast.success("Formulaire supprimé");
                    }}>
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(["to", "cc"] as const).map((key) => {
                    const list = cur[key] ?? [];
                    const display = list.length ? list : [""];
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs uppercase text-slate-500">
                          {key === "to" ? "Destinataires (À)" : "Copie (CC)"} · max {MAX_RECIPIENTS}
                        </Label>
                        {display.map((v, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Input
                              type="email"
                              value={v}
                              onChange={(e) => update(ft.id, key, i, e.target.value)}
                              placeholder={key === "to" ? "destinataire@exemple.com" : "copie@exemple.com"}
                            />
                            {list.length > 0 && (
                              <button type="button" onClick={() => removeRow(ft.id, key, i)}
                                className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Retirer">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {list.length < MAX_RECIPIENTS && (
                          <button type="button" onClick={() => addRow(ft.id, key)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                            <Plus className="h-3.5 w-3.5" /> Ajouter
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hidden.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
            Formulaires supprimés ({hidden.length})
          </div>
          <ul className="divide-y divide-slate-100">
            {hidden.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-5 py-2 text-sm">
                <span className="text-slate-700">{f.defaultLabel}</span>
                <span className="text-xs text-slate-400">({f.id})</span>
                <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 text-xs" onClick={() => {
                  restoreForm(f.id); setRefresh((r) => r + 1); toast.success("Formulaire restauré");
                }}>
                  <RotateCcw className="h-3 w-3" /> Restaurer
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Une copie automatique vers l'utilisateur connecté est toujours ajoutée à l'envoi (en plus des CC ci-dessus).
      </p>

      {renameTarget && (
        <RenameDialog
          form={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onSave={(label) => {
            setFormLabel(renameTarget.id, label);
            setRenameTarget(null); setRefresh((r) => r + 1);
            toast.success("Formulaire renommé");
          }}
        />
      )}
    </div>
  );
}

function RenameDialog({ form, onCancel, onSave }: { form: FormDef; onCancel: () => void; onSave: (label: string) => void }) {
  const [v, setV] = useState(form.label);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold">Renommer le formulaire</h3>
        <Label className="text-xs">Nouveau nom</Label>
        <Input value={v} onChange={(e) => setV(e.target.value)} className="mt-1" />
        <p className="mt-1 text-[11px] text-slate-500">Original : {form.defaultLabel}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
          <Button size="sm" onClick={() => onSave(v)} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
