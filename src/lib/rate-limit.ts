// Very small in-memory fixed-window rate limiter. Adequate for a single-instance
// clinic app; swap for Redis if horizontally scaled.
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) return { ok: false, remaining: 0 };
  return { ok: true, remaining: max - entry.count };
}
