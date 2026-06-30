import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive as ArchiveIcon, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/page-title";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadArchives, removeArchive, type ArchiveKind } from "@/lib/archives-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/archives")({
  head: () => ({ meta: [{ title: "Archives — Administration" }] }),
  component: ArchivesPage,
});

const KIND_LABEL: Record<ArchiveKind, string> = {
  document: "Document",
  "read-sign": "Read & Sign",
  form: "Formulaire",
};

function ArchivesPage() {
  const { user } = useAuth();
  usePageTitle("Archives", "Historique des éléments supprimés");
  const [refresh, setRefresh] = useState(0);
  const [kind, setKind] = useState<"" | ArchiveKind>("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");

  const items = useMemo(() => loadArchives(), [refresh]);

  if (user?.role !== "admin") {
    return <div className="p-8 text-sm text-slate-600">🔒 Accès réservé aux administrateurs.</div>;
  }

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const filtered = items.filter((i) => {
    if (kind && i.kind !== kind) return false;
    if (cat && i.category !== cat) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!i.title.toLowerCase().includes(s) && !(i.reference ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Word-like header */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b-4 border-blue-700 bg-blue-50 px-5 py-4">
          <ArchiveIcon className="h-5 w-5 text-blue-700" />
          <h1 className="text-base font-bold uppercase tracking-wide text-blue-900">Tunisair Ground Ops — Archives</h1>
          <span className="ml-auto rounded-full bg-blue-700 px-2 py-0.5 text-[11px] font-semibold text-white">
            {items.length} élément(s)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-3 text-xs">
          <select value={kind} onChange={(e) => setKind(e.target.value as ArchiveKind | "")} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Type (tous)</option>
            <option value="document">Documents</option>
            <option value="read-sign">Read & Sign</option>
            <option value="form">Formulaires</option>
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Catégorie (toutes)</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative ml-auto w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-8 rounded-full border-slate-200 bg-slate-50 pl-8 text-xs" />
          </div>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-900 text-xs uppercase text-white">
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold">Archivé le</th>
                  <th className="px-4 py-3 text-left font-semibold">Par</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">Aucun élément archivé.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">{KIND_LABEL[a.kind]}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.category}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.reference || "—"}</td>
                    <td className="px-4 py-3 text-slate-900">{a.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(a.archivedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.archivedBy}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => {
                          if (!window.confirm("Supprimer définitivement cet élément archivé ?")) return;
                          removeArchive(a.id); setRefresh((r) => r + 1); toast.success("Archive supprimée");
                        }}
                        className="h-7 cursor-pointer gap-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Les éléments archivés conservent leurs métadonnées (titre, référence, catégorie) pour traçabilité.
      </p>
    </div>
  );
}
