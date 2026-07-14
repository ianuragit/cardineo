import { prisma } from "@/lib/db";
import { istDayStart, istDayStartOffset, daysBetween } from "@/lib/date";
import FollowUpBoard, { type FollowUpCard } from "./FollowUpBoard";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const todayStart = istDayStart();
  const weekEnd = istDayStartOffset(7);

  const [upcoming, overdue] = await Promise.all([
    prisma.followUp.findMany({
      where: { dueDate: { gte: todayStart, lt: weekEnd } },
      include: { patient: true, consultation: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { dueDate: { lt: todayStart }, called: false, booked: false },
      include: { patient: true, consultation: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // last visit lookup per patient
  const patientIds = Array.from(
    new Set([...upcoming, ...overdue].map((f) => f.patientId))
  );
  const lastIntakes = await prisma.intake.findMany({
    where: { patientId: { in: patientIds } },
    select: { patientId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const lastVisitByPatient = new Map<string, Date>();
  for (const it of lastIntakes) {
    if (!lastVisitByPatient.has(it.patientId)) {
      lastVisitByPatient.set(it.patientId, it.createdAt);
    }
  }

  function toCard(f: (typeof upcoming)[number]): FollowUpCard {
    const last = lastVisitByPatient.get(f.patientId);
    return {
      id: f.id,
      name: f.patient.name,
      age: f.patient.age,
      gender: f.patient.gender,
      phone: f.patient.phone,
      dueDate: f.dueDate.toISOString(),
      diagnosis: f.diagnosis ?? f.consultation?.diagnosis ?? null,
      reason: f.reason ?? null,
      daysSinceLastVisit: last ? daysBetween(last) : null,
      called: f.called,
      calledOutcome: f.calledOutcome ?? null,
      booked: f.booked,
    };
  }

  // Build 7 day columns
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = istDayStartOffset(i);
    const end = istDayStartOffset(i + 1);
    const cards = upcoming
      .filter((f) => f.dueDate >= start && f.dueDate < end)
      .map(toCard);
    return { iso: start.toISOString(), offset: i, cards };
  });

  return (
    <FollowUpBoard days={days} overdue={overdue.map(toCard)} />
  );
}
