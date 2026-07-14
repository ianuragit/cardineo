import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  HeartPulse,
  Activity,
  ShieldAlert,
  Pill,
  FileText,
  History,
  Stethoscope,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Card, CardHeader, Badge } from "@/components/ui";
import { VisitBadge, StatusBadge } from "@/components/display";
import PrintButton from "@/components/PrintButton";
import { istDateTime, istDate } from "@/lib/date";
import {
  bpCategory,
  bmiCategory,
  lvefCategory,
  pulseBand,
  labOutOfRange,
  NYHA_LABELS,
  SYMPTOMS,
  type Band,
} from "@/lib/clinical";
import {
  asSymptoms,
  asReports,
  asConditions,
  asCardiac,
  asLifestyle,
  asMeds,
  riskFactorsForIntake,
  redFlagReasonsForIntake,
} from "@/lib/view";
import ConsultationPanel from "./ConsultationPanel";

export const dynamic = "force-dynamic";

const bandText: Record<Band, string> = {
  ok: "text-green-700",
  warn: "text-amber-700",
  danger: "text-red-700",
  info: "text-blue-700",
  muted: "text-slate-500",
};

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const canEdit = session?.role === "doctor";

  const intake = await prisma.intake.findUnique({
    where: { id },
    include: { patient: true, consultation: true, attachments: true },
  });
  if (!intake) notFound();

  const patient = intake.patient;
  const symptoms = asSymptoms(intake.symptoms);
  const reports = asReports(intake.reports);
  const conditions = asConditions(intake.conditions);
  const cardiac = asCardiac(intake.cardiacHistory);
  const lifestyle = asLifestyle(intake.lifestyle);
  const meds = asMeds(intake.medications);
  const rf = riskFactorsForIntake(intake);
  const redFlagReasons = redFlagReasonsForIntake(intake);

  const bp = bpCategory(reports.bpSys, reports.bpDia);
  const bmiCat = bmiCategory(intake.bmi);
  const lvef = lvefCategory(reports.echo?.lvef);

  // Previous visits (same phone), excluding this intake.
  const previous = await prisma.intake.findMany({
    where: { patient: { phone: patient.phone }, id: { not: intake.id } },
    include: { consultation: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const sexShort = patient.gender === "MALE" ? "M" : patient.gender === "FEMALE" ? "F" : "O";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between no-print">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={intake.status} />
          <PrintButton />
        </div>
      </div>

      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
              <VisitBadge visitType={intake.visitType} />
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {patient.age} yrs · {sexShort} · <a href={`tel:${patient.phone}`} className="text-accent hover:underline">{patient.phone}</a>
              {patient.city && <> · {patient.city}</>}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div className="text-2xl font-bold text-accent">#{intake.token}</div>
            <div>Filled {istDateTime(intake.createdAt)}</div>
          </div>
        </div>
      </Card>

      {/* Red flag banner */}
      {intake.redFlag && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
          <div>
            <div className="font-bold text-red-700">URGENT — Red flag</div>
            <div className="text-sm text-red-700">{redFlagReasons.join(" · ")}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* LEFT — the case */}
        <div className="space-y-4 lg:col-span-3">
          {/* Vitals & derived */}
          <Card>
            <CardHeader title="Vitals & metrics" icon={<Activity className="h-4 w-4 text-accent" />} />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-slate-100 sm:grid-cols-4">
              <Metric
                label="BP"
                value={reports.bpSys && reports.bpDia ? `${reports.bpSys}/${reports.bpDia}` : "—"}
                sub={bp.label}
                band={bp.band}
              />
              <Metric
                label="Pulse"
                value={reports.pulse ? `${reports.pulse}` : "—"}
                sub={reports.pulse ? "bpm" : ""}
                band={pulseBand(reports.pulse)}
              />
              <Metric label="BMI" value={intake.bmi ? `${intake.bmi}` : "—"} sub={bmiCat.label} band={bmiCat.band} />
              <Metric
                label="LVEF"
                value={reports.echo?.lvef ? `${reports.echo.lvef}%` : "—"}
                sub={lvef.label}
                band={lvef.band}
              />
            </div>
          </Card>

          {/* Chief complaint */}
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HeartPulse className="h-4 w-4 text-accent" /> Chief complaint
            </div>
            <blockquote className="border-l-2 border-accent pl-3 text-slate-800">
              “{intake.chiefComplaint}”
            </blockquote>
            <div className="mt-2 text-sm text-slate-500">Duration: {durationLabel(intake.duration)}</div>
          </Card>

          {/* Symptoms */}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">Symptoms</div>
            {symptoms.list.length === 0 ? (
              <div className="text-sm text-slate-500">No symptoms reported.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {symptoms.list.map((s) => (
                  <Badge key={s} band="info">
                    {SYMPTOMS.find((x) => x.key === s)?.label ?? s}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {symptoms.chestPain && (
                <DetailRow label="Chest pain">
                  {[
                    symptoms.chestPain.character,
                    symptoms.chestPain.radiation?.length
                      ? `radiates to ${symptoms.chestPain.radiation.join(", ")}`
                      : null,
                    symptoms.chestPain.triggers?.length
                      ? `triggered by ${symptoms.chestPain.triggers.join(", ")}`
                      : null,
                    symptoms.chestPain.relief?.length
                      ? `relieved by ${symptoms.chestPain.relief.join(", ")}`
                      : null,
                    symptoms.chestPain.severity ? `severity ${symptoms.chestPain.severity}/10` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </DetailRow>
              )}
              {symptoms.dyspnoea?.nyha && (
                <DetailRow label="Breathlessness">
                  NYHA {NYHA_LABELS[symptoms.dyspnoea.nyha]}
                  {symptoms.dyspnoea.orthopnoea ? " · orthopnoea" : ""}
                  {symptoms.dyspnoea.pnd ? " · PND" : ""}
                </DetailRow>
              )}
              {symptoms.palpitations?.pattern && (
                <DetailRow label="Palpitations">
                  {symptoms.palpitations.pattern}
                  {symptoms.palpitations.episodes ? ` · ${symptoms.palpitations.episodes}` : ""}
                </DetailRow>
              )}
            </div>
          </Card>

          {/* Risk factors */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldAlert className="h-4 w-4 text-accent" /> Risk factors
              </div>
              <Badge band={rf.count >= 3 ? "danger" : rf.count >= 1 ? "warn" : "ok"}>
                {rf.count} of 6
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <RiskChip label="Hypertension" on={rf.hypertension} />
              <RiskChip label="Diabetes" on={rf.diabetes} />
              <RiskChip label="Dyslipidaemia" on={rf.dyslipidaemia} />
              <RiskChip label="Smoker" on={rf.smoker} />
              <RiskChip label="Family history" on={rf.familyHistory} />
              <RiskChip label="Obesity" on={rf.obesity} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Smoking: {smokingLabel(lifestyle)}</span>
              <span>Tobacco: {lifestyle.tobacco ? "Yes" : "No"}</span>
              <span>Alcohol: {titleCase(lifestyle.alcohol)}</span>
              <span>Activity: {titleCase(lifestyle.activity)}</span>
              <span>Diet: {dietLabel(lifestyle.diet)}</span>
              {patient.gender === "FEMALE" && intake.pregnant != null && (
                <span>Pregnant: {intake.pregnant ? "Yes" : "No"}</span>
              )}
            </div>
          </Card>

          {/* Cardiac history & comorbidities */}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">Cardiac history & comorbidities</div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Cardiac: </span>
                {cardiac.items && cardiac.items.length > 0 ? (
                  <span className="text-slate-800">
                    {cardiac.items.join(", ")}
                    {cardiac.year ? ` (${cardiac.year})` : ""}
                  </span>
                ) : (
                  <span className="text-slate-400">None reported</span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Conditions: </span>
                {conditions.known && conditions.known.length > 0 ? (
                  <span className="text-slate-800">
                    {conditions.known
                      .map((c) => (c.years ? `${c.name} (${c.years}y)` : c.name))
                      .join(", ")}
                  </span>
                ) : (
                  <span className="text-slate-400">None reported</span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Family history: </span>
                <span className="text-slate-800">{intake.familyHistory ? titleCase(intake.familyHistory) : "—"}</span>
              </div>
              {intake.allergies && (
                <div>
                  <span className="text-slate-500">Allergies: </span>
                  <span className="font-medium text-red-600">{intake.allergies}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Medications */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Pill className="h-4 w-4 text-accent" /> Current medications
            </div>
            {meds.length === 0 ? (
              <div className="text-sm text-slate-400">None reported.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {meds.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700">
                    <span className="font-medium">{m.name}</span>
                    {m.dose && <span className="text-slate-500">{m.dose}</span>}
                    {m.frequency && <Badge band="muted">{m.frequency}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reports */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-accent" /> Reports & labs
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Lab label="Fasting sugar" k="fbs" v={reports.fbs} unit="mg/dL" />
              <Lab label="PP sugar" k="ppbs" v={reports.ppbs} unit="mg/dL" />
              <Lab label="HbA1c" k="hba1c" v={reports.hba1c} unit="%" />
              <Lab label="Total chol." k="tc" v={reports.tc} unit="mg/dL" />
              <Lab label="LDL" k="ldl" v={reports.ldl} unit="mg/dL" />
              <Lab label="HDL" k="hdl" v={reports.hdl} unit="mg/dL" />
              <Lab label="Triglycerides" k="tg" v={reports.tg} unit="mg/dL" />
              <Lab label="Haemoglobin" k="hb" v={reports.hb} unit="g/dL" />
              <Lab label="Creatinine" k="creatinine" v={reports.creatinine} unit="mg/dL" />
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              {reports.ecg?.done && (
                <TestRow name="ECG" date={reports.ecg.date} detail={reports.ecg.finding} />
              )}
              {reports.echo?.done && (
                <TestRow
                  name="2D Echo"
                  date={reports.echo.date}
                  detail={[reports.echo.lvef ? `LVEF ${reports.echo.lvef}%` : null, reports.echo.finding]
                    .filter(Boolean)
                    .join(" · ")}
                />
              )}
              {reports.tmt?.done && (
                <TestRow name="TMT" date={reports.tmt.date} detail={reports.tmt.result} />
              )}
              {reports.angio?.done && (
                <TestRow name="Angiography" date={reports.angio.date} detail={reports.angio.finding} />
              )}
              {reports.other && (
                <div className="text-slate-600">
                  <span className="font-medium text-slate-700">Other: </span>
                  {reports.other}
                </div>
              )}
            </div>
          </Card>

          {/* Previous visits timeline */}
          {previous.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <History className="h-4 w-4 text-accent" /> Previous visits
                <Badge band="muted">same phone number</Badge>
              </div>
              <ol className="space-y-3 border-l border-slate-200 pl-4">
                {previous.map((p) => (
                  <li key={p.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                    <div className="text-sm font-medium text-slate-800">{istDate(p.createdAt)}</div>
                    <div className="text-sm text-slate-600">
                      {p.consultation?.diagnosis || p.chiefComplaint}
                    </div>
                    {p.consultation?.nextSteps && (
                      <div className="text-xs text-slate-500">Next: {p.consultation.nextSteps}</div>
                    )}
                    {p.consultation?.recommendedFollowUpDate && (
                      <div className="text-xs text-slate-400">
                        Follow-up: {istDate(p.consultation.recommendedFollowUpDate)}
                      </div>
                    )}
                    <Link href={`/case/${p.id}`} className="text-xs text-accent hover:underline no-print">
                      View →
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* RIGHT — consultation panel */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4">
            <Card>
              <CardHeader
                title="Consultation"
                icon={<Stethoscope className="h-4 w-4 text-accent" />}
                action={
                  !canEdit ? <Badge band="muted">Read-only</Badge> : undefined
                }
              />
              <div className="p-4">
                <ConsultationPanel
                  intakeId={intake.id}
                  canEdit={canEdit}
                  status={intake.status}
                  initial={{
                    clinicBpSys: intake.consultation?.clinicBpSys ?? null,
                    clinicBpDia: intake.consultation?.clinicBpDia ?? null,
                    clinicPulse: intake.consultation?.clinicPulse ?? null,
                    spo2: intake.consultation?.spo2 ?? null,
                    clinicWeightKg: intake.consultation?.clinicWeightKg ?? null,
                    diagnosis: intake.consultation?.diagnosis ?? "",
                    notes: intake.consultation?.notes ?? "",
                    investigationsAdvised:
                      (intake.consultation?.investigationsAdvised as string[] | null) ?? [],
                    medicationsAdvised: intake.consultation?.medicationsAdvised ?? "",
                    nextSteps: intake.consultation?.nextSteps ?? "",
                    recommendedFollowUpDate: intake.consultation?.recommendedFollowUpDate
                      ? intake.consultation.recommendedFollowUpDate.toISOString().slice(0, 10)
                      : "",
                    followUpReason: intake.consultation?.followUpReason ?? "",
                    outcome: intake.consultation?.outcome ?? "",
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- small helpers ---------------- */

function Metric({ label, value, sub, band }: { label: string; value: string; sub?: string; band: Band }) {
  return (
    <div className="bg-white p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      {sub && <div className={`text-xs font-medium ${bandText[band]}`}>{sub}</div>}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <span className="font-medium text-slate-700">{label}: </span>
      <span className="text-slate-600">{children}</span>
    </div>
  );
}

function RiskChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={
        on
          ? "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          : "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400"
      }
    >
      {label}
    </span>
  );
}

function Lab({ label, k, v, unit }: { label: string; k: string; v?: number; unit: string }) {
  const out = labOutOfRange(k, v);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${out ? "text-red-600" : v != null ? "text-slate-800" : "text-slate-300"}`}>
        {v != null ? `${v}` : "—"}
        {v != null && <span className="ml-0.5 text-[10px] font-normal text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

function TestRow({ name, date, detail }: { name: string; date?: string; detail?: string | null }) {
  return (
    <div className="text-slate-600">
      <span className="font-medium text-slate-700">{name}</span>
      {date && <span className="text-slate-400"> · {date}</span>}
      {detail && <>: {detail}</>}
    </div>
  );
}

function durationLabel(d: string) {
  const map: Record<string, string> = {
    "<24h": "< 24 hours",
    "1-7d": "1–7 days",
    "1-4w": "1–4 weeks",
    "1-6m": "1–6 months",
    ">6m": "> 6 months",
  };
  return map[d] ?? d;
}

function titleCase(s?: string | null) {
  if (!s) return "—";
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function smokingLabel(l: { smoking?: string; smokingQuitYear?: string; cigsPerDay?: string }) {
  if (l.smoking === "NEVER") return "Never";
  if (l.smoking === "FORMER") return `Former${l.smokingQuitYear ? ` (quit ${l.smokingQuitYear})` : ""}`;
  if (l.smoking === "CURRENT") return `Current${l.cigsPerDay ? ` (${l.cigsPerDay}/day)` : ""}`;
  return "—";
}

function dietLabel(d?: string) {
  const map: Record<string, string> = { VEG: "Vegetarian", NONVEG: "Non-veg", EGG: "Eggetarian" };
  return d ? map[d] ?? d : "—";
}
