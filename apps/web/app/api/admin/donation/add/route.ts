import { NextResponse } from 'next/server';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const amount = parseFloat(String(form.get('amount') ?? '0'));
  const source = String(form.get('source') ?? 'other');
  const note = form.get('note') ? String(form.get('note')) : null;
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'bad_amount' }, { status: 400 });
  }
  const db = getDb();
  db.insert(schema.donations).values({
    amountInr: amount, source, receivedAt: Date.now(), note,
  }).run();
  return NextResponse.redirect(new URL('/admin/donations', req.url));
}
