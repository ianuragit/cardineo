import {
  computeRiskFactors,
  evaluateRedFlags,
  type SymptomData,
  type ReportsData,
  type ConditionsData,
  type CardiacHistoryData,
  type LifestyleData,
  type Medication,
  type RiskFactors,
} from "@/lib/clinical";
import type { Intake } from "@prisma/client";

export function asSymptoms(v: unknown): SymptomData {
  const o = (v ?? {}) as Partial<SymptomData>;
  return { list: o.list ?? [], ...o } as SymptomData;
}
export function asReports(v: unknown): ReportsData {
  return (v ?? {}) as ReportsData;
}
export function asConditions(v: unknown): ConditionsData {
  return (v ?? {}) as ConditionsData;
}
export function asCardiac(v: unknown): CardiacHistoryData {
  return (v ?? {}) as CardiacHistoryData;
}
export function asLifestyle(v: unknown): LifestyleData {
  return (v ?? {}) as LifestyleData;
}
export function asMeds(v: unknown): Medication[] {
  return Array.isArray(v) ? (v as Medication[]) : [];
}

export function riskFactorsForIntake(intake: Intake): RiskFactors {
  return computeRiskFactors({
    conditions: asConditions(intake.conditions),
    lifestyle: asLifestyle(intake.lifestyle),
    familyHistory: intake.familyHistory,
    bmi: intake.bmi,
    reports: asReports(intake.reports),
  });
}

export function redFlagReasonsForIntake(intake: Intake): string[] {
  return evaluateRedFlags({
    symptoms: asSymptoms(intake.symptoms),
    reports: asReports(intake.reports),
  }).reasons;
}

/** Short flag chips for the queue row (URGENT + top risk factors). */
export function queueFlags(intake: Intake): { urgent: boolean; chips: string[] } {
  const rf = riskFactorsForIntake(intake);
  const chips: string[] = [];
  if (rf.hypertension) chips.push("HTN");
  if (rf.diabetes) chips.push("DM");
  if (rf.dyslipidaemia) chips.push("Dyslipidaemia");
  if (rf.smoker) chips.push("Smoker");
  if (rf.familyHistory) chips.push("Family hx");
  if (rf.obesity) chips.push("Obese");
  return { urgent: intake.redFlag, chips };
}
