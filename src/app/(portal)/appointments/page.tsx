import { prisma } from "@/lib/db";
import { istDayStart, istDayStartOffset } from "@/lib/date";
import AppointmentsClient, { type ApptRow } from "./AppointmentsClient";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; date?: string }>;
}) {
  const prefill = await searchParams;
  const todayStart = istDayStart();
  const weekEnd = istDayStartOffset(8);

  const appts = await prisma.appointment.findMany({
    where: { date: { gte: todayStart, lt: weekEnd } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });

  const rows: ApptRow[] = appts.map((a) => ({
    id: a.id,
    name: a.name,
    phone: a.phone,
    date: a.date.toISOString(),
    timeSlot: a.timeSlot,
    visitType: a.visitType,
    notes: a.notes,
    status: a.status,
  }));

  const days = Array.from({ length: 8 }, (_, i) => {
    const start = istDayStartOffset(i);
    const end = istDayStartOffset(i + 1);
    return {
      iso: start.toISOString(),
      offset: i,
      rows: rows.filter((r) => {
        const d = new Date(r.date);
        return d >= start && d < end;
      }),
    };
  });

  return (
    <AppointmentsClient
      days={days}
      prefill={{ name: prefill.name, phone: prefill.phone, date: prefill.date }}
    />
  );
}
