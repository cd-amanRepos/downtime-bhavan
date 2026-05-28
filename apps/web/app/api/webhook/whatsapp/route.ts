import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { hashPhone, normalizeIndianPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// Meta calls GET for webhook verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.DTB_WA_WEBHOOK_VERIFY_TOKEN ?? 'dev-webhook-verify';
  if (mode === 'subscribe' && token === expected) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('forbidden', { status: 403 });
}

// Meta calls POST with delivery status updates + inbound messages (STOP keyword)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Inbound message → STOP handling
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  const msgs = entry?.messages ?? [];
  for (const m of msgs) {
    if (m.type === 'text' && /^stop$/i.test(String(m.text?.body ?? '').trim())) {
      const from = `+${m.from}`;
      const e164 = normalizeIndianPhone(from);
      if (!e164) continue;
      const phoneHash = hashPhone(e164);
      const db = getDb();
      db.update(schema.subscriptions)
        .set({ status: 'cancelled', phoneCiphertext: null })
        .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'active')))
        .run();
    }
  }
  // Status updates (delivered/read/failed) — we don't persist these for V1
  return NextResponse.json({ ok: true });
}
