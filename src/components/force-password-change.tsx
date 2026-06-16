import { useState } from "react";
import { useAuth, validateStrongPassword } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, KeyRound } from "lucide-react";
import { toast } from "sonner";

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-green-600" : "text-slate-500"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );
}

export function ForcePasswordChangeModal() {
  const { mustChange, changePassword, logout } = useAuth();
  const { t } = useI18n();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!mustChange) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw !== pw2) { setErr(t("password_mismatch")); return; }
    const v = validateStrongPassword(pw);
    if (v) {
      const key = v === "min_8" ? "pw_rule_min8" : `pw_rule_${v.replace("need_", "")}`;
      setErr(t(key));
      return;
    }
    const r = changePassword(cur, pw);
    if (!r.ok) {
      setErr(r.error === "wrong_current" ? t("wrong_current_password") : t(r.error));
      return;
    }
    toast.success(t("password_updated"));
  };

  return (
    <Dialog open={mustChange} onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-blue-600" />{t("must_change_title")}</DialogTitle>
          <DialogDescription>{t("must_change_desc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>{t("current_password")}</Label>
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <Label>{t("new_password")}</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>{t("confirm_password")}</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1 rounded-md bg-slate-50 p-2">
            <PwRule ok={pw.length >= 8} label={t("pw_rule_min8")} />
            <PwRule ok={/[A-Z]/.test(pw)} label={t("pw_rule_upper")} />
            <PwRule ok={/[a-z]/.test(pw)} label={t("pw_rule_lower")} />
            <PwRule ok={/[0-9]/.test(pw)} label={t("pw_rule_digit")} />
            <PwRule ok={/[^A-Za-z0-9]/.test(pw)} label={t("pw_rule_special")} />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={logout}>
              {t("logout")}
            </Button>
            <Button type="submit" className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700">
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
