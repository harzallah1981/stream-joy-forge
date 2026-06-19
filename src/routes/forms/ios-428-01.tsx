import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitEmailDialog } from "@/components/submit-email-dialog";
import { Send, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forms/ios-428-01")({
  head: () => ({ meta: [{ title: "Check-list IOS 428-01" }] }),
  component: Form,
});


type Sev = "HIGH" | "MEDIUM" | "LOW";
type Item = { ref: string; text: string; sev: Sev; gom?: string; iosa?: string };
type Section = { num: number; title: string; items: Item[] };
type Override = { sev?: Sev; gom?: string; iosa?: string; text?: string };
const OVR_KEY = "tunisair_ios428_overrides_v1";
function loadOverrides(): Record<string, Override> {
  try { return JSON.parse(localStorage.getItem(OVR_KEY) ?? "{}"); } catch { return {}; }
}
function saveOverrides(o: Record<string, Override>) {
  try { localStorage.setItem(OVR_KEY, JSON.stringify(o)); } catch {}
}

const SECTIONS: Section[] = [
  { num: 1, title: "Check-in", items: [
    { ref: "1.1", text: "Number of check-in boxes and flight display above", sev: "HIGH", gom: "2.3.2.3 + 5.2.1" },
    { ref: "1.2", text: "Check-in starting time and staff availability", sev: "LOW", gom: "5.2.3 + 5.2.1" },
    { ref: "1.3", text: "Staff behavior and look during customers contact", sev: "LOW", gom: "2.3.1.1" },
    { ref: "1.4", text: "DG instructions signs, DG questionnaires, vigilance during baggage acceptance", sev: "HIGH", gom: "5.2.1" },
    { ref: "1.5", text: "Documentary confrontation, safety questionnaire", sev: "LOW", gom: "2.3.2.6" },
    { ref: "1.6", text: "Removal of any unrelevant baggage tags, hand luggage tags", sev: "LOW", gom: "2.3.2.7" },
    { ref: "1.7", text: "Check-in running time, queue time", sev: "MEDIUM", gom: "2.3.2.3" },
    { ref: "1.8", text: "PRM Handling", sev: "MEDIUM", gom: "5.3.1" },
    { ref: "1.9", text: "Handling of passengers with special needs (other than PRM)", sev: "HIGH", gom: "5.3.2" },
    { ref: "1.10", text: "Flight closing, waiting list respect, closing of check-in boxes and flight display", sev: "MEDIUM", gom: "SLA + 5.2.3 + 5.3.8.2" },
    { ref: "1.11", text: "Handling of out-of-standard baggage, unaccompanied baggage, company mail", sev: "LOW", gom: "2.3.2.7 / 5.11" },
    { ref: "1.12", text: "Staff responsiveness, competence, management of irregularities", sev: "LOW", gom: "5.9.1" },
  ]},
  { num: 2, title: "Boarding", items: [
    { ref: "2.1", text: "Gate display, staff at the boarding gate", sev: "HIGH", gom: "2.3.1 + 2.3.4" },
    { ref: "2.2", text: "Staff behavior and look during customers contact", sev: "LOW", gom: "2.3.1.1" },
    { ref: "2.3", text: "Organization of boarding, announcements", sev: "HIGH", gom: "2.3.4.3" },
    { ref: "2.4", text: "Security checks of carry-on baggage", sev: "MEDIUM", gom: "2.3.4.2" },
    { ref: "2.5", text: "Pre-boarding (sequential), post-boarding (PRM, UM, families, etc.)", sev: "LOW", gom: "2.3.4.4" },
    { ref: "2.6", text: "Documents check & reconciliation, verification and counting", sev: "HIGH", gom: "5.7.1" },
    { ref: "2.7", text: "Communication of information to passengers (e.g. irregularities)", sev: "MEDIUM", gom: "5.9.2.3" },
  ]},
  { num: 3, title: "Disembarkation", items: [
    { ref: "3.1", text: "Staff behavior, look, and presence time during customer contact", sev: "HIGH", gom: "2.3.5.1 + 2.3.1.1" },
    { ref: "3.2", text: "Handling of passengers in correspondence, transit, accommodation, transport", sev: "LOW", gom: "5.8.4" },
    { ref: "3.3", text: "Handling of particularities (PRM, UM, VIP…)", sev: "LOW", gom: "5.8.2" },
    { ref: "3.4", text: "Handling of INAD/DEPO, security procedures", sev: "LOW", gom: "5.8.2" },
  ]},
  { num: 4, title: "Baggage Delivery", items: [
    { ref: "4.1", text: "First baggage delivered", sev: "LOW", gom: "5.11.7.3" },
    { ref: "4.2", text: "Last baggage delivered", sev: "LOW", gom: "5.11.7.3" },
    { ref: "4.3", text: "Flight display / number of operational belts", sev: "LOW", gom: "N/A APT" },
    { ref: "4.4", text: "Signage, exhibition, premises, area", sev: "LOW", gom: "N/A APT" },
  ]},
  { num: 5, title: "Baggage Claims", items: [
    { ref: "5.1", text: "Staff behavior and look during customers contact", sev: "LOW", gom: "2.3.1.1" },
    { ref: "5.2", text: "Organization, storage, arrangement, accessibility", sev: "LOW", gom: "5.12.1" },
    { ref: "5.3", text: "Handling of passengers complaints, timeliness, efficiency", sev: "LOW", gom: "5.12.1.2" },
  ]},
  { num: 6, title: "Safety On The Ramp", items: [
    { ref: "6.1", text: "Marshal's presence at the arrival of the A/C", sev: "HIGH" },
    { ref: "6.2", text: "Chocks are placed in sufficient numbers when engines are shut down", sev: "LOW", gom: "10.1.8" },
    { ref: "6.3", text: "Safety cones placement", sev: "LOW", gom: "10.1.7" },
    { ref: "6.4", text: "GPU Hook placement", sev: "LOW" },
    { ref: "6.5", text: "Presence of an engineer upon arrival (inspection; refuelling)", sev: "LOW", gom: "10.6.3" },
    { ref: "6.6", text: "Presence of a turnaround coordinator", sev: "HIGH" },
    { ref: "6.7", text: "A/C parking clear of any FOD", sev: "MEDIUM", gom: "10.1.4" },
    { ref: "6.8", text: "Ramp personnel wear visible access badges", sev: "MEDIUM" },
    { ref: "6.9", text: "Ramp personnel equipped with vests, gloves, hearing protection, safety shoes", sev: "HIGH" },
    { ref: "6.10", text: "Staff comply with telephone use prohibition at the ERA", sev: "MEDIUM", gom: "10.1.13.1" },
    { ref: "6.11", text: "ERA is clear when manoeuvring aircraft (guidance, push-back)", sev: "LOW", gom: "10.1.14.7" },
    { ref: "6.12", text: "All ground equipment and vehicles are clean from debris, FOD…", sev: "HIGH" },
    { ref: "6.13", text: "ULDs are stored in a dedicated area", sev: "HIGH", gom: "8.4.2.3" },
    { ref: "6.14", text: "ULDs are checked before loading", sev: "HIGH", gom: "8.1.1.1" },
    { ref: "6.15", text: "Absence of non-GSE in the ZEC", sev: "LOW", gom: "10.1.3" },
    { ref: "6.16", text: "Compliance with refuelling procedure", sev: "LOW" },
  ]},
  { num: 7, title: "GSE", items: [
    { ref: "7.1", text: "GSE are identified and in good condition (inventory, maintenance program)", sev: "HIGH", gom: "10.1.5.7" },
    { ref: "7.2", text: "Presence and validity of fire extinguishers", sev: "HIGH" },
    { ref: "7.3", text: "GSE drivers hold a valid Ramp driving licence", sev: "LOW" },
    { ref: "7.4", text: "GSE provided on time upon A/C arrival", sev: "LOW" },
    { ref: "7.5", text: "Belt loader, ULD loader, passenger & catering elevators equipped with protections and in good condition", sev: "LOW", gom: "10.1.5.5" },
    { ref: "7.6", text: "Safety railings deployed when in use", sev: "HIGH" },
    { ref: "7.7", text: "Placing GSE chocks at loading/unloading", sev: "MEDIUM" },
    { ref: "7.8", text: "All GSE not in deploying position when moving", sev: "MEDIUM", gom: "10.1.5.1 (j)" },
    { ref: "7.9", text: "Pushback provided on time for departure (SLA/Procedures)", sev: "HIGH", gom: "SLA" },
    { ref: "7.10", text: "GSE guidance manoeuvres followed when moving backwards", sev: "MEDIUM" },
    { ref: "7.11", text: "Speed limit and stops respected in ERA & brakes checks before entering", sev: "LOW" },
    { ref: "7.12", text: "Flashing & anti-collision lights on during push-back", sev: "HIGH" },
  ]},
  { num: 8, title: "Loading / Unloading", items: [
    { ref: "8.1", text: "Beltloader / ULD loaders in place, on time and in sufficient numbers", sev: "HIGH" },
    { ref: "8.2", text: "Priority baggages are unloaded first", sev: "LOW" },
    { ref: "8.3", text: "Holds are systematically checked before loading", sev: "LOW" },
    { ref: "8.4", text: "ULD are identified", sev: "LOW", gom: "8.1.1.1" },
    { ref: "8.5", text: "LIR is delivered to person in charge of A/C loading", sev: "LOW", gom: "8.1.1.1" },
    { ref: "8.6", text: "Manifest reconciliation and cargo visualization", sev: "HIGH" },
    { ref: "8.7", text: "Check NOTOC edition (per regulations)", sev: "MEDIUM", gom: "7.8" },
    { ref: "8.8", text: "Baggage reconciled prior to loading", sev: "MEDIUM" },
    { ref: "8.9", text: "Loading priority compliance per established LIR", sev: "HIGH" },
    { ref: "8.10", text: "Compliance with height limit of loading in holds", sev: "MEDIUM" },
    { ref: "8.11", text: "Nets set up even for aircraft with empty holds", sev: "LOW" },
    { ref: "8.12", text: "Holds inspected before closing", sev: "HIGH" },
    { ref: "8.13", text: "Engineering inspection before departure (if applicable)", sev: "MEDIUM" },
  ]},
  { num: 9, title: "Cabin Cleaning", items: [
    { ref: "9.1", text: "Emptying garbage boxes and racks", sev: "LOW", gom: "10.1.14.3" },
    { ref: "9.2", text: "External cleanliness of racks", sev: "LOW", gom: "10.1.14.3" },
    { ref: "9.3", text: "Cleanliness of seats (structure, back, pocket, armrests)", sev: "LOW", gom: "10.1.14.3" },
    { ref: "9.4", text: "Cleanliness of tablets", sev: "LOW", gom: "10.1.14.3" },
    { ref: "9.5", text: "Carpet and floor cleanliness", sev: "LOW", gom: "10.1.14.3" },
    { ref: "9.6", text: "Repositioning of seat belts and seat backs", sev: "LOW", gom: "10.1.14.3" },
  ]},
  { num: 10, title: "Flight Deck Cleaning", items: [
    { ref: "10.1", text: "Miscellaneous residues from pouches, seat backs & placards collected", sev: "LOW" },
    { ref: "10.2", text: "Cleaning of crew tablets", sev: "LOW" },
    { ref: "10.3", text: "Brushing the seats and backs of the seats", sev: "LOW" },
    { ref: "10.4", text: "Cleaning the floor with vacuum cleaner", sev: "LOW" },
  ]},
  { num: 11, title: "Galleys Cleaning", items: [
    { ref: "11.1", text: "Cleaning of sinks", sev: "LOW" },
    { ref: "11.2", text: "Cleaning of galleys work surfaces", sev: "LOW" },
    { ref: "11.3", text: "Cleaning the ovens", sev: "LOW" },
    { ref: "11.4", text: "Garbage bag collection and container cleaning", sev: "LOW" },
  ]},
  { num: 12, title: "Lavatories Cleaning", items: [
    { ref: "12.1", text: "Cleaning of wash basins", sev: "LOW" },
    { ref: "12.2", text: "Emptying and washing of towel receptacles", sev: "LOW" },
    { ref: "12.3", text: "Cleaning of seats, basins and surroundings", sev: "LOW" },
    { ref: "12.4", text: "Wiping the mirrors", sev: "LOW" },
    { ref: "12.5", text: "Cleaning baby diapers area", sev: "LOW" },
    { ref: "12.6", text: "Deodorisations", sev: "LOW" },
  ]},
  { num: 13, title: "A/C Handling — General / Documentation", items: [
    { ref: "13.1", text: "Constitution of the flight file and archiving", sev: "MEDIUM" },
    { ref: "13.2", text: "Documentation (GOM and DGR current edition)", sev: "HIGH" },
    { ref: "13.3", text: "Availability of latest operational data updates (DOI/DOW/AHM560)", sev: "HIGH" },
  ]},
  { num: 14, title: "Monitoring Of Sub-Contractors", items: [
    { ref: "14.1", text: "Existence of potable water tests", sev: "MEDIUM" },
    { ref: "14.2", text: "Realization of fuel control (density, type, control points)", sev: "HIGH" },
    { ref: "14.3", text: "Process for monitoring outsourced activities", sev: "MEDIUM" },
  ]},
  { num: 15, title: "Training — Passenger Handling Personnel", items: [
    { ref: "15.1", text: "Aviation Basics", sev: "MEDIUM" },
    { ref: "15.2", text: "Arrivals / Departures", sev: "MEDIUM" },
    { ref: "15.3", text: "Baggage Services", sev: "MEDIUM" },
    { ref: "15.4", text: "Check-in", sev: "MEDIUM" },
    { ref: "15.5", text: "Passenger Assistance and PRM", sev: "HIGH" },
    { ref: "15.6", text: "Post-Flight Requirements", sev: "LOW" },
    { ref: "15.7", text: "Special Category Passengers", sev: "MEDIUM" },
    { ref: "15.8", text: "Transfer of Load Information", sev: "MEDIUM" },
    { ref: "15.9", text: "Transfer, Transit and Connection", sev: "LOW" },
    { ref: "15.10", text: "Boarding Bridge Operations", sev: "MEDIUM" },
    { ref: "15.11", text: "Aircraft Cabin Access Doors", sev: "HIGH" },
    { ref: "15.12", text: "Safety & Human Factor", sev: "HIGH" },
  ]},
  { num: 16, title: "Training — Ramp Services Personnel", items: [
    { ref: "16.1", text: "Basic Ramp", sev: "HIGH" },
    { ref: "16.2", text: "Airside Driving", sev: "HIGH" },
    { ref: "16.3", text: "Basic Hand Signals", sev: "MEDIUM" },
    { ref: "16.4", text: "Aircraft Marshalling", sev: "HIGH" },
    { ref: "16.5", text: "Boarding Bridge Operations", sev: "MEDIUM" },
    { ref: "16.6", text: "Aircraft Cargo Access Doors", sev: "HIGH" },
    { ref: "16.7", text: "Aircraft Cabin Access Doors", sev: "HIGH" },
    { ref: "16.8", text: "Aircraft Loading", sev: "HIGH" },
    { ref: "16.9", text: "Aircraft Arrival", sev: "MEDIUM" },
    { ref: "16.10", text: "Aircraft Departure", sev: "MEDIUM" },
    { ref: "16.11", text: "Aircraft Pushback", sev: "HIGH" },
    { ref: "16.12", text: "Aircraft Towing", sev: "HIGH" },
    { ref: "16.13", text: "GSE Operations", sev: "HIGH" },
    { ref: "16.14", text: "Ground-to-Flight Deck Headset Communication and Engine Start", sev: "HIGH" },
    { ref: "16.15", text: "Ramp Baggage Handling", sev: "MEDIUM" },
    { ref: "16.16", text: "Aircraft Loading Supervision", sev: "HIGH" },
    { ref: "16.17", text: "Airside Safety Supervision", sev: "HIGH" },
    { ref: "16.18", text: "Safety & Human Factor", sev: "HIGH" },
  ]},
  { num: 17, title: "Training — Load Control Personnel", items: [
    { ref: "17.1", text: "Aviation Basics", sev: "MEDIUM" },
    { ref: "17.2", text: "Aircraft Weight & Balance Principles", sev: "HIGH" },
    { ref: "17.3", text: "Load Planning and Load Sheet", sev: "HIGH" },
    { ref: "17.4", text: "Documentation and Messaging", sev: "MEDIUM" },
    { ref: "17.5", text: "Safety & Human Factor", sev: "HIGH" },
  ]},
  { num: 18, title: "Training — Fuelling Operations Supervision", items: [
    { ref: "18.1", text: "Safe operation of equipment", sev: "HIGH" },
    { ref: "18.2", text: "Emergency Procedures", sev: "HIGH" },
    { ref: "18.3", text: "Fuel spillage avoidance response", sev: "HIGH" },
    { ref: "18.4", text: "Aircraft fueling and defueling procedures", sev: "HIGH" },
    { ref: "18.5", text: "Aircraft specific training", sev: "MEDIUM" },
    { ref: "18.6", text: "Safety & Human Factor", sev: "HIGH" },
  ]},
  { num: 19, title: "Training — De/Anti-Icing Supervision", items: [
    { ref: "19.1", text: "Common standards, regulations & local rules", sev: "MEDIUM" },
    { ref: "19.2", text: "Hazards of snow, ice and frost", sev: "HIGH" },
    { ref: "19.3", text: "Safe operation of equipment & de/anti-icing (critical areas)", sev: "HIGH" },
    { ref: "19.4", text: "Fluid characteristics, application & holdover time limits", sev: "HIGH" },
    { ref: "19.5", text: "De-icing/anti-icing codes, communication and coordination", sev: "HIGH" },
    { ref: "19.6", text: "Safety & Human Factor", sev: "HIGH" },
  ]},
  { num: 20, title: "General Aspects", items: [
    { ref: "20.1", text: "Initial, recurrent and requalification trainings (GOM 3.2.1.1.1.6 + 3.2.1.1.1.2.3)", sev: "HIGH" },
    { ref: "20.2", text: "Check the content of the training program and annual updates", sev: "MEDIUM" },
    { ref: "20.3", text: "Check personnel training records and tests (per module)", sev: "HIGH" },
  ]},
];

