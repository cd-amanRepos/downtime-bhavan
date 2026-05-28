import { and, eq, gte } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';

export const RATE_LIMITS = {
  'grievance:submit': { perMinute: 5, perHour: 30 },
  'grievance:react':  { perMinute: 60, perHour: 600 },
  'grievance:report': { perMinute: 10, perHour: 60 },
} as const;
export type RateLimitAction = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Check + record a rate-limited action. ATOMIC: this function both reads
 * the existing counts and increments the current slot in one logical step.
 * Call BEFORE doing the work; if `allowed: true`, proceed; otherwise reject.
 *
 * Uses two windows simultaneously:
 *   - perMinute: count in the current 60-second slot
 *   - perHour:   sum across all slots in the last 60 minutes
 *
 * `now` is injectable for tests.
 */
export function checkRateLimit(
  db: Db,
  ipHash: string,
  action: RateLimitAction,
  now: number = Date.now(),
): RateLimitResult {
  const limits = RATE_LIMITS[action];
  const currentSlot = Math.floor(now / 60_000);
  const hourAgoSlot = currentSlot - 60;

  // Sum of attempts in the last 60 slots
  const recent = db.select().from(schema.rateLimitAttempts)
    .where(and(
      eq(schema.rateLimitAttempts.action, action),
      eq(schema.rateLimitAttempts.ipHash, ipHash),
      gte(schema.rateLimitAttempts.slotMinute, hourAgoSlot),
    ))
    .all();

  const hourCount = recent.reduce((sum, r) => sum + r.count, 0);
  const currentSlotCount = recent.find((r) => r.slotMinute === currentSlot)?.count ?? 0;

  if (currentSlotCount >= limits.perMinute) {
    return { allowed: false, retryAfterMs: 60_000 - (now % 60_000) };
  }
  if (hourCount >= limits.perHour) {
    return { allowed: false, retryAfterMs: 60 * 60_000 }; // approximate
  }

  // Allowed — record the attempt
  db.insert(schema.rateLimitAttempts).values({
    action, ipHash, slotMinute: currentSlot, count: 1,
  }).onConflictDoUpdate({
    target: [schema.rateLimitAttempts.action, schema.rateLimitAttempts.ipHash, schema.rateLimitAttempts.slotMinute],
    set: { count: currentSlotCount + 1 },
  }).run();

  return { allowed: true };
}
