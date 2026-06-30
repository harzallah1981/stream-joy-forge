import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { loadAcksRemote, type Ack } from "@/lib/acknowledgements";
import { getAllDocs, type DocItem } from "@/lib/documents";
import { loadUsers } from "@/lib/users-store";
import { TEST_CREDENTIALS } from "@/lib/auth";
import { toast } from "sonner";

const INTERNAL_CATS = new Set([
  "gom", "dam", "pos-427", "pos-428", "pos-429",
  "ios-428-01", "ios-428-02", "ios-429-01", "ios-429-02",
  "dow-doi-a320", "dow-doi-a330-243",
  "ahm-fleet", "load-trim-fleet", "loading-instructions-fleet",
  "cdn", "ceirb", "c-immatriculation", "cln", "aoc", "notes-flash",
]);

function isInternal(cat: string) { return INTERNAL_CATS.has(cat); }

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9", "#d946ef", "#14b8a6"];

export function DocIndicatorsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [acks, setAcks] = useState<Ack[]>([]);
  useEffect(() => {
    if (!open) return;
    loadAcksRemote().then(setAcks);
  }, [open]);

  const allDocs = useMemo(() => getAllDocs(), [open]);

  // Filters
  const [fEscale, setFEscale] = useState("");
  const [fCat, setFCat] = useState("");
  const [fDoc, setFDoc] = useState("");
  const [fType, setFType] = useState<"" | "internal" | "external">("");

  const usersByEmail = useMemo(() => {
    const m = new Map<string, { workplace?: string }>();
    for (const u of TEST_CREDENTIALS) m.set(u.email.toLowerCase(), { workplace: u.workplace ?? u.org });
    for (const u of loadUsers()) m.set(u.email.toLowerCase(), { workplace: u.workplace });
    return m;
  }, [open]);

  const enriched = useMemo(() => acks.map((a) => {
    const u = usersByEmail.get(a.userEmail.toLowerCase());
    return { ...a, workplace: u?.workplace ?? "—", isInternal: isInternal(a.category) };
  }), [acks, usersByEmail]);

  const filtered = enriched.filter((a) => {
    if (fEscale && a.workplace !== fEscale) return false;
    if (fCat && a.category !== fCat) return false;
    if (fDoc && a.docTitle !== fDoc) return false;
    if (fType === "internal" && !a.isInternal) return false;
    if (fType === "external" && a.isInternal) return false;
    return true;
  });

  const escales = Array.from(new Set(enriched.map((a) => a.workplace).filter((w) => w && w !== "—"))).sort();
  const cats = Array.from(new Set(allDocs.map((d) => d.category))).sort();
  const titles = Array.from(new Set(allDocs.map((d) => d.title))).sort();

  const byEscale = aggregate(filtered, (a) => a.workplace || "—");
  const byCat = aggregate(filtered, (a) => a.category);
  const byDoc = aggregate(filtered, (a) => (a.docTitle.length > 30 ? a.docTitle.slice(0, 28) + "…" : a.docTitle)).slice(0, 12);
  const byType = aggregate(filtered, (a) => (a.isInternal ? "Documents internes" : "Documents externes"));

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 842, 50, "F");
      pdf.setTextColor(255); pdf.setFontSize(16);
      pdf.text("Tunisair Ground Ops — Indicateurs Documentaires", 40, 32);
      pdf.setTextColor(15, 23, 42); pdf.setFontSize(9);
      pdf.text(`Généré le ${new Date().toLocaleString()} · ${filtered.length} lecture(s)`, 40, 70);

      autoTable(pdf, { startY: 90, head: [["Escale", "Lectures"]], body: byEscale.map((r) => [r.name, r.value]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42], textColor: 255 } });
      autoTable(pdf, { head: [["Manuel / Catégorie", "Lectures"]], body: byCat.map((r) => [r.name, r.value]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42], textColor: 255 } });
      autoTable(pdf, { head: [["Document", "Lectures"]], body: byDoc.map((r) => [r.name, r.value]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42], textColor: 255 } });
      autoTable(pdf, { head: [["Type", "Lectures"]], body: byType.map((r) => [r.name, r.value]), styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42], textColor: 255 } });
      pdf.save(`indicateurs-documentaires-${Date.now()}.pdf`);
    } catch (e) {
      toast.error("Erreur génération PDF : " + (e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Indicateurs Documentaires — Vue dynamique
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
          <select value={fEscale} onChange={(e) => setFEscale(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Escale (toutes)</option>
            {escales.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Manuel/Catégorie (tous)</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={fDoc} onChange={(e) => setFDoc(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Document (tous)</option>
            {titles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fType} onChange={(e) => setFType(e.target.value as "" | "internal" | "external")} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Type (interne+externe)</option>
            <option value="internal">Documents internes</option>
            <option value="external">Documents externes</option>
          </select>
          {(fEscale || fCat || fDoc || fType) && (
            <button onClick={() => { setFEscale(""); setFCat(""); setFDoc(""); setFType(""); }} className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-100">
              Réinitialiser
            </button>
          )}
          <span className="ml-auto text-slate-500">{filtered.length} lecture(s)</span>
          <Button size="sm" onClick={exportPdf} className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-3.5 w-3.5" /> Télécharger PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartCard title="Lectures par escale">
            <BarChart data={byEscale} margin={{ left: 0, right: 8, top: 5, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Lectures par manuel / catégorie">
            <BarChart data={byCat} margin={{ left: 0, right: 8, top: 5, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Top documents lus">
            <BarChart data={byDoc} layout="vertical" margin={{ left: 60, right: 8, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Interne vs Externe">
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" outerRadius={80} label>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ChartCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function aggregate<T>(arr: T[], by: (a: T) => string): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const a of arr) m.set(by(a), (m.get(by(a)) ?? 0) + 1);
  return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 text-xs font-semibold text-slate-700">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
