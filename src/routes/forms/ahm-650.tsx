import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitEmailDialog } from "@/components/submit-email-dialog";
import { Send, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/forms/ahm-650")({
  head: () => ({ meta: [{ title: "AHM 650 — Ground Incident / Accident / Damage Report" }] }),
  component: Form,
});

// ---- Reference data taken directly from AHM 650 template ----
const DAMAGE_BY = [
  "Other Aircraft", "Ramp Equipment", "Vehicle", "Foreign Object",
  "Jet Blast", "Unknown (Previously Unreported)", "Other",
];

const VEHICLE_PARTS = [
  "Tyres", "Brakes", "Steering", "Lights", "Wipers",
  "Protection", "Warning Devices", "Stabilisers", "Tow Hitch", "Field of vision from driving position",
];

const WEATHER = ["Rain", "Snow", "Sleet", "Hail", "Fog"];
const SURFACE = ["Dry", "Wet", "Snow", "Slush", "Ice", "Contamination"];
const LIGHTING = ["Good", "Poor", "Day", "Night", "Twilight"];

// Section III — Contributing factors ticklist
const FACTOR_GROUPS: { code: string; title: string; items: string[] }[] = [
  { code: "A", title: "Work Area / Environment", items: [
    "Traffic Congestion", "Ramp Markings", "Visual Reference", "Spatial Judgement", "Lighting",
    "High Winds", "Snow / Ice", "Rain", "Lightning", "Slippery Surface",
    "Trip Hazard", "Noise", "Dust Storm", "Heat (ambient temp)", "Other",
  ]},
  { code: "B", title: "Equipment / Tools", items: [
    "Equipment malfunction (verified)", "Pre-operation tick list not completed",
    "Preventive maintenance not completed", "Faulty equip not removed from service",
    "Unsafe or unreliable equip used", "Equipment difficult to use",
    "Proper equipment unavailable", "Not familiar with equipment",
    "Inappropriate equipment used", "No instructions provided",
    "Equipment incorrectly used", "Safety device bypassed",
    "Operated at excessive speeds", "Not trained on equipment",
    "Design problem", "Other",
  ]},
  { code: "C", title: "Communication", items: [
    "Shift debriefing", "Ground to/from flight deck", "Ground to/from ground",
    "Supervisor to/from agent", "Incomplete message", "Confusing message",
    "Hand signals", "Other",
  ]},
  { code: "D", title: "Ergonomics", items: [
    "Repetitive / Monotonous", "Forceful exertions", "Kneeling / Bending / Stooping",
    "Twisting", "Vibration", "Contact stress",
    "Difficult to grip", "Long duration", "Heat / Cold", "Awkward position",
  ]},
  { code: "E", title: "Procedures / Task / Training", items: [
    "Lacked skill or training", "Failed to plan for task", "Task too difficult",
    "Deviated from procedure", "Procedure not documented", "Procedure not trained",
    "Procedure or training not reinforced", "Procedure not communicated",
    "Not familiar with procedure", "Procedure did not anticipate hazard",
    "Task encourages deviation from procedure", "New task or task change",
    "New tool or equipment", "Other",
  ]},
  { code: "F", title: "Individual Factors", items: [
    "Physical health (hearing/sight)", "Fatigue", "Peer pressure",
    "Body size or strength", "Personal event (family, car acc.)",
    "Workplace distraction / interruption", "Memory lapse (forgot)",
    "Situational awareness (failed to id hazard)", "Stress",
    "Time constraints", "Job / task experience", "Other",
  ]},
  { code: "G", title: "Leadership / Supervision / Organisation", items: [
    "Planning / organisation of task", "Prioritisation of work",
    "Delegation of task", "Unrealistic attitude or expectations",
    "Amount of supervision or availability", "Responsibility not assigned",
    "Failed to communicate", "Failed to co-ordinate",
    "Workload management", "Other",
  ]},
  { code: "H", title: "Organisational Factors", items: [
    "Quality of support mgt / eng. / planning", "Company policies",
    "Corporate change / restructuring", "Union action", "Normal practice",
    "Work process", "Insufficient staff",
    "Local norms permit at-risk behaviour", "Other",
  ]},
];

