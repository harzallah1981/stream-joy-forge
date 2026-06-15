import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, Plus, Search, Download, Trash2, Eye, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/page-title";
import { useAuth } from "@/lib/auth";
import {
  getDocsForCategory, loadUserDocs, saveUserDocs, fileToDataUrl, type DocItem,
} from "@/lib/documents";
import { addAck, loadAcks } from "@/lib/acknowledgements";
import { loadUsers, addUser, removeUser, type StoredUser } from "@/lib/users-store";
import { toast } from "sonner";

const SLUG_TO_KEY: Record<string, string> = {
  gom: "gom", dam: "dam",
  "pos-427": "pos_427", "pos-428": "pos_428", "pos-429": "pos_429",
  "ios-428-01": "ios_428_01", "ios-428-02": "ios_428_02",
  "ios-429-01": "ios_429_01", "ios-429-02": "ios_429_02",
  "dow-doi-a320": "a320_fleet", "dow-doi-a330-243": "a330_243",
  "ahm-fleet": "ahm_fleet", "load-trim-fleet": "load_trim",
  "loading-instructions-fleet": "loading_instr",
  cdn: "cdn", ceirb: "ceirb", "c-immatriculation": "c_immat",
  cln: "cln", aoc: "aoc",
  dgac: "dgac", iata: "iata", "ac-affretees": "affretees",
  "liste-personnel": "liste_personnel",
  "suivi-formation": "suivi_formation",
  "gestion-utilisateurs": "gestion_users",
  credentials: "credentials",
  "accuses-reception": "accuses",
};

export const Route = createFileRoute("/page/$slug")({
  component: StubPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — Ground Ops EDMS` }],
  }),
});

function StubPage() {
  const { slug } = Route.useParams();

  // Special-case admin pages
  if (slug === "gestion-utilisateurs") return <UserManagementPage />;
  if (slug === "accuses-reception") return <AcksPage />;

  return <DocumentsPage slug={slug} />;
}

function DocumentsPage({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const key = SLUG_TO_KEY[slug] ?? slug;
  const title = t(key);
  usePageTitle(title, "Gestion documentaire");

  const [refresh, setRefresh] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [ackTarget, setAckTarget] = useState<null | { doc: DocItem; action: "view" | "download" }>(null);

  const docs = useMemo(() => getDocsForCategory(slug), [slug, refresh]);
  const filtered = docs.filter(
    (d) =>
      (status === "all" || d.status === status) &&
      (q === "" ||
        d.title.toLowerCase().includes(q.toLowerCase()) ||
        d.reference.toLowerCase().includes(q.toLowerCase())),
  );

  const handleDelete = (id: string) => {
    const u = loadUserDocs().filter((d) => d.id !== id);
    saveUserDocs(u);
    setRefresh((r) => r + 1);
    toast.success("Document supprimé");
  };

  const requestAction = (doc: DocItem, action: "view" | "download") => {
    if (isAdmin) {
      // Admin: direct open / download
      performAction(doc, action);
      return;
    }
    // Non-admin must acknowledge first
    setAckTarget({ doc, action });
  };

  const performAction = (doc: DocItem, action: "view" | "download") => {
    if (action === "view") {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {filtered.length} document{filtered.length > 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex flex-1 items-center gap-2 sm:flex-none">
            <div className="relative flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par titre ou référence..."
                className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="En diffusion">En diffusion</option>
              <option value="En revue">En revue</option>
              <option value="Périmé">Périmé</option>
            </select>
            {isAdmin && (
              <UploadDialog slug={slug} onDone={() => setRefresh((r) => r + 1)} />
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100">
                          <FileText className="h-7 w-7 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">Aucun document trouvé</p>
                        {isAdmin && (
                          <UploadDialog
                            slug={slug}
                            onDone={() => setRefresh((r) => r + 1)}
                            trigger={
                              <Button variant="outline" size="sm" className="mt-4 cursor-pointer gap-1.5">
                                <Upload className="h-3.5 w-3.5" /> Ajouter
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{d.reference}</td>
                      <td className="px-4 py-3 text-slate-900">{d.title}</td>
                      <td className="px-4 py-3 text-slate-600">{d.version}</td>
                      <td className="px-4 py-3 text-slate-600">{d.date}</td>
                      <td className="px-4 py-3">
                        <StatusPill s={d.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => requestAction(d, "view")}
                            className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Visualiser le document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestAction(d, "download")}
                            className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Télécharger le document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {isAdmin && d.id.startsWith("u-") && (
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!isAdmin && (
          <div className="border-t border-slate-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">
            🔒 Lecture seule — un accusé de réception est requis avant toute consultation ou téléchargement.
          </div>
        )}
      </div>

      {ackTarget && (
        <AckDialog
          doc={ackTarget.doc}
          action={ackTarget.action}
          slug={slug}
          onCancel={() => setAckTarget(null)}
          onConfirm={() => {
            addAck({
              userEmail: user?.email ?? "anonymous",
              userName: user?.username ?? "anonymous",
              docId: ackTarget.doc.id,
              docTitle: ackTarget.doc.title,
              docReference: ackTarget.doc.reference,
              category: slug,
              action: ackTarget.action,
            });
            const target = ackTarget;
            setAckTarget(null);
            performAction(target.doc, target.action);
            toast.success("Accusé de réception enregistré");
          }}
        />
      )}
    </div>
  );
}

function AckDialog({
  doc, action, slug, onCancel, onConfirm,
}: {
  doc: DocItem;
  action: "view" | "download";
  slug: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Accusé de réception requis
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Avant de {action === "view" ? "consulter" : "télécharger"} ce document,
            vous devez confirmer en avoir pris connaissance.
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <div><span className="font-semibold">Référence :</span> {doc.reference}</div>
            <div><span className="font-semibold">Titre :</span> {doc.title}</div>
            <div><span className="font-semibold">Catégorie :</span> {slug}</div>
            <div><span className="font-semibold">Version :</span> {doc.version}</div>
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span className="text-xs text-slate-800">
              Je reconnais avoir pris connaissance de ce document et accepte la traçabilité de cet accusé de réception.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="cursor-pointer">Annuler</Button>
          <Button
            disabled={!checked}
            onClick={onConfirm}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700"
          >
            Confirmer et {action === "view" ? "visualiser" : "télécharger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusPill({ s }: { s: DocItem["status"] }) {
  const map: Record<DocItem["status"], string> = {
    "En diffusion": "bg-green-100 text-green-700",
    "En revue": "bg-amber-100 text-amber-700",
    "Périmé": "bg-red-100 text-red-700",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + map[s]}>{s}</span>;
}

function UploadDialog({
  slug, onDone, trigger,
}: {
  slug: string;
  onDone: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [version, setVersion] = useState("Rev 1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (files.length === 0 || !reference || !docTitle) {
      toast.error("Référence, titre et fichier(s) sont requis");
      return;
    }
    const docs = loadUserDocs();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const url = await fileToDataUrl(f);
      docs.push({
        id: `u-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        category: slug,
        reference: files.length > 1 ? `${reference}-${i + 1}` : reference,
        title: files.length > 1 ? `${docTitle} (${f.name})` : docTitle,
        version,
        date,
        status: "En diffusion",
        fileName: f.name,
        url,
        uploadedBy: user?.email,
      });
    }
    saveUserDocs(docs);
    toast.success(`${files.length} document${files.length > 1 ? "s" : ""} ajouté${files.length > 1 ? "s" : ""}`);
    setReference(""); setDocTitle(""); setVersion("Rev 1"); setFiles([]);
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 cursor-pointer gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Ajouter un document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un ou plusieurs documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Référence</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="GOM-2026-02" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Titre</Label>
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Fichier(s) — PDF, Word, Excel, PowerPoint, JPG, PNG…</Label>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.svg"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                {files.map((f) => (
                  <li key={f.name}>• {f.name} — {(f.size / 1024).toFixed(1)} KB</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Annuler</Button>
          <Button onClick={submit} className="cursor-pointer bg-blue-600 hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" /> Téléverser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== Admin: User management page ============== */
function UserManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  usePageTitle("Gestion Utilisateurs", "Comptes internes et externes");

  const [refresh, setRefresh] = useState(0);
  const users = useMemo(() => loadUsers(), [refresh]);
  const [open, setOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="p-8 text-sm text-slate-600">
        🔒 Accès réservé aux administrateurs.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Gestion des utilisateurs</h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {users.length} compte{users.length > 1 ? "s" : ""}
          </span>
          <Button
            onClick={() => setOpen(true)}
            className="ml-auto h-9 cursor-pointer gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" /> Ajouter un utilisateur
          </Button>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold">Rôle</th>
                  <th className="px-4 py-3 text-left font-semibold">Organisation</th>
                  <th className="px-4 py-3 text-left font-semibold">Créé le</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Aucun utilisateur ajouté. Cliquez sur "Ajouter".</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={"rounded px-1.5 py-0.5 text-[10px] font-bold uppercase " + (
                        u.role === "admin" ? "bg-red-100 text-red-700" :
                        u.role === "internal" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.org}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { removeUser(u.id); setRefresh((r) => r + 1); toast.success("Utilisateur supprimé"); }}
                        className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {open && (
        <AddUserDialog
          onCancel={() => setOpen(false)}
          onAdd={(u) => { addUser(u); setOpen(false); setRefresh((r) => r + 1); toast.success("Utilisateur ajouté"); }}
        />
      )}
    </div>
  );
}

function AddUserDialog({
  onCancel, onAdd,
}: {
  onCancel: () => void;
  onAdd: (u: Omit<StoredUser, "id" | "createdAt">) => void;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"internal" | "external" | "admin">("internal");
  const [org, setOrg] = useState("");
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un utilisateur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" /></div>
          <div><Label>Nom d'utilisateur</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div>
            <Label>Rôle</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "internal" | "external" | "admin")}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="internal">Interne (Tunisair)</option>
              <option value="external">Externe (Sous-traitant)</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div><Label>Organisation</Label><Input value={org} onChange={(e) => setOrg(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="cursor-pointer">Annuler</Button>
          <Button
            disabled={!email || !username}
            onClick={() => onAdd({ email, username, role, org })}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700"
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== Admin: Acknowledgements page ============== */
function AcksPage() {
  const { user } = useAuth();
  usePageTitle("Accusés de Réception", "Traçabilité des consultations documentaires");
  const acks = useMemo(() => loadAcks(), []);

  if (user?.role !== "admin") {
    return <div className="p-8 text-sm text-slate-600">🔒 Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Accusés de Réception</h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {acks.length} enregistré{acks.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold">Document</th>
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {acks.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Aucun accusé enregistré.</td></tr>
                ) : acks.slice().reverse().map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(a.date).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{a.userName} <span className="text-xs text-slate-500">({a.userEmail})</span></td>
                    <td className="px-4 py-3 text-slate-700">{a.docTitle}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.docReference}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.category}</td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (a.action === "view" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                        {a.action === "view" ? "Consultation" : "Téléchargement"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
