import { NextResponse } from "next/server";
import { createIntake, type IntakePayload } from "@/lib/intake-service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { ok } = rateLimit(`intake:${ip}`, { max: 8, windowMs: 60 * 60 * 1000 });
  if (!ok) return bad("Too many submissions. Please try again later.", 429);

  let body: (IntakePayload & { honeypot?: string }) | null = null;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request body.");
  }
  if (!body) return bad("Missing body.");

  // Honeypot — bots fill hidden fields.
  if (body.honeypot && body.honeypot.trim() !== "") {
    // Pretend success to not tip off the bot.
    return NextResponse.json({ token: "000", ok: true });
  }

  // Minimal server-side validation of required fields.
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("name");
  if (!body.phone || !/^\d{10}$/.test(body.phone)) errors.push("phone");
  if (!body.age || body.age < 1 || body.age > 120) errors.push("age");
  if (!body.gender) errors.push("gender");
  if (!body.visitType) errors.push("visitType");
  if (typeof body.hasAppointment !== "boolean") errors.push("hasAppointment");
  if (!body.chiefComplaint?.trim()) errors.push("chiefComplaint");
  if (!body.duration) errors.push("duration");
  if (!body.symptoms) errors.push("symptoms");
  if (!body.consentGiven) errors.push("consent");

  if (errors.length) {
    return bad(`Please complete required fields: ${errors.join(", ")}`);
  }

  try {
    const result = await createIntake(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save intake.";
    return bad(message, 500);
  }
}
