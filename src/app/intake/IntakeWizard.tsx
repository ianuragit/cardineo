"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ClipboardList,
  HeartPulse,
  ShieldAlert,
  Pill,
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Select,
  Field,
  ToggleChip,
  RadioChips,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { t, LOCALES, type Locale } from "@/lib/i18n";
import {
  SYMPTOMS,
  NYHA_LABELS,
  computeBMI,
  bmiCategory,
  type NYHA,
} from "@/lib/clinical";
import {
  REFERRED_BY,
  DURATION_OPTIONS,
  CHEST_PAIN_CHARACTER,
  RADIATION,
  TRIGGERS,
  RELIEF,
  PALPITATION_PATTERN,
  KNOWN_CONDITIONS,
  CARDIAC_HISTORY,
  COMMON_CARDIAC_DRUGS,
  FREQUENCIES,
} from "@/lib/constants";

const STORAGE_KEY = "cardineo_intake_draft";

type Med = { name: string; dose: string; frequency: string };

interface FormState {
  locale: Locale;
  // step 1
  name: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  city: string;
  emergencyName: string;
  emergencyPhone: string;
  // step 2
  visitType: string;
  referredBy: string;
  lastVisitDate: string;
  hasAppointment: string; // "yes" | "no"
  // step 3
  chiefComplaint: string;
  duration: string;
  symptoms: string[];
  cp_character: string;
  cp_radiation: string[];
  cp_triggers: string[];
  cp_relief: string[];
  cp_severity: string;
  nyha: string;
  orthopnoea: string;
  pnd: string;
  palp_pattern: string;
  palp_episodes: string;
  restChestPain: string; // "yes" | "no"
  // step 4
  conditions: { name: string; years: string }[];
  cardiac: string[];
  cardiacYear: string;
  familyHistory: string;
  smoking: string;
  smokingDetail: string;
  tobacco: string;
  alcohol: string;
  activity: string;
  diet: string;
  heightCm: string;
  weightKg: string;
  pregnant: string;
  allergies: string;
  // step 5
  medications: Med[];
  // step 6
  bpSys: string;
  bpDia: string;
  pulse: string;
  fbs: string;
  ppbs: string;
  rbs: string;
  hba1c: string;
  tc: string;
  ldl: string;
  hdl: string;
  tg: string;
  hb: string;
  creatinine: string;
  ecgDone: string;
  ecgDate: string;
  ecgFinding: string;
  echoDone: string;
  echoDate: string;
  lvef: string;
  echoFinding: string;
  tmtDone: string;
  tmtDate: string;
  tmtResult: string;
  angioDone: string;
  angioDate: string;
  angioFinding: string;
  reportsOther: string;
  // consent
  consent: boolean;
  honeypot: string;
}

const initialState: FormState = {
  locale: "en",
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  city: "",
  emergencyName: "",
  emergencyPhone: "",
  visitType: "",
  referredBy: "",
  lastVisitDate: "",
  hasAppointment: "",
  chiefComplaint: "",
  duration: "",
  symptoms: [],
  cp_character: "",
  cp_radiation: [],
  cp_triggers: [],
  cp_relief: [],
  cp_severity: "",
  nyha: "",
  orthopnoea: "",
  pnd: "",
  palp_pattern: "",
  palp_episodes: "",
  restChestPain: "",
  conditions: [],
  cardiac: [],
  cardiacYear: "",
  familyHistory: "",
  smoking: "",
  smokingDetail: "",
  tobacco: "",
  alcohol: "",
  activity: "",
  diet: "",
  heightCm: "",
  weightKg: "",
  pregnant: "",
  allergies: "",
  medications: [],
  bpSys: "",
  bpDia: "",
  pulse: "",
  fbs: "",
  ppbs: "",
  rbs: "",
  hba1c: "",
  tc: "",
  ldl: "",
  hdl: "",
  tg: "",
  hb: "",
  creatinine: "",
  ecgDone: "",
  ecgDate: "",
  ecgFinding: "",
  echoDone: "",
  echoDate: "",
  lvef: "",
  echoFinding: "",
  tmtDone: "",
  tmtDate: "",
  tmtResult: "",
  angioDone: "",
  angioDate: "",
  angioFinding: "",
  reportsOther: "",
  consent: false,
  honeypot: "",
};

const STEP_ICONS = [User, ClipboardList, HeartPulse, ShieldAlert, Pill, FileText];

