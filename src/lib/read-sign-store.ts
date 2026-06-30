// Read & Sign documents — separate from the general document catalogue.
// Admin uploads documents specifically destined for Read & Sign and assigns them
// to a chosen list of user emails.

import { putBlob, resolveBlobUrl } from "@/lib/doc-blobs";

export type ReadSignDoc = {
  id: string;
  title: string;
  reference: string;
  version: string;
  date: string;
  fileName: string;
  url: string;           // data: URL when inline, "" when stored in IndexedDB
  blobKey?: string;
  mime?: string;
  requireSign: boolean;  // false => view-only, true => requires signature
  assignedEmails: string[]; // lowercase emails
  createdAt: string;
  createdBy: string;
};

const KEY = "tunisair_read_sign_v1";

export function loadReadSign(): ReadSignDoc[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as ReadSignDoc[]) : [];
  } catch { return []; }
}
export function saveReadSign(list: ReadSignDoc[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function addReadSign(d: Omit<ReadSignDoc, "id" | "createdAt">): ReadSignDoc {
  const list = loadReadSign();
  const item: ReadSignDoc = {
    ...d,
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    assignedEmails: d.assignedEmails.map((e) => e.toLowerCase()),
  };
  list.unshift(item);
  saveReadSign(list);
  return item;
}

export function removeReadSign(id: string) {
  const list = loadReadSign();
  const target = list.find((x) => x.id === id);
  if (target?.blobKey) {
    import("@/lib/doc-blobs").then((m) => m.deleteBlob(target.blobKey!).catch(() => {}));
  }
  saveReadSign(list.filter((x) => x.id !== id));
}

export function visibleForUser(email: string | undefined): ReadSignDoc[] {
  if (!email) return [];
  const e = email.toLowerCase();
  return loadReadSign().filter((d) => d.assignedEmails.includes(e));
}

export async function resolveReadSignUrl(d: ReadSignDoc): Promise<string> {
  if (d.blobKey) {
    const u = await resolveBlobUrl(d.blobKey);
    if (u) return u;
  }
  return d.url;
}

const INLINE_LIMIT = 2 * 1024 * 1024;
export async function persistReadSignFile(
  id: string, file: File,
): Promise<{ url: string; blobKey?: string; mime: string }> {
  if (file.size <= INLINE_LIMIT) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    return { url: dataUrl, mime: file.type || "application/octet-stream" };
  }
  await putBlob(id, file);
  return { url: "", blobKey: id, mime: file.type || "application/octet-stream" };
}
