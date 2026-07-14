"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, CalendarClock } from "lucide-react";
import { Button, Input, Textarea, Field, ToggleChip } from "@/components/ui";
import { saveConsultation, autosaveNotes, type ConsultationInput } from "@/lib/actions";
import { DIAGNOSIS_CHIPS, INVESTIGATIONS, CONSULT_OUTCOMES, FOLLOWUP_QUICK } from "@/lib/constants";

interface InitialState {
  clinicBpSys: number | null;
  clinicBpDia: number | null;
  clinicPulse: number | null;
  spo2: number | null;
  clinicWeightKg: number | null;
  diagnosis: string;
  notes: string;
  investigationsAdvised: string[];
  medicationsAdvised: string;
  nextSteps: string;
  recommendedFollowUpDate: string;
  followUpReason: string;
  outcome: string;
}

function addDaysIso(days: number): string {
  // compute in IST-ish local terms; use UTC date math then format yyyy-mm-dd
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60000);
  ist.setUTCDate(ist.getUTCDate() + days);
  return ist.toISOString().slice(0, 10);
}

export default function ConsultationPanel({
  intakeId,
  canEdit,
  status,
  initial,
}: {
  intakeId: string;
  canEdit: boolean;
  status: string;
  initial: InitialState;
}) {
  const [s, setS] = useState<InitialState>(initial);
  const [pending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const set = <K extends keyof InitialState>(k: K, v: InitialState[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  // Autosave notes draft every ~10s of inactivity (doctor only).
  useEffect(() => {
    if (!canEdit) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      autosaveNotes(intakeId, s.notes).then((r) => {
        if (r.ok) {
          setDraftSaved(true);
          setTimeout(() => setDraftSaved(false), 1500);
        }
      });
    }, 10000);
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.notes]);

  function payload(): ConsultationInput {
    return {
      clinicBpSys: s.clinicBpSys,
      clinicBpDia: s.clinicBpDia,
      clinicPulse: s.clinicPulse,
      spo2: s.spo2,
      clinicWeightKg: s.clinicWeightKg,
      diagnosis: s.diagnosis,
      notes: s.notes,
      investigationsAdvised: s.investigationsAdvised,
      medicationsAdvised: s.medicationsAdvised,
      nextSteps: s.nextSteps,
      recommendedFollowUpDate: s.recommendedFollowUpDate || null,
      followUpReason: s.followUpReason,
      outcome: s.outcome,
    };
  }

  function save(markConsulted: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await saveConsultation(intakeId, payload(), markConsulted);
        setSavedMsg(markConsulted ? "Saved — marked consulted" : "Saved");
        setTimeout(() => setSavedMsg(null), 2500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  const toggleInvestigation = (v: string) =>
    setS((prev) => ({
      ...prev,
      investigationsAdvised: prev.investigationsAdvised.includes(v)
        ? prev.investigationsAdvised.filter((x) => x !== v)
        : [...prev.investigationsAdvised, v],
    }));

  const disabled = !canEdit;

  return (
    <div className="space-y-4">
      {/* Clinic vitals */}
      <div>
        <div className="mb-1.5 text-sm font-medium text-slate-700">Examination vitals</div>
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="BP sys"
            type="number"
            disabled={disabled}
            value={s.clinicBpSys ?? ""}
            onChange={(e) => set("clinicBpSys", num(e.target.value))}
          />
          <Input
            placeholder="BP dia"
            type="number"
            disabled={disabled}
            value={s.clinicBpDia ?? ""}
            onChange={(e) => set("clinicBpDia", num(e.target.value))}
          />
          <Input
            placeholder="Pulse"
            type="number"
            disabled={disabled}
            value={s.clinicPulse ?? ""}
            onChange={(e) => set("clinicPulse", num(e.target.value))}
          />
          <Input
            placeholder="SpO₂"
            type="number"
            disabled={disabled}
            value={s.spo2 ?? ""}
            onChange={(e) => set("spo2", num(e.target.value))}
          />
          <Input
            placeholder="Weight kg"
            type="number"
            disabled={disabled}
            value={s.clinicWeightKg ?? ""}
            onChange={(e) => set("clinicWeightKg", num(e.target.value))}
          />
        </div>
      </div>

      {/* Diagnosis */}
      <Field label="Provisional diagnosis">
        <Input
          disabled={disabled}
          value={s.diagnosis}
          onChange={(e) => set("diagnosis", e.target.value)}
          placeholder="Type or pick below"
        />
        {!disabled && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DIAGNOSIS_CHIPS.map((d) => (
              <ToggleChip
                key={d}
                active={s.diagnosis === d}
                onClick={() => set("diagnosis", d)}
                className="py-1 text-xs"
              >
                {d}
              </ToggleChip>
            ))}
          </div>
        )}
      </Field>

      {/* Notes */}
      <Field
        label={
          <span className="flex items-center justify-between">
            <span>Clinical notes</span>
            {draftSaved && <span className="text-xs font-normal text-green-600">Draft saved</span>}
          </span>
        }
      >
        <Textarea
          disabled={disabled}
          value={s.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-[120px]"
          placeholder="Examination, impression, plan…"
        />
      </Field>

      {/* Investigations */}
      <Field label="Investigations advised">
        <div className="flex flex-wrap gap-1.5">
          {INVESTIGATIONS.map((inv) => (
            <ToggleChip
              key={inv}
              active={s.investigationsAdvised.includes(inv)}
              onClick={() => toggleInvestigation(inv)}
              disabled={disabled}
              className="py-1 text-xs"
            >
              {inv}
            </ToggleChip>
          ))}
        </div>
      </Field>

      {/* Medications advised */}
      <Field label="Medications advised / changes">
        <Textarea
          disabled={disabled}
          value={s.medicationsAdvised}
          onChange={(e) => set("medicationsAdvised", e.target.value)}
          placeholder="e.g. Start Rosuvastatin 10 mg OD"
        />
      </Field>

      {/* Next steps */}
      <Field label="Next steps">
        <Textarea
          disabled={disabled}
          value={s.nextSteps}
          onChange={(e) => set("nextSteps", e.target.value)}
          placeholder="e.g. Review with lipid profile in 4 weeks"
        />
      </Field>

      {/* Follow-up */}
      <Field label="Recommended follow-up date">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <Input
            type="date"
            disabled={disabled}
            value={s.recommendedFollowUpDate}
            onChange={(e) => set("recommendedFollowUpDate", e.target.value)}
          />
        </div>
        {!disabled && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FOLLOWUP_QUICK.map((q) => (
              <ToggleChip
                key={q.label}
                active={s.recommendedFollowUpDate === addDaysIso(q.days)}
                onClick={() => set("recommendedFollowUpDate", addDaysIso(q.days))}
                className="py-1 text-xs"
              >
                {q.label}
              </ToggleChip>
            ))}
            <ToggleChip
              active={s.recommendedFollowUpDate === ""}
              onClick={() => set("recommendedFollowUpDate", "")}
              className="py-1 text-xs"
            >
              No follow-up
            </ToggleChip>
          </div>
        )}
      </Field>

      {s.recommendedFollowUpDate && (
        <Field label="Follow-up reason / note (shown to reception)">
          <Input
            disabled={disabled}
            value={s.followUpReason}
            onChange={(e) => set("followUpReason", e.target.value)}
            placeholder="e.g. Review lipid profile"
          />
        </Field>
      )}

      {/* Outcome */}
      <Field label="Consultation outcome">
        <div className="flex flex-wrap gap-1.5">
          {CONSULT_OUTCOMES.map((o) => (
            <ToggleChip
              key={o}
              active={s.outcome === o}
              onClick={() => set("outcome", o)}
              disabled={disabled}
              className="py-1 text-xs"
            >
              {o}
            </ToggleChip>
          ))}
        </div>
      </Field>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check className="h-4 w-4" /> {savedMsg}
        </div>
      )}

      {canEdit ? (
        <div className="flex flex-col gap-2">
          <Button onClick={() => save(true)} disabled={pending} size="lg">
            {pending ? "Saving…" : status === "CONSULTED" ? "Save changes (Consulted)" : "Save & mark consulted"}
          </Button>
          <Button onClick={() => save(false)} disabled={pending} variant="outline">
            Save without changing status
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
          Sign in as Doctor to edit clinical notes.
        </div>
      )}
    </div>
  );
}
