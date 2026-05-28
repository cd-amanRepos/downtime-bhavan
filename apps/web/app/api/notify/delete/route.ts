import { NextResponse } from 'next/server';
import { eq, and, desc, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { hashOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { phone: string; otp: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (!body.otp || !/^\d{6}$/.test(body.otp)) {
    return NextResponse.json({ error: 'invalid_otp' }, { status: 400 });
  }

  const phoneHash = hashPhone(phone);
  const codeHash = hashOtp(body.otp);
  const db = getDb();
  const now = Date.now();

  // Verify OTP with purpose='delete_data'
  const otp = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, phoneHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.purpose, 'delete_data'),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, now),
    ))
    .orderBy(desc(schema.otpAttempts.createdAt))
    .get();

  if (!otp) return NextResponse.json({ error: 'otp_wrong_or_expired' }, { status: 403 });

  // Mark OTP used
  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, otp.id)).run();

  // Purge subscriptions: set status='deleted', clear phone ciphertext
  const result = db.update(schema.subscriptions)
    .set({ status: 'deleted', phoneCiphertext: null })
    .where(eq(schema.subscriptions.phoneHash, phoneHash))
    .run();

  const purged = result.changes ?? 0;

  // Delete all OTP attempts for this phone (purge OTP history)
  db.delete(schema.otpAttempts).where(eq(schema.otpAttempts.phoneHash, phoneHash)).run();

  return NextResponse.json({ ok: true, purged });
}
