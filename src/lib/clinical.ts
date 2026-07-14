// Clinical derivations & colour bands. See PRD §5.2, §8.

export type Band = "ok" | "warn" | "danger" | "info" | "muted";

export function computeBMI(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number | null): { label: string; band: Band } {
  if (bmi == null) return { label: "—", band: "muted" };
  // WHO Asian cut-offs commonly used in India
  if (bmi < 18.5) return { label: "Underweight", band: "info" };
  if (bmi < 23) return { label: "Normal", band: "ok" };
  if (bmi < 25) return { label: "Overweight (at risk)", band: "warn" };
  return { label: "Obese", band: "danger" };
}

export function isObese(bmi: number | null): boolean {
  return bmi != null && bmi >= 25;
}

export function bpCategory(
  sys?: number | null,
  dia?: number | null
): { label: string; band: Band } {
  if (sys == null || dia == null) return { label: "—", band: "muted" };
  if (sys >= 180 || dia >= 120) return { label: "Hypertensive crisis", band: "danger" };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2", band: "danger" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1", band: "warn" };
  if (sys >= 120 && dia < 80) return { label: "Elevated", band: "warn" };
  return { label: "Normal", band: "ok" };
}

export function pulseBand(pulse?: number | null): Band {
  if (pulse == null) return "muted";
  if (pulse < 50 || pulse > 100) return "warn";
  return "ok";
}

export function lvefCategory(lvef?: number | null): { label: string; band: Band } {
  if (lvef == null) return { label: "—", band: "muted" };
  if (lvef >= 50) return { label: "Normal", band: "ok" };
  if (lvef >= 40) return { label: "Mildly reduced", band: "warn" };
  return { label: "Reduced", band: "danger" };
}

// ---- Reference ranges for lab highlighting (adult, general) ----
export type LabRange = { min?: number; max?: number };

export const LAB_RANGES: Record<string, LabRange> = {
  fbs: { min: 70, max: 100 }, // mg/dL fasting
  ppbs: { min: 70, max: 140 },
  hba1c: { max: 5.7 }, // %
  tc: { max: 200 }, // total cholesterol mg/dL
  ldl: { max: 100 },
  hdl: { min: 40 },
  tg: { max: 150 },
  hb: { min: 12, max: 17 }, // g/dL
  creatinine: { min: 0.6, max: 1.3 }, // mg/dL
};

export function labOutOfRange(key: string, value?: number | null): boolean {
  if (value == null) return false;
  const r = LAB_RANGES[key];
  if (!r) return false;
  if (r.min != null && value < r.min) return true;
  if (r.max != null && value > r.max) return true;
  return false;
}

// ---- Symptom / structured intake types ----
export type NYHA = "I" | "II" | "III" | "IV";

export interface SymptomData {
  list: string[]; // canonical symptom keys reported
  chestPain?: {
    character?: string;
    radiation?: string[];
    triggers?: string[];
    relief?: string[];
    severity?: number;
  };
  dyspnoea?: {
    nyha?: NYHA;
    orthopnoea?: boolean;
    pnd?: boolean;
  };
  palpitations?: {
    pattern?: string;
    episodes?: string;
  };
  restChestPain?: boolean; // the red-flag question
}

export interface ReportsData {
  bpSys?: number;
  bpDia?: number;
  pulse?: number;
  fbs?: number;
  ppbs?: number;
  rbs?: number;
  hba1c?: number;
  tc?: number;
  ldl?: number;
  hdl?: number;
  tg?: number;
  hb?: number;
  creatinine?: number;
  ecg?: { done?: boolean; date?: string; finding?: string };
  echo?: { done?: boolean; date?: string; lvef?: number; finding?: string };
  tmt?: { done?: boolean; date?: string; result?: string };
  angio?: { done?: boolean; date?: string; finding?: string };
  other?: string;
}

export interface ConditionsData {
  known?: { name: string; years?: number }[];
}

export interface CardiacHistoryData {
  items?: string[];
  year?: string;
}

