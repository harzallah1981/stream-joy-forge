import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, BookOpen } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { loadAcksRemote, type Ack } from "@/lib/acknowledgements";
import { canUserSeeReadSignDoc, getAllDocs, requiresAckForCategory } from "@/lib/documents";
import { loadReads } from "@/lib/notifications";
import { loadUsers, defaultModulesFor, type StoredUser, type UserType } from "@/lib/users-store";
import { TEST_CREDENTIALS } from "@/lib/auth";
import { loadReadSign } from "@/lib/read-sign-store";
import { toast } from "sonner";

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function seededUserType(u: (typeof TEST_CREDENTIALS)[number]): UserType {
  return u.userType ?? (u.role === "admin" ? "admin" : u.role === "external" ? "external" : "internal_standard");
}
function loadKnownUsers(): StoredUser[] {
  const byEmail = new Map<string, StoredUser>();
  for (const u of TEST_CREDENTIALS) {
    const userType = seededUserType(u);
    byEmail.set(u.email.toLowerCase(), {
      id: `seed-${u.email}`, email: u.email, emails: u.emails ?? [u.email], username: u.username,
      role: u.role, userType, modules: u.modules ?? defaultModulesFor(userType),
      org: u.org, workplace: u.workplace ?? u.org ?? "—", adminScope: u.adminScope,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  }
  for (const u of loadUsers()) byEmail.set(u.email.toLowerCase(), u);
  return Array.from(byEmail.values()).filter((u) => u.userType !== "admin");
}

type Row = { id: string; title: string; reference: string; category: string; required: number; done: number };

export function GlobalReadingRateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [acks, setAcks] = useState<Ack[]>([]);
  useEffect(() => { if (open) loadAcksRemote().then(setAcks); }, [open]);

  const [fCat, setFCat] = useState("");

  const rows = useMemo<Row[]>(() => {
    const users = loadKnownUsers();
    const ackedDocIds = new Set(acks.map((a) => a.docId));
    const docs = getAllDocs().filter((d) =>
      (d.requireAck !== false && requiresAckForCategory(d.category)) || ackedDocIds.has(d.id),
    );
    const results: Row[] = [];
    for (const d of docs) {
      const targetUsers = users.filter((u) => canUserSeeReadSignDoc(d, u.userType));
      const required = targetUsers.length;
      if (required === 0) continue;
      let done = 0;
      for (const u of targetUsers) {
        const reads = loadReads(u.email);
        if (reads[d.id] || acks.some((a) => a.userEmail.toLowerCase() === u.email.toLowerCase() && a.docId === d.id)) done++;
      }
      results.push({ id: d.id, title: d.title, reference: d.reference ?? "", category: d.category, required, done });
    }
    // Read & Sign items
    for (const d of loadReadSign()) {
      const required = d.assignedEmails.length;
      if (required === 0) continue;
      const done = d.assignedEmails.filter((e) => acks.some((a) => a.userEmail.toLowerCase() === e && a.docId === d.id)).length;
      results.push({ id: d.id, title: d.title, reference: d.reference ?? "", category: "read-sign", required, done });
    }
    return results.sort((a, b) => b.required - a.required);
  }, [acks, open]);

  const cats = Array.from(new Set(rows.map((r) => r.category))).sort();
  const filtered = fCat ? rows.filter((r) => r.category === fCat) : rows;

  const totalReq = filtered.reduce((s, r) => s + r.required, 0);
  const totalDone = filtered.reduce((s, r) => s + r.done, 0);
  const rate = totalReq > 0 ? Math.round((totalDone / totalReq) * 100) : 0;

  const chartData = filtered.slice(0, 12).map((r) => ({
    name: r.title.length > 26 ? r.title.slice(0, 24) + "…" : r.title,
    Lues: r.done,
    Attendues: r.required - r.done,
  }));
  const donutData = [
    { name: "Lues", value: totalDone },
    { name: "Non lues", value: Math.max(totalReq - totalDone, 0) },
  ];

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 842, 50, "F");
      pdf.setTextColor(255); pdf.setFontSize(16);
      pdf.text("Tunisair Ground Ops — Taux global de lecture par document", 40, 32);
      pdf.setTextColor(15, 23, 42); pdf.setFontSize(9);
      pdf.text(`Généré le ${new Date().toLocaleString()} · ${filtered.length} document(s) · Global ${totalDone}/${totalReq} (${rate}%)`, 40, 70);
      autoTable(pdf, {
        startY: 90,
        head: [["Référence", "Titre", "Catégorie", "Lues", "Attendues", "Taux"]],
        body: filtered.map((r) => [r.reference || "—", r.title, r.category, r.done, r.required, r.required ? `${Math.round((r.done / r.required) * 100)}%` : "—"]),
        styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      });
      pdf.save(`taux-lecture-documents-${Date.now()}.pdf`);
    } catch (e) { toast.error("Erreur PDF : " + (e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Taux global de lecture par document
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2">
            <option value="">Catégorie (toutes)</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {fCat && (
            <button onClick={() => setFCat("")} className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-100">Réinitialiser</button>
          )}
          <span className="ml-auto font-semibold text-slate-700">
            Global : <span className="text-blue-700">{totalDone} / {totalReq}</span> ({rate}%)
          </span>
          <Button size="sm" onClick={exportPdf} className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-1 text-xs font-semibold text-slate-700">Top documents — Lues / Attendues</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 5, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Lues" stackId="a" fill="#10b981" />
                  <Bar dataKey="Attendues" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-1 text-xs font-semibold text-slate-700">Répartition globale</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={50} label>
                    {donutData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-white">
              <tr>
                <th className="px-3 py-2 text-left">Référence</th>
                <th className="px-3 py-2 text-left">Document</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-right">Lues / Attendues</th>
                <th className="px-3 py-2 text-right">Taux</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucun document.</td></tr>
              ) : filtered.map((r) => {
                const pct = r.required ? Math.round((r.done / r.required) * 100) : 0;
                return (
                  <tr key={r.id} className="border-t last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.reference || "—"}</td>
                    <td className="px-3 py-2">{r.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{r.category}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.done} / {r.required}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626" }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
