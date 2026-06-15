// Demo data — Ground Safety 2026 (GRH_SAFETY_2026)
export type Quarter = "T1" | "T2" | "T3" | "T4";

export const QUARTERS: Quarter[] = ["T1", "T2", "T3", "T4"];

export const impactSolTunisie: Record<Quarter, { vols: number | null; damages: number | null }> = {
  T1: { vols: 2337, damages: 0 },
  T2: { vols: null, damages: null },
  T3: { vols: null, damages: null },
  T4: { vols: null, damages: null },
};

export const impactSolEtranger: Record<Quarter, { vols: number | null; damages: number | null }> = {
  T1: { vols: 2334, damages: 0 },
  T2: { vols: null, damages: null },
  T3: { vols: null, damages: null },
  T4: { vols: null, damages: null },
};

export const safaD03: Record<Quarter, { inspections: number | null; ecarts: number | null }> = {
  T1: { inspections: 17, ecarts: 3 },
  T2: { inspections: null, ecarts: null },
  T3: { inspections: null, ecarts: null },
  T4: { inspections: null, ecarts: null },
};

export const MONTHS = [
  "JAN", "FÉV", "MAR", "AVR", "MAI", "JUN",
  "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC",
] as const;
export type Month = (typeof MONTHS)[number];

export const opsSolMensuel: Record<Month, { anomalies: number | null; vols: number | null }> = {
  JAN: { anomalies: 0, vols: 1601 },
  FÉV: { anomalies: 1, vols: 1423 },
  MAR: { anomalies: 7, vols: 1647 },
  AVR: { anomalies: 5, vols: 1845 },
  MAI: { anomalies: 1, vols: null },
  JUN: { anomalies: null, vols: null },
  JUL: { anomalies: null, vols: null },
  AOÛ: { anomalies: null, vols: null },
  SEP: { anomalies: null, vols: null },
  OCT: { anomalies: null, vols: null },
  NOV: { anomalies: null, vols: null },
  DÉC: { anomalies: null, vols: null },
};

export const pct = (num: number | null, den: number | null): string => {
  if (num === null || den === null || den === 0) return "—";
  return ((num / den) * 100).toFixed(2) + "%";
};

