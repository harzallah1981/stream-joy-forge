// Archives — keeps a copy of deleted documents / read-sign items / forms.
// Visible only to admins under Administration > Archives.

export type ArchiveKind = "document" | "read-sign" | "form";

export type ArchiveItem = {
  id: string;
  kind: ArchiveKind;
  category: string;     // doc category slug, or "read-sign", or "form"
  title: string;
  reference?: string;
  archivedAt: string;   // ISO
  archivedBy: string;   // email
  payload: unknown;     // full original object (to allow inspection / future restore)
};

const KEY = "tunisair_archives_v1";

export function loadArchives(): ArchiveItem[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as ArchiveItem[]) : [];
  } catch { return []; }
}

export function saveArchives(items: ArchiveItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function archive(item: Omit<ArchiveItem, "id" | "archivedAt">) {
  const items = loadArchives();
  items.unshift({
    ...item,
    id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    archivedAt: new Date().toISOString(),
  });
  saveArchives(items.slice(0, 1000));
}

export function removeArchive(id: string) {
  saveArchives(loadArchives().filter((a) => a.id !== id));
}