function YesNo({
  value,
  onChange,
  includeNA,
}: {
  value: string;
  onChange: (v: string) => void;
  includeNA?: boolean;
}) {
  const opts = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    ...(includeNA ? [{ value: "na", label: "N/A" }] : []),
  ];
  return <RadioChips options={opts} value={value} onChange={onChange} />;
}

export default function IntakeWizard({ clinicName }: { clinicName: string }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [f, setF] = useState<FormState>(initialState);
  const [showRedFlag, setShowRedFlag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setF({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Autosave draft
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      /* ignore */
    }
  }, [f, loaded]);

  const locale = f.locale;
  const tr = (k: string) => t(locale, k);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const toggleArr = (key: keyof FormState, val: string) =>
    setF((prev) => {
      const arr = prev[key] as unknown as string[];
      const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
      return { ...prev, [key]: next };
    });

  const bmi = useMemo(
    () => computeBMI(Number(f.heightCm) || null, Number(f.weightKg) || null),
    [f.heightCm, f.weightKg]
  );
  const bmiCat = bmiCategory(bmi);

  const hasChestPain = f.symptoms.includes("chestPain");
  const hasDyspnoea = f.symptoms.includes("dyspnoea");
  const hasPalpitations = f.symptoms.includes("palpitations");
  const showPregnancy =
    f.gender === "FEMALE" && Number(f.age) >= 15 && Number(f.age) <= 50;

  // Red flag trigger — the moment they answer "yes"
  useEffect(() => {
    if (f.restChestPain === "yes") setShowRedFlag(true);
  }, [f.restChestPain]);

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!f.name.trim()) return "Please enter the patient's full name.";
      if (!f.age || Number(f.age) < 1 || Number(f.age) > 120)
        return "Please enter a valid age (1–120).";
      if (!f.gender) return "Please select gender.";
      if (!/^\d{10}$/.test(f.phone)) return "Please enter a valid 10-digit mobile number.";
    }
    if (s === 2) {
      if (!f.visitType) return "Please select the visit type.";
      if (!f.hasAppointment) return "Please tell us if you have an appointment today.";
    }
    if (s === 3) {
      if (!f.chiefComplaint.trim()) return "Please describe your main complaint.";
      if (!f.duration) return "Please select how long you've had this complaint.";
      if (f.symptoms.length === 0)
        return "Please select at least one symptom (or 'None of these').";
      if (hasChestPain && !f.cp_character)
        return "Please describe the character of the chest pain.";
      if (hasDyspnoea && !f.nyha) return "Please select the breathlessness grade.";
      if (!f.restChestPain)
        return "Please answer the question about chest pain right now.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function skip() {
    setError(null);
    setStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    const symptomData = {
      list: f.symptoms.includes("none") ? [] : f.symptoms,
      chestPain: hasChestPain
        ? {
            character: f.cp_character || undefined,
            radiation: f.cp_radiation,
            triggers: f.cp_triggers,
            relief: f.cp_relief,
            severity: f.cp_severity ? Number(f.cp_severity) : undefined,
          }
        : undefined,
      dyspnoea: hasDyspnoea
        ? {
            nyha: (f.nyha || undefined) as NYHA | undefined,
            orthopnoea: f.orthopnoea === "yes",
            pnd: f.pnd === "yes",
          }
        : undefined,
      palpitations: hasPalpitations
        ? { pattern: f.palp_pattern || undefined, episodes: f.palp_episodes || undefined }
        : undefined,
      restChestPain: f.restChestPain === "yes",
    };

    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

    return {
      name: f.name.trim(),
      age: Number(f.age),
      gender: f.gender,
      phone: f.phone,
      email: f.email || undefined,
      city: f.city || undefined,
      locale: f.locale,
      emergencyName: f.emergencyName || undefined,
      emergencyPhone: f.emergencyPhone || undefined,
      visitType: f.visitType,
      referredBy: f.referredBy || undefined,
      lastVisitDate: f.lastVisitDate || undefined,
      hasAppointment: f.hasAppointment === "yes",
      chiefComplaint: f.chiefComplaint.trim(),
      duration: f.duration,
      symptoms: symptomData,
      conditions: {
        known: f.conditions
          .filter((c) => c.name)
          .map((c) => ({ name: c.name, years: c.years ? Number(c.years) : undefined })),
      },
      cardiacHistory: { items: f.cardiac, year: f.cardiacYear || undefined },
      familyHistory: f.familyHistory || undefined,
      lifestyle: {
        smoking: f.smoking || undefined,
        smokingQuitYear: f.smoking === "FORMER" ? f.smokingDetail : undefined,
        cigsPerDay: f.smoking === "CURRENT" ? f.smokingDetail : undefined,
        tobacco: f.tobacco === "yes",
        alcohol: f.alcohol || undefined,
        activity: f.activity || undefined,
        diet: f.diet || undefined,
      },
      heightCm: num(f.heightCm),
      weightKg: num(f.weightKg),
      pregnant: showPregnancy ? f.pregnant === "yes" : undefined,
      allergies: f.allergies || undefined,
      medications: f.medications.filter((m) => m.name.trim()),
      reports: {
        bpSys: num(f.bpSys),
        bpDia: num(f.bpDia),
        pulse: num(f.pulse),
        fbs: num(f.fbs),
        ppbs: num(f.ppbs),
        rbs: num(f.rbs),
        hba1c: num(f.hba1c),
        tc: num(f.tc),
        ldl: num(f.ldl),
        hdl: num(f.hdl),
        tg: num(f.tg),
        hb: num(f.hb),
        creatinine: num(f.creatinine),
        ecg:
          f.ecgDone === "yes"
            ? { done: true, date: f.ecgDate || undefined, finding: f.ecgFinding || undefined }
            : undefined,
        echo:
          f.echoDone === "yes"
            ? {
                done: true,
                date: f.echoDate || undefined,
                lvef: num(f.lvef),
                finding: f.echoFinding || undefined,
              }
            : undefined,
        tmt:
          f.tmtDone === "yes"
            ? { done: true, date: f.tmtDate || undefined, result: f.tmtResult || undefined }
            : undefined,
        angio:
          f.angioDone === "yes"
            ? { done: true, date: f.angioDate || undefined, finding: f.angioFinding || undefined }
            : undefined,
        other: f.reportsOther || undefined,
      },
      consentGiven: f.consent,
      honeypot: f.honeypot,
    };
  }

  async function submit() {
    if (!f.consent) {
      setError("Please tick the consent box to submit.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      const params = new URLSearchParams({ token: data.token });
      if (data.redFlag) params.set("urgent", "1");
      router.push(`/intake/success?${params.toString()}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ---------------- Landing ----------------
  if (!started) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
        <div className="mb-6 flex items-center gap-2 text-accent">
          <HeartPulse className="h-7 w-7" />
          <span className="text-lg font-semibold text-slate-800">{clinicName}</span>
        </div>
        <div className="flex justify-end">
          <LangToggle value={locale} onChange={(l) => set("locale", l)} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{tr("landing.title")}</h1>
        <p className="mt-3 text-slate-600">{tr("landing.subtitle")}</p>
        <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-teal-800">
          ⏱️ {tr("landing.time")}
        </div>
        <Button size="lg" className="mt-6" onClick={() => setStarted(true)}>
          {tr("landing.start")}
        </Button>
        <p className="mt-6 text-xs text-slate-500">{tr("privacy")}</p>
      </div>
    );
  }

  const StepIcon = STEP_ICONS[step - 1];

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-5">
      {/* Progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <StepIcon className="h-5 w-5 text-accent" />
            {tr(`step.${step}`)}
          </div>
          <div className="flex items-center gap-3">
            <LangToggle value={locale} onChange={(l) => set("locale", l)} />
            <span className="text-sm text-slate-500">
              {step} {tr("step.of")} 6
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                n <= step ? "bg-accent" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Honeypot (hidden) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        value={f.honeypot}
        onChange={(e) => set("honeypot", e.target.value)}
      />

      <div className="space-y-5">
        {step === 1 && (
          <>
            <Field label="Full name" required>
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ramesh Iyer" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={f.age}
                  onChange={(e) => set("age", e.target.value)}
                />
              </Field>
              <Field label="Gender" required>
                <Select value={f.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
            </div>
            <Field label="Mobile number" required hint="Used to recognise repeat patients & for follow-up calls">
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={f.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit number"
              />
            </Field>
            <Field label="Email">
              <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="City / Locality">
              <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emergency contact name">
                <Input value={f.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
              </Field>
              <Field label="Emergency contact number">
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={f.emergencyPhone}
                  onChange={(e) => set("emergencyPhone", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Visit type" required>
              <RadioChips
                options={[
                  { value: "FIRST", label: "First visit" },
                  { value: "REPEAT", label: "Repeat visit" },
                  { value: "FOLLOW_UP", label: "Follow-up" },
                ]}
                value={f.visitType}
                onChange={(v) => set("visitType", v)}
              />
            </Field>
            <Field label="Referred by">
              <Select value={f.referredBy} onChange={(e) => set("referredBy", e.target.value)}>
                <option value="">Select</option>
                {REFERRED_BY.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            {f.visitType === "FOLLOW_UP" && (
              <Field label="Approx. date of your last visit">
                <Input type="date" value={f.lastVisitDate} onChange={(e) => set("lastVisitDate", e.target.value)} />
              </Field>
            )}
            <Field label="Do you have an appointment today?" required>
              <RadioChips
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No (walk-in)" },
                ]}
                value={f.hasAppointment}
                onChange={(v) => set("hasAppointment", v)}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="What brings you in today? (in your own words)" required>
              <Textarea
                value={f.chiefComplaint}
                onChange={(e) => set("chiefComplaint", e.target.value)}
                placeholder="e.g. Chest heaviness when I walk fast"
              />
            </Field>
            <Field label="How long have you had this?" required>
              <RadioChips
                options={DURATION_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                value={f.duration}
                onChange={(v) => set("duration", v)}
              />
            </Field>
            <Field label="Which of these are you feeling?" required hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => (
                  <ToggleChip
                    key={s.key}
                    active={f.symptoms.includes(s.key)}
                    onClick={() => {
                      // selecting a real symptom clears "none"
                      setF((prev) => ({
                        ...prev,
                        symptoms: prev.symptoms.includes(s.key)
                          ? prev.symptoms.filter((x) => x !== s.key)
                          : [...prev.symptoms.filter((x) => x !== "none"), s.key],
                      }));
                    }}
                  >
                    {s.label}
                  </ToggleChip>
                ))}
                <ToggleChip
                  active={f.symptoms.includes("none")}
                  onClick={() => set("symptoms", f.symptoms.includes("none") ? [] : ["none"])}
                >
                  None of these
                </ToggleChip>
              </div>
            </Field>

            {hasChestPain && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">About the chest pain</div>
                <Field label="Character" required>
                  <RadioChips
                    options={CHEST_PAIN_CHARACTER.map((c) => ({ value: c, label: c }))}
                    value={f.cp_character}
                    onChange={(v) => set("cp_character", v)}
                  />
                </Field>
                <Field label="Does it radiate to…">
                  <MultiChips options={RADIATION as unknown as string[]} value={f.cp_radiation} onToggle={(v) => toggleArr("cp_radiation", v)} />
                </Field>
                <Field label="Triggered by">
                  <MultiChips options={TRIGGERS as unknown as string[]} value={f.cp_triggers} onToggle={(v) => toggleArr("cp_triggers", v)} />
                </Field>
                <Field label="Relieved by">
                  <MultiChips options={RELIEF as unknown as string[]} value={f.cp_relief} onToggle={(v) => toggleArr("cp_relief", v)} />
                </Field>
                <Field label={`Severity (1–10)${f.cp_severity ? `: ${f.cp_severity}` : ""}`}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={f.cp_severity || "5"}
                    onChange={(e) => set("cp_severity", e.target.value)}
                    className="w-full accent-teal-600"
                  />
                </Field>
              </div>
            )}

            {hasDyspnoea && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">About the breathlessness</div>
                <Field label="When do you get breathless?" required>
                  <div className="flex flex-col gap-2">
                    {(["I", "II", "III", "IV"] as NYHA[]).map((g) => (
                      <ToggleChip
                        key={g}
                        active={f.nyha === g}
                        onClick={() => set("nyha", g)}
                        className="text-left"
                      >
                        {NYHA_LABELS[g]}
                      </ToggleChip>
                    ))}
                  </div>
                </Field>
                <Field label="Breathless lying flat / need extra pillows?">
                  <YesNo value={f.orthopnoea} onChange={(v) => set("orthopnoea", v)} />
                </Field>
                <Field label="Wake up at night gasping for breath?">
                  <YesNo value={f.pnd} onChange={(v) => set("pnd", v)} />
                </Field>
              </div>
            )}

            {hasPalpitations && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">About the palpitations</div>
                <Field label="Pattern">
                  <RadioChips
                    options={PALPITATION_PATTERN.map((p) => ({ value: p, label: p }))}
                    value={f.palp_pattern}
                    onChange={(v) => set("palp_pattern", v)}
                  />
                </Field>
                <Field label="How often & how long do episodes last?">
                  <Input value={f.palp_episodes} onChange={(e) => set("palp_episodes", e.target.value)} placeholder="e.g. 2–3 times a week, a few minutes" />
                </Field>
              </div>
            )}

            <Field
              label="Is chest pain happening RIGHT NOW, or is it severe / at rest?"
              required
            >
              <YesNo value={f.restChestPain} onChange={(v) => set("restChestPain", v)} />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Known conditions" hint="Select all that apply; add years since diagnosis if you know">
              <div className="space-y-2">
                {KNOWN_CONDITIONS.map((c) => {
                  const sel = f.conditions.find((x) => x.name === c);
                  return (
                    <div key={c} className="flex items-center gap-2">
                      <ToggleChip
                        active={!!sel}
                        onClick={() =>
                          setF((prev) => ({
                            ...prev,
                            conditions: sel
                              ? prev.conditions.filter((x) => x.name !== c)
                              : [...prev.conditions, { name: c, years: "" }],
                          }))
                        }
                        className="flex-1 text-left"
                      >
                        {c}
                      </ToggleChip>
                      {sel && (
                        <Input
                          type="number"
                          placeholder="yrs"
                          className="w-20"
                          value={sel.years}
                          onChange={(e) =>
                            setF((prev) => ({
                              ...prev,
                              conditions: prev.conditions.map((x) =>
                                x.name === c ? { ...x, years: e.target.value } : x
                              ),
                            }))
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>

            <Field label="Known cardiac history">
              <MultiChips options={CARDIAC_HISTORY as unknown as string[]} value={f.cardiac} onToggle={(v) => toggleArr("cardiac", v)} />
            </Field>
            {f.cardiac.length > 0 && (
              <Field label="Year of the above event/procedure">
                <Input value={f.cardiacYear} onChange={(e) => set("cardiacYear", e.target.value)} placeholder="e.g. 2019" />
              </Field>
            )}

            <Field label="Family history of heart disease or sudden cardiac death before 55 (M) / 65 (F)?">
              <RadioChips
                options={[
                  { value: "YES", label: "Yes" },
                  { value: "NO", label: "No" },
                  { value: "UNKNOWN", label: "Don't know" },
                ]}
                value={f.familyHistory}
                onChange={(v) => set("familyHistory", v)}
              />
            </Field>

            <Field label="Smoking">
              <RadioChips
                options={[
                  { value: "NEVER", label: "Never" },
                  { value: "FORMER", label: "Former" },
                  { value: "CURRENT", label: "Current" },
                ]}
                value={f.smoking}
                onChange={(v) => set("smoking", v)}
              />
            </Field>
            {f.smoking === "FORMER" && (
              <Field label="Quit year">
                <Input value={f.smokingDetail} onChange={(e) => set("smokingDetail", e.target.value)} placeholder="e.g. 2015" />
              </Field>
            )}
            {f.smoking === "CURRENT" && (
              <Field label="Cigarettes per day">
                <Input value={f.smokingDetail} onChange={(e) => set("smokingDetail", e.target.value)} placeholder="e.g. 10" />
              </Field>
            )}

            <Field label="Tobacco (chewing / gutka)">
              <YesNo value={f.tobacco} onChange={(v) => set("tobacco", v)} />
            </Field>
            <Field label="Alcohol">
              <RadioChips
                options={[
                  { value: "NEVER", label: "Never" },
                  { value: "OCCASIONAL", label: "Occasional" },
                  { value: "REGULAR", label: "Regular" },
                ]}
                value={f.alcohol}
                onChange={(v) => set("alcohol", v)}
              />
            </Field>
            <Field label="Physical activity">
              <RadioChips
                options={[
                  { value: "SEDENTARY", label: "Sedentary" },
                  { value: "LIGHT", label: "Light (<150 min/wk)" },
                  { value: "MODERATE", label: "Moderate" },
                  { value: "ACTIVE", label: "Active" },
                ]}
                value={f.activity}
                onChange={(v) => set("activity", v)}
              />
            </Field>
            <Field label="Diet">
              <RadioChips
                options={[
                  { value: "VEG", label: "Vegetarian" },
                  { value: "NONVEG", label: "Non-vegetarian" },
                  { value: "EGG", label: "Eggetarian" },
                ]}
                value={f.diet}
                onChange={(v) => set("diet", v)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <Input type="number" inputMode="numeric" value={f.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" inputMode="numeric" value={f.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
              </Field>
            </div>
            {bmi != null && (
              <div className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-teal-800">
                BMI: <strong>{bmi}</strong> — {bmiCat.label}
              </div>
            )}

            {showPregnancy && (
              <Field label="Are you currently pregnant?">
                <YesNo value={f.pregnant} onChange={(v) => set("pregnant", v)} includeNA />
              </Field>
            )}

            <Field label="Known drug allergies">
              <Input value={f.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin, or 'None'" />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <p className="text-sm text-slate-600">
              List the medicines you take now. Tap a common one to add it quickly, then fill dose & frequency.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_CARDIAC_DRUGS.map((d) => (
                <ToggleChip
                  key={d}
                  active={f.medications.some((m) => m.name === d)}
                  onClick={() =>
                    setF((prev) => ({
                      ...prev,
                      medications: prev.medications.some((m) => m.name === d)
                        ? prev.medications
                        : [...prev.medications, { name: d, dose: "", frequency: "" }],
                    }))
                  }
                >
                  + {d}
                </ToggleChip>
              ))}
            </div>

            <div className="space-y-3">
              {f.medications.map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={m.name}
                      placeholder="Medicine name"
                      onChange={(e) =>
                        setF((prev) => ({
                          ...prev,
                          medications: prev.medications.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setF((prev) => ({
                          ...prev,
                          medications: prev.medications.filter((_, j) => j !== i),
                        }))
                      }
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove medicine"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      value={m.dose}
                      placeholder="Dose (e.g. 10 mg)"
                      onChange={(e) =>
                        setF((prev) => ({
                          ...prev,
                          medications: prev.medications.map((x, j) =>
                            j === i ? { ...x, dose: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <Select
                      value={m.frequency}
                      onChange={(e) =>
                        setF((prev) => ({
                          ...prev,
                          medications: prev.medications.map((x, j) =>
                            j === i ? { ...x, frequency: e.target.value } : x
                          ),
                        }))
                      }
                    >
                      <option value="">Frequency</option>
                      {FREQUENCIES.map((fr) => (
                        <option key={fr} value={fr}>
                          {fr}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setF((prev) => ({
                  ...prev,
                  medications: [...prev.medications, { name: "", dose: "", frequency: "" }],
                }))
              }
            >
              <Plus className="h-4 w-4" /> Add medicine
            </Button>
            <p className="text-xs text-slate-500">
              Prescription photo upload is coming soon — for now, please type your medicines.
            </p>
          </>
        )}

        {step === 6 && (
          <>
            <p className="text-sm text-slate-600">
              If you're carrying any reports or recent readings, enter what you can. All optional.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="BP systolic">
                <Input type="number" inputMode="numeric" value={f.bpSys} onChange={(e) => set("bpSys", e.target.value)} />
              </Field>
              <Field label="BP diastolic">
                <Input type="number" inputMode="numeric" value={f.bpDia} onChange={(e) => set("bpDia", e.target.value)} />
              </Field>
              <Field label="Pulse (bpm)">
                <Input type="number" inputMode="numeric" value={f.pulse} onChange={(e) => set("pulse", e.target.value)} />
              </Field>
              <Field label="Haemoglobin (g/dL)">
                <Input type="number" value={f.hb} onChange={(e) => set("hb", e.target.value)} />
              </Field>
              <Field label="Fasting sugar">
                <Input type="number" value={f.fbs} onChange={(e) => set("fbs", e.target.value)} />
              </Field>
              <Field label="PP sugar">
                <Input type="number" value={f.ppbs} onChange={(e) => set("ppbs", e.target.value)} />
              </Field>
              <Field label="Random sugar">
                <Input type="number" value={f.rbs} onChange={(e) => set("rbs", e.target.value)} />
              </Field>
              <Field label="HbA1c (%)">
                <Input type="number" value={f.hba1c} onChange={(e) => set("hba1c", e.target.value)} />
              </Field>
              <Field label="Total cholesterol">
                <Input type="number" value={f.tc} onChange={(e) => set("tc", e.target.value)} />
              </Field>
              <Field label="LDL">
                <Input type="number" value={f.ldl} onChange={(e) => set("ldl", e.target.value)} />
              </Field>
              <Field label="HDL">
                <Input type="number" value={f.hdl} onChange={(e) => set("hdl", e.target.value)} />
              </Field>
              <Field label="Triglycerides">
                <Input type="number" value={f.tg} onChange={(e) => set("tg", e.target.value)} />
              </Field>
              <Field label="Serum creatinine">
                <Input type="number" value={f.creatinine} onChange={(e) => set("creatinine", e.target.value)} />
              </Field>
            </div>

            <TestBlock
              label="ECG done?"
              done={f.ecgDone}
              onDone={(v) => set("ecgDone", v)}
              date={f.ecgDate}
              onDate={(v) => set("ecgDate", v)}
            >
              <Field label="Finding">
                <Input value={f.ecgFinding} onChange={(e) => set("ecgFinding", e.target.value)} />
              </Field>
            </TestBlock>

            <TestBlock
              label="2D Echo done?"
              done={f.echoDone}
              onDone={(v) => set("echoDone", v)}
              date={f.echoDate}
              onDate={(v) => set("echoDate", v)}
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="LVEF (%)">
                  <Input type="number" value={f.lvef} onChange={(e) => set("lvef", e.target.value)} />
                </Field>
                <Field label="Finding">
                  <Input value={f.echoFinding} onChange={(e) => set("echoFinding", e.target.value)} />
                </Field>
              </div>
            </TestBlock>

            <TestBlock
              label="TMT / Stress test done?"
              done={f.tmtDone}
              onDone={(v) => set("tmtDone", v)}
              date={f.tmtDate}
              onDate={(v) => set("tmtDate", v)}
            >
              <Field label="Result">
                <Select value={f.tmtResult} onChange={(e) => set("tmtResult", e.target.value)}>
                  <option value="">Select</option>
                  <option>Positive</option>
                  <option>Negative</option>
                  <option>Inconclusive</option>
                </Select>
              </Field>
            </TestBlock>

            <TestBlock
              label="Angiography done?"
              done={f.angioDone}
              onDone={(v) => set("angioDone", v)}
              date={f.angioDate}
              onDate={(v) => set("angioDate", v)}
            >
              <Field label="Finding">
                <Input value={f.angioFinding} onChange={(e) => set("angioFinding", e.target.value)} />
              </Field>
            </TestBlock>

            <Field label="Other test / report values">
              <Textarea value={f.reportsOther} onChange={(e) => set("reportsOther", e.target.value)} />
            </Field>

            {/* Consent */}
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <input
                type="checkbox"
                checked={f.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-1 h-5 w-5 accent-teal-600"
              />
              <span className="text-sm text-slate-700">{tr("consent.label")}</span>
            </label>
          </>
        )}
      </div>

      {/* Sticky footer nav */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={back}>
              {tr("step.back")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex-1" />
          {step >= 4 && step < 6 && (
            <Button variant="ghost" onClick={skip}>
              {tr("step.skip")}
            </Button>
          )}
          {step < 6 ? (
            <Button onClick={next}>{tr("step.next")}</Button>
          ) : (
            <Button onClick={submit} disabled={submitting || !f.consent}>
              {submitting ? "Submitting…" : tr("step.submit")}
            </Button>
          )}
        </div>
      </div>

      {/* Red flag full-screen alert */}
      {showRedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/80 p-6">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-9 w-9 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-700">{tr("redflag.title")}</h2>
            <p className="mt-2 text-slate-600">{tr("redflag.body")}</p>
            <Button variant="danger" className="mt-5 w-full" onClick={() => setShowRedFlag(false)}>
              {tr("redflag.ack")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LangToggle({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Locale)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

function MultiChips({
  options,
  value,
  onToggle,
}: {
  options: string[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <ToggleChip key={o} active={value.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </ToggleChip>
      ))}
    </div>
  );
}

function TestBlock({
  label,
  done,
  onDone,
  date,
  onDate,
  children,
}: {
  label: string;
  done: string;
  onDone: (v: string) => void;
  date: string;
  onDate: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <RadioChips
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          value={done}
          onChange={onDone}
        />
      </div>
      {done === "yes" && (
        <div className="mt-3 space-y-2">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
          </Field>
          {children}
        </div>
      )}
    </div>
  );
}
