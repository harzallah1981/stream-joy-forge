// Read & Sign — local storage signature ledger
import { supabase } from "@/integrations/supabase/client";
import { addAck } from "./acknowledgements";

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
  const signature = {
    ...s,
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  };
  items.push(signature);
  localStorage.setItem(KEY, JSON.stringify(items));
  addAck({
    userEmail: s.userEmail,
    userName: s.userName,
    docId: s.docId,
    docTitle: s.docTitle,
    docReference: s.docReference,
    category: "read-sign",
    action: "view",
  });
  void supabase
    .from("acknowledgements")
    .upsert(
      {
        user_email: s.userEmail,
        user_name: s.userName,
        doc_id: s.docId,
        doc_title: s.docTitle,
        doc_reference: s.docReference,
        category: "read-sign",
        action: "sign",
      },
      { onConflict: "user_email,doc_id,action", ignoreDuplicates: true },
    )
    .then(({ error }) => { if (error) console.warn("signature ack remote sync failed", error); });
}
