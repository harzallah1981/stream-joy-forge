import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, AlertCircle, X, ArrowRight, ShieldAlert, Plane, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getAllDocs, type DocItem } from "@/lib/documents";
import { loadReads, markRead, unreadDocs } from "@/lib/notifications";
import { addAck } from "@/lib/acknowledgements";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { openSafaForEscale, type SafaRecord } from "@/lib/safa-store";
import type { SafetyEvent } from "@/lib/safety-data";
import { getReminders, clearReminder } from "@/lib/user-reminders";

function loadOpenEventsForEscale(escale?: string): SafetyEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`tunisair_events_2026`);
    const list: SafetyEvent[] = raw ? JSON.parse(raw) : [];
    const open = list.filter((e) => e.statut !== "CLÔTURÉ");
    const esc = (escale ?? "").trim().toUpperCase();
    return esc ? open.filter((e) => e.escale.toUpperCase() === esc) : open;
  } catch { return []; }
}


export function UserDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((x) => x + 1);

  const stats = useMemo(() => {
    if (!user) return { total: 0, read: 0, unread: [] as DocItem[] };
    const reads = loadReads(user.email);
    const docs = getAllDocs();
    const total = docs.length;
    const read = Object.keys(reads).filter((id) => docs.some((d) => d.id === id)).length;
    return { total, read, unread: unreadDocs(user.email) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tick]);

  const [reading, setReading] = useState<DocItem[] | null>(null);
  const [idx, setIdx] = useState(0);

  const startReading = (queue: DocItem[]) => { setReading(queue); setIdx(0); };
  const current = reading?.[idx];

  const handleMarkRead = () => {
    if (!user || !current) return;
    markRead(user.email, current.id);
    addAck({
      userEmail: user.email,
      userName: user.username,
      docId: current.id,
      docTitle: current.title,
      docReference: current.reference,
      category: current.category,
      action: "view",
    });
    if (reading && idx < reading.length - 1) setIdx(idx + 1);
    else { setReading(null); refresh(); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("my_dashboard")}</h2>
        <p className="text-sm text-slate-500">{t("my_dashboard_desc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={BookOpen} iconBg="bg-blue-100 text-blue-600" label={t("docs_total")} value={stats.total} />
        <KpiCard icon={CheckCircle2} iconBg="bg-green-100 text-green-600" label={t("docs_read")} value={stats.read} />

        <HoverCard openDelay={120}>
          <HoverCardTrigger asChild>
            <div className={
              "relative cursor-pointer rounded-xl border bg-white p-4 shadow-sm " +
              (stats.unread.length > 0 ? "border-red-300 ring-2 ring-red-300 animate-pulse" : "border-slate-200")
            }>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("docs_unread")}</div>
                  <div className="mt-2 text-3xl font-bold text-red-600">{stats.unread.length}</div>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                </span>
              </div>
              {stats.unread.length > 0 && (
                <div className="mt-3 text-xs font-medium text-red-600">⚠ {t("unread_alert")}</div>
              )}
            </div>
          </HoverCardTrigger>
          {stats.unread.length > 0 && (
            <HoverCardContent align="end" className="w-80 p-0">
              <div className="border-b px-4 py-2 text-sm font-semibold">{t("docs_unread")} ({stats.unread.length})</div>
              <div className="max-h-72 overflow-y-auto">
                {stats.unread.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => startReading([d])}
                    className="flex w-full items-center justify-between gap-2 border-b px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.title}</div>
                      <div className="text-[11px] text-slate-500">{d.reference} · {d.version}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
              <div className="border-t p-2">
                <Button size="sm" className="w-full" onClick={() => startReading(stats.unread)}>
                  {t("read_now")} ({stats.unread.length})
                </Button>
              </div>
            </HoverCardContent>
          )}
        </HoverCard>
      </div>

      <RemindersBanner onOpen={(d) => startReading([d])} />

      <SafetyEscaleBlock />



      <Dialog open={!!reading} onOpenChange={(v) => !v && setReading(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{current?.title}</span>
              {reading && reading.length > 1 && (
                <span className="text-xs font-normal text-slate-500">{idx + 1} / {reading.length}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {current && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">{current.reference} · {current.version} · {current.date}</div>
              <iframe src={current.url} title={current.title} className="h-[55vh] w-full rounded border" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReading(null)}>
              <X className="mr-1 h-4 w-4" /> {t("close")}
            </Button>
            <Button onClick={handleMarkRead}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {reading && idx < reading.length - 1 ? `${t("mark_read")} · ${t("next_doc")}` : t("mark_read")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, iconBg, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>
        <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-lg " + iconBg}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function SafetyEscaleBlock() {
  const { user } = useAuth();
  const escale = user?.workplace?.trim() || "";
  const [openEvents, setOpenEvents] = useState<SafetyEvent[]>([]);
  const [openSafa, setOpenSafa] = useState<SafaRecord[]>([]);

  useEffect(() => {
    setOpenEvents(loadOpenEventsForEscale(escale || undefined));
    setOpenSafa(openSafaForEscale(escale || undefined));
  }, [escale]);

  const total = openEvents.length + openSafa.length;
  if (total === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border-2 border-red-400 bg-red-50 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 border-b border-red-200 bg-red-100 px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 text-red-700" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-red-800">
          Événements & écarts SAFA en cours{escale ? ` · escale ${escale}` : ""}
        </h3>
        <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{total}</span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-red-700">
            <AlertCircle className="h-3.5 w-3.5" /> Événements ouverts ({openEvents.length})
          </div>
          {openEvents.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun événement ouvert.</p>
          ) : (
            <ul className="space-y-1.5">
              {openEvents.slice(0, 5).map((e) => (
                <li key={e.id} className="text-xs">
                  <Link to="/safety/events" search={{ focus: e.id }} className="block rounded p-1 hover:bg-red-50">
                    <span className="font-mono font-semibold text-slate-800">{e.id}</span>
                    <span className="ml-2 text-slate-500">{e.date} · {e.escale}</span>
                    <div className="truncate text-slate-700">{e.description}</div>
                  </Link>
                </li>
              ))}
              {openEvents.length > 5 && (
                <li className="text-[11px] text-red-700"><Link to="/safety/events">+ {openEvents.length - 5} autre(s)</Link></li>
              )}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-red-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-red-700">
            <Plane className="h-3.5 w-3.5" /> Écarts SAFA non clôturés ({openSafa.length})
          </div>
          {openSafa.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun écart ouvert.</p>
          ) : (
            <ul className="space-y-1.5">
              {openSafa.slice(0, 5).map((r) => (
                <li key={r.id} className="text-xs">
                  <Link to="/safety/safa-d03" search={{ focus: r.id }} className="block rounded p-1 hover:bg-red-50">
                    <span className="font-mono font-semibold text-slate-800">{r.id}</span>
                    <span className="ml-2 text-slate-500">{r.date} · {r.escale} · {r.vol}</span>
                    <div className="truncate text-slate-700">{r.description}</div>
                  </Link>
                </li>
              ))}
              {openSafa.length > 5 && (
                <li className="text-[11px] text-red-700"><Link to="/safety/safa-d03">+ {openSafa.length - 5} autre(s)</Link></li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RemindersBanner({ onOpen }: { onOpen: (d: DocItem) => void }) {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  if (!user) return null;
  const rems = getReminders(user.email);
  if (rems.length === 0) return null;
  return (
    <div className="mt-6 overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100 px-4 py-2.5">
        <Bell className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-800">
          Rappels de lecture envoyés par l'administration
        </h3>
        <span className="ml-auto rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">{rems.length}</span>
      </div>
      <ul className="divide-y divide-amber-100">
        {rems.map((r) => {
          const doc = getAllDocs().find((d) => d.id === r.docId);
          return (
            <li key={r.id} className="flex items-center gap-2 px-4 py-2 text-xs">
              <span className="font-mono font-semibold text-slate-800">{r.docReference}</span>
              <span className="truncate text-slate-700">{r.docTitle}</span>
              <span className="ml-auto text-[10px] text-slate-500">{new Date(r.at).toLocaleString()}</span>
              {doc && (
                <Button size="sm" variant="outline" className="h-7 cursor-pointer text-xs" onClick={() => { onOpen(doc); clearReminder(user.email, r.docId); setTick((t) => t + 1); }}>
                  Lire
                </Button>
              )}
              <button onClick={() => { clearReminder(user.email, r.docId); setTick((t) => t + 1); }} className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
      <span className="hidden">{tick}</span>
    </div>
  );
}

