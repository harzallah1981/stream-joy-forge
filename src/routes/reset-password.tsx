import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, KeyRound, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { findAccountByEmail, resetPassword, validateStrongPassword } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ email: typeof s.email === "string" ? s.email : "" }),
  component: ResetPasswordPage,
});

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-green-600" : "text-slate-500"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );
}

function ResetPasswordPage() {
  const { t, lang, setLang } = useI18n();
  const { email } = useSearch({ from: "/reset-password" });
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const acc = email ? findAccountByEmail(email) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!acc) { setErr(t("email_unknown")); return; }
    if (pw !== pw2) { setErr(t("password_mismatch")); return; }
    const v = validateStrongPassword(pw);
    if (v) { setErr(t(`pw_rule_${v.replace("need_", "").replace("min_8", "min8")}` === "pw_rule_min8" ? "pw_rule_min8" : `pw_rule_${v.replace("need_", "")}`)); return; }
    resetPassword(acc.email, pw);
    toast.success(t("password_updated"));
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0a2540] to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white">
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t("reset_title")}</h1>
                <p className="text-sm text-slate-500">{email}</p>
              </div>
            </div>
            <div className="flex gap-1 rounded-md border bg-slate-50 p-0.5">
              <button type="button" onClick={() => setLang("fr")} className={`cursor-pointer rounded px-2 py-1 text-xs font-semibold ${lang === "fr" ? "bg-blue-600 text-white" : "text-slate-600"}`}>FR</button>
              <button type="button" onClick={() => setLang("en")} className={`cursor-pointer rounded px-2 py-1 text-xs font-semibold ${lang === "en" ? "bg-blue-600 text-white" : "text-slate-600"}`}>EN</button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>{t("new_password")}</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <Label>{t("confirm_password")}</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1 rounded-md bg-slate-50 p-3">
              <PwRule ok={pw.length >= 8} label={t("pw_rule_min8")} />
              <PwRule ok={/[A-Z]/.test(pw)} label={t("pw_rule_upper")} />
              <PwRule ok={/[a-z]/.test(pw)} label={t("pw_rule_lower")} />
              <PwRule ok={/[0-9]/.test(pw)} label={t("pw_rule_digit")} />
              <PwRule ok={/[^A-Za-z0-9]/.test(pw)} label={t("pw_rule_special")} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700">
              <KeyRound className="mr-2 h-4 w-4" /> {t("save")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