type Conformity = "" | "Yes" | "No" | "Not Audited" | "Not Applicable";
type Answer = { conformity: Conformity; remark: string };

const blank = (): Record<string, Answer> => {
  const r: Record<string, Answer> = {};
  for (const s of SECTIONS) for (const i of s.items) r[i.ref] = { conformity: "", remark: "" };
  return r;
};

function Form() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [header, setHeader] = useState({
    auditor: "", date: new Date().toISOString().slice(0, 10),
    station: "", flight: "", aircraft: "",
  });
  const [answers, setAnswers] = useState(blank());
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  // Admin overrides for Sev/GOM/IOSA/text per item ref — persisted in localStorage (T22)
  const [overrides, setOverrides] = useState<Record<string, Override>>(() => loadOverrides());

  const stats = useMemo(() => {
    let yes = 0, no = 0, na = 0, total = 0;
    const findings: { ref: string; text: string; remark: string }[] = [];
    for (const s of SECTIONS) for (const i of s.items) {
      total++;
      const a = answers[i.ref];
      const c = a.conformity;
      if (c === "Yes") yes++;
      else if (c === "No") { no++; findings.push({ ref: i.ref, text: i.text, remark: a.remark }); }
      else if (c === "Not Applicable") na++;
    }
    // Conformity rate: CONFORMES / (total audited items, excluding N/A) × 100.
    // Rounded to 2 decimal places, e.g. 1/147 → 0.68%.
    const audited = total - na;
    const rate = audited > 0 ? Math.round((yes / audited) * 10000) / 100 : 0;
    return { yes, no, na, total, audited, rate, findings };
  }, [answers]);

  const setA = (ref: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [ref]: { ...a[ref], ...patch } }));
  const setOverride = (ref: string, patch: Override) =>
    setOverrides((o) => {
      const next = { ...o, [ref]: { ...o[ref], ...patch } };
      saveOverrides(next);
      return next;
    });


  return (
    <PageShell title="IOS 428-01 — Check-list" subtitle="Inspection Opérationnelle Sol — Passengers & Ramp / Réf. réglementaire : IOS428-02#a5">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="#003a7a" />
              <path d="M14 38 L50 22 L46 32 L24 36 L20 42 Z" fill="#e30613" />
              <path d="M20 42 L46 32 L34 44 Z" fill="#ffffff" />
            </svg>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-wider text-[#003a7a]">TUNISAIR</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ground Operations</div>
            </div>
          </div>
          <div className="ml-auto text-right text-xs text-blue-900">
            <div className="font-bold uppercase tracking-wide">IOS 428-01</div>
            <div>Réf. : <span className="font-mono font-bold">IOS428-02#a5</span></div>
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-primary">En-tête / Header</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div><Label>Auditeur</Label><Input value={header.auditor} onChange={(e) => setHeader({ ...header, auditor: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })} /></div>
            <div><Label>Station</Label><Input value={header.station} onChange={(e) => setHeader({ ...header, station: e.target.value })} placeholder="TUN" /></div>
            <div><Label>Vol</Label><Input value={header.flight} onChange={(e) => setHeader({ ...header, flight: e.target.value })} placeholder="TU 712" /></div>
            <div><Label>Immat.</Label><Input value={header.aircraft} onChange={(e) => setHeader({ ...header, aircraft: e.target.value })} placeholder="TS-IMW" /></div>
          </CardContent>
        </Card>

        <div className="sticky top-0 z-10 grid grid-cols-2 gap-3 rounded-xl border bg-white p-3 shadow-sm sm:grid-cols-5">
          <Stat label="Items" value={stats.total} tone="slate" />
          <Stat label="Conformes" value={stats.yes} tone="green" />
          <Stat label="Écarts" value={stats.no} tone="red" />
          <Stat label="N/A · Non audité" value={stats.na} tone="amber" />
          <Stat label="Conformité" value={`${stats.rate.toFixed(2)}%`} tone="blue" />
        </div>

        {SECTIONS.map((s) => {
          const isCollapsed = collapsed[s.num];
          return (
            <Card key={s.num}>
              <button
                type="button"
                onClick={() => setCollapsed({ ...collapsed, [s.num]: !isCollapsed })}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  <span className="font-semibold text-primary">Section {s.num} — {s.title}</span>
                  <span className="text-xs text-slate-500">({s.items.length} items)</span>
                </div>
              </button>
              {!isCollapsed && (
                <CardContent className="px-0 pt-0 pb-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Ref</th>
                        <th className="px-3 py-2 text-left font-semibold">Audit scope</th>
                        <th className="px-3 py-2 text-left font-semibold">Sev.</th>
                        <th className="px-3 py-2 text-left font-semibold">GOM</th>
                        <th className="px-3 py-2 text-left font-semibold">IOSA</th>
                        <th className="px-3 py-2 text-left font-semibold">Conformité</th>
                        <th className="px-3 py-2 text-left font-semibold">Remarque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((it) => {
                        const ovr = overrides[it.ref] ?? {};
                        const sevValue = ovr.sev ?? it.sev;
                        const gomValue = ovr.gom ?? it.gom ?? "";
                        const iosaValue = ovr.iosa ?? "";
                        const textValue = ovr.text ?? it.text;
                        return (
                        <tr key={it.ref} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{it.ref}</td>
                          <td className="px-3 py-2 text-slate-800">
                            {isAdmin ? (
                              <Input
                                value={textValue}
                                onChange={(e) => setOverride(it.ref, { text: e.target.value })}
                                className="h-7 text-xs"
                              />
                            ) : textValue}
                          </td>
                          <td className="px-3 py-2">
                            {isAdmin ? (
                              <select
                                value={sevValue}
                                onChange={(e) => setOverride(it.ref, { sev: e.target.value as Sev })}
                                className="h-7 rounded border border-slate-200 px-1 text-[10px] font-bold"
                              >
                                <option value="HIGH">HIGH</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="LOW">LOW</option>
                              </select>
                            ) : (
                              <SevBadge sev={sevValue} />
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {isAdmin ? (
                              <Input
                                value={gomValue}
                                onChange={(e) => setOverride(it.ref, { gom: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="—"
                              />
                            ) : (
                              gomValue || "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {isAdmin ? (
                              <Input
                                value={iosaValue}
                                onChange={(e) => setOverride(it.ref, { iosa: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="GRH 3.x.x"
                              />
                            ) : (
                              iosaValue || "—"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={answers[it.ref].conformity}
                              onChange={(e) => setA(it.ref, { conformity: e.target.value as Conformity })}
                              className="h-8 rounded border border-slate-200 px-2 text-xs"
                            >

                              <option value="">—</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                              <option value="Not Audited">Not Audited</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={answers[it.ref].remark}
                              onChange={(e) => setA(it.ref, { remark: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </td>
                        </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          );
        })}

        <Card>
          <CardHeader><CardTitle className="text-primary">Synthèse / Findings ({stats.findings.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="min-h-[120px] rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              {stats.findings.length === 0 ? (
                <p className="text-sm italic text-slate-500">Aucun écart relevé. Les items répondus « No » apparaîtront ici automatiquement.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-slate-800">
                  {stats.findings.map((f) => (
                    <li key={f.ref} className="flex gap-2">
                      <span className="font-mono font-bold text-red-600">— {f.ref}</span>
                      <span>{f.text}{f.remark ? ` — ${f.remark}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="outline" onClick={() => setAnswers(blank())}>
            <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Soumettre par email
          </Button>
        </div>
      </div>

      <SubmitEmailDialog
        open={open}
        onOpenChange={setOpen}
        formType="ios-428-01"
        payload={{ header, answers, stats }}
        onSent={() => setAnswers(blank())}
      />
    </PageShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "green" | "red" | "amber" | "blue" }) {
  const map = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <div className={"rounded-lg p-3 text-center " + map}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] uppercase">{label}</div>
    </div>
  );
}

function SevBadge({ sev }: { sev: Sev }) {
  const map = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-slate-100 text-slate-600" };
  return <span className={"rounded px-1.5 py-0.5 text-[10px] font-bold " + map[sev]}>{sev}</span>;
}
