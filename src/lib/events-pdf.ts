import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SafetyEvent } from "@/lib/safety-data";

// Tunisair brand colors
const RED: [number, number, number] = [220, 38, 38];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_200: [number, number, number] = [226, 232, 240];

function sevColor(s: number): [number, number, number] {
  if (s >= 20) return [254, 226, 226]; // red-100
  if (s >= 9) return [255, 237, 213];  // orange-100
  return [220, 252, 231];              // green-100
}
function sevText(s: number): [number, number, number] {
  if (s >= 20) return [185, 28, 28];
  if (s >= 9) return [194, 65, 12];
  return [21, 128, 61];
}

export function exportEventsPdf(opts: {
  year: number;
  events: SafetyEvent[];
  userName?: string;
}) {
  const { year, events, userName } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString("fr-FR");

  const drawHeader = () => {
    // Red band
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TUNISAIR — GROUND SAFETY", 10, 8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Registre des évenements · Année ${year}`, 10, 14);

    doc.setFontSize(9);
    doc.text(`Édité le ${generatedAt}`, pageW - 10, 8, { align: "right" });
    if (userName) doc.text(`Par : ${userName}`, pageW - 10, 14, { align: "right" });
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.3);
    doc.line(10, pageH - 12, pageW - 10, pageH - 12);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    doc.setFont("helvetica", "normal");
    doc.text("Document interne — Tunisair Ground Safety", 10, pageH - 6);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageW - 10, pageH - 6, { align: "right" });
  };

  const head = [[
    "Date", "Source", "Escale", "Description",
    "P", "G", "Sev", "Réponse / Action", "Statut", "Catégorie",
  ]];

  const body = events.map((e) => {
    const s = e.prob * e.grav;
    return [
      e.date, e.source, e.escale, e.description,
      String(e.prob), String(e.grav), String(s),
      e.action, e.statut, e.categorie,
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 24,
    margin: { top: 24, left: 8, right: 8, bottom: 16 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.8,
      textColor: SLATE_900,
      lineColor: SLATE_200,
      lineWidth: 0.2,
      valign: "top",
    },
    headStyles: {
      fillColor: SLATE_900,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 16, fontStyle: "bold", halign: "center" },
      3: { cellWidth: 60 },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      7: { cellWidth: 60 },
      8: { cellWidth: 24, halign: "center", fontStyle: "bold" },
      9: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const s = Number(data.cell.raw);
        if (!Number.isNaN(s)) {
          data.cell.styles.fillColor = sevColor(s);
          data.cell.styles.textColor = sevText(s);
        }
      }
    },
    didDrawPage: () => {
      drawHeader();
    },
  });

  // Footer with page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i, total);
  }

  doc.save(`registre-evenements-${year}.pdf`);
}
