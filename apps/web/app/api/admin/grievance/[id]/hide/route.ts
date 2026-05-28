import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const db = getDb();
  db.update(schema.grievances).set({ visible: false }).where(eq(schema.grievances.id, id)).run();
  emitGrievanceEvent('grievance:hide', { grievanceId: id });
  return NextResponse.redirect(new URL('/admin/grievances', _req.url));
}
