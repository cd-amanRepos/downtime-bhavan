import { NextResponse } from 'next/server';
import { eq, gte, and, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { generateOtp, hashOtp } from '@/lib/otp';
import { getClientIpHash } from '@/lib/ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdapter } from '@/lib/whatsapp-adapter';
import { countActiveByPhone, MAX_ACTIVE_PER_PHONE } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTPS_PER_PHONE_PER_HOUR = 3;

export async function POST(req: Request) {
  let body: { phone: string; siteId: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (!body.siteId) return NextResponse.json({ error: 'invalid_site' }, { status: 400 });

  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, body.siteId)).get();
  if (!site || !site.enabled) return NextResponse.json({ error: 'site_not_tracked' }, { status: 400 });

  const ipHash = getClientIpHash(req.headers);
  const phoneHash = hashPhone(phone);

  // Rate limit by IP (system-wide abuse) AND by phone (OTP spam to a number)
  const rl = checkRateLimit(db, ipHash, 'grievance:submit'); // reuse existing limit for now
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const hourAgo = Date.now() - 60 * 60_000;
  const recentOtps = db.select({ n: count() }).from(schema.otpAttempts)
    .where(and(eq(schema.otpAttempts.phoneHash, phoneHash), gte(schema.otpAttempts.createdAt, hourAgo)))
    .get()?.n ?? 0;
  if (recentOtps >= MAX_OTPS_PER_PHONE_PER_HOUR) {
    return NextResponse.json({ error: 'too_many_otps' }, { status: 429 });
  }

  // Cap active alerts
  if (countActiveByPhone(db, phoneHash) >= MAX_ACTIVE_PER_PHONE) {
    return NextResponse.json({ error: 'max_alerts_reached', max: MAX_ACTIVE_PER_PHONE }, { status: 409 });
  }

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const now = Date.now();

  db.insert(schema.otpAttempts).values({
    phoneHash, codeHash, purpose: 'notify_signup',
    expiresAt: now + OTP_TTL_MS, used: false, ipHash, createdAt: now,
  }).run();

  // Also store a pending subscription so verify can find which site we wanted
  db.insert(schema.subscriptions).values({
    siteId: body.siteId, phoneHash, phoneCiphertext: null /* we encrypt at verify */,
    status: 'pending_otp', createdAt: now,
  }).run();

  const adapter = await getAdapter();
  const sent = await adapter.sendOtp({ toE164: phone, otp });
  if (!sent.ok) return NextResponse.json({ error: 'send_failed', detail: sent.error }, { status: 502 });

  // Return masked phone so the modal can display it
  return NextResponse.json({ ok: true, maskedPhone: maskForResponse(phone) });
}

function maskForResponse(e164: string): string {
  const m = e164.match(/^\+91(\d{2})\d{5}(\d{3})$/);
  if (!m) return e164;
  return `+91 ${m[1]}••• ••${m[2]}`;
}
