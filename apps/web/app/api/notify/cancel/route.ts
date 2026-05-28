import { NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { hashOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { phone, otp } = await req.json() as { phone: string; otp: string };
  const e164 = normalizeIndianPhone(phone);
  if (!e164) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  const phoneHash = hashPhone(e164);
  const codeHash = hashOtp(otp ?? '');

  const db = getDb();
  const valid = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, phoneHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, Date.now()),
    )).get();
  if (!valid) return NextResponse.json({ error: 'otp_wrong' }, { status: 403 });
  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, valid.id)).run();

  // Cancel all active subs for this phone
  const updated = db.update(schema.subscriptions)
    .set({ status: 'cancelled', phoneCiphertext: null })
    .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'active')))
    .run();
  return NextResponse.json({ ok: true, cancelled: updated.changes });
}
