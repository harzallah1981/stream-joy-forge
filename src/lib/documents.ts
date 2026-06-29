// Sample documents per category + localStorage-backed user uploads.
// "Sample" PDFs are tiny one-page generated PDFs (data URLs) so download works.
// Large user uploads (>2 MB) are stored in IndexedDB via doc-blobs.ts.

import { putBlob, resolveBlobUrl } from "@/lib/doc-blobs";

export type DocItem = {
  id: string;
  category: string; // slug
  reference: string;
  title: string;
  version: string;
  date: string; // yyyy-mm-dd
  /** For certificates (CDN, CEIRB, AOC...) — validity range */
  validFrom?: string;
  validTo?: string;
  status: "En diffusion" | "Périmé" | "En revue";
  fileName: string;
  /** data URL or http URL; empty when stored in IndexedDB (use blobKey) */
  url: string;
  /** When set, the underlying file lives in IndexedDB under this key */
  blobKey?: string;
  /** Mime type (helps the in-app viewer) */
  mime?: string;
  uploadedBy?: string;
  /** When false, document can be viewed/downloaded without an ack. */
  requireAck?: boolean;
  /** Read & Sign audience chosen by admin for uploaded documents. */
  readSignUserTypes?: Array<"internal_standard" | "internal_manager" | "external">;
};


export const ACK_REQUIRED_PREFIXES: string[] = [
  "gom",
  "dam",
  "dow-doi",
  "ahm",
  "pos-",
  "ios-",
  "load-trim",
  "loading-instructions",
  "notes-flash",
];

export function requiresAckForCategory(category: string): boolean {
  return ACK_REQUIRED_PREFIXES.some((p) => category.startsWith(p));
}

