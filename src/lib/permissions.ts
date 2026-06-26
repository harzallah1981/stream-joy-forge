// Centralised runtime permission helpers.
// Reads `userType` + `modules` from the auth user (hydrated from users-store).
import type { AuthUser } from "./auth";

export type ModuleKey = "documentation" | "forms" | "safety" | "admin";

export function userType(u: AuthUser | null | undefined) {
  return u?.userType ?? (u?.role === "admin" ? "admin" : u?.role === "external" ? "external" : "internal_standard");
}

export function userModules(u: AuthUser | null | undefined): string[] {
  if (!u) return [];
  if (u.modules && u.modules.length) return u.modules;
  const t = userType(u);
  if (t === "admin" || t === "internal_manager") return ["documentation", "forms", "safety", "admin"];
  if (t === "external") return ["documentation"];
  return ["documentation"]; // internal_standard default
}

// Sidebar group visibility.
export function canSeeGroup(groupKey: string, u: AuthUser | null | undefined): boolean {
  if (!u) return false;
  if (groupKey === "dashboard") return true;
  const t = userType(u);
  if (t === "admin") return true;
  if (t === "internal_manager") return groupKey !== "admin"; // view all except admin tools
  if (t === "external") return groupKey === "documentation";
  // internal_standard: only granted modules
  const mods = userModules(u);
  if (groupKey === "documentation") return mods.includes("documentation");
  if (groupKey === "safety") return mods.includes("safety");
  if (groupKey === "admin") return mods.includes("admin");
  return false;
}

type MenuLike = { key: string; to?: string; children?: MenuLike[] };

const EXTERNAL_DOC_KEYS = new Set(["docs_externes", "dgac", "iata", "affretees", "safa_d03"]);
const EXTERNAL_FORM_KEYS = new Set(["forms", "ios_428_01_checklist"]);

export function canSeeMenuNode(node: MenuLike, u: AuthUser | null | undefined): boolean {
  if (!u) return false;
  const t = userType(u);
  if (t === "admin" || t === "internal_manager") return true;
  if (t === "external") {
    if (node.key === "read_sign") return true;
    if (EXTERNAL_DOC_KEYS.has(node.key) || EXTERNAL_FORM_KEYS.has(node.key)) return true;
    return !!node.children?.some((child) => canSeeMenuNode(child, u));
  }
  const mods = userModules(u);
  if (node.key === "read_sign") return mods.includes("documentation");
  if (node.key === "forms") return mods.includes("forms") || mods.includes("documentation");
  if (node.children?.length) return node.children.some((child) => canSeeMenuNode(child, u));
  return mods.includes("documentation") || mods.includes("forms") || mods.includes("safety") || mods.includes("admin");
}

// Can the user download from a given area?
export function canDownload(area: "documentation" | "safety_table" | "safety_attachment", u: AuthUser | null | undefined): boolean {
  if (!u) return false;
  const t = userType(u);
  if (t === "admin") return true;
  if (t === "internal_manager") return area === "documentation"; // view-only on safety
  if (t === "external") return area === "documentation"; // via ack flow
  // internal_standard: only what they have access to; safety download disabled by default
  if (area === "documentation") return userModules(u).includes("documentation");
  return false;
}

// Does the doc action require an acknowledgement (accusé de réception)?
export function requiresAck(u: AuthUser | null | undefined): boolean {
  const t = userType(u);
  return t === "external" || t === "internal_standard";
}

// T29: Is this user a "principal" (super) admin?
// Source of truth: localStorage (StoredUser.adminScope) for admins added via the UI;
// the seeded admin.ops@tunisair.com.tn is always treated as principal.
const SEEDED_PRINCIPAL = "admin.ops@tunisair.com.tn";
export function isPrincipalAdmin(u: AuthUser | null | undefined): boolean {
  if (!u) return false;
  if (userType(u) !== "admin") return false;
  if (u.email.toLowerCase() === SEEDED_PRINCIPAL) return true;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("tunisair_users_v1") : null;
    if (!raw) return false;
    const arr = JSON.parse(raw) as Array<{ email: string; adminScope?: string }>;
    return arr.some((x) => x.email.toLowerCase() === u.email.toLowerCase() && x.adminScope === "principal");
  } catch { return false; }
}