type Person = { name: string; jobTitle: string; company: string; staffNr: string; licence: string };
type Vehicle = { part: string; serviceable: boolean; faulty: boolean; remarks: string };
type Casualty = { fatal: string; nonFatal: string };
type Corrective = { factor: string; action: string; owner: string; due: string };

const blank = () => ({
  // Header
  airline: "Tunisair", airport: "",
  title: "",
  oneLineStatement: "",
  // Part 1
  damageBy: [] as string[], damageByOther: "",
  date: new Date().toISOString().slice(0, 10), time: "",
  phaseOfOp: "", area: "", aircraftReg: "", aircraftType: "",
  flightNr: "", scheduledGroundTime: "",
  delayHrs: "", delayMin: "", flightCancelled: "no" as "yes" | "no",
  // Part 2
  damageDetails: "",
  // Part 3 - casualties
  casualties: {
    employees: { fatal: "", nonFatal: "" },
    passengers: { fatal: "", nonFatal: "" },
    others: { fatal: "", nonFatal: "" },
  } as Record<"employees"|"passengers"|"others", Casualty>,
  // Part 4 — vehicle
  vehicle: {
    serialFleetNr: "", type: "", owner: "", area: "",
    age: "", lastOverhaul: "",
    parts: VEHICLE_PARTS.map((p) => ({ part: p, serviceable: false, faulty: false, remarks: "" })) as Vehicle[],
  },
  // Part 5 — personnel involved
  personnel: [
    { name: "", jobTitle: "", company: "", staffNr: "", licence: "" },
    { name: "", jobTitle: "", company: "", staffNr: "", licence: "" },
    { name: "", jobTitle: "", company: "", staffNr: "", licence: "" },
  ] as Person[],
  // Part 6 — conditions
  weather: [] as string[],
  useOfficialMet: false,
  surface: [] as string[],
  lighting: [] as string[],
  visibilityM: "", visibilityKm: "",
  windKts: "", temperatureC: "",
  // Part 7
  contributoryFactorsMajor: "",
  contributoryFactorsOther: "",
  normalPractice: "",
  // Part 8/9
  sketchNote: "", narrative: "",
  // Part 10/11/12
  initialFindings: "", initialAction: "", closingAction: "",
  // Part 13
  preparedByName: "", preparedByStatus: "", preparedBySignature: "",
  // Section III ticklist
  factors: Object.fromEntries(
    FACTOR_GROUPS.map((g) => [g.code, { selected: [] as string[], description: "" }]),
  ) as Record<string, { selected: string[]; description: string }>,
  // Corrective actions
  correctives: Array.from({ length: 5 }, () => ({ factor: "", action: "", owner: "", due: "" })) as Corrective[],
});

type Data = ReturnType<typeof blank>;

