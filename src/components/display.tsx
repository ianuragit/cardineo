"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Band } from "@/lib/clinical";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, VISIT_TYPE_LABEL, APPT_STATUS_LABEL } from "@/lib/constants";

const statusBand: Record<string, Band> = {
  WAITING: "warn",
  IN_CONSULT: "info",
  CONSULTED: "ok",
  NO_SHOW: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge band={statusBand[status] ?? "muted"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

const apptBand: Record<string, Band> = {
  SCHEDULED: "info",
  ARRIVED: "warn",
  CONSULTED: "ok",
  NO_SHOW: "muted",
  CANCELLED: "muted",
};

export function ApptStatusBadge({ status }: { status: string }) {
  return <Badge band={apptBand[status] ?? "muted"}>{APPT_STATUS_LABEL[status] ?? status}</Badge>;
}

export function VisitBadge({ visitType }: { visitType: string }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {VISIT_TYPE_LABEL[visitType] ?? visitType}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  band = "muted",
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  band?: Band;
}) {
  const accent: Record<Band, string> = {
    ok: "text-green-600 bg-green-50",
    warn: "text-amber-600 bg-amber-50",
    danger: "text-red-600 bg-red-50",
    info: "text-blue-600 bg-blue-50",
    muted: "text-teal-600 bg-accent-soft",
  };
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accent[band])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-none text-slate-900">{value}</div>
        <div className="truncate text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

/** Date navigation used on Home & Reports. Pushes ?date=YYYY-MM-DD. */
export function DateNav({
  date,
  basePath,
  todayIso,
}: {
  date: string;
  basePath: string;
  todayIso: string;
}) {
  const router = useRouter();

  function shift(days: number) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    go(dt.toISOString().slice(0, 10));
  }
  function go(iso: string) {
    const params = new URLSearchParams();
    if (iso !== todayIso) params.set("date", iso);
    router.push(params.toString() ? `${basePath}?${params}` : basePath);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shift(-1)}
        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => go(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
      />
      <button
        onClick={() => shift(1)}
        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {date !== todayIso && (
        <button
          onClick={() => go(todayIso)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Today
        </button>
      )}
    </div>
  );
}
