import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, CheckCircle2, PenLine, ArrowLeft, Plus, Trash2, Upload, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/page-title";
import { addSignature, hasSigned, loadSignatures } from "@/lib/signatures";
import { addAck } from "@/lib/acknowledgements";
import { toast } from "sonner";
import {
  addReadSign, loadReadSign, persistReadSignFile, removeReadSign, resolveReadSignUrl,
  visibleForUser, type ReadSignDoc,
} from "@/lib/read-sign-store";
import { loadUsers } from "@/lib/users-store";
import { TEST_CREDENTIALS } from "@/lib/auth";
import { archive } from "@/lib/archives-store";

export const Route = createFileRoute("/read-sign")({
  component: ReadSignPage,
  head: () => ({ meta: [{ title: "Read & Sign — Ground Ops EDMS" }] }),
});

function ReadSignPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  usePageTitle("Read & Sign", "Lecture / Signature des documents diffusés par l'administration");

  const [refresh, setRefresh] = useState(0);
  const [active, setActive] = useState<ReadSignDoc | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const docs = useMemo(() => {
    if (isAdmin) return loadReadSign();
    return visibleForUser(user?.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, user, isAdmin]);

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
        onSigned={() => { setActive(null); setRefresh((r) => r + 1); }}
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
          {isAdmin && (
            <Button size="sm" className="ml-2 cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold">Destinataires</th>}
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-slate-500">
                      {isAdmin ? "Aucun document Read & Sign — cliquez sur Ajouter." : "Aucun document à signer."}
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
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs text-slate-600">{d.assignedEmails.length} utilisateur(s)</td>
                        )}
                        <td className="px-4 py-3">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Signé
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {d.requireSign ? "À signer" : "À lire"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button size="sm" variant={isSigned ? "outline" : "default"} className="cursor-pointer" onClick={() => setActive(d)}>
                              {isSigned ? "Consulter" : (d.requireSign ? "Lire & signer" : "Lire")}
                            </Button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (!window.confirm(`Supprimer « ${d.title} » ?`)) return;
                                  archive({ kind: "read-sign", category: "read-sign", title: d.title, reference: d.reference, archivedBy: user?.email ?? "admin", payload: d });
                                  removeReadSign(d.id);
                                  setRefresh((r) => r + 1);
                                  toast.success("Document supprimé et archivé");
                                }}
                                className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
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

      {addOpen && (
        <AddReadSignDialog
          onCancel={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); setRefresh((r) => r + 1); }}
        />
      )}
    </div>
  );
}