export interface LifestyleData {
  smoking?: "NEVER" | "FORMER" | "CURRENT";
  smokingQuitYear?: string;
  cigsPerDay?: string;
  tobacco?: boolean;
  alcohol?: "NEVER" | "OCCASIONAL" | "REGULAR";
  activity?: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE";
  diet?: "VEG" | "NONVEG" | "EGG";
}

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
}

// ---- Risk factor count (HTN, DM, dyslipidaemia, smoking, family history, obesity) ----
export interface RiskFactorInput {
  conditions: ConditionsData;
  lifestyle: LifestyleData;
  familyHistory?: string | null;
  bmi?: number | null;
  reports?: ReportsData;
}

export interface RiskFactors {
  hypertension: boolean;
  diabetes: boolean;
  dyslipidaemia: boolean;
  smoker: boolean;
  familyHistory: boolean;
  obesity: boolean;
  count: number;
}

function hasCondition(conditions: ConditionsData, matcher: RegExp): boolean {
  return (conditions.known ?? []).some((c) => matcher.test(c.name));
}

export function computeRiskFactors(input: RiskFactorInput): RiskFactors {
  const { conditions, lifestyle, familyHistory, bmi, reports } = input;
  const hypertension = hasCondition(conditions, /hypertension|htn|high blood/i);
  const diabetes = hasCondition(conditions, /diabet/i);
  const dyslipidaemia =
    hasCondition(conditions, /cholesterol|lipid|dyslip/i) ||
    labOutOfRange("ldl", reports?.ldl) ||
    labOutOfRange("tc", reports?.tc);
  const smoker = lifestyle.smoking === "CURRENT" || lifestyle.tobacco === true;
  const familyHx = (familyHistory ?? "").toUpperCase() === "YES";
  const obesity = isObese(bmi ?? null);

  const count = [hypertension, diabetes, dyslipidaemia, smoker, familyHx, obesity].filter(
    Boolean
  ).length;

  return {
    hypertension,
    diabetes,
    dyslipidaemia,
    smoker,
    familyHistory: familyHx,
    obesity,
    count,
  };
}

// ---- Red flag evaluation (PRD §16 Q10 default: flag all of these) ----
export interface RedFlagInput {
  symptoms: SymptomData;
  reports?: ReportsData;
}

export interface RedFlagResult {
  redFlag: boolean;
  reasons: string[];
}

export function evaluateRedFlags(input: RedFlagInput): RedFlagResult {
  const reasons: string[] = [];
  const { symptoms, reports } = input;

  if (symptoms.restChestPain) reasons.push("Ongoing / rest chest pain");
  if (symptoms.dyspnoea?.nyha === "IV") reasons.push("NYHA IV breathlessness");
  if (symptoms.list?.includes("syncope")) reasons.push("Fainting (syncope)");
  if (reports?.echo?.lvef != null && reports.echo.lvef < 35)
    reasons.push(`LVEF ${reports.echo.lvef}% (< 35%)`);
  if (reports?.bpSys != null && reports?.bpDia != null && (reports.bpSys > 180 || reports.bpDia > 110))
    reasons.push(`BP ${reports.bpSys}/${reports.bpDia} (> 180/110)`);

  return { redFlag: reasons.length > 0, reasons };
}

// Canonical symptom catalogue (key + label + icon name)
export const SYMPTOMS: { key: string; label: string }[] = [
  { key: "chestPain", label: "Chest pain / discomfort" },
  { key: "dyspnoea", label: "Breathlessness" },
  { key: "palpitations", label: "Palpitations" },
  { key: "dizziness", label: "Dizziness / light-headedness" },
  { key: "syncope", label: "Fainting (syncope)" },
  { key: "oedema", label: "Swelling of feet/ankles" },
  { key: "fatigue", label: "Fatigue / reduced exercise capacity" },
  { key: "cough", label: "Cough (esp. at night)" },
  { key: "claudication", label: "Leg pain on walking (claudication)" },
  { key: "snoring", label: "Snoring / daytime sleepiness" },
];

export const NYHA_LABELS: Record<NYHA, string> = {
  I: "I — Only on heavy exertion",
  II: "II — On ordinary activity (walking / stairs)",
  III: "III — On minimal activity",
  IV: "IV — Even at rest",
};
