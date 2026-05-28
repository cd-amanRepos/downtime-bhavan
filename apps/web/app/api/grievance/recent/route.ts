import { NextResponse } from 'next/server';
import { desc, eq, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '40', 10), 100);
  const since = Date.now() - 60 * 60 * 1000; // last hour
  const db = getDb();

  const rows = db.select().from(schema.grievances)
    .where(and(
      eq(schema.grievances.visible, true),
      gte(schema.grievances.createdAt, since),
    ))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(limit)
    .all();

  // attach reaction counts in one extra query
  const reactionRows = db.select().from(schema.reactions).all();
  const reactionCounts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = reactionCounts[r.grievanceId] ?? (reactionCounts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  return NextResponse.json({
    grievances: rows.map((g) => ({
      id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
      reactions: reactionCounts[g.id] ?? {},
    })),
  });
}
