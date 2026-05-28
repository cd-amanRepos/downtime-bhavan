import { NextResponse } from 'next/server';
import { eq, and, desc, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { hashOtp } from '@/lib/otp';
import { createCipheriv, randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const ENC_KEY = (() => {
  const raw = process.env.DTB_PHONE_ENC_KEY ?? 'dev-32-byte-key-replace-in-prod!';
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'));
})();

function encryptPhone(e164: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([c.update(e164, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export async function POST(req: Request) {
  let body: { phone: string; otp: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (!body.otp || !/^\d{6}$/.test(body.otp)) return NextResponse.json({ error: 'invalid_otp' }, { status: 400 });

  const phoneHash = hashPhone(phone);
  const codeHash = hashOtp(body.otp);
  const db = getDb();
  const now = Date.now();

  const otp = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, phoneHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, now),
    ))
    .orderBy(desc(schema.otpAttempts.createdAt))
    .get();

  if (!otp) return NextResponse.json({ error: 'otp_wrong_or_expired' }, { status: 403 });

  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, otp.id)).run();

  // Activate the most recent pending subscription for this phone
  const pending = db.select().from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'pending_otp')))
    .orderBy(desc(schema.subscriptions.createdAt))
    .get();
  if (!pending) return NextResponse.json({ error: 'no_pending' }, { status: 404 });

  db.update(schema.subscriptions).set({
    status: 'active',
    activatedAt: now,
    phoneCiphertext: encryptPhone(phone),
  }).where(eq(schema.subscriptions.id, pending.id)).run();

  return NextResponse.json({ ok: true, subscriptionId: pending.id, siteId: pending.siteId });
}
