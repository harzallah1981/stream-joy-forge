// Dynamic categories, statuses, probabilities, gravities & severity bands
// (admin-editable via the "Configurer" dialog)
import { CATEGORIES, categoryColor } from "./safety-data";

const KEY = "tunisair_events_config_v2";
const LEGACY_KEY = "tunisair_events_config_v1";

export type CatDef = { name: string; color: string };
export type StatusDef = { name: string; color: string };
export type ScaleDef = { value: number; label: string };
export type SeverityBand = { name: string; min: number; max: number; color: string };

export type EventsConfig = {
  categories: CatDef[];
  statuses: StatusDef[];
  probabilities: ScaleDef[];
  gravities: ScaleDef[];
  severities: SeverityBand[];
};

const DEFAULT_CATEGORIES: CatDef[] = CATEGORIES.map((c) => ({
  name: c,
  color: categoryColor[c],
}));

const DEFAULT_STATUSES: StatusDef[] = [
  { name: "EN COURS", color: "bg-orange-100 text-orange-700" },
  { name: "CLÔTURÉ", color: "bg-green-100 text-green-700" },
];

const DEFAULT_PROBABILITIES: ScaleDef[] = [
  { value: 1, label: "Très improbable" },
  { value: 2, label: "Improbable" },
  { value: 3, label: "Occasionnel" },
  { value: 4, label: "Probable" },
  { value: 5, label: "Fréquent" },
];

const DEFAULT_GRAVITIES: ScaleDef[] = [
  { value: 1, label: "Négligeable" },
  { value: 2, label: "Mineur" },
  { value: 3, label: "Majeur" },
  { value: 4, label: "Dangereux" },
  { value: 5, label: "Catastrophique" },
];

const DEFAULT_SEVERITIES: SeverityBand[] = [
  { name: "Acceptable",     min: 1,  max: 8,  color: "bg-green-100 text-green-700" },
  { name: "Moyen",          min: 9,  max: 19, color: "bg-orange-100 text-orange-700" },
  { name: "Non acceptable", min: 20, max: 25, color: "bg-red-100 text-red-700" },
];

export const COLOR_PRESETS: { label: string; cat: string; status: string }[] = [
  { label: "Bleu", cat: "bg-blue-100 text-blue-800 border-blue-200", status: "bg-blue-100 text-blue-700" },
  { label: "Vert", cat: "bg-green-100 text-green-800 border-green-200", status: "bg-green-100 text-green-700" },
  { label: "Orange", cat: "bg-orange-100 text-orange-800 border-orange-200", status: "bg-orange-100 text-orange-700" },
  { label: "Rouge", cat: "bg-red-100 text-red-800 border-red-200", status: "bg-red-100 text-red-700" },
  { label: "Violet", cat: "bg-purple-100 text-purple-800 border-purple-200", status: "bg-purple-100 text-purple-700" },
  { label: "Ambre", cat: "bg-amber-100 text-amber-800 border-amber-200", status: "bg-amber-100 text-amber-700" },
  { label: "Indigo", cat: "bg-indigo-100 text-indigo-800 border-indigo-200", status: "bg-indigo-100 text-indigo-700" },
  { label: "Rose", cat: "bg-pink-100 text-pink-800 border-pink-200", status: "bg-pink-100 text-pink-700" },
  { label: "Sarcelle", cat: "bg-teal-100 text-teal-800 border-teal-200", status: "bg-teal-100 text-teal-700" },
  { label: "Ardoise", cat: "bg-slate-100 text-slate-800 border-slate-200", status: "bg-slate-100 text-slate-700" },
];

function withDefaults(partial: Partial<EventsConfig>): EventsConfig {
  return {
    categories:    partial.categories?.length    ? partial.categories    : DEFAULT_CATEGORIES,
    statuses:      partial.statuses?.length      ? partial.statuses      : DEFAULT_STATUSES,
    probabilities: partial.probabilities?.length ? partial.probabilities : DEFAULT_PROBABILITIES,
    gravities:     partial.gravities?.length     ? partial.gravities     : DEFAULT_GRAVITIES,
    severities:    partial.severities?.length    ? partial.severities    : DEFAULT_SEVERITIES,
  };
}

export function loadEventsConfig(): EventsConfig {
  if (typeof window === "undefined") return withDefaults({});
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) return withDefaults(JSON.parse(raw) as Partial<EventsConfig>);
  } catch {}
  return withDefaults({});
}

export function saveEventsConfig(cfg: EventsConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function categoryClass(cfg: EventsConfig, name: string): string {
  return cfg.categories.find((c) => c.name === name)?.color
    ?? "bg-slate-100 text-slate-800 border-slate-200";
}
export function statusClass(cfg: EventsConfig, name: string): string {
  return cfg.statuses.find((s) => s.name === name)?.color
    ?? "bg-slate-100 text-slate-700";
}
export function severityFor(cfg: EventsConfig, score: number): SeverityBand {
  return cfg.severities.find((b) => score >= b.min && score <= b.max)
    ?? { name: "—", min: 0, max: 0, color: "bg-slate-100 text-slate-700" };
}
