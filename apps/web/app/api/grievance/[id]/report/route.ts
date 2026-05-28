import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';

const HIDE_THRESHOLD = 3;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  const rl = checkRateLimit(db, ipHash, 'grievance:report');
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const grievance = db.select().from(schema.grievances).where(eq(schema.grievances.id, id)).get();
  if (!grievance) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Note: we don't track WHICH IPs reported (to keep the row narrow). This
  // means the same IP can report multiple times; for V1 that's acceptable.
  const newCount = grievance.reportsCount + 1;
  const nowHidden = newCount >= HIDE_THRESHOLD && grievance.visible;

  db.update(schema.grievances)
    .set({
      reportsCount: newCount,
      ...(nowHidden ? { visible: false } : {}),
    })
    .where(eq(schema.grievances.id, id)).run();

  if (nowHidden) emitGrievanceEvent('grievance:hide', { grievanceId: id });

  return NextResponse.json({ reportsCount: newCount, hidden: !grievance.visible || nowHidden });
}
