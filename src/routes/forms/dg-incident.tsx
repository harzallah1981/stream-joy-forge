import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitEmailDialog } from "@/components/submit-email-dialog";
import { Send, RotateCcw, AlertTriangle } from "lucide-react";
import { iataDgrEdition } from "@/lib/iata";

export const Route = createFileRoute("/forms/dg-incident")({
  head: () => ({ meta: [{ title: "DG Incident / Accident Report — IATA DGR" }] }),
  component: () => <InternalOnly><Form /></InternalOnly>,
});

// 32 numbered fields, taken directly from the DG report template.
const blank = () => ({
  reportType: "incident" as "accident" | "incident" | "other",
  reportTypeOther: "",
  // 1-3
  airline: "Tunisair",
  date: new Date().toISOString().slice(0, 10),
  timeLocal: "",
  // 4-5
  flightDate: "",
  flightNumber: "",
  // 6-7
  departureAirport: "",
  destinationAirport: "",
  // 8-9
  aircraftType: "",
  aircraftReg: "",
  // 10-11
  incidentLocation: "",
  goodsOrigin: "",
  // 12
  description: "",
  // 13-14
  shippingName: "",
  unId: "",
  // 15-18
  classDivision: "",
  subsidiaryRisk: "",
  packagingGroup: "",
  categoryClass7: "",
  // 19-22
  packagingType: "",
  unMarking: "",
  numberOfPackages: "",
  quantity: "",
  // 23
  awbNumber: "",
  // 24-25
  shipperNameAddress: "",
  consigneeNameAddress: "",
  // 26
  otherInfo: "",
  // 27-32
  editorName: "",
  editorPhone: "",
  departmentCode: "",
  editorRef: "",
  address: "",
  signatureDate: new Date().toISOString().slice(0, 10),
  editorSignature: "",
});

type Data = ReturnType<typeof blank>;