function Form() {
  const [data, setData] = useState<Data>(blank());
  const [open, setOpen] = useState(false);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData((d) => ({ ...d, [k]: v }));
  const toggleList = (key: "damageBy" | "weather" | "surface" | "lighting", val: string) =>
    setData((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((x) => x !== val) : [...d[key], val],
    }));

  return (
    <PageShell
      title="AHM 650 — Ground Incident / Accident / Damage Report"
      subtitle="Rapport d'incident/accident/dommage au sol (IATA AHM 650)"
    >
      <div className="space-y-5">
        {/* Header */}
        <Card>
          <CardHeader><CardTitle className="text-primary">En-tête / Header</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Airline</Label><Input value={data.airline} onChange={(e) => set("airline", e.target.value)} /></div>
            <div><Label>Airport / Station</Label><Input value={data.airport} onChange={(e) => set("airport", e.target.value)} placeholder="TUN" /></div>
            <div><Label>Title (one-line statement)</Label><Input value={data.oneLineStatement} onChange={(e) => set("oneLineStatement", e.target.value)} placeholder="Main features of the incident/accident" /></div>
          </CardContent>
        </Card>

        {/* Part 1 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 1 — Damage By</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              {DAMAGE_BY.map((d) => (
                <CheckRow key={d} label={d} checked={data.damageBy.includes(d)} onChange={() => toggleList("damageBy", d)} />
              ))}
            </div>
            <div><Label>Other (specify)</Label><Input value={data.damageByOther} onChange={(e) => set("damageByOther", e.target.value)} /></div>

            <div className="grid gap-3 md:grid-cols-4 border-t pt-4">
              <div><Label>Date</Label><Input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} /></div>
              <div><Label>Time of Occurrence (UTC)</Label><Input type="time" value={data.time} onChange={(e) => set("time", e.target.value)} /></div>
              <div><Label>Phase of Operation</Label><Input value={data.phaseOfOp} onChange={(e) => set("phaseOfOp", e.target.value)} placeholder="Arrival, turnaround, push-back..." /></div>
              <div><Label>Area (Stand, etc.)</Label><Input value={data.area} onChange={(e) => set("area", e.target.value)} placeholder="Stand B12" /></div>
              <div><Label>Aircraft Reg.</Label><Input value={data.aircraftReg} onChange={(e) => set("aircraftReg", e.target.value)} placeholder="TS-IMW" /></div>
              <div><Label>Aircraft Type</Label><Input value={data.aircraftType} onChange={(e) => set("aircraftType", e.target.value)} placeholder="A320" /></div>
              <div><Label>Flight Nr.</Label><Input value={data.flightNr} onChange={(e) => set("flightNr", e.target.value)} /></div>
              <div><Label>Scheduled Ground Time</Label><Input value={data.scheduledGroundTime} onChange={(e) => set("scheduledGroundTime", e.target.value)} placeholder="01:15" /></div>
              <div><Label>Flight Delay (hrs)</Label><Input type="number" value={data.delayHrs} onChange={(e) => set("delayHrs", e.target.value)} /></div>
              <div><Label>Flight Delay (min)</Label><Input type="number" value={data.delayMin} onChange={(e) => set("delayMin", e.target.value)} /></div>
              <div>
                <Label>Flight Cancelled</Label>
                <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={data.flightCancelled}
                  onChange={(e) => set("flightCancelled", e.target.value as "yes" | "no")}>
                  <option value="no">No</option><option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Part 2 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 2 — Details of Damage</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={5} value={data.damageDetails} onChange={(e) => set("damageDetails", e.target.value)} placeholder="Decrire avec precision la zone et l'etendue du dommage..." />
          </CardContent>
        </Card>

        {/* Part 3 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 3 — Number of Casualties</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500">
                <th className="px-2 py-2 text-left">Category</th>
                <th className="px-2 py-2 text-left">Fatalities</th>
                <th className="px-2 py-2 text-left">Non Fatal</th>
              </tr></thead>
              <tbody>
                {(["employees", "passengers", "others"] as const).map((k) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="px-2 py-2 capitalize">{k}</td>
                    <td className="px-2 py-2">
                      <Input type="number" value={data.casualties[k].fatal}
                        onChange={(e) => set("casualties", { ...data.casualties, [k]: { ...data.casualties[k], fatal: e.target.value } })} className="h-8" />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" value={data.casualties[k].nonFatal}
                        onChange={(e) => set("casualties", { ...data.casualties, [k]: { ...data.casualties[k], nonFatal: e.target.value } })} className="h-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Part 4 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 4 — Vehicle / Ramp Equipment Details & Condition Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Serial / Fleet Nr.</Label><Input value={data.vehicle.serialFleetNr} onChange={(e) => set("vehicle", { ...data.vehicle, serialFleetNr: e.target.value })} /></div>
              <div><Label>Type</Label><Input value={data.vehicle.type} onChange={(e) => set("vehicle", { ...data.vehicle, type: e.target.value })} /></div>
              <div><Label>Owner</Label><Input value={data.vehicle.owner} onChange={(e) => set("vehicle", { ...data.vehicle, owner: e.target.value })} /></div>
              <div><Label>Area</Label><Input value={data.vehicle.area} onChange={(e) => set("vehicle", { ...data.vehicle, area: e.target.value })} /></div>
              <div><Label>Age of Vehicle / Ramp Eq.</Label><Input value={data.vehicle.age} onChange={(e) => set("vehicle", { ...data.vehicle, age: e.target.value })} /></div>
              <div><Label>Last Overhaul</Label><Input type="date" value={data.vehicle.lastOverhaul} onChange={(e) => set("vehicle", { ...data.vehicle, lastOverhaul: e.target.value })} /></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500">
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-center">Serviceable</th>
                <th className="px-2 py-2 text-center">Faulty</th>
                <th className="px-2 py-2 text-left">Remarks</th>
              </tr></thead>
              <tbody>
                {data.vehicle.parts.map((p, i) => (
                  <tr key={p.part} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{p.part}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={p.serviceable} onCheckedChange={(v) => {
                        const parts = [...data.vehicle.parts]; parts[i] = { ...p, serviceable: !!v };
                        set("vehicle", { ...data.vehicle, parts });
                      }} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={p.faulty} onCheckedChange={(v) => {
                        const parts = [...data.vehicle.parts]; parts[i] = { ...p, faulty: !!v };
                        set("vehicle", { ...data.vehicle, parts });
                      }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={p.remarks} onChange={(e) => {
                        const parts = [...data.vehicle.parts]; parts[i] = { ...p, remarks: e.target.value };
                        set("vehicle", { ...data.vehicle, parts });
                      }} className="h-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Part 5 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 5 — Details of Personnel Involved</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500">
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Job Title</th>
                <th className="px-2 py-2 text-left">Company</th>
                <th className="px-2 py-2 text-left">Staff Nr.</th>
                <th className="px-2 py-2 text-left">Licence</th>
              </tr></thead>
              <tbody>
                {data.personnel.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1.5 font-mono">{i + 1}</td>
                    {(["name", "jobTitle", "company", "staffNr", "licence"] as const).map((f) => (
                      <td key={f} className="px-2 py-1.5">
                        <Input value={p[f]} onChange={(e) => {
                          const arr = [...data.personnel]; arr[i] = { ...p, [f]: e.target.value };
                          set("personnel", arr);
                        }} className="h-8" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Part 6 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 6 — Conditions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <Label>Weather</Label>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <Checkbox checked={data.useOfficialMet} onCheckedChange={(v) => set("useOfficialMet", !!v)} />
                  Use of official met. report
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {WEATHER.map((w) => (
                  <CheckRow key={w} label={w} checked={data.weather.includes(w)} onChange={() => toggleList("weather", w)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Surface</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {SURFACE.map((s) => (
                  <CheckRow key={s} label={s} checked={data.surface.includes(s)} onChange={() => toggleList("surface", s)} />
                ))}
              </div>
            </div>
            <div>
              <Label>Lighting</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {LIGHTING.map((l) => (
                  <CheckRow key={l} label={l} checked={data.lighting.includes(l)} onChange={() => toggleList("lighting", l)} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div><Label>Visibility (m)</Label><Input type="number" value={data.visibilityM} onChange={(e) => set("visibilityM", e.target.value)} /></div>
              <div><Label>Visibility (km)</Label><Input type="number" value={data.visibilityKm} onChange={(e) => set("visibilityKm", e.target.value)} /></div>
              <div><Label>Wind / gust (kts)</Label><Input value={data.windKts} onChange={(e) => set("windKts", e.target.value)} placeholder="240/15G25" /></div>
              <div><Label>Temperature (°C)</Label><Input type="number" value={data.temperatureC} onChange={(e) => set("temperatureC", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Part 7 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 7 — Contributory Factors</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Major factor (code from checklist below)</Label><Input value={data.contributoryFactorsMajor} onChange={(e) => set("contributoryFactorsMajor", e.target.value)} placeholder="E.d — Deviated from procedure" /></div>
            <div><Label>Other factors</Label><Textarea rows={2} value={data.contributoryFactorsOther} onChange={(e) => set("contributoryFactorsOther", e.target.value)} /></div>
            <div><Label>Which of these contributory factors are normal practice?</Label><Textarea rows={2} value={data.normalPractice} onChange={(e) => set("normalPractice", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Sections 8 / 9 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 8 — Sketch (description) & Part 9 — Narrative</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Sketch description (text)</Label><Textarea rows={3} value={data.sketchNote} onChange={(e) => set("sketchNote", e.target.value)} placeholder="Décrire ou joindre le croquis..." /></div>
            <div><Label>Narrative — what happened</Label><Textarea rows={5} value={data.narrative} onChange={(e) => set("narrative", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Parts 10/11/12 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Parts 10 / 11 / 12 — Findings & Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div><Label>Part 10 — Initial Findings</Label><Textarea rows={5} value={data.initialFindings} onChange={(e) => set("initialFindings", e.target.value)} /></div>
            <div><Label>Part 11 — Initial Action Taken</Label><Textarea rows={5} value={data.initialAction} onChange={(e) => set("initialAction", e.target.value)} /></div>
            <div><Label>Part 12 — Closing Action</Label><Textarea rows={5} value={data.closingAction} onChange={(e) => set("closingAction", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Section III ticklist */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Section III — Contributing Factors Ticklist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {FACTOR_GROUPS.map((g) => {
              const sel = data.factors[g.code];
              return (
                <div key={g.code} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-800">{g.code}. {g.title}</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((it) => (
                      <CheckRow
                        key={it} label={it}
                        checked={sel.selected.includes(it)}
                        onChange={() => {
                          const cur = sel.selected;
                          const nx = cur.includes(it) ? cur.filter((x) => x !== it) : [...cur, it];
                          set("factors", { ...data.factors, [g.code]: { ...sel, selected: nx } });
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-600">Describe how the selected factor contributed to the event</Label>
                    <Textarea rows={2} value={sel.description} onChange={(e) =>
                      set("factors", { ...data.factors, [g.code]: { ...sel, description: e.target.value } })
                    } />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Corrective actions */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Contributing Factors & Associated Corrective Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.correctives.map((c, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label className="text-xs">#{i + 1} Contributing factor</Label>
                  <Input value={c.factor} onChange={(e) => {
                    const arr = [...data.correctives]; arr[i] = { ...c, factor: e.target.value }; set("correctives", arr);
                  }} />
                </div>
                <div className="md:col-span-5">
                  <Label className="text-xs">Corrective action</Label>
                  <Input value={c.action} onChange={(e) => {
                    const arr = [...data.correctives]; arr[i] = { ...c, action: e.target.value }; set("correctives", arr);
                  }} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Owner</Label>
                  <Input value={c.owner} onChange={(e) => {
                    const arr = [...data.correctives]; arr[i] = { ...c, owner: e.target.value }; set("correctives", arr);
                  }} />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Due</Label>
                  <Input type="date" value={c.due} onChange={(e) => {
                    const arr = [...data.correctives]; arr[i] = { ...c, due: e.target.value }; set("correctives", arr);
                  }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Part 13 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Part 13 — Prepared By</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Name (block capitals)</Label><Input value={data.preparedByName} onChange={(e) => set("preparedByName", e.target.value)} /></div>
            <div><Label>Status</Label><Input value={data.preparedByStatus} onChange={(e) => set("preparedByStatus", e.target.value)} /></div>
            <div><Label>Signature (initials)</Label><Input value={data.preparedBySignature} onChange={(e) => set("preparedBySignature", e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="outline" onClick={() => setData(blank())}>
            <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Soumettre par email
          </Button>
        </div>
      </div>

      <SubmitEmailDialog open={open} onOpenChange={setOpen} formType="ahm-650" payload={data} onSent={() => setData(blank())} />
    </PageShell>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}
