import {
  ClipboardCheck,
  Stethoscope,
  Clock,
  CalendarCheck,
  UserX,
  CalendarClock,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { istDayRangeFromISO, istISODate, istDayRange } from "@/lib/date";
import { KpiCard, DateNav } from "@/components/display";
import { queueFlags } from "@/lib/view";
import QueueTable, { type QueueRow } from "./QueueTable";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const todayIso = istISODate();
  const dayIso = date || todayIso;
  const { start, end } = date ? istDayRangeFromISO(dayIso) : istDayRange();

  const [intakes, apptBooked, apptNoShow, followUpsDue] = await Promise.all([
    prisma.intake.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { patient: true, consultation: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.count({ where: { date: { gte: start, lt: end } } }),
    prisma.appointment.count({
      where: { date: { gte: start, lt: end }, status: "NO_SHOW" },
    }),
    prisma.followUp.count({ where: { dueDate: { gte: start, lt: end } } }),
  ]);

  const consulted = intakes.filter((i) => i.status === "CONSULTED").length;
  const waiting = intakes.filter((i) => i.status === "WAITING").length;

  const rows: QueueRow[] = intakes
    .map((i) => {
      const flags = queueFlags(i);
      return {
        id: i.id,
        token: i.token,
        name: i.patient.name,
        age: i.patient.age,
        gender: i.patient.gender,
        phone: i.patient.phone,
        visitType: i.visitType,
        chiefComplaint: i.chiefComplaint,
        urgent: flags.urgent,
        chips: flags.chips,
        filledAt: i.createdAt.toISOString(),
        status: i.status,
        diagnosis: i.consultation?.diagnosis ?? null,
      };
    })
    // urgent pinned to top, then by fill time
    .sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return a.filledAt.localeCompare(b.filledAt);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Queue</h1>
          <p className="text-sm text-slate-500">
            {dayIso === todayIso ? "Live intake queue" : `Viewing ${dayIso}`}
          </p>
        </div>
        <DateNav date={dayIso} basePath="/" todayIso={todayIso} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Forms filled" value={intakes.length} icon={<ClipboardCheck className="h-5 w-5" />} />
        <KpiCard label="Consulted" value={consulted} band="ok" icon={<Stethoscope className="h-5 w-5" />} />
        <KpiCard label="Waiting" value={waiting} band="warn" icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Appointments" value={apptBooked} band="info" icon={<CalendarCheck className="h-5 w-5" />} />
        <KpiCard label="No-shows" value={apptNoShow} band="muted" icon={<UserX className="h-5 w-5" />} />
        <KpiCard label="Follow-ups due" value={followUpsDue} band="info" icon={<CalendarClock className="h-5 w-5" />} />
      </div>

      <QueueTable rows={rows} />
    </div>
  );
}