function Form() {
  const [data, setData] = useState<Data>(blank());
  const [open, setOpen] = useState(false);
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <PageShell
      title="DG Incident / Accident Report"
      subtitle={iataDgrEdition().label}
    >
      <div className="space-y-5">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Un rapport initial doit être complété et transmis dans les <b>72 heures</b> suivant
            l'événement. Conservez tous les colis, documents et emballages tant que le rapport initial
            n'est pas finalisé. Le rapport est normalement transmis à l'autorité compétente.
          </div>
        </div>

        {/* Report type */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Type de rapport / Report type</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {(["accident", "incident", "other"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="rtype" checked={data.reportType === t} onChange={() => set("reportType", t)} />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
              {data.reportType === "other" && (
                <Input className="h-8 max-w-xs" placeholder="Préciser..." value={data.reportTypeOther} onChange={(e) => set("reportTypeOther", e.target.value)} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 1-11 Identification */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Identification de l'événement (1-11)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <F n={1} label="Airline"><Input value={data.airline} onChange={(e) => set("airline", e.target.value)} /></F>
            <F n={2} label="Date du rapport"><Input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} /></F>
            <F n={3} label="Heure (locale)"><Input type="time" value={data.timeLocal} onChange={(e) => set("timeLocal", e.target.value)} /></F>
            <F n={4} label="Flight date"><Input type="date" value={data.flightDate} onChange={(e) => set("flightDate", e.target.value)} /></F>
            <F n={5} label="Flight number"><Input value={data.flightNumber} onChange={(e) => set("flightNumber", e.target.value)} placeholder="TU 712" /></F>
            <div />
            <F n={6} label="Departure airport"><Input value={data.departureAirport} onChange={(e) => set("departureAirport", e.target.value)} placeholder="TUN" /></F>
            <F n={7} label="Destination airport"><Input value={data.destinationAirport} onChange={(e) => set("destinationAirport", e.target.value)} placeholder="CDG" /></F>
            <div />
            <F n={8} label="Aircraft type"><Input value={data.aircraftType} onChange={(e) => set("aircraftType", e.target.value)} placeholder="A320" /></F>
            <F n={9} label="Aircraft registration"><Input value={data.aircraftReg} onChange={(e) => set("aircraftReg", e.target.value)} placeholder="TS-IMW" /></F>
            <div />
            <F n={10} label="Location of incident" className="md:col-span-2"><Input value={data.incidentLocation} onChange={(e) => set("incidentLocation", e.target.value)} placeholder="Soute avant, stand B12" /></F>
            <F n={11} label="Origin of goods"><Input value={data.goodsOrigin} onChange={(e) => set("goodsOrigin", e.target.value)} /></F>
          </CardContent>
        </Card>

        {/* 12 Description */}
        <Card>
          <CardHeader><CardTitle className="text-primary">12 — Description de l'incident (blessures, dommages)</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={5} value={data.description} onChange={(e) => set("description", e.target.value)} />
          </CardContent>
        </Card>

        {/* 13-22 Goods */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Marchandise dangereuse (13-22)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <F n={13} label="Shipping designation (technical name)" className="md:col-span-2"><Input value={data.shippingName} onChange={(e) => set("shippingName", e.target.value)} /></F>
            <F n={14} label="UN / ID (if known)"><Input value={data.unId} onChange={(e) => set("unId", e.target.value)} placeholder="UN 1950" /></F>
            <F n={15} label="Class / Division"><Input value={data.classDivision} onChange={(e) => set("classDivision", e.target.value)} placeholder="2.1" /></F>
            <F n={16} label="Subsidiary risk"><Input value={data.subsidiaryRisk} onChange={(e) => set("subsidiaryRisk", e.target.value)} /></F>
            <F n={17} label="Packaging group"><Input value={data.packagingGroup} onChange={(e) => set("packagingGroup", e.target.value)} placeholder="I / II / III" /></F>
            <F n={18} label="Category (class 7 only)"><Input value={data.categoryClass7} onChange={(e) => set("categoryClass7", e.target.value)} /></F>
            <F n={19} label="Packaging type"><Input value={data.packagingType} onChange={(e) => set("packagingType", e.target.value)} /></F>
            <F n={20} label="UN marking"><Input value={data.unMarking} onChange={(e) => set("unMarking", e.target.value)} /></F>
            <F n={21} label="Number of packages"><Input type="number" value={data.numberOfPackages} onChange={(e) => set("numberOfPackages", e.target.value)} /></F>
            <F n={22} label="Quantity (or transport index if RRY)" className="md:col-span-2"><Input value={data.quantity} onChange={(e) => set("quantity", e.target.value)} /></F>
          </CardContent>
        </Card>

        {/* 23-26 */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Documentation & parties (23-26)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <F n={23} label="LTA / AWB Number"><Input value={data.awbNumber} onChange={(e) => set("awbNumber", e.target.value)} /></F>
            <F n={24} label="Sender's name and address"><Textarea rows={2} value={data.shipperNameAddress} onChange={(e) => set("shipperNameAddress", e.target.value)} /></F>
            <F n={25} label="Consignee's name and address"><Textarea rows={2} value={data.consigneeNameAddress} onChange={(e) => set("consigneeNameAddress", e.target.value)} /></F>
            <F n={26} label="Other important information (suspected causes & actions taken)">
              <Textarea rows={4} value={data.otherInfo} onChange={(e) => set("otherInfo", e.target.value)} />
            </F>
          </CardContent>
        </Card>

        {/* 27-32 Editor */}
        <Card>
          <CardHeader><CardTitle className="text-primary">Editor / Reporting officer (27-32)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F n={27} label="Name and position of editor"><Input value={data.editorName} onChange={(e) => set("editorName", e.target.value)} /></F>
            <F n={28} label="Phone"><Input value={data.editorPhone} onChange={(e) => set("editorPhone", e.target.value)} /></F>
            <F n={29} label="Company / department code, email, etc."><Input value={data.departmentCode} onChange={(e) => set("departmentCode", e.target.value)} /></F>
            <F n={30} label="Editor reference"><Input value={data.editorRef} onChange={(e) => set("editorRef", e.target.value)} /></F>
            <F n={31} label="Address" className="md:col-span-2"><Textarea rows={2} value={data.address} onChange={(e) => set("address", e.target.value)} /></F>
            <F n={32} label="Date"><Input type="date" value={data.signatureDate} onChange={(e) => set("signatureDate", e.target.value)} /></F>
            <F n={32} label="Signature (initiales)"><Input value={data.editorSignature} onChange={(e) => set("editorSignature", e.target.value)} /></F>
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

      <SubmitEmailDialog open={open} onOpenChange={setOpen} formType="dg-incident" payload={data} onSent={() => setData(blank())} />
    </PageShell>
  );
}

function F({ n, label, children, className }: { n: number; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="flex items-center gap-1.5">
        <span className="inline-grid h-5 min-w-5 place-items-center rounded bg-blue-100 px-1 text-[10px] font-bold text-blue-700">{n}</span>
        <span>{label}</span>
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
