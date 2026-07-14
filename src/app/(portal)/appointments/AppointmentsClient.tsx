"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, UserX, Check, Phone } from "lucide-react";
import { Card, CardHeader, Button, Input, Select, Field } from "@/components/ui";
import { ApptStatusBadge, VisitBadge } from "@/components/display";
import { istWeekday, istDayMonth } from "@/lib/date";
import { TIME_SLOTS } from "@/lib/constants";
import {
  addAppointment,
  setAppointmentStatus,
  markAllPendingNoShows,
  lookupPatientByPhone,
} from "@/lib/actions";
import type { ApptStatus, VisitType } from "@prisma/client";

export interface ApptRow {
  id: string;
  name: string;
  phone: string;
  date: string;
  timeSlot: string;
  visitType: string;
  notes: string | null;
  status: string;
}

function todayIso() {
  const ist = new Date(Date.now() + (5 * 60 + 30) * 60000);
  return ist.toISOString().slice(0, 10);
}

export default function AppointmentsClient({
  days,
  prefill,
}: {
  days: { iso: string; offset: number; rows: ApptRow[] }[];
  prefill: { name?: string; phone?: string; date?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(prefill.name ?? "");
  const [phone, setPhone] = useState(prefill.phone ?? "");
  const [date, setDate] = useState(prefill.date ?? todayIso());
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [visitType, setVisitType] = useState<VisitType>("FIRST");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Typeahead: fill name from phone on 10 digits
  useEffect(() => {
    if (phone.length >= 4 && !name) {
      lookupPatientByPhone(phone).then((p) => {
        if (p && !name) setName(p.name);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !/^\d{10}$/.test(phone)) {
      setError("Enter a name and a valid 10-digit mobile number.");
      return;
    }
    startTransition(async () => {
      try {
        await addAppointment({ name, phone, date, timeSlot, visitType, notes });
        setOk(true);
        setName("");
        setPhone("");
        setNotes("");
        setTimeout(() => setOk(false), 2000);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add appointment.");
      }
    });
  }

  function changeStatus(id: string, status: ApptStatus) {
    startTransition(async () => {
      await setAppointmentStatus(id, status);
      router.refresh();
    });
  }

  const dayLabel = (offset: number, iso: string) => {
    if (offset === 0) return "Today";
    if (offset === 1) return "Tomorrow";
    return `${istWeekday(new Date(iso))}, ${istDayMonth(new Date(iso))}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Punch in walk-ins & book ahead</p>
        </div>
        <Button
          variant="outline"
          onClick={() => startTransition(async () => { await markAllPendingNoShows(); router.refresh(); })}
          disabled={pending}
        >
          <UserX className="h-4 w-4" /> Mark pending as no-show
        </Button>
      </div>

      {/* Punch-in form */}
      <Card>
        <CardHeader title="Add appointment" icon={<CalendarPlus className="h-4 w-4 text-accent" />} />
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mobile" required>
            <Input
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit number"
            />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time slot">
            <Select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visit type">
            <Select value={visitType} onChange={(e) => setVisitType(e.target.value as VisitType)}>
              <option value="FIRST">First visit</option>
              <option value="REPEAT">Repeat visit</option>
              <option value="FOLLOW_UP">Follow-up</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add appointment"}
            </Button>
            {ok && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" /> Added
              </span>
            )}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      </Card>

      {/* Week view */}
      <div className="space-y-4">
        {days.map((d) => (
          <Card key={d.iso} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <div className="font-semibold text-slate-800">{dayLabel(d.offset, d.iso)}</div>
              <span className="text-xs text-slate-400">{d.rows.length} appointment(s)</span>
            </div>
            {d.rows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No appointments.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {d.rows.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="w-20 shrink-0 text-sm font-medium text-slate-700">{a.timeSlot}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">{a.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <a href={`tel:${a.phone}`} className="flex items-center gap-1 text-accent hover:underline">
                          <Phone className="h-3 w-3" /> {a.phone}
                        </a>
                        <VisitBadge visitType={a.visitType} />
                        {a.notes && <span className="truncate">· {a.notes}</span>}
                      </div>
                    </div>
                    <ApptStatusBadge status={a.status} />
                    <div className="flex flex-wrap gap-1">
                      {a.status === "SCHEDULED" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => changeStatus(a.id, "ARRIVED")}>
                          Arrived
                        </Button>
                      )}
                      {(a.status === "SCHEDULED" || a.status === "ARRIVED") && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => changeStatus(a.id, "CONSULTED")}>
                            Consulted
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => changeStatus(a.id, "NO_SHOW")}>
                            No-show
                          </Button>
                        </>
                      )}
                      {(a.status === "NO_SHOW" || a.status === "CANCELLED") && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => changeStatus(a.id, "SCHEDULED")}>
                          Reset
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
