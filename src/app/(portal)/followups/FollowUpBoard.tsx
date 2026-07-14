"use client";

import { useState } from "react";
import { Phone, PhoneCall, CalendarPlus, Check, AlertTriangle } from "lucide-react";
import { Card, Badge, Button, Textarea } from "@/components/ui";
import { istWeekday, istDayMonth } from "@/lib/date";
import { CALL_OUTCOMES } from "@/lib/constants";
import { markFollowUpCalled } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface FollowUpCard {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  dueDate: string;
  diagnosis: string | null;
  reason: string | null;
  daysSinceLastVisit: number | null;
  called: boolean;
  calledOutcome: string | null;
  booked: boolean;
}

type Filter = "ALL" | "NOT_CALLED" | "CALLED_NOT_BOOKED" | "BOOKED";

export default function FollowUpBoard({
  days,
  overdue,
}: {
  days: { iso: string; offset: number; cards: FollowUpCard[] }[];
  overdue: FollowUpCard[];
}) {
  const [filter, setFilter] = useState<Filter>("ALL");

  function match(c: FollowUpCard) {
    if (filter === "NOT_CALLED") return !c.called;
    if (filter === "CALLED_NOT_BOOKED") return c.called && !c.booked;
    if (filter === "BOOKED") return c.booked;
    return true;
  }

  const dayLabel = (offset: number, iso: string) => {
    if (offset === 0) return "Today";
    if (offset === 1) return "Tomorrow";
    return istWeekday(new Date(iso));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>
          <p className="text-sm text-slate-500">Next 7 days · call patients who are due</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["ALL", "All"],
              ["NOT_CALLED", "Not yet called"],
              ["CALLED_NOT_BOOKED", "Called, not booked"],
              ["BOOKED", "Booked"],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === f
                  ? "border-accent bg-accent-soft text-teal-800"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue bucket */}
      {overdue.filter(match).length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Overdue — never called or booked
            <Badge band="warn">{overdue.filter(match).length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overdue.filter(match).map((c) => (
              <FollowUpItem key={c.id} card={c} overdue />
            ))}
          </div>
        </Card>
      )}

      {/* 7-day board */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((d) => {
          const cards = d.cards.filter(match);
          return (
            <div key={d.iso} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-card">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {dayLabel(d.offset, d.iso)}
                  </div>
                  <div className="text-xs text-slate-400">{istDayMonth(new Date(d.iso))}</div>
                </div>
                <Badge band={cards.length ? "info" : "muted"}>{cards.length}</Badge>
              </div>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    No follow-ups
                  </div>
                ) : (
                  cards.map((c) => <FollowUpItem key={c.id} card={c} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FollowUpItem({ card, overdue }: { card: FollowUpCard; overdue?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const sex = card.gender === "MALE" ? "M" : card.gender === "FEMALE" ? "F" : "O";

  async function call(outcome: string) {
    setSaving(true);
    await markFollowUpCalled(card.id, outcome, notes);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  function book() {
    const params = new URLSearchParams({
      name: card.name,
      phone: card.phone,
      date: card.dueDate.slice(0, 10),
    });
    router.push(`/appointments?${params.toString()}`);
  }

  return (
    <div className={cn("rounded-lg border bg-white p-3 shadow-card", overdue ? "border-amber-200" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-800">{card.name}</div>
          <div className="text-xs text-slate-500">
            {card.age} {sex}
          </div>
        </div>
        {card.called && (
          <Badge band={card.booked ? "ok" : "info"}>
            <Check className="h-3 w-3" /> {card.booked ? "Booked" : "Called"}
          </Badge>
        )}
      </div>

      {card.diagnosis && <div className="mt-1 text-xs text-slate-600">Dx: {card.diagnosis}</div>}
      {card.reason && <div className="text-xs text-slate-500">{card.reason}</div>}
      {card.daysSinceLastVisit != null && (
        <div className="mt-1 text-[11px] text-slate-400">
          {card.daysSinceLastVisit === 0
            ? "Visited today"
            : `${card.daysSinceLastVisit} days since last visit`}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <a href={`tel:${card.phone}`}>
          <Button size="sm" variant="outline" className="h-8">
            <Phone className="h-3.5 w-3.5" /> Call
          </Button>
        </a>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen((v) => !v)}>
          <PhoneCall className="h-3.5 w-3.5" /> Mark called
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={book}>
          <CalendarPlus className="h-3.5 w-3.5" /> Book
        </Button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-2">
          <Textarea
            placeholder="Call notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[52px] text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {CALL_OUTCOMES.map((o) => (
              <Button
                key={o.value}
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                disabled={saving}
                onClick={() => call(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
