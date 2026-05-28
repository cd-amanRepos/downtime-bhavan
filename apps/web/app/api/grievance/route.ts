import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { filterGrievance } from '@/lib/grievance-filter';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

const VALID_TAGS = new Set([
  'otp-not-coming', 'error-5xx', 'blank-page', 'slow',
  'login-failed', 'payment-failed', 'other',
]);

export const dynamic = 'force-dynamic';

interface SubmitBody {
  siteId: string;
  tag: string;
  body: string;
  turnstileToken: string;
}

export async function POST(request: Request) {
  let payload: SubmitBody;
  try {
    payload = await request.json() as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!payload.siteId || typeof payload.siteId !== 'string') {
    return NextResponse.json({ error: 'site_required' }, { status: 400 });
  }
  if (!VALID_TAGS.has(payload.tag)) {
    return NextResponse.json({ error: 'invalid_tag' }, { status: 400 });
  }

  const filter = filterGrievance(payload.body ?? '');
  if (!filter.ok) {
    return NextResponse.json({ error: 'moderation_failed', reason: filter.reason }, { status: 422 });
  }

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  // Rate-limit BEFORE Turnstile so abusers don't burn our Cloudflare quota
  const rl = checkRateLimit(db, ipHash, 'grievance:submit');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: rl.retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) } },
    );
  }

  const passed = await verifyTurnstile(payload.turnstileToken, request.headers.get('cf-connecting-ip') ?? undefined);
  if (!passed) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 403 });
  }

  // Confirm the site exists and is enabled
  const site = db.select().from(schema.sites)
    .where(eq(schema.sites.id, payload.siteId)).get();
  if (!site || !site.enabled) {
    return NextResponse.json({ error: 'site_not_tracked' }, { status: 400 });
  }

  const now = Date.now();
  const inserted = db.insert(schema.grievances).values({
    siteId: payload.siteId,
    tag: payload.tag as never, // narrowed by VALID_TAGS check above
    body: payload.body.trim(),
    ipHash,
    createdAt: now,
    visible: true,
    reportsCount: 0,
  }).returning().get();

  emitGrievanceEvent('grievance:new', {
    id: inserted.id,
    siteId: inserted.siteId,
    tag: inserted.tag,
    body: inserted.body,
    createdAt: inserted.createdAt,
  });

  return NextResponse.json({ id: inserted.id, createdAt: inserted.createdAt }, { status: 201 });
}
