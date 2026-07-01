// Dynamic forms registry — admin can rename, hide, restore the 3 built-in forms
// AND create fully custom forms (name, slug, fields) that live entirely in
// localStorage. Custom forms are rendered by the generic route /forms/c/$slug.

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "email"
  | "select"
  | "checkbox";

export type FormField = {
  id: string;              // stable id, unique inside the form
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];      // for "select"
};

export type FormDef = {
  id: string;              // stable id (e.g. "ahm-650" or "custom-<ts>")
  slug: string;            // route slug
  label: string;           // user-facing label (overridable)
  defaultLabel: string;
  hidden: boolean;
  custom?: boolean;        // true when created by admin
  fields?: FormField[];    // schema for custom forms (generic renderer)
  createdAt?: string;
  updatedAt?: string;
};

const KEY = "tunisair_forms_v1";

export const BUILTIN_FORMS: FormDef[] = [
  { id: "ahm-650", slug: "ahm-650", label: "Ground Damages Incident report / AHM 650", defaultLabel: "Ground Damages Incident report / AHM 650", hidden: false },
  { id: "dg-incident", slug: "dg-incident", label: "DG Incident report", defaultLabel: "DG Incident report", hidden: false },
  { id: "ios-428-01", slug: "ios-428-01", label: "IOS 428-01 check list", defaultLabel: "IOS 428-01 check list", hidden: false },
];

function readRaw(): FormDef[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as FormDef[]) : [];
  } catch {
    return [];
  }
}

export function loadForms(): FormDef[] {
  const arr = readRaw();
  const byId = new Map(arr.map((f) => [f.id, f]));
  const builtinMerged: FormDef[] = BUILTIN_FORMS.map((b) => {
    const o = byId.get(b.id);
    return o ? { ...b, label: o.label || b.defaultLabel, hidden: !!o.hidden } : b;
  });
  const customs = arr.filter((f) => f.custom && !BUILTIN_FORMS.some((b) => b.id === f.id));
  return [...builtinMerged, ...customs];
}

export function saveForms(list: FormDef[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function visibleForms(): FormDef[] {
  return loadForms().filter((f) => !f.hidden);
}

export function getFormLabel(id: string): string {
  return loadForms().find((x) => x.id === id)?.label ?? id;
}

function upsert(def: FormDef) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === def.id);
  if (idx < 0) list.push(def); else list[idx] = def;
  saveForms(list);
}

export function setFormLabel(id: string, label: string) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], label: label.trim() || list[idx].defaultLabel, updatedAt: new Date().toISOString() };
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
  const isBuiltin = BUILTIN_FORMS.some((b) => b.id === id);
  list[idx] = { ...list[idx], hidden: false, label: isBuiltin ? list[idx].defaultLabel : list[idx].label };
  saveForms(list);
}

export function isFormHidden(id: string): boolean {
  return loadForms().find((f) => f.id === id)?.hidden ?? false;
}

// ---- Custom forms ---------------------------------------------------------

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "form";
}

export function addCustomForm(input: { label: string; slug?: string; fields?: FormField[] }): FormDef {
  const list = loadForms();
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.label);
  let slug = baseSlug;
  let n = 2;
  while (list.some((f) => f.slug === slug)) { slug = `${baseSlug}-${n++}`; }
  const id = `custom-${Date.now()}`;
  const def: FormDef = {
    id, slug,
    label: input.label.trim() || "Nouveau formulaire",
    defaultLabel: input.label.trim() || "Nouveau formulaire",
    hidden: false, custom: true,
    fields: input.fields ?? [],
    createdAt: new Date().toISOString(),
  };
  upsert(def);
  return def;
}

export function updateFormFields(id: string, fields: FormField[]) {
  const list = loadForms();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], fields, updatedAt: new Date().toISOString() };
  saveForms(list);
}

// Hard-remove a custom form; for builtins, hide instead.
export function deleteForm(id: string) {
  const isBuiltin = BUILTIN_FORMS.some((b) => b.id === id);
  if (isBuiltin) { hideForm(id); return; }
  const list = loadForms().filter((f) => f.id !== id);
  saveForms(list);
}

export function getFormBySlug(slug: string): FormDef | undefined {
  return loadForms().find((f) => f.slug === slug);
}
