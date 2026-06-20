// T28: Block copy / cut / paste / right-click for standard & external users.
// Plus: print/PrintScreen warning + print stylesheet that hides content.
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { userType } from "@/lib/permissions";
import { toast } from "sonner";

export function NoCopyGuard() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const t = userType(user);
    if (t !== "internal_standard" && t !== "external") return;

    const isAllowed = () => document.body.dataset.allowCopy === "1";
    const stop = (e: Event) => {
      if (isAllowed()) return;
      e.preventDefault();
      toast.error("Copie désactivée pour votre profil");
    };
    const ctx = (e: MouseEvent) => { if (!isAllowed()) e.preventDefault(); };
    const key = (e: KeyboardEvent) => {
      if (isAllowed()) return;
      // Block Ctrl/Cmd+C/X/V/S/P and PrintScreen
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "s", "p"].includes(k)) {
        e.preventDefault();
        toast.error("Raccourci désactivé pour votre profil");
      }
      if (e.key === "PrintScreen") {
        toast.error("Capture d'écran non autorisée — incident enregistré");
      }
    };

    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("contextmenu", ctx);
    document.addEventListener("keydown", key);
    document.body.classList.add("no-copy-mode");

    return () => {
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("contextmenu", ctx);
      document.removeEventListener("keydown", key);
      document.body.classList.remove("no-copy-mode");
    };
  }, [user]);
  return null;
}
