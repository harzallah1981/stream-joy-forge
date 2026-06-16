import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, findAccountByEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plane, KeyRound, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Ground Ops EDMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login, ready } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (ready && user) nav({ to: "/" });
  }, [ready, user, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const r = login(email.trim(), password);
    if (!r.ok) setErr(r.error);
    else nav({ to: "/" });
  };

  const sendReset = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = findAccountByEmail(forgotEmail.trim());
    if (!acc) {
      toast.error(t("email_unknown"));
      return;
    }
    toast.success(t("reset_link_sent"));
    setForgotOpen(false);
    // Simulate the email link → navigate to secure reset page
    setTimeout(() => {
      nav({ to: "/reset-password", search: { email: acc.email } });
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0a2540] to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white">
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Ground Ops EDMS</h1>
                <p className="text-sm text-slate-500">{t("login_subtitle")}</p>
              </div>
            </div>
            <div className="flex gap-1 rounded-md border bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setLang("fr")}
                className={`cursor-pointer rounded px-2 py-1 text-xs font-semibold ${lang === "fr" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >FR</button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`cursor-pointer rounded px-2 py-1 text-xs font-semibold ${lang === "en" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >EN</button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            <div>
              <Label>{t("email_or_username")}</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Label>{t("password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700">
              <KeyRound className="mr-2 h-4 w-4" /> {t("sign_in")}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                className="cursor-pointer text-sm text-blue-600 hover:underline"
              >
                {t("forgot_password")}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-600" />{t("forgot_title")}</DialogTitle>
            <DialogDescription>{t("forgot_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-4">
            <div>
              <Label>{t("email_or_username")}</Label>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="user@tunisair.com.tn"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700">
              {t("send_reset_link")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
