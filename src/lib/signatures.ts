// Read & Sign — local storage signature ledger
export type Signature = {
  id: string;
  userEmail: string;
  userName: string;
  docId: string;
  docTitle: string;
  docReference: string;
  signatureText: string; // typed full name
  date: string; // ISO
};

const KEY = "tunisair_signatures_v1";

export function loadSignatures(): Signature[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hasSigned(userEmail: string, docId: string): boolean {
  return loadSignatures().some(
    (s) => s.userEmail.toLowerCase() === userEmail.toLowerCase() && s.docId === docId,
  );
}

export function addSignature(s: Omit<Signature, "id" | "date">) {
  const items = loadSignatures();
  if (hasSigned(s.userEmail, s.docId)) return;
  items.push({
    ...s,
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  });
  localStorage.setItem(KEY, JSON.stringify(items));
}
