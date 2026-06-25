// SAFA D03 records store — multi-year, localStorage backed
export type SafaStatus = "EN COURS" | "CLÔTURÉ";

export type SafaRecord = {
  id: string;
  date: string;        // ISO yyyy-mm-dd
  category: string;    // e.g. "D03"
  escale: string;      // e.g. "TUN"
  vol: string;         // e.g. "TU744"
  description: string;
  notification: string; // "Envoyée à TH par ..."
  statut: SafaStatus;
};

const KEY = (y: number) => `tunisair_safa_d03_${y}`;
export const SAFA_CURRENT_YEAR = 2026;

// Seed from the uploaded Excel
const SEED_2026: SafaRecord[] = [
  {
    id: "SAFA-2026-001",
    date: "2026-03-01",
    category: "D03",
    escale: "TUN",
    vol: "TU744",
    description:
      "Cargo not correctly secured and restrained in all directions — Several net, straps, stanchions, lock assemblies missing or inappropriately installed — Upon arrival, several unsecured cargo pallets were found in the forward cargo compartment.",
    notification: "Envoyée à TH par INES CHECKER le 17/03/2026",
    statut: "CLÔTURÉ",
  },
  {
    id: "SAFA-2026-002",
    date: "2026-03-07",
    category: "D03",
    escale: "TUN",
    vol: "TU718",
    description:
      "AT ARRIVAL — PALLET PMC 79202 FOUND WITH NET EXPIRY DATE PASSED (EXP 2025-11)",
    notification: "Email SABER DHAOUADI le 18/03/2026 à TH",
    statut: "CLÔTURÉ",
  },
  {
    id: "SAFA-2026-003",
    date: "2026-03-07",
    category: "D03",
    escale: "TUN",
    vol: "TU718",
    description:
      "NO TAG ON PALLET PMC 79202 DESPITE PRESENCE OF DANGEROUS GOODS (CLASS 9 UN 3373)",
    notification: "Email SABER DHAOUADI le 18/03/2026 à TH",
    statut: "CLÔTURÉ",
  },
  {
    id: "SAFA-2026-004",
    date: "2026-06-15",
    category: "D03",
    escale: "TUN",
    vol: "TU542",
    description:
      "AFT cargo compartment sidewall lining panels in section 41 and 32: Initial repair on damaged flanges found fractured into pieces, but covered with HST to keep fragments in situ. Fasteners located in fractured area consequently failed in function and cut-out panel was free to move without notable force. However, fractured repair resulted in visible gap.",
    notification: "Email Ines Checker le 19/06/2026 à TH",
    statut: "EN COURS",
  },
];

export function loadSafa(year: number): SafaRecord[] {
  if (typeof window === "undefined") return year === SAFA_CURRENT_YEAR ? SEED_2026 : [];
  try {
    const raw = localStorage.getItem(KEY(year));
    if (raw) return JSON.parse(raw);
  } catch {}
  if (year === SAFA_CURRENT_YEAR) {
    localStorage.setItem(KEY(year), JSON.stringify(SEED_2026));
    return SEED_2026;
  }
  return [];
}
export function saveSafa(year: number, list: SafaRecord[]) {
  localStorage.setItem(KEY(year), JSON.stringify(list));
}
export function listSafaYears(): number[] {
  const set = new Set<number>([SAFA_CURRENT_YEAR]);
  if (typeof window === "undefined") return [SAFA_CURRENT_YEAR];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("tunisair_safa_d03_")) {
      const y = Number(k.slice("tunisair_safa_d03_".length));
      if (!Number.isNaN(y)) set.add(y);
    }
  }
  return Array.from(set).sort((a, b) => b - a);
}

export function openSafaForEscale(escale?: string): SafaRecord[] {
  const all = loadSafa(SAFA_CURRENT_YEAR);
  const open = all.filter((r) => r.statut !== "CLÔTURÉ");
  if (!escale) return open;
  const e = escale.trim().toUpperCase();
  if (!e) return open;
  return open.filter((r) => r.escale.toUpperCase() === e);
}
