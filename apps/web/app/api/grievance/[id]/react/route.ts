import { NextResponse } from 'next/server';
import { eq, and, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

const VALID_KINDS = new Set(['angry', 'sad', 'laugh', 'same']);

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  let kind: string;
  try { ({ kind } = await request.json() as { kind: string }); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  if (!VALID_KINDS.has(kind)) return NextResponse.json({ error: 'bad_kind' }, { status: 400 });

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  const rl = checkRateLimit(db, ipHash, 'grievance:react');
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const grievance = db.select().from(schema.grievances).where(eq(schema.grievances.id, id)).get();
  if (!grievance || !grievance.visible) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Toggle: if the reaction exists, delete it; otherwise insert.
  const existing = db.select().from(schema.reactions)
    .where(and(
      eq(schema.reactions.grievanceId, id),
      eq(schema.reactions.ipHash, ipHash),
      eq(schema.reactions.kind, kind as never),
    )).get();

  let delta: 1 | -1;
  if (existing) {
    db.delete(schema.reactions)
      .where(and(
        eq(schema.reactions.grievanceId, id),
        eq(schema.reactions.ipHash, ipHash),
        eq(schema.reactions.kind, kind as never),
      )).run();
    delta = -1;
  } else {
    db.insert(schema.reactions).values({
      grievanceId: id, ipHash, kind: kind as never, createdAt: Date.now(),
    }).run();
    delta = 1;
  }

  const newCount = db.select({ n: count() }).from(schema.reactions)
    .where(and(eq(schema.reactions.grievanceId, id), eq(schema.reactions.kind, kind as never)))
    .get()?.n ?? 0;

  emitGrievanceEvent('grievance:react', { grievanceId: id, kind, delta });

  return NextResponse.json({ count: newCount, toggled: delta });
}
