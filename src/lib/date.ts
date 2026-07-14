// All "today"/date-boundary logic is anchored to Asia/Kolkata (IST, UTC+5:30).
// We store UTC in the DB and render/compute day boundaries in IST.

const IST_OFFSET_MIN = 5 * 60 + 30; // +330 minutes

/** Returns the start of the IST day (as a UTC Date) that contains `d`. */
export function istDayStart(d: Date = new Date()): Date {
  const utcMs = d.getTime();
  const istMs = utcMs + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  // Zero out the time in IST
  const dayStartIstMs = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    0,
    0,
    0,
    0
  );
  // Convert that IST midnight back to UTC
  return new Date(dayStartIstMs - IST_OFFSET_MIN * 60_000);
}

/** Start of the day `offset` days from the IST day containing `base`. */
export function istDayStartOffset(offset: number, base: Date = new Date()): Date {
  const start = istDayStart(base);
  return new Date(start.getTime() + offset * 86_400_000);
}

/** [startOfDay, startOfNextDay) UTC range for the IST day containing `d`. */
export function istDayRange(d: Date = new Date()): { start: Date; end: Date } {
  const start = istDayStart(d);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/** Parse a yyyy-mm-dd string as an IST calendar day, return its UTC range. */
export function istDayRangeFromISO(iso: string): { start: Date; end: Date } {
  const [y, m, day] = iso.split("-").map(Number);
  const dayStartIstMs = Date.UTC(y, (m ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  const start = new Date(dayStartIstMs - IST_OFFSET_MIN * 60_000);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/** yyyy-mm-dd for the IST calendar day containing `d`. */
export function istISODate(d: Date = new Date()): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return ist.toISOString().slice(0, 10);
}

/** Human weekday label in IST, e.g. "Mon". */
export function istWeekday(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/** e.g. "14 Jul" in IST. */
export function istDayMonth(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/** e.g. "10:24 AM" in IST. */
export function istTime(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/** e.g. "14 Jul 2026, 10:24 AM" in IST. */
export function istDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/** e.g. "14 Jul 2026" in IST. */
export function istDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/** Whole days between two dates by IST day boundary (b - a). */
export function daysBetween(a: Date, b: Date = new Date()): number {
  const sa = istDayStart(a).getTime();
  const sb = istDayStart(b).getTime();
  return Math.round((sb - sa) / 86_400_000);
}
