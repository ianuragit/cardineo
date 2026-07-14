import { NextResponse } from "next/server";
import Papa from "papaparse";
import { getSession } from "@/lib/session";
import { buildReport } from "@/lib/reports";
import { istDayRangeFromISO, istISODate } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const todayIso = istISODate();
  const fromIso = url.searchParams.get("from") || todayIso;
  const toIso = url.searchParams.get("to") || fromIso;

  const { start } = istDayRangeFromISO(fromIso);
  const { end } = istDayRangeFromISO(toIso);
  const data = await buildReport(start, end);

  const csv = Papa.unparse(
    data.rows.map((r) => ({
      Token: r.token,
      Name: r.name,
      Age: r.age,
      Sex: r.gender,
      "Visit type": r.visitType,
      Complaint: r.complaint,
      Diagnosis: r.diagnosis,
      "Next steps": r.nextSteps,
      "Follow-up date": r.followUpDate,
      Status: r.status,
    }))
  );

  const clinic = (process.env.CLINIC_NAME || "Clinic").replace(/[^a-zA-Z0-9]+/g, "");
  const filename = `${clinic}_Summary_${fromIso}${toIso !== fromIso ? `_to_${toIso}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
