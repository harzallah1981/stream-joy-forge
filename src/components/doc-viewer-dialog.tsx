import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { resolveDocUrl, type DocItem } from "@/lib/documents";

export function DocViewerDialog({
  doc,
  onClose,
}: {
  doc: DocItem | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    if (doc) resolveDocUrl(doc).then((u) => { if (alive) setUrl(u); });
    else setUrl("");
    return () => { alive = false; };
  }, [doc]);

  if (!doc) return null;
  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {doc.reference} — {doc.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-slate-500">
          Version {doc.version} · {doc.date}
        </div>
        {url ? (
          <iframe
            src={url}
            title={doc.title}
            className="h-[70vh] w-full rounded border border-slate-200"
          />
        ) : (
          <div className="grid h-[70vh] place-items-center text-sm text-slate-500">Chargement…</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            <X className="mr-1 h-4 w-4" /> Fermer
          </Button>
          <Button onClick={download} className="cursor-pointer" disabled={!url}>
            <Download className="mr-1 h-4 w-4" /> Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
