import { prisma } from "@/lib/db";
import { istDayRange } from "@/lib/date";
import {
  computeBMI,
  evaluateRedFlags,
  type SymptomData,
  type ReportsData,
  type ConditionsData,
  type CardiacHistoryData,
  type LifestyleData,
  type Medication,
} from "@/lib/clinical";
import type { Gender, VisitType, Prisma } from "@prisma/client";

export interface IntakePayload {
  // Step 1
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string;
  city?: string;
  locale?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  // Step 2
  visitType: VisitType;
  referredBy?: string;
  lastVisitDate?: string; // ISO
  hasAppointment: boolean;
  // Step 3
  chiefComplaint: string;
  duration: string;
  symptoms: SymptomData;
  // Step 4
  conditions: ConditionsData;
  cardiacHistory: CardiacHistoryData;
  familyHistory?: string;
  lifestyle: LifestyleData;
  heightCm?: number;
  weightKg?: number;
  pregnant?: boolean;
  allergies?: string;
  // Step 5
  medications: Medication[];
  // Step 6
  reports: ReportsData;
  // consent
  consentGiven: boolean;
}

export interface IntakeResult {
  token: string;
  intakeId: string;
  redFlag: boolean;
}

/** Generate the next zero-padded queue token for today (IST). */
async function nextToken(): Promise<string> {
  const { start, end } = istDayRange();
  const count = await prisma.intake.count({
    where: { createdAt: { gte: start, lt: end } },
  });
  return String(count + 1).padStart(3, "0");
}

export async function createIntake(payload: IntakePayload): Promise<IntakeResult> {
  if (!payload.consentGiven) {
    throw new Error("Consent is required to submit the intake form.");
  }

  const bmi = computeBMI(payload.heightCm, payload.weightKg);
  const { redFlag } = evaluateRedFlags({
    symptoms: payload.symptoms,
    reports: payload.reports,
  });

  // Patient matching by phone (PRD §13 matching rule).
  const existing = await prisma.patient.findFirst({
    where: { phone: payload.phone },
    orderBy: { createdAt: "asc" },
  });

  const patient =
    existing ??
    (await prisma.patient.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        email: payload.email || null,
        age: payload.age,
        gender: payload.gender,
        city: payload.city || null,
        emergencyName: payload.emergencyName || null,
        emergencyPhone: payload.emergencyPhone || null,
      },
    }));

  const token = await nextToken();

  const intake = await prisma.intake.create({
    data: {
      patientId: patient.id,
      token,
      visitType: payload.visitType,
      hasAppointment: payload.hasAppointment,
      referredBy: payload.referredBy || null,
      lastVisitDate: payload.lastVisitDate ? new Date(payload.lastVisitDate) : null,
      chiefComplaint: payload.chiefComplaint,
      duration: payload.duration,
      symptoms: payload.symptoms as unknown as Prisma.InputJsonValue,
      redFlag,
      conditions: payload.conditions as unknown as Prisma.InputJsonValue,
      cardiacHistory: payload.cardiacHistory as unknown as Prisma.InputJsonValue,
      familyHistory: payload.familyHistory || null,
      lifestyle: payload.lifestyle as unknown as Prisma.InputJsonValue,
      heightCm: payload.heightCm ?? null,
      weightKg: payload.weightKg ?? null,
      bmi,
      pregnant: payload.pregnant ?? null,
      allergies: payload.allergies || null,
      medications: payload.medications as unknown as Prisma.InputJsonValue,
      reports: payload.reports as unknown as Prisma.InputJsonValue,
      consentGiven: payload.consentGiven,
      locale: payload.locale || "en",
    },
  });

  // Auto-arrive a matching appointment for today (PRD §9).
  if (existing || patient) {
    const { start, end } = istDayRange();
    await prisma.appointment.updateMany({
      where: {
        phone: payload.phone,
        date: { gte: start, lt: end },
        status: "SCHEDULED",
      },
      data: { status: "ARRIVED", patientId: patient.id },
    });
  }

  return { token, intakeId: intake.id, redFlag };
}
