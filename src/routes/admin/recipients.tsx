import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/page-title";
import {
  FORM_TYPES,
  loadRecipientsConfig,
  saveRecipientsConfig,
  MAX_RECIPIENTS,
  type RecipientsConfig,
} from "@/lib/forms/recipients-config";

export const Route = createFileRoute("/admin/recipients")({
  head: () => ({ meta: [{ title: "Destinataires des formulaires — Admin" }] }),
  component: RecipientsAdmin,
});

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function RecipientsAdmin() {
  usePageTitle("Destinataires", "Configurer les destinataires par formulaire");
  const { user } = useAuth();
  const [cfg, setCfg] = useState<RecipientsConfig>({});

  useEffect(() => { setCfg(loadRecipientsConfig()); }, []);

  if (user?.role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

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
    // Validate & strip empties
    const clean: RecipientsConfig = {};
    for (const ft of FORM_TYPES) {
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-blue-600" />
            DESTINATAIRES PAR FORMULAIRE
          </h2>
          <Button onClick={save} className="ml-auto h-9 cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </div>

        <div className="space-y-4 bg-slate-50 p-4">
          {FORM_TYPES.map((ft) => {
            const cur = cfg[ft.id] ?? { to: [], cc: [] };
            return (
              <div key={ft.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{ft.label}</h3>
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
                              <button
                                type="button"
                                onClick={() => removeRow(ft.id, key, i)}
                                className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Retirer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {list.length < MAX_RECIPIENTS && (
                          <button
                            type="button"
                            onClick={() => addRow(ft.id, key)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
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

      <p className="mt-3 text-xs text-slate-500">
        Une copie automatique vers l'utilisateur connecté est toujours ajoutée à l'envoi (en plus des CC ci-dessus).
      </p>
    </div>
  );
}
