import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

// Inactivity: 10 minutes total. Warning popup at T-60s with a "Stay connected" button.
const IDLE_MS = 10 * 60 * 1000;
const WARN_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [warn, setWarn] = useState(false);
  const [left, setLeft] = useState(WARN_MS);
  const lastActivity = useRef<number>(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track activity
  useEffect(() => {
    if (!user) return;
    const onAct = () => {
      lastActivity.current = Date.now();
      if (warn) {
        setWarn(false);
        setLeft(WARN_MS);
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onAct));
  }, [user, warn]);

  // Idle ticker
  useEffect(() => {
    if (!user) return;
    tickRef.current = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        logout();
        return;
      }
      const remain = IDLE_MS - idle;
      if (remain <= WARN_MS) {
        setWarn(true);
        setLeft(remain);
      }
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [user, logout]);

  if (!user || !warn) return null;
  const secs = Math.max(0, Math.ceil(left / 1000));

  return (
    <Dialog open={warn} onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            {t("session_expiring_title")}
          </DialogTitle>
          <DialogDescription>
            {t("session_expiring_desc").replace("{s}", String(secs))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={logout}>
            {t("logout")}
          </Button>
          <Button
            type="button"
            className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700"
            onClick={() => { lastActivity.current = Date.now(); setWarn(false); setLeft(WARN_MS); }}
          >
            {t("stay_connected")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
