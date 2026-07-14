"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Card, Badge, Input, Button } from "@/components/ui";
import { StatusBadge, VisitBadge } from "@/components/display";
import { istTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface QueueRow {
  id: string;
  token: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  visitType: string;
  chiefComplaint: string;
  urgent: boolean;
  chips: string[];
  filledAt: string;
  status: string;
  diagnosis: string | null;
}

const STATUS_ORDER = ["WAITING", "IN_CONSULT", "CONSULTED", "NO_SHOW"];

export default function QueueTable({ rows }: { rows: QueueRow[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortByTime, setSortByTime] = useState(false);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.phone.includes(s) ||
          r.token.includes(s) ||
          r.chiefComplaint.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "ALL") out = out.filter((r) => r.status === statusFilter);
    if (sortByTime) {
      out = [...out].sort((a, b) => a.filledAt.localeCompare(b.filledAt));
    }
    return out;
  }, [rows, q, statusFilter, sortByTime]);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, token, complaint…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <FilterChip active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
            All
          </FilterChip>
          {STATUS_ORDER.map((s) => (
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "IN_CONSULT" ? "In consult" : s.charAt(0) + s.slice(1).toLowerCase().replace("_", "-")}
            </FilterChip>
          ))}
          <button
            onClick={() => setSortByTime((v) => !v)}
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
              sortByTime ? "border-accent bg-accent-soft text-teal-800" : "border-slate-300 text-slate-600"
            )}
            title="Sort by time filled"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Time
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-500">No patients match.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">Token</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Age/Sex</th>
                  <th className="px-3 py-2 font-medium">Visit</th>
                  <th className="px-3 py-2 font-medium">Chief complaint</th>
                  <th className="px-3 py-2 font-medium">Flags</th>
                  <th className="px-3 py-2 font-medium">Filled</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-slate-50 hover:bg-slate-50",
                      r.urgent && "bg-red-50/40"
                    )}
                  >
                    <td className={cn("px-3 py-3 font-semibold", r.urgent && "border-l-4 border-danger")}>
                      #{r.token}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {r.age} {sexShort(r.gender)}
                    </td>
                    <td className="px-3 py-3">
                      <VisitBadge visitType={r.visitType} />
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-slate-600">
                      {r.chiefComplaint}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.urgent && (
                          <Badge band="danger">
                            <AlertTriangle className="h-3 w-3" /> URGENT
                          </Badge>
                        )}
                        {r.chips.map((c) => (
                          <Badge key={c} band="muted">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                      {istTime(new Date(r.filledAt))}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/case/${r.id}`}>
                        <Button size="sm" variant="outline" className="whitespace-nowrap">
                          Open →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-50 md:hidden">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/case/${r.id}`}
                className={cn("block p-4 hover:bg-slate-50", r.urgent && "border-l-4 border-danger bg-red-50/40")}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">
                    #{r.token} · {r.name}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {r.age} {sexShort(r.gender)} · <VisitBadge visitType={r.visitType} />
                </div>
                <div className="mt-1 text-sm text-slate-600">{r.chiefComplaint}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.urgent && (
                    <Badge band="danger">
                      <AlertTriangle className="h-3 w-3" /> URGENT
                    </Badge>
                  )}
                  {r.chips.map((c) => (
                    <Badge key={c} band="muted">
                      {c}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function sexShort(g: string) {
  return g === "MALE" ? "M" : g === "FEMALE" ? "F" : "O";
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
        active ? "border-accent bg-accent-soft text-teal-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
