import { NextResponse } from 'next/server';
import { eq, gte, and, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone, maskPhone } from '@/lib/phone';
import { normalizeEmail, hashEmail, maskEmail } from '@/lib/email';
import { generateOtp, hashOtp } from '@/lib/otp';
import { getClientIpHash } from '@/lib/ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { getNotifyAdapter } from '@/lib/notify-adapter';
import { countActiveByPhone, MAX_ACTIVE_PER_PHONE } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTPS_PER_CONTACT_PER_HOUR = 3;

export async function POST(req: Request) {
  let body: {
    contact?: string;
    phone?: string;
    siteId?: string;
    kind?: 'email' | 'whatsapp';
    purpose?: 'notify_signup' | 'delete_data';
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

  // Validate and normalize contact by kind
  let normalizedContact: string;
  let contactHash: string;
  let maskedContact: string;

  if (kind === 'email') {
    const email = normalizeEmail(contact);
    if (!email) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    normalizedContact = email;
    contactHash = hashEmail(email);
    maskedContact = maskEmail(email);
  } else {
    // whatsapp
    const phone = normalizeIndianPhone(contact);
    if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    normalizedContact = phone;
    contactHash = hashPhone(phone);
    maskedContact = maskPhone(phone);
  }

  const purpose = body.purpose ?? 'notify_signup';

  // delete_data branch: skip site validation and subscription creation
  if (purpose === 'delete_data') {
    const db = getDb();
    const ipHash = getClientIpHash(req.headers);

    const rl = checkRateLimit(db, ipHash, 'grievance:submit');
    if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const hourAgo = Date.now() - 60 * 60_000;
    const recentOtps = db.select({ n: count() }).from(schema.otpAttempts)
      .where(and(eq(schema.otpAttempts.phoneHash, contactHash), gte(schema.otpAttempts.createdAt, hourAgo)))
      .get()?.n ?? 0;
    if (recentOtps >= MAX_OTPS_PER_CONTACT_PER_HOUR) {
      return NextResponse.json({ error: 'too_many_otps' }, { status: 429 });
    }

    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const now = Date.now();

    db.insert(schema.otpAttempts).values({
      phoneHash: contactHash, codeHash, purpose: 'delete_data', kind,
      expiresAt: now + OTP_TTL_MS, used: false, ipHash, createdAt: now,
    }).run();

    const adapter = await getNotifyAdapter(kind);
    const sent = await adapter.sendOtp({ to: normalizedContact, otp, kind });
    if (!sent.ok) return NextResponse.json({ error: 'send_failed', detail: sent.error }, { status: 502 });

    return NextResponse.json({ ok: true, maskedContact, kind });
  }

  // notify_signup branch (default)
  if (!body.siteId) return NextResponse.json({ error: 'invalid_site' }, { status: 400 });

  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, body.siteId)).get();
  if (!site || !site.enabled) return NextResponse.json({ error: 'site_not_tracked' }, { status: 400 });

  const ipHash = getClientIpHash(req.headers);

  // Rate limit by IP (system-wide abuse) AND by contact (OTP spam to a contact)
  const rl = checkRateLimit(db, ipHash, 'grievance:submit'); // reuse existing limit for now
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const hourAgo = Date.now() - 60 * 60_000;
  const recentOtps = db.select({ n: count() }).from(schema.otpAttempts)
    .where(and(eq(schema.otpAttempts.phoneHash, contactHash), gte(schema.otpAttempts.createdAt, hourAgo)))
    .get()?.n ?? 0;
  if (recentOtps >= MAX_OTPS_PER_CONTACT_PER_HOUR) {
    return NextResponse.json({ error: 'too_many_otps' }, { status: 429 });
  }

  // Cap active alerts
  if (countActiveByPhone(db, contactHash) >= MAX_ACTIVE_PER_PHONE) {
    return NextResponse.json({ error: 'max_alerts_reached', max: MAX_ACTIVE_PER_PHONE }, { status: 409 });
  }

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const now = Date.now();

  db.insert(schema.otpAttempts).values({
    phoneHash: contactHash, codeHash, purpose: 'notify_signup', kind,
    expiresAt: now + OTP_TTL_MS, used: false, ipHash, createdAt: now,
  }).run();

  // Also store a pending subscription so verify can find which site we wanted
  db.insert(schema.subscriptions).values({
    siteId: body.siteId, phoneHash: contactHash, phoneCiphertext: null /* we encrypt at verify */,
    status: 'pending_otp', kind, createdAt: now,
  }).run();

  const adapter = await getNotifyAdapter(kind);
  const sent = await adapter.sendOtp({ to: normalizedContact, otp, kind });
  if (!sent.ok) return NextResponse.json({ error: 'send_failed', detail: sent.error }, { status: 502 });

  // Return masked contact so the modal can display it
  return NextResponse.json({ ok: true, maskedContact, kind });
}