function AddReadSignDialog({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("Rev 1");
  const [requireSign, setRequireSign] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the union of all known users (seed + stored)
  const allUsers = useMemo(() => {
    const map = new Map<string, { email: string; username: string; userType?: string }>();
    for (const u of TEST_CREDENTIALS) map.set(u.email.toLowerCase(), { email: u.email, username: u.username, userType: u.userType });
    for (const u of loadUsers()) map.set(u.email.toLowerCase(), { email: u.email, username: u.username, userType: u.userType });
    return Array.from(map.values()).filter((u) => u.userType !== "admin");
  }, []);

  const toggle = (email: string) => {
    const e = email.toLowerCase();
    setSelected((s) => s.includes(e) ? s.filter((x) => x !== e) : [...s, e]);
  };
  const toggleAll = () => {
    if (selected.length === allUsers.length) setSelected([]);
    else setSelected(allUsers.map((u) => u.email.toLowerCase()));
  };

  const submit = async () => {
    if (!reference || !title || files.length === 0) {
      toast.error("Référence, titre et fichier sont requis");
      return;
    }
    if (selected.length === 0) {
      toast.error("Sélectionnez au moins un destinataire");
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const id = `rs-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const { url, blobKey, mime } = await persistReadSignFile(id, f);
      addReadSign({
        title: files.length > 1 ? `${title} (${f.name})` : title,
        reference: files.length > 1 ? `${reference}-${i + 1}` : reference,
        version,
        date: new Date().toISOString().slice(0, 10),
        fileName: f.name,
        url, blobKey, mime,
        requireSign,
        assignedEmails: selected,
        createdBy: user?.email ?? "admin",
      });
    }
    toast.success("Document Read & Sign ajouté");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Ajouter un document Read & Sign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Référence *</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="RS-2026-01" /></div>
            <div><Label>Version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} /></div>
          </div>
          <div><Label>Titre *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Fichier(s) *</Label>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <input type="checkbox" checked={requireSign} onChange={(e) => setRequireSign(e.target.checked)} className="h-4 w-4 cursor-pointer accent-blue-600" />
            <span><b>Exiger une signature</b> (sinon, simple lecture)</span>
          </label>
          <div>
            <div className="flex items-center gap-2">
              <Label>Destinataires ({selected.length}/{allUsers.length})</Label>
              <button onClick={toggleAll} className="ml-auto cursor-pointer rounded-md border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50">
                {selected.length === allUsers.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="mt-1 max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
              {allUsers.length === 0 ? (
                <div className="p-2 text-xs text-slate-500">Aucun utilisateur.</div>
              ) : allUsers.map((u) => (
                <label key={u.email} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-white">
                  <input type="checkbox" checked={selected.includes(u.email.toLowerCase())} onChange={() => toggle(u.email)} className="h-3.5 w-3.5 cursor-pointer" />
                  <span className="flex-1 truncate">{u.username} <span className="text-slate-400">— {u.email}</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="cursor-pointer">Annuler</Button>
          <Button onClick={submit} className="cursor-pointer bg-blue-600 hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" /> Téléverser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadSignViewer({ doc, onBack, onSigned }: { doc: ReadSignDoc; onBack: () => void; onSigned: () => void }) {
  const { user } = useAuth();
  const alreadySigned = !!user && hasSigned(user.email, doc.id);
  const [scrolledEnd, setScrolledEnd] = useState(alreadySigned);
  const [sig, setSig] = useState(user?.username ?? "");
  const [agree, setAgree] = useState(false);
  const [docUrl, setDocUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    resolveReadSignUrl(doc).then((u) => { if (alive) setDocUrl(u); });
    return () => { alive = false; };
  }, [doc]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledEnd(true);
  };

  // View-only: mark as "read" on close without signing
  const markViewed = () => {
    if (!user) return;
    addAck({
      userEmail: user.email, userName: user.username,
      docId: doc.id, docTitle: doc.title, docReference: doc.reference,
      category: "read-sign", action: "view",
    });
  };

  const canSign = !alreadySigned && scrolledEnd && agree && sig.trim().length >= 3;

  const submit = () => {
    if (!user || !canSign) return;
    addSignature({
      userEmail: user.email, userName: user.username,
      docId: doc.id, docTitle: doc.title, docReference: doc.reference,
      signatureText: sig.trim(),
    });
    addAck({
      userEmail: user.email, userName: user.username,
      docId: doc.id, docTitle: doc.title, docReference: doc.reference,
      category: "read-sign", action: "sign",
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            {doc.requireSign ? "Faites défiler jusqu'en bas pour activer la signature." : "Document à lire."}
          </div>
          <div ref={scrollRef} onScroll={onScroll} className="h-[70vh] overflow-y-auto px-2 py-3">
            <iframe title={doc.title} src={docUrl} className="h-[68vh] w-full rounded border border-slate-200" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {doc.requireSign ? (
            <>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Signature électronique</h3>
              <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <div><span className="font-semibold">Utilisateur :</span> {user?.username}</div>
                <div><span className="font-semibold">Email :</span> {user?.email}</div>
              </div>
              <div className={"mb-3 rounded-md border px-3 py-2 text-xs " + (scrolledEnd ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800")}>
                {scrolledEnd ? "✓ Document lu jusqu'à la fin." : "⏳ Défilez jusqu'en bas."}
              </div>
              <Label htmlFor="sig" className="text-xs">Tapez votre nom complet</Label>
              <Input id="sig" value={sig} onChange={(e) => setSig(e.target.value)} disabled={alreadySigned} className="mt-1" />
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 text-xs">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={alreadySigned} className="mt-0.5 h-4 w-4 cursor-pointer" />
                <span>Je confirme avoir lu et compris l'intégralité du document.</span>
              </label>
              <Button className="mt-4 w-full cursor-pointer" disabled={!canSign} onClick={submit}>
                <PenLine className="mr-1.5 h-4 w-4" />
                {alreadySigned ? "Déjà signé" : "Signer le document"}
              </Button>
            </>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Lecture</h3>
              <p className="text-xs text-slate-600">Ce document est en lecture seule. Cliquez ci-dessous pour enregistrer votre lecture.</p>
              <Button className="mt-4 w-full cursor-pointer" onClick={() => { markViewed(); onSigned(); toast.success("Lecture enregistrée"); }}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marquer comme lu
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
