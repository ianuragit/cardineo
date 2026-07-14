import { prisma } from "@/lib/db";
import { riskFactorsForIntake } from "@/lib/view";
import { VISIT_TYPE_LABEL, STATUS_LABEL } from "@/lib/constants";

export interface ReportRow {
  token: string;
  name: string;
  age: number;
  gender: string;
  visitType: string;
  complaint: string;
  diagnosis: string;
  nextSteps: string;
  followUpDate: string;
  status: string;
}

export interface ReportData {
  counts: {
    filled: number;
    consulted: number;
    walkIns: number;
    appointments: number;
    noShows: number;
    first: number;
    repeat: number;
    followUp: number;
    urgent: number;
    followUpsScheduled: number;
    avgFormToConsultMin: number | null;
  };
  visitTypeBreakdown: { name: string; value: number }[];
  genderBreakdown: { name: string; value: number }[];
  ageBands: { name: string; value: number }[];
  topComplaints: { name: string; value: number }[];
  topDiagnoses: { name: string; value: number }[];
  riskPrevalence: { name: string; value: number }[];
  rows: ReportRow[];
}

const AGE_BANDS = [
  { label: "<30", min: 0, max: 29 },
  { label: "30–44", min: 30, max: 44 },
  { label: "45–59", min: 45, max: 59 },
  { label: "60–74", min: 60, max: 74 },
  { label: "75+", min: 75, max: 200 },
];

function topN(items: string[], n: number) {
  const map = new Map<string, number>();
  for (const it of items) {
    const key = it.trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value }));
}

export async function buildReport(start: Date, end: Date): Promise<ReportData> {
  const [intakes, appointments] = await Promise.all([
    prisma.intake.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { patient: true, consultation: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({ where: { date: { gte: start, lt: end } } }),
  ]);

  const followUpsScheduled = await prisma.followUp.count({
    where: { dueDate: { gte: start, lt: end } },
  });

  const consultedIntakes = intakes.filter((i) => i.status === "CONSULTED");

  // avg form-to-consult (minutes)
  const deltas: number[] = [];
  for (const i of consultedIntakes) {
    if (i.consultation) {
      const d = (i.consultation.createdAt.getTime() - i.createdAt.getTime()) / 60000;
      if (d >= 0 && d < 24 * 60) deltas.push(d);
    }
  }
  const avgFormToConsultMin =
    deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

  const counts = {
    filled: intakes.length,
    consulted: consultedIntakes.length,
    walkIns: intakes.filter((i) => !i.hasAppointment).length,
    appointments: intakes.filter((i) => i.hasAppointment).length,
    noShows: appointments.filter((a) => a.status === "NO_SHOW").length,
    first: intakes.filter((i) => i.visitType === "FIRST").length,
    repeat: intakes.filter((i) => i.visitType === "REPEAT").length,
    followUp: intakes.filter((i) => i.visitType === "FOLLOW_UP").length,
    urgent: intakes.filter((i) => i.redFlag).length,
    followUpsScheduled,
    avgFormToConsultMin,
  };

  const visitTypeBreakdown = [
    { name: "First", value: counts.first },
    { name: "Repeat", value: counts.repeat },
    { name: "Follow-up", value: counts.followUp },
  ].filter((x) => x.value > 0);

  const genderBreakdown = [
    { name: "Male", value: intakes.filter((i) => i.patient.gender === "MALE").length },
    { name: "Female", value: intakes.filter((i) => i.patient.gender === "FEMALE").length },
    { name: "Other", value: intakes.filter((i) => i.patient.gender === "OTHER").length },
  ].filter((x) => x.value > 0);

  const ageBands = AGE_BANDS.map((b) => ({
    name: b.label,
    value: intakes.filter((i) => i.patient.age >= b.min && i.patient.age <= b.max).length,
  }));

  const topComplaints = topN(intakes.map((i) => i.chiefComplaint), 5);
  const topDiagnoses = topN(
    consultedIntakes.map((i) => i.consultation?.diagnosis ?? "").filter(Boolean),
    5
  );

  // risk factor prevalence
  const rf = { HTN: 0, DM: 0, Dyslipidaemia: 0, Smoker: 0, "Family hx": 0, Obesity: 0 };
  for (const i of intakes) {
    const f = riskFactorsForIntake(i);
    if (f.hypertension) rf.HTN++;
    if (f.diabetes) rf.DM++;
    if (f.dyslipidaemia) rf.Dyslipidaemia++;
    if (f.smoker) rf.Smoker++;
    if (f.familyHistory) rf["Family hx"]++;
    if (f.obesity) rf.Obesity++;
  }
  const riskPrevalence = Object.entries(rf).map(([name, value]) => ({ name, value }));

  const rows: ReportRow[] = intakes.map((i) => ({
    token: i.token,
    name: i.patient.name,
    age: i.patient.age,
    gender: i.patient.gender === "MALE" ? "M" : i.patient.gender === "FEMALE" ? "F" : "O",
    visitType: VISIT_TYPE_LABEL[i.visitType] ?? i.visitType,
    complaint: i.chiefComplaint,
    diagnosis: i.consultation?.diagnosis ?? "",
    nextSteps: i.consultation?.nextSteps ?? "",
    followUpDate: i.consultation?.recommendedFollowUpDate
      ? i.consultation.recommendedFollowUpDate.toISOString().slice(0, 10)
      : "",
    status: STATUS_LABEL[i.status] ?? i.status,
  }));

  return {
    counts,
    visitTypeBreakdown,
    genderBreakdown,
    ageBands,
    topComplaints,
    topDiagnoses,
    riskPrevalence,
    rows,
  };
}
