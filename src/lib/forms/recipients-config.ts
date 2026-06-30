// Per-form recipients configuration (admin-managed, persisted in localStorage)
// Up to 3 default "To" + 3 default "CC" addresses per form type.
// Form list is sourced from the dynamic forms-store so renames/deletions propagate.

import { loadForms, type FormDef } from "@/lib/forms-store";

export type FormTypeId = string;

export type FormRecipients = {
  to: string[]; // up to 3
  cc: string[]; // up to 3
};

export type RecipientsConfig = Record<string, FormRecipients>;

const STORAGE_KEY = "tunisair_form_recipients_v1";
const MAX = 3;

const DEFAULTS: RecipientsConfig = {
  "ahm-650": { to: ["safety@tunisair.com.tn"], cc: ["ops@tunisair.com.tn"] },
  "dg-incident": { to: ["dg@tunisair.com.tn"], cc: ["safety@tunisair.com.tn"] },
  "ios-428-01": { to: ["audit@tunisair.com.tn"], cc: [] },
};

// Dynamic form list — reflects current admin renames / hidden flags.
export function getFormTypes(): { id: string; label: string }[] {
  return loadForms()
    .filter((f) => !f.hidden)
    .map((f: FormDef) => ({ id: f.id, label: f.label }));
}

// Legacy static export kept for back-compat (used in older imports).
export const FORM_TYPES = [
  { id: "ahm-650", label: "AHM 650 — Damage Report" },
  { id: "dg-incident", label: "DG Incident Report" },
  { id: "ios-428-01", label: "IOS 428-01 Checklist" },
] as const;

export function loadRecipientsConfig(): RecipientsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RecipientsConfig;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveRecipientsConfig(cfg: RecipientsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function resetRecipientsFor(formId: string) {
  const cfg = loadRecipientsConfig();
  if (DEFAULTS[formId]) cfg[formId] = { ...DEFAULTS[formId] };
  else cfg[formId] = { to: [], cc: [] };
  saveRecipientsConfig(cfg);
}

export function getRecipientsFor(formType: string): FormRecipients {
  const cfg = loadRecipientsConfig();
  const r = cfg[formType];
  return {
    to: (r?.to ?? []).slice(0, MAX),
    cc: (r?.cc ?? []).slice(0, MAX),
  };
}

export const MAX_RECIPIENTS = MAX;
