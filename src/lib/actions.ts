"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, changePassword } from "@/lib/session";
import { istDayRange } from "@/lib/date";
import type { ApptStatus, IntakeStatus, VisitType } from "@prisma/client";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");
  return session;
}

/* ---------------- Intake / queue status ---------------- */
export async function setIntakeStatus(intakeId: string, status: IntakeStatus) {
  await requireSession();
  await prisma.intake.update({ where: { id: intakeId }, data: { status } });
  revalidatePath("/");
  revalidatePath(`/case/${intakeId}`);
}

/* ---------------- Consultation (doctor only for clinical fields) ---------------- */
export interface ConsultationInput {
  clinicBpSys?: number | null;
  clinicBpDia?: number | null;
  clinicPulse?: number | null;
  spo2?: number | null;
  clinicWeightKg?: number | null;
  diagnosis?: string;
  notes?: string;
  investigationsAdvised?: string[];
  medicationsAdvised?: string;
  nextSteps?: string;
  recommendedFollowUpDate?: string | null; // ISO date
  followUpReason?: string;
  outcome?: string;
}

export async function saveConsultation(
  intakeId: string,
  input: ConsultationInput,
  markConsulted: boolean
) {
  const session = await requireSession();
  if (session.role !== "doctor") {
    throw new Error("Only the doctor can edit clinical notes.");
  }

  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    include: { consultation: true },
  });
  if (!intake) throw new Error("Case not found.");

  const followUpDate = input.recommendedFollowUpDate
    ? new Date(input.recommendedFollowUpDate)
    : null;

  const data = {
    clinicBpSys: input.clinicBpSys ?? null,
    clinicBpDia: input.clinicBpDia ?? null,
    clinicPulse: input.clinicPulse ?? null,
    spo2: input.spo2 ?? null,
    clinicWeightKg: input.clinicWeightKg ?? null,
    diagnosis: input.diagnosis || null,
    notes: input.notes || null,
    investigationsAdvised: (input.investigationsAdvised ?? []) as unknown as object,
    medicationsAdvised: input.medicationsAdvised || null,
    nextSteps: input.nextSteps || null,
    recommendedFollowUpDate: followUpDate,
    followUpReason: input.followUpReason || null,
    outcome: input.outcome || null,
    authoredBy: "doctor",
  };

  const consultation = await prisma.consultation.upsert({
    where: { intakeId },
    create: { intakeId, ...data },
    update: data,
  });

  // Manage the FollowUp record tied to this consultation.
  const existingFollowUp = await prisma.followUp.findFirst({
    where: { consultationId: consultation.id },
  });

  if (followUpDate) {
    const fuData = {
      patientId: intake.patientId,
      consultationId: consultation.id,
      dueDate: followUpDate,
      reason: input.followUpReason || null,
      diagnosis: input.diagnosis || null,
    };
    if (existingFollowUp) {
      await prisma.followUp.update({ where: { id: existingFollowUp.id }, data: fuData });
    } else {
      await prisma.followUp.create({ data: fuData });
    }
  } else if (existingFollowUp) {
    // Doctor cleared the date → remove the follow-up.
    await prisma.followUp.delete({ where: { id: existingFollowUp.id } });
  }

  if (markConsulted) {
    await prisma.intake.update({
      where: { id: intakeId },
      data: { status: "CONSULTED" },
    });
  }

  revalidatePath("/");
  revalidatePath(`/case/${intakeId}`);
  revalidatePath("/followups");
  return { ok: true };
}

/** Autosave draft notes (doctor only) — lighter path, no follow-up side effects. */
export async function autosaveNotes(intakeId: string, notes: string) {
  const session = await getSession();
  if (!session || session.role !== "doctor") return { ok: false };
  await prisma.consultation.upsert({
    where: { intakeId },
    create: { intakeId, notes, authoredBy: "doctor" },
    update: { notes },
  });
  return { ok: true };
}

/* ---------------- Follow-ups ---------------- */
export async function markFollowUpCalled(
  followUpId: string,
  outcome: string,
  callNotes?: string
) {
  await requireSession();
  await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      called: true,
      calledAt: new Date(),
      calledOutcome: outcome,
      callNotes: callNotes || null,
      booked: outcome === "BOOKED",
    },
  });
  revalidatePath("/followups");
}

/* ---------------- Appointments ---------------- */
export interface AppointmentInput {
  name: string;
  phone: string;
  date: string; // ISO date
  timeSlot: string;
  visitType: VisitType;
  notes?: string;
}

export async function addAppointment(input: AppointmentInput) {
  await requireSession();
  if (!input.name?.trim() || !/^\d{10}$/.test(input.phone)) {
    throw new Error("Name and a valid 10-digit phone are required.");
  }
  const patient = await prisma.patient.findFirst({ where: { phone: input.phone } });
  await prisma.appointment.create({
    data: {
      name: input.name.trim(),
      phone: input.phone,
      date: new Date(input.date),
      timeSlot: input.timeSlot,
      visitType: input.visitType,
      notes: input.notes || null,
      patientId: patient?.id ?? null,
    },
  });
  revalidatePath("/appointments");
  revalidatePath("/");
  return { ok: true };
}

export async function setAppointmentStatus(id: string, status: ApptStatus) {
  await requireSession();
  await prisma.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/appointments");
  revalidatePath("/");
}

/** Auto-suggest no-shows at end of day: appts still SCHEDULED for a past-or-today date. */
export async function markAllPendingNoShows() {
  await requireSession();
  const { end } = istDayRange();
  await prisma.appointment.updateMany({
    where: { status: "SCHEDULED", date: { lt: end } },
    data: { status: "NO_SHOW" },
  });
  revalidatePath("/appointments");
  revalidatePath("/");
}

/* ---------------- Settings ---------------- */
export async function changeClinicPassword(current: string, next: string) {
  await requireSession();
  await changePassword(current, next);
  return { ok: true };
}

export async function updateClinicSetting(key: "clinicName" | "doctorName", value: string) {
  await requireSession();
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidatePath("/settings");
  return { ok: true };
}

/* ---------------- Typeahead: find patient by phone ---------------- */
export async function lookupPatientByPhone(phone: string) {
  await requireSession();
  if (!/^\d{4,10}$/.test(phone)) return null;
  const patient = await prisma.patient.findFirst({
    where: { phone: { startsWith: phone } },
    orderBy: { createdAt: "desc" },
  });
  if (!patient) return null;
  return { name: patient.name, phone: patient.phone, id: patient.id };
}
