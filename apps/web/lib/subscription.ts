import { and, eq, count } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';

export const MAX_ACTIVE_PER_PHONE = 5;

export function countActiveByPhone(db: Db, phoneHash: string): number {
  return db.select({ n: count() }).from(schema.subscriptions)
    .where(and(
      eq(schema.subscriptions.phoneHash, phoneHash),
      eq(schema.subscriptions.status, 'active'),
    ))
    .get()?.n ?? 0;
}
