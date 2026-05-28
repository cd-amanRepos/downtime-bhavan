import { NextResponse } from 'next/server';
import { eq, and, desc, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { normalizeEmail, hashEmail } from '@/lib/email';
import { hashOtp } from '@/lib/otp';
import { createCipheriv, randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const ENC_KEY = (() => {
  const raw = process.env.DTB_PHONE_ENC_KEY ?? 'dev-32-byte-key-replace-in-prod!';
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'));
})();

function encryptContact(contact: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([c.update(contact, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export async function POST(req: Request) {
  let body: {
    contact?: string;
    phone?: string;
    otp: string;
    kind?: 'email' | 'whatsapp';
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  // Backward compat: old clients sent { phone, ... } — treat as WhatsApp
  let contact = body.contact;
  let kind: 'email' | 'whatsapp' = body.kind ?? 'email';
  if (!contact && body.phone) {
    contact = body.phone;
    kind = 'whatsapp';
  }

  if (!contact) return NextResponse.json({ error: 'invalid_contact' }, { status: 400 });
  if (!body.otp || !/^\d{6}$/.test(body.otp)) return NextResponse.json({ error: 'invalid_otp' }, { status: 400 });

  // Validate and normalize contact by kind
  let normalizedContact: string;
  let contactHash: string;

  if (kind === 'email') {
    const email = normalizeEmail(contact);
    if (!email) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    normalizedContact = email;
    contactHash = hashEmail(email);
  } else {
    // whatsapp
    const phone = normalizeIndianPhone(contact);
    if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    normalizedContact = phone;
    contactHash = hashPhone(phone);
  }

  const codeHash = hashOtp(body.otp);
  const db = getDb();
  const now = Date.now();

  const otp = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, contactHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.kind, kind),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, now),
    ))
    .orderBy(desc(schema.otpAttempts.createdAt))
    .get();

  if (!otp) return NextResponse.json({ error: 'otp_wrong_or_expired' }, { status: 403 });

  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, otp.id)).run();

  // Activate the most recent pending subscription for this contact
  const pending = db.select().from(schema.subscriptions)
    .where(and(
      eq(schema.subscriptions.phoneHash, contactHash),
      eq(schema.subscriptions.status, 'pending_otp'),
    ))
    .orderBy(desc(schema.subscriptions.createdAt))
    .get();
  if (!pending) return NextResponse.json({ error: 'no_pending' }, { status: 404 });

  db.update(schema.subscriptions).set({
    status: 'active',
    activatedAt: now,
    phoneCiphertext: encryptContact(normalizedContact),
  }).where(eq(schema.subscriptions.id, pending.id)).run();

  return NextResponse.json({ ok: true, subscriptionId: pending.id, siteId: pending.siteId });
}