// Event categories
export const CATEGORIES = [
  "ARRIMAGE",
  "MESSAGES OPS",
  "LDM/LOADSHEET",
  "GSE/DAMAGE",
  "PUSHBACK",
  "PAX SPEC.",
  "CARGO FRET",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const categoryColor: Record<Category, string> = {
  "ARRIMAGE": "bg-blue-100 text-blue-800 border-blue-200",
  "MESSAGES OPS": "bg-purple-100 text-purple-800 border-purple-200",
  "LDM/LOADSHEET": "bg-amber-100 text-amber-800 border-amber-200",
  "GSE/DAMAGE": "bg-red-100 text-red-800 border-red-200",
  "PUSHBACK": "bg-teal-100 text-teal-800 border-teal-200",
  "PAX SPEC.": "bg-pink-100 text-pink-800 border-pink-200",
  "CARGO FRET": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export type EventStatus = "CLÔTURÉ" | "EN COURS";

export interface SafetyEvent {
  id: string;
  date: string;
  source: string;
  escale: string;
  description: string;
  prob: number; // 1-5
  grav: number; // 1-5
  sev: string; // e.g. "Mineur", "Majeur", "Critique"
  action: string;
  statut: EventStatus;
  categorie: Category;
}

export const events: SafetyEvent[] = [
  {
    id: "GS-2026-001",
    date: "2026-02-14",
    source: "Rapport Escale",
    escale: "TUN",
    description: "Anomalie de chargement — bagage soute avant non sécurisé.",
    prob: 2, grav: 3, sev: "Mineur",
    action: "Briefing équipe piste — rappel procédure arrimage.",
    statut: "CLÔTURÉ",
    categorie: "ARRIMAGE",
  },
  {
    id: "GS-2026-002",
    date: "2026-03-03",
    source: "ATL",
    escale: "ORY",
    description: "LDM transmis avec retard supérieur à 30 min après bloc.",
    prob: 3, grav: 2, sev: "Mineur",
    action: "Note de service diffusée aux agents OPS.",
    statut: "CLÔTURÉ",
    categorie: "MESSAGES OPS",
  },
  {
    id: "GS-2026-003",
    date: "2026-03-12",
    source: "Pilote",
    escale: "CDG",
    description: "Loadsheet non conforme — écart MAC > 1%.",
    prob: 2, grav: 4, sev: "Majeur",
    action: "Investigation en cours — agent de trafic concerné.",
    statut: "EN COURS",
    categorie: "LDM/LOADSHEET",
  },
  {
    id: "GS-2026-004",
    date: "2026-03-19",
    source: "Rapport Escale",
    escale: "TUN",
    description: "Tracteur de pushback ayant heurté la barre de remorquage.",
    prob: 2, grav: 3, sev: "Mineur",
    action: "Inspection technique — aucun dommage avion.",
    statut: "CLÔTURÉ",
    categorie: "PUSHBACK",
  },
  {
    id: "GS-2026-005",
    date: "2026-03-25",
    source: "Equipage cabine",
    escale: "MIR",
    description: "PAX UMNR sans assistance déclarée à l'embarquement.",
    prob: 3, grav: 2, sev: "Mineur",
    action: "Suivi avec service PAX — corrigé avant vol.",
    statut: "CLÔTURÉ",
    categorie: "PAX SPEC.",
  },
  {
    id: "GS-2026-006",
    date: "2026-04-02",
    source: "Inspection SAFA",
    escale: "FCO",
    description: "GSE en contact avec fuselage — éraflure peinture porte cargo.",
    prob: 2, grav: 4, sev: "Majeur",
    action: "Réparation programmée — investigation GSE en cours.",
    statut: "EN COURS",
    categorie: "GSE/DAMAGE",
  },
  {
    id: "GS-2026-007",
    date: "2026-04-08",
    source: "Rapport Cargo",
    escale: "TUN",
    description: "Colis fret non étiqueté DG détecté lors du chargement.",
    prob: 1, grav: 4, sev: "Majeur",
    action: "Colis retiré — formation DG renforcée prévue.",
    statut: "CLÔTURÉ",
    categorie: "CARGO FRET",
  },
  {
    id: "GS-2026-008",
    date: "2026-04-15",
    source: "ATL",
    escale: "DJE",
    description: "Anomalie de répartition cargo — soute arrière surchargée.",
    prob: 2, grav: 3, sev: "Mineur",
    action: "Reprise de chargement — vol non retardé.",
    statut: "CLÔTURÉ",
    categorie: "ARRIMAGE",
  },
  {
    id: "GS-2026-009",
    date: "2026-04-22",
    source: "Pilote",
    escale: "CMN",
    description: "Message OPS manquant — divergence ETD/ATD non transmise.",
    prob: 3, grav: 2, sev: "Mineur",
    action: "Rappel procédure — superviseur escale notifié.",
    statut: "EN COURS",
    categorie: "MESSAGES OPS",
  },
];

// Training compliance (Conformité Formation Personnel)
export interface TrainingItem {
  code: string;
  label: string;
  total: number;
  compliant: number;
}
export const trainingCompliance: TrainingItem[] = [
  { code: "CRM",    label: "Crew Resource Management",       total: 320, compliant: 308 },
  { code: "SMS",    label: "Safety Management System",       total: 412, compliant: 395 },
  { code: "DG",     label: "Dangerous Goods (Cat. 6/7/8)",   total: 285, compliant: 261 },
  { code: "SÛRETÉ", label: "Sûreté Aviation Civile",         total: 412, compliant: 401 },
  { code: "AVSEC",  label: "AVSEC Recurrent",                total: 198, compliant: 175 },
  { code: "HF",     label: "Human Factors",                  total: 412, compliant: 388 },
  { code: "FUEL",   label: "Fuel Handling & De-Icing",       total: 96,  compliant: 89  },
  { code: "RAMP",   label: "Ramp Safety",                    total: 245, compliant: 232 },
];
