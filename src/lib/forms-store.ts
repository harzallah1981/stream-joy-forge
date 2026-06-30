// Dynamic forms registry — admin can rename, hide and restore the 3 built-in forms.
// The original form schemas (ahm-650, dg-incident, ios-428-01) remain intact;
// this store only overrides the displayed label and the hidden flag.

export type FormDef = {
  id: string;          // stable id (e.g. "ahm-650")
  slug: string;        // route slug under /forms/
  label: string;       // user-facing label (overridable)
  defaultLabel: string;
  hidden: boolean;
};

const KEY = "tunisair_forms_v1";

export const BUILTIN_FORMS: FormDef[] = [
  { id: "ahm-650", slug: "ahm-650", label: "Ground Damages Incident report / AHM 650", defaultLabel: "Ground Damages Incident report / AHM 650", hidden: false },
  { id: "dg-incident", slug: "dg-incident", label: "DG Incident report", defaultLabel: "DG Incident report", hidden: false },
  { id: "ios-428-01", slug: "ios-428-01", label: "IOS 428-01 check list", defaultLabel: "IOS 428-01 check list", hidden: false },
];

export function loadForms(): FormDef[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const arr = raw ? (JSON.parse(raw) as FormDef[]) : [];
    // Merge: keep builtin order, apply overrides, preserve unknown ids appended.
    const byId = new Map(arr.map((f) => [f.id, f]));
    const merged: FormDef[] = BUILTIN_FORMS.map((b) => {
      const o = byId.get(b.id);
      return o ? { ...b, label: o.label || b.defaultLabel, hidden: !!o.hidden } : b;
    });
    return merged;
  } catch {
    return [...BUILTIN_FORMS];
  }
}

export function saveForms(list: FormDef[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function visibleForms(): FormDef[] {
  return loadForms().filter((f) => !f.hidden);
}

export function getFormLabel(id: string): string {
  const f = loadForms().find((x) => x.id === id);
  return f?.label ?? id;
}

export function setFormLabel(id: string, label: string) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], label: label.trim() || list[idx].defaultLabel };
  saveForms(list);
}

export function hideForm(id: string) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], hidden: true };
  saveForms(list);
}

export function restoreForm(id: string) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], hidden: false, label: list[idx].defaultLabel };
  saveForms(list);
}

export function isFormHidden(id: string): boolean {
  return loadForms().find((f) => f.id === id)?.hidden ?? false;
}