// Minimal valid 1-page PDF (will render "Tunisair — <title>")
function buildSamplePdf(title: string): string {
  const txt = title.replace(/[()\\]/g, "");
  const content = `BT /F1 18 Tf 50 750 Td (TUNISAIR GROUND OPS) Tj ET
BT /F1 12 Tf 50 720 Td (${txt}) Tj ET
BT /F1 10 Tf 50 690 Td (Document de demonstration / Sample document) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += String(o).padStart(10, "0") + " 00000 n \n";
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  // base64 (browser-safe)
  if (typeof btoa !== "undefined") {
    return "data:application/pdf;base64," + btoa(unescape(encodeURIComponent(pdf)));
  }
  return "data:application/pdf;base64," + Buffer.from(pdf, "utf-8").toString("base64");
}

const mk = (
  category: string,
  ref: string,
  title: string,
  version: string,
  date: string,
  status: DocItem["status"] = "En diffusion",
): DocItem => ({
  id: `${category}-${ref}`,
  category,
  reference: ref,
  title,
  version,
  date,
  status,
  fileName: `${ref}.pdf`,
  url: buildSamplePdf(`${ref} — ${title}`),
});

export const SAMPLE_DOCS: DocItem[] = [
  mk("gom", "GOM-2026-01", "Ground Operations Manual — Edition 2026", "Rev 12", "2026-01-15"),
  mk("dam", "DAM-2026-01", "Dangerous Goods Manual", "Rev 8", "2026-02-10"),
  mk("pos-427", "POS-427", "Procédures Opérationnelles Sol 427", "Rev 3", "2025-11-04"),
  mk("pos-428", "POS-428", "Procédures Opérationnelles Sol 428", "Rev 4", "2026-01-20"),
  mk("pos-429", "POS-429", "Procédures Opérationnelles Sol 429", "Rev 2", "2025-09-12"),
  mk("ios-428-01", "IOS-428-01", "Inspection Opérationnelle Sol — Passengers & Ramp", "Rev 5", "2026-03-01"),
  mk("ios-428-02", "IOS-428-02", "Inspection Opérationnelle Sol — Cargo", "Rev 3", "2026-02-15"),
  mk("ios-429-01", "IOS-429-01", "Inspection Opérationnelle Sol — De/Anti-icing", "Rev 2", "2025-12-01"),
  mk("ios-429-02", "IOS-429-02", "Inspection Opérationnelle Sol — Fuelling", "Rev 2", "2025-12-05"),
  mk("dow-doi-a320", "DOW-A320", "DOW/DOI — Flotte A320", "Rev 9", "2026-01-30"),
  mk("dow-doi-a330-243", "DOW-A330", "DOW/DOI — A330-243", "Rev 4", "2025-10-22"),
  mk("ahm-fleet", "AHM-FLEET", "Aircraft Handling Manual — Flotte Tunisair", "Rev 7", "2026-01-10"),
  mk("load-trim-fleet", "LT-FLEET", "Load & Trim Sheets — Fleet", "Rev 6", "2026-02-01"),
  mk("loading-instructions-fleet", "LIR-FLEET", "Loading Instructions Reports", "Rev 5", "2026-01-25"),
  { ...mk("cdn", "CDN-TS", "Certificat de Navigabilité — Flotte", "2026", "2026-01-01"), validFrom: "2026-01-01", validTo: "2026-12-31" },
  { ...mk("ceirb", "CEIRB-26", "Certificat Radio Licence", "2026", "2026-01-01"), validFrom: "2026-01-01", validTo: "2026-12-31" },
  mk("c-immatriculation", "C-IMMAT", "Certificats d'Immatriculation", "2026", "2026-01-01"),
  mk("cln", "CLN-26", "Certificat de Limitation de Nuisance", "2026", "2026-01-01"),
  { ...mk("aoc", "AOC-TS-26", "Air Operator Certificate", "Rev 14", "2026-01-01"), validFrom: "2026-01-01", validTo: "2028-12-31" },
  mk("notes-flash", "NF-2026-01", "Note de sécurité — Procédure de dégivrage hiver 2026", "Rev 1", "2026-01-10"),
  mk("notes-flash", "FS-2026-02", "Flash sécurité — Incident push-back stand B12", "Rev 1", "2026-02-18"),
  mk("notes-flash", "NF-2026-03", "Note de sécurité — Rappel FOD / Ramp safety", "Rev 1", "2026-03-05"),
  mk("dgac", "DGAC-CIRC", "Circulaires & directives DGAC", "2026", "2026-03-10"),
  mk("iata", "IATA-AHM", "IATA AHM Standards 2026", "Ed 46", "2026-01-01"),
  mk("ac-affretees", "ACMI-26", "Documentation aéronefs affrétés", "2026", "2026-02-20"),
  mk("safa-d03", "SAFA-D03-26", "SAFA D03 — Ramp Inspection Report", "Rev 1", "2026-01-01"),
  mk("safa-d03", "SAFA-D03-GUIDE", "SAFA D03 — Guide d'utilisation", "Rev 1", "2026-01-15"),
];

const LS_KEY = "tunisair_docs_v1";
const HIDDEN_KEY = "tunisair_docs_hidden_v1";

export function loadUserDocs(): DocItem[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserDocs(docs: DocItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(docs));
}

export function loadHiddenSeedIds(): string[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(HIDDEN_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function hideSeedDoc(id: string) {
  const list = loadHiddenSeedIds();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
  }
}

export function getDocsForCategory(slug: string): DocItem[] {
  const hidden = new Set(loadHiddenSeedIds());
  return [
    ...SAMPLE_DOCS.filter((d) => d.category === slug && !hidden.has(d.id)),
    ...loadUserDocs().filter((d) => d.category === slug),
  ];
}

export function getAllDocs(): DocItem[] {
  const hidden = new Set(loadHiddenSeedIds());
  return [
    ...SAMPLE_DOCS.filter((d) => !hidden.has(d.id)),
    ...loadUserDocs(),
  ];
}

export function canUserSeeReadSignDoc(
  doc: DocItem,
  userType: "admin" | "internal_standard" | "internal_manager" | "external" | undefined,
): boolean {
  if (!userType) return false;
  if (userType === "admin") return true;
  if (!doc.readSignUserTypes || doc.readSignUserTypes.length === 0) return true;
  return doc.readSignUserTypes.includes(userType);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
