// Shared option catalogues used across intake + portal. See PRD §5, §8.

export const REFERRED_BY = [
  "Self",
  "GP",
  "Physician",
  "Another specialist",
  "Family or friend",
  "Online",
  "Camp",
] as const;

export const DURATION_OPTIONS = [
  { value: "<24h", label: "< 24 hours" },
  { value: "1-7d", label: "1–7 days" },
  { value: "1-4w", label: "1–4 weeks" },
  { value: "1-6m", label: "1–6 months" },
  { value: ">6m", label: "> 6 months" },
] as const;

export const CHEST_PAIN_CHARACTER = [
  "Pressure / heaviness",
  "Burning",
  "Sharp / stabbing",
  "Tightness",
  "Other",
] as const;

export const RADIATION = ["Left arm", "Right arm", "Jaw / neck", "Back", "None"] as const;
export const TRIGGERS = ["Exertion", "At rest", "Emotion / stress", "After meals", "Cold"] as const;
export const RELIEF = ["Rest", "Medication (e.g. sorbitrate)", "Antacid", "Nothing"] as const;
export const PALPITATION_PATTERN = [
  "Fast & regular",
  "Fast & irregular",
  "Skipped beats",
  "Not sure",
] as const;

export const KNOWN_CONDITIONS = [
  "Hypertension",
  "Diabetes (Type 1)",
  "Diabetes (Type 2)",
  "High cholesterol",
  "Thyroid disorder",
  "Kidney disease",
  "Asthma / COPD",
  "Prior stroke / TIA",
  "Sleep apnoea",
] as const;

export const CARDIAC_HISTORY = [
  "Heart attack (MI)",
  "Angioplasty / Stent",
  "Bypass surgery (CABG)",
  "Heart failure",
  "Atrial fibrillation / arrhythmia",
  "Valve disease",
  "Rheumatic heart disease",
  "Pacemaker / ICD",
  "Congenital heart disease",
] as const;

export const COMMON_CARDIAC_DRUGS = [
  "Aspirin",
  "Clopidogrel",
  "Atorvastatin",
  "Rosuvastatin",
  "Metoprolol",
  "Telmisartan",
  "Losartan",
  "Amlodipine",
  "Ramipril",
  "Metformin",
  "Furosemide",
  "Warfarin",
  "Apixaban",
  "Pantoprazole",
] as const;

export const DIAGNOSIS_CHIPS = [
  "CAD / IHD",
  "Hypertension",
  "Heart failure",
  "Arrhythmia / AF",
  "Valvular disease",
  "Dyslipidaemia",
  "Non-cardiac chest pain",
  "Preventive check-up",
] as const;

export const INVESTIGATIONS = [
  "ECG",
  "2D Echo",
  "TMT",
  "Holter",
  "Lipid profile",
  "HbA1c",
  "CBC",
  "KFT",
  "Chest X-ray",
  "Angiography",
] as const;

export const CONSULT_OUTCOMES = [
  "Consulted",
  "Referred out",
  "Advised admission",
  "Emergency",
] as const;

export const CALL_OUTCOMES = [
  { value: "REACHED", label: "Reached" },
  { value: "NOT_REACHABLE", label: "Not reachable" },
  { value: "BOOKED", label: "Appointment booked" },
  { value: "DECLINED", label: "Declined" },
] as const;

export const FREQUENCIES = ["OD", "BD", "TDS", "SOS", "HS", "Weekly"] as const;

export const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
] as const;

export const FOLLOWUP_QUICK = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
] as const;

export const VISIT_TYPE_LABEL: Record<string, string> = {
  FIRST: "First visit",
  REPEAT: "Repeat visit",
  FOLLOW_UP: "Follow-up",
};

export const STATUS_LABEL: Record<string, string> = {
  WAITING: "Waiting",
  IN_CONSULT: "In consult",
  CONSULTED: "Consulted",
  NO_SHOW: "No-show",
};

export const APPT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  ARRIVED: "Arrived",
  CONSULTED: "Consulted",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};
