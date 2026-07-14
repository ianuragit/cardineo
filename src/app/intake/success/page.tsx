import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const metadata = { title: "Submitted — CardioIntake" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; urgent?: string }>;
}) {
  const { token, urgent } = await searchParams;
  const clinicName = process.env.CLINIC_NAME || "Cardineo Heart Clinic";
  const isUrgent = urgent === "1";

  return (
    <main className="intake-root flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md text-center">
        {isUrgent ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <div className="flex items-center gap-2 font-semibold text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Please inform reception right away
            </div>
            <p className="mt-1 text-sm text-red-700">
              Based on your answers you may need urgent attention. Show this screen to the
              reception staff immediately.
            </p>
          </div>
        ) : (
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-900">Thank you — you're all set</h1>
        <p className="mt-2 text-slate-600">Please show this number at reception.</p>

        <div className="my-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="text-sm uppercase tracking-wide text-slate-500">Your queue number</div>
          <div className="mt-1 text-5xl font-bold text-accent">#{token ?? "—"}</div>
        </div>

        <p className="text-sm text-slate-500">{clinicName}</p>
        <Link href="/intake" className="mt-6 inline-block text-sm text-accent hover:underline">
          Fill another form
        </Link>
      </div>
    </main>
  );
}
