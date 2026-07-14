import { buildReport } from "@/lib/reports";
import { istISODate, istDayRangeFromISO } from "@/lib/date";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const todayIso = istISODate();
  const fromIso = from || todayIso;
  const toIso = to || fromIso;

  const { start } = istDayRangeFromISO(fromIso);
  const { end } = istDayRangeFromISO(toIso);

  const data = await buildReport(start, end);

  return (
    <ReportsClient data={data} fromIso={fromIso} toIso={toIso} todayIso={todayIso} />
  );
}
