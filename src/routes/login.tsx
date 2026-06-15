import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Ground Ops EDMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login, ready } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0a2540] to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ground Ops EDMS</h1>
              <p className="text-sm text-slate-500">Connexion / Sign in</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            <div>
              <Label>Email ou nom d'utilisateur</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder=""
              />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=""
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700">
              <KeyRound className="mr-2 h-4 w-4" /> Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
