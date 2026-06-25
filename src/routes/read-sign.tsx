import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FileText, CheckCircle2, PenLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/page-title";
import { SAMPLE_DOCS, loadUserDocs, type DocItem } from "@/lib/documents";
import { addSignature, hasSigned, loadSignatures } from "@/lib/signatures";
import { toast } from "sonner";

export const Route = createFileRoute("/read-sign")({
  component: ReadSignPage,
  head: () => ({ meta: [{ title: "Read & Sign — Ground Ops EDMS" }] }),
});

function ReadSignPage() {
  const { user } = useAuth();
  usePageTitle("Read & Sign", "Lecture obligatoire et signature");

  const [refresh, setRefresh] = useState(0);
  const [active, setActive] = useState<DocItem | null>(null);

  const docs = useMemo(() => {
    return [...SAMPLE_DOCS, ...loadUserDocs()];
  }, [refresh]);

  const signedSet = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(
      loadSignatures()
        .filter((s) => s.userEmail.toLowerCase() === user.email.toLowerCase())
        .map((s) => s.docId),
    );
  }, [user, refresh]);

  if (active) {
    return (
      <ReadSignViewer
        doc={active}
        onBack={() => setActive(null)}
        onSigned={() => {
          setActive(null);
          setRefresh((r) => r + 1);
        }}
      />
    );
  }

  const pending = docs.filter((d) => !signedSet.has(d.id));
  const signed = docs.filter((d) => signedSet.has(d.id));

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <PenLine className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Documents à lire & signer</h2>
          <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            {pending.length} en attente
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {signed.length} signés
          </span>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Aucun document.
                    </td>
                  </tr>
                ) : (
                  docs.map((d) => {
                    const isSigned = signedSet.has(d.id);
                    return (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{d.reference}</td>
                        <td className="px-4 py-3 text-slate-900">{d.title}</td>
                        <td className="px-4 py-3 text-slate-600">{d.version}</td>
                        <td className="px-4 py-3">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Signé
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              À signer
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={isSigned ? "outline" : "default"}
                            className="cursor-pointer"
                            onClick={() => setActive(d)}
                          >
                            {isSigned ? "Consulter" : "Lire & signer"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadSignViewer({
  doc,
  onBack,
  onSigned,
}: {
  doc: DocItem;
  onBack: () => void;
  onSigned: () => void;
}) {
  const { user } = useAuth();
  const alreadySigned = !!user && hasSigned(user.email, doc.id);
  const [scrolledEnd, setScrolledEnd] = useState(alreadySigned);
  const [sig, setSig] = useState("");
  const [agree, setAgree] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledEnd(true);
    }
  };

  const canSign = !alreadySigned && scrolledEnd && agree && sig.trim().length >= 3;

  const submit = () => {
    if (!user || !canSign) return;
    addSignature({
      userEmail: user.email,
      userName: user.username,
      docId: doc.id,
      docTitle: doc.title,
      docReference: doc.reference,
      signatureText: sig.trim(),
    });
    toast.success("Document signé");
    onSigned();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="cursor-pointer gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <h2 className="text-sm font-semibold text-slate-900">
          {doc.reference} — {doc.title}
        </h2>
        {alreadySigned && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Déjà signé
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            Faites défiler jusqu'en bas pour activer la signature.
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="h-[70vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-800"
          >
            <h3 className="mb-2 text-base font-semibold">{doc.title}</h3>
            <p className="mb-3 text-xs text-slate-500">
              Référence : {doc.reference} · Version : {doc.version} · Date : {doc.date}
            </p>
            <iframe
              title={doc.title}
              src={doc.url}
              className="mb-4 h-[55vh] w-full rounded border border-slate-200"
            />
            {Array.from({ length: 12 }).map((_, i) => (
              <p key={i} className="mb-3 text-justify text-slate-700">
                <strong>Section {i + 1}.</strong> Ce document fait partie du dispositif documentaire
                Tunisair Ground Ops. En tant qu'opérateur concerné, vous devez en prendre
                connaissance intégralement avant signature. Toute non-conformité aux procédures
                décrites doit être signalée via le Registre des Événements. La signature électronique
                ci-contre engage votre responsabilité quant à la lecture et la compréhension du
                contenu présenté ci-dessus.
              </p>
            ))}
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              ✓ Fin du document — vous pouvez maintenant signer.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Signature électronique</h3>

          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <div><span className="font-semibold">Utilisateur :</span> {user?.username}</div>
            <div><span className="font-semibold">Email :</span> {user?.email}</div>
          </div>

          <div className={"mb-3 rounded-md border px-3 py-2 text-xs " + (scrolledEnd ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800")}>
            {scrolledEnd ? "✓ Document lu jusqu'à la fin." : "⏳ Lecture en cours — défilez jusqu'en bas."}
          </div>

          <Label htmlFor="sig" className="text-xs">Tapez votre nom complet</Label>
          <Input
            id="sig"
            value={sig}
            onChange={(e) => setSig(e.target.value)}
            placeholder={user?.username ?? "Prénom Nom"}
            disabled={alreadySigned}
            className="mt-1"
          />

          <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 text-xs">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={alreadySigned}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span>
              Je confirme avoir lu et compris l'intégralité du document et accepte la valeur légale
              de cette signature électronique.
            </span>
          </label>

          <Button
            className="mt-4 w-full cursor-pointer"
            disabled={!canSign}
            onClick={submit}
          >
            <PenLine className="mr-1.5 h-4 w-4" />
            {alreadySigned ? "Déjà signé" : "Signer le document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
