// Dynamic categories & statuses for the Events register (admin-editable)
import { CATEGORIES, categoryColor } from "./safety-data";

const KEY = "tunisair_events_config_v1";

export type CatDef = { name: string; color: string }; // color = tailwind classes
export type StatusDef = { name: string; color: string };

export type EventsConfig = {
  categories: CatDef[];
  statuses: StatusDef[];
};

const DEFAULT_CATEGORIES: CatDef[] = CATEGORIES.map((c) => ({
  name: c,
  color: categoryColor[c],
}));

const DEFAULT_STATUSES: StatusDef[] = [
  { name: "EN COURS", color: "bg-orange-100 text-orange-700" },
  { name: "CLÔTURÉ", color: "bg-green-100 text-green-700" },
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

export function loadEventsConfig(): EventsConfig {
  if (typeof window === "undefined") {
    return { categories: DEFAULT_CATEGORIES, statuses: DEFAULT_STATUSES };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EventsConfig>;
      return {
        categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
        statuses: parsed.statuses?.length ? parsed.statuses : DEFAULT_STATUSES,
      };
    }
  } catch {}
  return { categories: DEFAULT_CATEGORIES, statuses: DEFAULT_STATUSES };
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
