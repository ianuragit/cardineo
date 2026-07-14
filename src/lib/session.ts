import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session-const";

export type Role = "doctor" | "receptionist";
export interface Session {
  role: Role;
  iat?: number;
  exp?: number;
}

const COOKIE_NAME = SESSION_COOKIE_NAME;
const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not set or too short. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

/** Returns the active password hash: a DB-stored one (set via Settings) wins,
 *  otherwise the env var. */
async function activePasswordHash(): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "passwordHash" } });
    if (setting?.value) return setting.value;
  } catch {
    /* DB unavailable — fall back to env */
  }
  return process.env.CLINIC_PASSWORD_HASH ?? null;
}

export async function verifyPassword(plain: string): Promise<boolean> {
  const hash = await activePasswordHash();
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Change the clinic password (persisted in DB Setting). */
export async function changePassword(current: string, next: string): Promise<void> {
  const valid = await verifyPassword(current);
  if (!valid) throw new Error("Current password is incorrect.");
  if (!next || next.length < 6) throw new Error("New password must be at least 6 characters.");
  const hash = bcrypt.hashSync(next, 10);
  await prisma.setting.upsert({
    where: { key: "passwordHash" },
    create: { key: "passwordHash", value: hash },
    update: { value: hash },
  });
}

export async function createSession(role: Role): Promise<void> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "doctor" && payload.role !== "receptionist") return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
