/**
 * CardioIntake seed — realistic demo data (PRD §15).
 * Run: npm run seed   |   Wipe + reseed: npm run seed:reset
 */
import { PrismaClient, type Gender, type VisitType, type IntakeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeBMI, evaluateRedFlags } from "../src/lib/clinical";

const prisma = new PrismaClient();

// ---- deterministic RNG so reseeds are reproducible ----
let _seed = 1234567;
function rng() {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function chance(p: number) {
  return rng() < p;
}
function int(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---- day math (IST-ish; seed data doesn't need exact boundaries) ----
const IST_OFFSET = (5 * 60 + 30) * 60000;
function todayIstMidnightUtc(): Date {
  const nowIst = new Date(Date.now() + IST_OFFSET);
  const ms = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  return new Date(ms - IST_OFFSET);
}
function dayOffset(days: number, hour = 10, minute = 0): Date {
  const base = todayIstMidnightUtc();
  return new Date(base.getTime() + days * 86400000 + (hour * 60 + minute) * 60000 - 0);
}

// ---- name pools ----
const MALE_FIRST = ["Ramesh", "Suresh", "Rajesh", "Anil", "Vijay", "Prakash", "Mohan", "Deepak", "Sanjay", "Arun", "Kiran", "Nitin", "Ashok", "Ravi", "Sunil", "Manoj", "Yogesh", "Girish", "Harish", "Vikram"];
const FEMALE_FIRST = ["Sunita", "Anita", "Meena", "Lata", "Kavita", "Rekha", "Sushma", "Poonam", "Neha", "Priya", "Asha", "Geeta", "Sarla", "Vandana", "Shobha", "Manisha", "Nisha", "Radha", "Seema", "Usha"];
const LAST = ["Iyer", "Sharma", "Patil", "Deshmukh", "Kulkarni", "Nair", "Reddy", "Gupta", "Joshi", "Mehta", "Shah", "Rao", "Menon", "Bhat", "Naik", "Kumar", "Verma", "Agarwal", "Chavan", "Pillai"];
const CITIES = ["Andheri", "Bandra", "Dadar", "Thane", "Powai", "Borivali", "Chembur", "Vashi", "Kurla", "Goregaon"];

function phone() {
  return `9${int(100000000, 999999999)}`.slice(0, 10);
}

// ---- clinical scenario templates ----
interface Scenario {
  complaint: string;
  duration: string;
  symptoms: any;
  conditions: { name: string; years?: number }[];
  cardiac: string[];
  cardiacYear?: string;
  family: string;
  reports: any;
  meds: { name: string; dose: string; frequency: string }[];
  diagnosis: string;
  nextSteps: string;
  investigations: string[];
  medsAdvised: string;
  visitBias?: VisitType;
}

const SCENARIOS: Scenario[] = [
  {
    complaint: "Chest heaviness while walking, relieved by rest",
    duration: "1-4w",
    symptoms: {
      list: ["chestPain", "fatigue"],
      chestPain: { character: "Pressure / heaviness", radiation: ["Left arm"], triggers: ["Exertion"], relief: ["Rest"], severity: 6 },
      restChestPain: false,
    },
    conditions: [{ name: "Hypertension", years: 8 }, { name: "Diabetes (Type 2)", years: 5 }],
    cardiac: [],
    family: "YES",
    reports: { bpSys: 148, bpDia: 92, pulse: 82, fbs: 138, hba1c: 7.8, tc: 224, ldl: 148, hdl: 38, tg: 190, ecg: { done: true, date: "2026-07-01", finding: "T-wave inversion in V4-V6" } },
    meds: [{ name: "Telmisartan", dose: "40 mg", frequency: "OD" }, { name: "Metformin", dose: "500 mg", frequency: "BD" }],
    diagnosis: "CAD / IHD",
    nextSteps: "Start Rosuvastatin 20 mg OD, TMT, review in 2 weeks",
    investigations: ["TMT", "2D Echo", "Lipid profile"],
    medsAdvised: "Add Rosuvastatin 20 mg OD, Aspirin 75 mg OD",
  },
  {
    complaint: "Breathless on climbing one flight of stairs, swelling of feet",
    duration: "1-6m",
    symptoms: {
      list: ["dyspnoea", "oedema", "fatigue"],
      dyspnoea: { nyha: "III", orthopnoea: true, pnd: true },
      restChestPain: false,
    },
    conditions: [{ name: "Hypertension", years: 12 }],
    cardiac: ["Heart failure"],
    cardiacYear: "2024",
    family: "NO",
    reports: { bpSys: 132, bpDia: 84, pulse: 96, hb: 11.8, creatinine: 1.4, echo: { done: true, date: "2026-06-20", lvef: 32, finding: "Global hypokinesia, dilated LV" } },
    meds: [{ name: "Furosemide", dose: "40 mg", frequency: "OD" }, { name: "Ramipril", dose: "5 mg", frequency: "OD" }],
    diagnosis: "Heart failure",
    nextSteps: "Optimise GDMT, add Dapagliflozin, daily weight chart, review in 1 week",
    investigations: ["2D Echo", "KFT", "CBC"],
    medsAdvised: "Add Dapagliflozin 10 mg OD, up-titrate beta-blocker",
    visitBias: "FOLLOW_UP",
  },
  {
    complaint: "Fast irregular heartbeat episodes, few times a week",
    duration: ">6m",
    symptoms: {
      list: ["palpitations", "dizziness"],
      palpitations: { pattern: "Fast & irregular", episodes: "2-3 times a week, 10-20 min" },
      restChestPain: false,
    },
    conditions: [{ name: "Thyroid disorder", years: 3 }],
    cardiac: ["Atrial fibrillation / arrhythmia"],
    family: "DONT_KNOW",
    reports: { bpSys: 128, bpDia: 78, pulse: 110, ecg: { done: true, date: "2026-07-05", finding: "Atrial fibrillation, rate 110" } },
    meds: [{ name: "Metoprolol", dose: "25 mg", frequency: "BD" }],
    diagnosis: "Arrhythmia / AF",
    nextSteps: "Start Apixaban 5 mg BD, Holter, TSH, review in 2 weeks",
    investigations: ["Holter", "2D Echo", "HbA1c"],
    medsAdvised: "Start Apixaban 5 mg BD; continue rate control",
  },
  {
    complaint: "Routine review after angioplasty, doing well",
    duration: ">6m",
    symptoms: { list: [], restChestPain: false },
    conditions: [{ name: "Hypertension", years: 6 }, { name: "High cholesterol", years: 6 }],
    cardiac: ["Angioplasty / Stent"],
    cardiacYear: "2023",
    family: "YES",
    reports: { bpSys: 124, bpDia: 76, pulse: 68, ldl: 62, tc: 140, hdl: 44, tg: 120 },
    meds: [{ name: "Aspirin", dose: "75 mg", frequency: "OD" }, { name: "Atorvastatin", dose: "40 mg", frequency: "OD" }, { name: "Clopidogrel", dose: "75 mg", frequency: "OD" }],
    diagnosis: "CAD / IHD",
    nextSteps: "Continue DAPT, lipid target met, review in 3 months",
    investigations: ["Lipid profile"],
    medsAdvised: "Continue current medications",
    visitBias: "FOLLOW_UP",
  },
  {
    complaint: "Sharp chest pain when pressing, worried about heart",
    duration: "1-7d",
    symptoms: {
      list: ["chestPain"],
      chestPain: { character: "Sharp / stabbing", radiation: ["None"], triggers: ["At rest"], relief: ["Nothing"], severity: 3 },
      restChestPain: false,
    },
    conditions: [],
    cardiac: [],
    family: "NO",
    reports: { bpSys: 118, bpDia: 74, pulse: 72, ecg: { done: true, date: "2026-07-10", finding: "Normal ECG" } },
    meds: [],
    diagnosis: "Non-cardiac chest pain",
    nextSteps: "Reassure, musculoskeletal cause, antacid trial, SOS review",
    investigations: ["ECG"],
    medsAdvised: "Pantoprazole 40 mg OD x 2 weeks",
  },
  {
    complaint: "Blood pressure check, no complaints",
    duration: ">6m",
    symptoms: { list: [], restChestPain: false },
    conditions: [{ name: "Hypertension", years: 4 }],
    cardiac: [],
    family: "NO",
    reports: { bpSys: 138, bpDia: 88, pulse: 76, hba1c: 5.9 },
    meds: [{ name: "Amlodipine", dose: "5 mg", frequency: "OD" }],
    diagnosis: "Hypertension",
    nextSteps: "Continue Amlodipine, home BP monitoring, review in 1 month",
    investigations: ["Lipid profile", "KFT"],
    medsAdvised: "Continue Amlodipine 5 mg OD",
  },
  {
    complaint: "Severe chest pain right now, sweating",
    duration: "<24h",
    symptoms: {
      list: ["chestPain", "dyspnoea"],
      chestPain: { character: "Pressure / heaviness", radiation: ["Left arm", "Jaw / neck"], triggers: ["At rest"], relief: ["Nothing"], severity: 9 },
      dyspnoea: { nyha: "IV", orthopnoea: false, pnd: false },
      restChestPain: true,
    },
    conditions: [{ name: "Diabetes (Type 2)", years: 10 }, { name: "Hypertension", years: 10 }],
    cardiac: [],
    family: "YES",
    reports: { bpSys: 168, bpDia: 104, pulse: 104 },
    meds: [{ name: "Metformin", dose: "1000 mg", frequency: "BD" }],
    diagnosis: "CAD / IHD",
    nextSteps: "Emergency — shift to cath lab, load DAPT, urgent angiography",
    investigations: ["ECG", "Angiography"],
    medsAdvised: "Aspirin 325 mg + Clopidogrel 300 mg stat, Atorvastatin 80 mg",
  },
];

function buildIntakePayload(scn: Scenario, patient: { age: number; gender: Gender }) {
  const heightCm = int(150, 178);
  const weightKg = int(55, 92);
  const bmi = computeBMI(heightCm, weightKg);
  const lifestyle = {
    smoking: pick(["NEVER", "NEVER", "FORMER", "CURRENT"]),
    tobacco: chance(0.2),
    alcohol: pick(["NEVER", "OCCASIONAL", "REGULAR"]),
    activity: pick(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE"]),
    diet: pick(["VEG", "NONVEG", "EGG"]),
    cigsPerDay: "10",
  };
  const { redFlag } = evaluateRedFlags({ symptoms: scn.symptoms, reports: scn.reports });
  return {
    heightCm,
    weightKg,
    bmi,
    lifestyle,
    redFlag,
    symptoms: scn.symptoms,
    conditions: { known: scn.conditions },
    cardiacHistory: { items: scn.cardiac, year: scn.cardiacYear },
    familyHistory: scn.family,
    reports: scn.reports,
    medications: scn.meds,
    chiefComplaint: scn.complaint,
    duration: scn.duration,
    allergies: chance(0.15) ? "Penicillin" : null,
    pregnant: patient.gender === "FEMALE" && patient.age <= 50 ? false : null,
  };
}

async function reset() {
  console.log("Wiping existing data…");
  await prisma.followUp.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.setting.deleteMany();
}

async function main() {
  const doReset = process.argv.includes("--reset");
  if (doReset) await reset();

  const existing = await prisma.patient.count();
  if (existing > 0 && !doReset) {
    console.log(`Database already has ${existing} patients. Use "npm run seed:reset" to wipe & reseed.`);
    return;
  }

  // Settings (default demo password)
  const passwordHash = bcrypt.hashSync("cardineo123", 10);
  await prisma.setting.upsert({
    where: { key: "passwordHash" },
    create: { key: "passwordHash", value: passwordHash },
    update: { value: passwordHash },
  });
  await prisma.setting.upsert({
    where: { key: "clinicName" },
    create: { key: "clinicName", value: "Cardineo Heart Clinic" },
    update: { value: "Cardineo Heart Clinic" },
  });

  // ---- 40 patients ----
  const patients: { id: string; age: number; gender: Gender; name: string; phone: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const gender: Gender = chance(0.55) ? "MALE" : "FEMALE";
    const first = gender === "MALE" ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const name = `${first} ${pick(LAST)}`;
    const age = int(28, 82);
    const p = await prisma.patient.create({
      data: {
        name,
        age,
        gender,
        phone: phone(),
        email: chance(0.4) ? `${first.toLowerCase()}@example.com` : null,
        city: pick(CITIES),
        emergencyName: chance(0.5) ? `${pick(MALE_FIRST)} ${pick(LAST)}` : null,
        emergencyPhone: chance(0.5) ? phone() : null,
      },
    });
    patients.push({ id: p.id, age, gender, name, phone: p.phone });
  }
  console.log(`Created ${patients.length} patients`);

  // helper to create an intake for a patient with a scenario at a given time
  async function makeIntake(opts: {
    patient: (typeof patients)[number];
    scn: Scenario;
    createdAt: Date;
    token: string;
    status: IntakeStatus;
    visitType?: VisitType;
    hasAppointment?: boolean;
    withConsult?: boolean;
    followUpDate?: Date | null;
    followUpReason?: string;
    called?: boolean;
  }) {
    const d = buildIntakePayload(opts.scn, opts.patient);
    const visitType = opts.visitType ?? opts.scn.visitBias ?? pick<VisitType>(["FIRST", "REPEAT", "FOLLOW_UP"]);
    const intake = await prisma.intake.create({
      data: {
        patientId: opts.patient.id,
        token: opts.token,
        visitType,
        hasAppointment: opts.hasAppointment ?? chance(0.6),
        referredBy: pick(["Self", "GP", "Physician", "Family or friend"]),
        chiefComplaint: d.chiefComplaint,
        duration: d.duration,
        symptoms: d.symptoms,
        redFlag: d.redFlag,
        conditions: d.conditions,
        cardiacHistory: d.cardiacHistory,
        familyHistory: d.familyHistory,
        lifestyle: d.lifestyle,
        heightCm: d.heightCm,
        weightKg: d.weightKg,
        bmi: d.bmi,
        pregnant: d.pregnant,
        allergies: d.allergies,
        medications: d.medications,
        reports: d.reports,
        status: opts.status,
        consentGiven: true,
        createdAt: opts.createdAt,
      },
    });

    if (opts.withConsult) {
      const consult = await prisma.consultation.create({
        data: {
          intakeId: intake.id,
          clinicBpSys: d.reports.bpSys ?? int(110, 160),
          clinicBpDia: d.reports.bpDia ?? int(70, 100),
          clinicPulse: d.reports.pulse ?? int(60, 100),
          spo2: int(95, 99),
          diagnosis: opts.scn.diagnosis,
          notes: `${opts.scn.complaint}. ${opts.scn.nextSteps}`,
          investigationsAdvised: opts.scn.investigations,
          medicationsAdvised: opts.scn.medsAdvised,
          nextSteps: opts.scn.nextSteps,
          recommendedFollowUpDate: opts.followUpDate ?? null,
          followUpReason: opts.followUpReason ?? null,
          outcome: opts.scn.diagnosis === "CAD / IHD" && d.redFlag ? "Emergency" : "Consulted",
          authoredBy: "doctor",
          createdAt: new Date(opts.createdAt.getTime() + int(20, 90) * 60000),
        },
      });

      if (opts.followUpDate) {
        await prisma.followUp.create({
          data: {
            patientId: opts.patient.id,
            consultationId: consult.id,
            dueDate: opts.followUpDate,
            reason: opts.followUpReason ?? opts.scn.nextSteps.slice(0, 60),
            diagnosis: opts.scn.diagnosis,
            called: opts.called ?? false,
            calledAt: opts.called ? new Date() : null,
            calledOutcome: opts.called ? pick(["REACHED", "BOOKED"]) : null,
            booked: opts.called ? chance(0.5) : false,
          },
        });
      }
    }

    return intake;
  }

  // ---- Today's intakes (~25) ----
  // 8 waiting, 2 in consult, 13 consulted, 2 no-show; 1-2 urgent
  const todayStatuses: IntakeStatus[] = [
    ...Array(8).fill("WAITING"),
    ...Array(2).fill("IN_CONSULT"),
    ...Array(13).fill("CONSULTED"),
    ...Array(2).fill("NO_SHOW"),
  ];
  let tokenN = 1;
  for (let i = 0; i < todayStatuses.length; i++) {
    const status = todayStatuses[i];
    // ensure 1-2 urgent among waiting/in-consult
    const scn = i === 0 || i === 9 ? SCENARIOS[6] : pick(SCENARIOS.slice(0, 6));
    const patient = patients[i];
    const createdAt = dayOffset(0, 9, i * 12); // spread across the morning
    const consulted = status === "CONSULTED";
    // consulted-today with follow-ups spread over next 7 days
    const fuDays = consulted ? int(1, 7) : 0;
    await makeIntake({
      patient,
      scn,
      createdAt,
      token: String(tokenN++).padStart(3, "0"),
      status,
      withConsult: consulted,
      followUpDate: consulted && chance(0.8) ? dayOffset(fuDays, 11) : null,
      followUpReason: scn.nextSteps.slice(0, 50),
    });
  }
  console.log(`Created ${todayStatuses.length} intakes for today`);

  // ---- Past 30 days (~60 intakes) ----
  let pastCount = 0;
  for (let d = 1; d <= 30; d++) {
    const perDay = int(1, 3);
    let dayToken = 1;
    for (let k = 0; k < perDay; k++) {
      const patient = pick(patients);
      const scn = pick(SCENARIOS.slice(0, 6));
      const createdAt = dayOffset(-d, int(9, 18), int(0, 59));
      await makeIntake({
        patient,
        scn,
        createdAt,
        token: String(dayToken++).padStart(3, "0"),
        status: "CONSULTED",
        withConsult: true,
        followUpDate: null,
      });
      pastCount++;
    }
  }
  console.log(`Created ${pastCount} past intakes`);

  // ---- Follow-ups explicitly across next 7 days (3-6 per day) + overdue ----
  for (let day = 0; day < 7; day++) {
    const n = int(3, 6);
    for (let k = 0; k < n; k++) {
      const patient = pick(patients);
      const scn = pick(SCENARIOS.slice(0, 6));
      // create a past consulted intake that generated this follow-up
      const createdAt = dayOffset(-int(7, 25), int(9, 17));
      await makeIntake({
        patient,
        scn,
        createdAt,
        token: String(int(1, 20)).padStart(3, "0"),
        status: "CONSULTED",
        visitType: "REPEAT",
        withConsult: true,
        followUpDate: dayOffset(day, 11, k * 5),
        followUpReason: scn.nextSteps.slice(0, 50),
        called: day > 0 && chance(0.3),
      });
    }
  }
  // 3 overdue follow-ups (never called/booked)
  for (let k = 0; k < 3; k++) {
    const patient = pick(patients);
    const scn = pick(SCENARIOS.slice(0, 6));
    const createdAt = dayOffset(-int(20, 40), 12);
    await makeIntake({
      patient,
      scn,
      createdAt,
      token: String(int(1, 20)).padStart(3, "0"),
      status: "CONSULTED",
      visitType: "REPEAT",
      withConsult: true,
      followUpDate: dayOffset(-int(1, 6), 11),
      followUpReason: "Overdue — needs a call",
      called: false,
    });
  }
  console.log("Created follow-ups across next 7 days + overdue");

  // ---- Appointments ----
  const slots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "04:00 PM", "04:30 PM", "05:00 PM"];
  // Today's appointments: some ARRIVED, some SCHEDULED, 2 NO_SHOW
  const todayAppts = [
    ...Array(4).fill("ARRIVED"),
    ...Array(4).fill("SCHEDULED"),
    ...Array(2).fill("CONSULTED"),
    ...Array(2).fill("NO_SHOW"),
  ];
  for (let i = 0; i < todayAppts.length; i++) {
    const patient = pick(patients);
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        name: patient.name,
        phone: patient.phone,
        date: dayOffset(0, 9 + i, 0),
        timeSlot: slots[i % slots.length],
        visitType: pick<VisitType>(["FIRST", "REPEAT", "FOLLOW_UP"]),
        status: todayAppts[i] as any,
        notes: chance(0.3) ? "Called to confirm" : null,
      },
    });
  }
  // Next 7 days appointments
  for (let day = 1; day <= 7; day++) {
    const n = int(2, 5);
    for (let k = 0; k < n; k++) {
      const patient = pick(patients);
      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          name: patient.name,
          phone: patient.phone,
          date: dayOffset(day, 9 + k, 0),
          timeSlot: slots[k % slots.length],
          visitType: pick<VisitType>(["FIRST", "REPEAT", "FOLLOW_UP"]),
          status: "SCHEDULED",
        },
      });
    }
  }
  console.log("Created appointments for today + next 7 days");

  const totals = {
    patients: await prisma.patient.count(),
    intakes: await prisma.intake.count(),
    consultations: await prisma.consultation.count(),
    followUps: await prisma.followUp.count(),
    appointments: await prisma.appointment.count(),
  };
  console.log("\n✅ Seed complete:", totals);
  console.log('\nDemo login → password: "cardineo123" (Doctor or Receptionist)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
