import { useEffect, useMemo, useState } from "react";
import { Bell, Clock, LogOut, Plane, FileText, RefreshCw, BookOpen } from "lucide-react";
import { usePageMeta } from "@/lib/page-title";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildNotifications, markRead, type Notif } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return {
    utc: `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}Z`,
    lcl: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 32" className={className} style={style} aria-hidden="true">
      <path
        fill="white"
        d="M20 24c-6 0-10-4-10-9 0-5 5-9 10-8 1-5 6-7 11-6 4 1 7 4 8 8 5-1 10 2 10 8 0 5-4 7-9 7H20z"
        opacity="0.85"
      />
    </svg>
  );
}

export function TopHeader() {
  const { meta } = usePageMeta();
  const { utc, lcl } = useClock();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const refresh = () => { if (user) setNotifs(buildNotifications(user.email)); };
  useEffect(() => { refresh(); }, [user, pathname]);

  const count = useMemo(() => notifs.length, [notifs]);

  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #cfeaff 0%, #e6f3ff 60%, #ffffff 100%)" }}
      >
        <Cloud className="ts-cloud absolute top-2 h-6 w-16 opacity-90" style={{ animationDuration: "38s", animationDelay: "-4s", left: 0 }} />
        <Cloud className="ts-cloud absolute top-6 h-4 w-12 opacity-75" style={{ animationDuration: "55s", animationDelay: "-22s", left: 0 }} />
        <Cloud className="ts-cloud absolute top-1 h-5 w-14 opacity-80" style={{ animationDuration: "47s", animationDelay: "-12s", left: 0 }} />
        <Cloud className="ts-cloud absolute top-9 h-3 w-10 opacity-70" style={{ animationDuration: "62s", animationDelay: "-30s", left: 0 }} />
        <div className="ts-plane absolute top-3" style={{ left: 0 }}>
          <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 shadow-sm backdrop-blur-sm">
            <Plane className="h-4 w-4 -rotate-12 text-blue-700" />
            <span className="text-[9px] font-bold tracking-widest text-blue-700">TUNISAIR</span>
          </div>
        </div>
      </div>

      <div className="relative flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />

        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/70 px-2 py-1 shadow-sm backdrop-blur">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white">
            <Plane className="h-4 w-4 -rotate-12" />
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-[11px] font-extrabold tracking-widest text-blue-700">TUNISAIR</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Ground Ops</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-slate-900 md:text-xl">{meta.title}</h1>
          {meta.subtitle && (
            <p className="truncate text-xs text-slate-600 md:text-sm">{meta.subtitle}</p>
          )}
        </div>

        <div className="hidden items-center gap-3 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur md:flex">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-mono font-semibold text-blue-600">{utc}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-slate-700">{lcl}</span>
            <span className="text-[10px] uppercase text-slate-400">LCL</span>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative grid h-9 w-9 place-items-center rounded-full bg-white/70 text-slate-500 shadow-sm backdrop-blur hover:bg-white"
              aria-label={t("notifications")}
              onClick={refresh}
            >
              <Bell className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-pulse place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-2 text-sm font-semibold">{t("notifications")} ({count})</div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">{t("no_notifications")}</div>
              )}
              {notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (user) markRead(user.email, n.doc.id);
                    window.open(n.doc.url, "_blank");
                    refresh();
                  }}
                  className="flex w-full items-start gap-2 border-b px-4 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {n.kind === "new" && <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
                  {n.kind === "updated" && <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{n.doc.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {n.kind === "new" && t("notif_new")}
                      {n.kind === "updated" && t("notif_updated")}
                      {" · "}{n.doc.reference} · {n.doc.version}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {user && (
          <div className="hidden items-center gap-2 rounded-lg bg-white/80 px-3 py-1 shadow-sm backdrop-blur md:flex">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">{user.username}</div>
              <div className="text-[11px] text-slate-500">
                <span className={"mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase " + (
                  user.role === "admin" ? "bg-red-100 text-red-700" :
                  user.role === "internal" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                )}>{user.role}</span>
                {user.email}
              </div>
            </div>
            <button
              onClick={() => { logout(); nav({ to: "/login" }); }}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
