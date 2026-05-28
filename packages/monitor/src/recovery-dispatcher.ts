import { eq, and } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';
import { sendRecoveryMessage } from './whatsapp-send.js';
import { sendRecoveryEmail } from './email-send.js';
import { createDecipheriv } from 'node:crypto';

const ENC_KEY = (() => {
  const raw = process.env.DTB_PHONE_ENC_KEY ?? 'dev-32-byte-key-replace-in-prod!';
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'));
})();

function decryptPhone(ciphertextB64: string): string | null {
  try {
    const buf = Buffer.from(ciphertextB64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const d = createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export async function dispatchRecoveryAlerts(
  db: Db,
  justRecoveredSiteIds: string[],
): Promise<void> {
  if (justRecoveredSiteIds.length === 0) return;

  for (const siteId of justRecoveredSiteIds) {
    const site = db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
    if (!site) continue;

    const subs = db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.siteId, siteId),
          eq(schema.subscriptions.status, 'active'),
        ),
      )
      .all();

    for (const sub of subs) {
      if (!sub.phoneCiphertext) continue;
      const contact = decryptPhone(sub.phoneCiphertext);
      if (!contact) {
        db.update(schema.subscriptions).set({ status: 'failed' }).where(eq(schema.subscriptions.id, sub.id)).run();
        continue;
      }
      let res: { ok: boolean; error?: string };
      if (sub.kind === 'email') {
        res = await sendRecoveryEmail(contact, site.name, site.url);
      } else {
        res = await sendRecoveryMessage(contact, site.name, site.url);
      }
      if (res.ok) {
        db.update(schema.subscriptions)
          .set({
            status: 'triggered',
            triggeredAt: Date.now(),
            phoneCiphertext: null,
          })
          .where(eq(schema.subscriptions.id, sub.id))
          .run();
      } else {
        db.update(schema.subscriptions)
          .set({ status: 'failed' })
          .where(eq(schema.subscriptions.id, sub.id))
          .run();
      }
    }
  }
}
