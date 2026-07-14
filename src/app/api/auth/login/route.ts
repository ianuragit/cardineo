import { NextResponse } from "next/server";
import { verifyPassword, createSession, type Role } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const { ok } = rateLimit(`login:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { password?: string; role?: Role } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const role: Role = body?.role === "receptionist" ? "receptionist" : "doctor";
  const password = body?.password ?? "";

  const valid = await verifyPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSession(role);
  return NextResponse.json({ ok: true, role });
}
