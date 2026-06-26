// Acknowledgements (Accusés de réception) — mirrored locally + Supabase
import { supabase } from "@/integrations/supabase/client";

export type Ack = {
  id: string;
  userEmail: string;
  userName: string;
  docId: string;
  docTitle: string;
  docReference: string;
  category: string;
  action: "view" | "download" | "sign";
  date: string; // ISO
};

const KEY = "tunisair_ack_v1";

export function loadAcks(): Ack[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(items: Ack[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
}

export function addAck(a: Omit<Ack, "id" | "date">) {
  const items = loadAcks();
  if (!items.some((x) => x.userEmail.toLowerCase() === a.userEmail.toLowerCase() && x.docId === a.docId && x.action === a.action)) {
    items.push({ ...a, id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString() });
    saveLocal(items);
  }
  // Mirror to Supabase so the admin (any browser) sees all users' acks.
  void supabase
    .from("acknowledgements")
    .upsert(
      {
        user_email: a.userEmail,
        user_name: a.userName,
        doc_id: a.docId,
        doc_title: a.docTitle,
        doc_reference: a.docReference,
        category: a.category,
        action: a.action,
      },
      { onConflict: "user_email,doc_id,action", ignoreDuplicates: true },
    )
    .then(({ error }) => { if (error) console.warn("ack remote sync failed", error); });
}

export function hasAcked(userEmail: string, docId: string): boolean {
  return loadAcks().some(
    (a) => a.userEmail.toLowerCase() === userEmail.toLowerCase() && a.docId === docId,
  );
}

// Fetch all acknowledgements from Supabase (admin view).
export async function loadAcksRemote(): Promise<Ack[]> {
  const { data, error } = await supabase
    .from("acknowledgements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) {
    console.warn("loadAcksRemote failed", error);
    return loadAcks();
  }
  return data.map((r) => ({
    id: r.id,
    userEmail: r.user_email,
    userName: r.user_name,
    docId: r.doc_id,
    docTitle: r.doc_title,
    docReference: r.doc_reference ?? "",
    category: r.category ?? "",
    action: (r.action as "view" | "download" | "sign"),
    date: r.created_at,
  }));
}
