import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/lib/page-title";
import { getFormBySlug, type FormField } from "@/lib/forms-store";
import { getRecipientsFor } from "@/lib/forms/recipients-config";
import { submitForm } from "@/lib/forms/submit.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forms/c/$slug")({
  head: () => ({ meta: [{ title: "Formulaire personnalisé" }] }),
  component: CustomFormPage,
});

function CustomFormPage() {
  const { slug } = useParams({ from: "/forms/c/$slug" });
  const nav = useNavigate();
  const { user } = useAuth();
  const def = useMemo(() => getFormBySlug(slug), [slug]);
  usePageTitle(def?.label ?? "Formulaire", def?.custom ? "Formulaire personnalisé" : "Formulaire");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  if (!def) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">Formulaire introuvable.</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => nav({ to: "/" })}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  const fields: FormField[] = def.fields ?? [];

  const setVal = (id: string, v: unknown) => setValues((s) => ({ ...s, [id]: v }));

  const submit = async () => {
    for (const f of fields) {
      if (f.required && (values[f.id] === undefined || values[f.id] === "" || values[f.id] === false)) {
        toast.error(`Champ requis: ${f.label}`); return;
      }
    }
    const r = getRecipientsFor(def.id);
    const to = r.to.length ? r.to : (user?.email ? [user.email] : []);
    if (to.length === 0) { toast.error("Aucun destinataire configuré"); return; }
    setBusy(true);
    try {
      await submitForm({ data: { formType: def.id, to, cc: [...r.cc, ...(user?.email ? [user.email] : [])], payload: { _formLabel: def.label, ...values } } });
      toast.success("Formulaire envoyé");
      setValues({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => nav({ to: "/" })}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b-4 border-blue-700 bg-blue-50 px-5 py-4">
          <FileText className="h-5 w-5 text-blue-700" />
          <h1 className="text-base font-bold uppercase tracking-wide text-blue-900">{def.label}</h1>
        </div>
        <div className="space-y-4 bg-slate-50 p-5">
          {fields.length === 0 ? (
            <p className="text-sm text-slate-500">Ce formulaire n'a pas encore de champs. L'administrateur peut les ajouter dans « Formulaires & destinataires ».</p>
          ) : fields.map((f) => (
            <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <Label className="text-xs font-semibold text-slate-700">
                {f.label} {f.required && <span className="text-red-600">*</span>}
              </Label>
              <div className="mt-1.5">
                {f.type === "textarea" ? (
                  <Textarea rows={4} placeholder={f.placeholder} value={String(values[f.id] ?? "")} onChange={(e) => setVal(f.id, e.target.value)} />
                ) : f.type === "select" ? (
                  <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" value={String(values[f.id] ?? "")} onChange={(e) => setVal(f.id, e.target.value)}>
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "checkbox" ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!values[f.id]} onChange={(e) => setVal(f.id, e.target.checked)} />
                    <span className="text-slate-600">{f.placeholder ?? "Oui / Non"}</span>
                  </label>
                ) : (
                  <Input type={f.type} placeholder={f.placeholder} value={String(values[f.id] ?? "")} onChange={(e) => setVal(f.id, f.type === "number" ? Number(e.target.value) : e.target.value)} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <Button disabled={busy || fields.length === 0} onClick={submit} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" /> {busy ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
