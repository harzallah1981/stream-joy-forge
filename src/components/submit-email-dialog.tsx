import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitForm } from "@/lib/forms/submit.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getRecipientsFor, MAX_RECIPIENTS } from "@/lib/forms/recipients-config";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

function pad(list: string[], min = 1): string[] {
  const next = [...list];
  while (next.length < min) next.push("");
  return next;
}

export function SubmitEmailDialog({
  open,
  onOpenChange,
  formType,
  payload,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formType: string;
  payload: Record<string, unknown>;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const submit = useServerFn(submitForm);

  const defaults = useMemo(() => (open ? getRecipientsFor(formType) : null), [open, formType]);
  const [to, setTo] = useState<string[]>([""]);
  const [cc, setCc] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!defaults) return;
    setTo(pad(defaults.to, 1));
    // Auto-copy the current user
    const autoCc = user?.email && !defaults.cc.map((x) => x.toLowerCase()).includes(user.email.toLowerCase())
      ? [...defaults.cc, user.email]
      : defaults.cc;
    setCc(autoCc);
  }, [defaults, user?.email]);

  const setAt = (list: string[], setter: (l: string[]) => void, i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    setter(next);
  };

  const addRow = (list: string[], setter: (l: string[]) => void) => {
    if (list.length >= MAX_RECIPIENTS) return;
    setter([...list, ""]);
  };

  const removeRow = (list: string[], setter: (l: string[]) => void, i: number) => {
    setter(list.filter((_, idx) => idx !== i));
  };

  const toClean = uniq(to.filter((s) => s.trim()));
  const ccClean = uniq(cc.filter((s) => s.trim()));
  const allValid = toClean.length > 0
    && toClean.every(isEmail)
    && ccClean.every(isEmail);

  const handleSend = async () => {
    if (!allValid) return;
    setBusy(true);
    try {
      await submit({ data: { formType, to: toClean, cc: ccClean, payload } });
      const recap = ccClean.length
        ? `${toClean.join(", ")} (cc: ${ccClean.join(", ")})`
        : toClean.join(", ");
      toast.success(t("sent_ok"), { description: recap });
      onOpenChange(false);
      onSent();
    } catch (e) {
      console.error(e);
      toast.error(t("sent_err"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const renderRows = (
    list: string[],
    setter: (l: string[]) => void,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      {list.map((v, i) => {
        const invalid = v.trim() !== "" && !isEmail(v);
        return (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              type="email"
              value={v}
              onChange={(e) => setAt(list, setter, i, e.target.value)}
              placeholder={placeholder}
              className={invalid ? "border-red-300 focus-visible:ring-red-300" : ""}
            />
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(list, setter, i)}
                className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Retirer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      {list.length < MAX_RECIPIENTS && (
        <button
          type="button"
          onClick={() => addRow(list, setter)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter (max {MAX_RECIPIENTS})
        </button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("email_modal_title")}</DialogTitle>
          <DialogDescription>
            Pré-rempli depuis la configuration admin pour ce formulaire. Vous pouvez ajuster les destinataires avant l'envoi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destinataires (À) — jusqu'à {MAX_RECIPIENTS}</Label>
            {renderRows(to, setTo, "destinataire@exemple.com")}
          </div>
          <div className="space-y-2">
            <Label>Copie (CC) — jusqu'à {MAX_RECIPIENTS}</Label>
            {renderRows(pad(cc, 1), setCc, "copie@exemple.com")}
            {user?.email && (
              <p className="text-[11px] text-slate-500">
                Une copie est automatiquement envoyée à vous-même ({user.email}).
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={busy || !allValid}>
            {busy ? "…" : t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
