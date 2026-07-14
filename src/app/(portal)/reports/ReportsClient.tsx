"use client";

import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, FileText, Printer } from "lucide-react";
import { Card, CardHeader, Button } from "@/components/ui";
import type { ReportData } from "@/lib/reports";

const PIE_COLORS = ["#0D9488", "#2563EB", "#D97706", "#DC2626", "#7C3AED", "#059669"];

export default function ReportsClient({
  data,
  fromIso,
  toIso,
  todayIso,
}: {
  data: ReportData;
  fromIso: string;
  toIso: string;
  todayIso: string;
}) {
  const router = useRouter();
  const c = data.counts;

  function setRange(from: string, to: string) {
    const params = new URLSearchParams();
    if (from !== todayIso) params.set("from", from);
    if (to !== from) params.set("to", to);
    router.push(params.toString() ? `/reports?${params}` : "/reports");
  }

  const exportUrl = `/api/reports/export?from=${fromIso}&to=${toIso}`;
  const printUrl = `/reports/print?from=${fromIso}&to=${toIso}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            {fromIso === toIso ? `Summary for ${fromIso}` : `${fromIso} → ${toIso}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fromIso}
            max={toIso}
            onChange={(e) => setRange(e.target.value, toIso)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={toIso}
            min={fromIso}
            onChange={(e) => setRange(fromIso, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <a href={exportUrl}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </a>
          <a href={printUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4" /> PDF
            </Button>
          </a>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Forms filled" value={c.filled} />
        <Stat label="Consulted" value={c.consulted} />
        <Stat label="Walk-ins" value={c.walkIns} />
        <Stat label="With appointment" value={c.appointments} />
        <Stat label="No-shows" value={c.noShows} />
        <Stat label="First / Repeat / F-up" value={`${c.first}/${c.repeat}/${c.followUp}`} />
        <Stat label="Urgent (red-flag)" value={c.urgent} danger={c.urgent > 0} />
        <Stat label="Follow-ups scheduled" value={c.followUpsScheduled} />
        <Stat
          label="Avg form → consult"
          value={c.avgFormToConsultMin != null ? `${c.avgFormToConsultMin} min` : "—"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Visit types">
          {data.visitTypeBreakdown.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.visitTypeBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.visitTypeBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Gender split">
          {data.genderBreakdown.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.genderBreakdown} dataKey="value" nameKey="name" outerRadius={80}>
                  {data.genderBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Age bands">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.ageBands}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk-factor prevalence">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.riskPrevalence} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={90} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCard title="Top chief complaints" items={data.topComplaints} />
        <ListCard title="Top diagnoses" items={data.topDiagnoses} />
      </div>

      {/* Patient table */}
      <Card>
        <CardHeader title="Patient-level detail" icon={<FileText className="h-4 w-4 text-accent" />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Age/Sex</th>
                <th className="px-3 py-2">Visit</th>
                <th className="px-3 py-2">Complaint</th>
                <th className="px-3 py-2">Diagnosis</th>
                <th className="px-3 py-2">Next steps</th>
                <th className="px-3 py-2">Follow-up</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    No records in this range.
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-2 font-medium">#{r.token}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500">{r.age} {r.gender}</td>
                    <td className="px-3 py-2 text-slate-500">{r.visitType}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-slate-600">{r.complaint}</td>
                    <td className="px-3 py-2 text-slate-600">{r.diagnosis || "—"}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-slate-600">{r.nextSteps || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{r.followUpDate || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="card p-3">
      <div className={`text-2xl font-bold ${danger ? "text-red-600" : "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="p-3">{children}</div>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="p-3">
        {items.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-700">{it.name}</span>
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-teal-700">
                  {it.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Empty() {
  return <div className="py-10 text-center text-sm text-slate-400">No data</div>;
}
