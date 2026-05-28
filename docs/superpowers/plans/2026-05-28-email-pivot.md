# Plan 8 — Email Notify-Me Pivot (WhatsApp → Coming Soon)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Why:** WhatsApp Cloud API setup requires Meta business verification + template approval (1-2 days minimum, often longer). We need notify-me functional for launch traffic NOW. SMS isn't actually free in India (~₹0.20-3 per msg + DLT registration with TRAI takes 1-2 weeks). **Email is genuinely free** at our scale via Resend (3,000/month free tier).

**Goal:** Swap the V1 notify-me channel from WhatsApp to email. Reuse the entire adapter pattern + OTP flow + subscription model that Plan 6 already built — just plug in an `EmailAdapter` and update the UI from "phone number" to "email address". Mark the existing WhatsApp path as "coming soon" so users know it's intentional, not abandoned.

**Architecture:**
- New `EmailAdapter` (Resend-backed) sits behind the same `NotifyAdapter` interface alongside the existing `WhatsAppAdapter`. Factory picks `email` by default when `DTB_EMAIL_API_KEY` is set; falls back to DryRun.
- Subscriptions schema stays — `phone_hash` / `phone_ciphertext` columns are reused to store the email hash + ciphertext (semantically they become "contact" columns; a follow-up migration renames them in V1.2).
- A new `kind` column on `subscriptions` and `otp_attempts` (`'email'` | `'whatsapp'`) so future WhatsApp signups can coexist without conflict.
- Resend sender: launch with `noreply@resend.dev` (works instantly, no domain verification). Plan 8.1: swap to `alerts@downtimebhavan.in` once domain is verified in Resend (~30 min, SPF/DKIM/DMARC records at registrar).
- UI: hero copy and NotifyFlow modal swap to email. A small "🟢 WhatsApp alerts · coming soon" pill goes near the form so users see the WhatsApp work isn't abandoned.

**Builds on:** `v1.0.0` (commit `4758356`).

---

## File structure (additions/modifications)

```
apps/web/
├── lib/
│   ├── email.ts                      # NEW: normalize, hash, mask email
│   ├── email.test.ts                 # NEW
│   ├── email-adapter.ts              # NEW: Resend impl
│   ├── notify-adapter.ts             # NEW: shared interface (was whatsapp-adapter.ts)
│   ├── whatsapp-adapter.ts           # KEPT but unused at runtime
│   └── whatsapp-cloud.ts             # KEPT for v1.x WhatsApp revival
├── app/
│   └── api/
│       ├── notify/
│       │   ├── request/route.ts      # MODIFY: accept { contact, siteId, kind? }
│       │   └── verify/route.ts       # MODIFY: accept { contact, otp }
├── components/
│   ├── NotifyFlow.tsx                # MODIFY: email field instead of +91 phone
│   ├── NotifyHero.tsx                # MODIFY: copy + WhatsApp-coming-soon pill
│   └── DeleteFlow.tsx                # MODIFY: email field
packages/db/
├── src/schema.ts                     # MODIFY: add `kind` to subscriptions + otp_attempts
└── migrations/0004_<name>.sql        # auto-generated
packages/monitor/src/
├── recovery-dispatcher.ts            # MODIFY: read kind, dispatch via correct adapter
└── email-send.ts                     # NEW: minimal Resend send (mirrors whatsapp-send.ts)
.env.example                          # MODIFY: add DTB_EMAIL_API_KEY, DTB_EMAIL_FROM
```

---

## Task 1 — DB additions (kind column)

**Files:**
- Modify: `packages/db/src/schema.ts`

- [ ] **Step 1: Add `kind` column to both tables**

In `subscriptions`, after `phoneCiphertext`, add:

```typescript
    kind: text('kind', { enum: ['email', 'whatsapp'] }).notNull().default('email'),
```

In `otpAttempts`, after `purpose`, add:

```typescript
    kind: text('kind', { enum: ['email', 'whatsapp'] }).notNull().default('email'),
```

NOTE: Default `'email'` because Plan 8 makes email the primary channel. Existing rows from Plan 6 get this default automatically.

- [ ] **Step 2: Generate + commit**

```bash
npm -w @dtb/db run migrate:generate
npm run db:migrate
git add packages/db
git commit -m "feat(db): add 'kind' column to subscriptions + otp_attempts (0004)

Channel discriminator — 'email' (default, Plan 8) | 'whatsapp' (Plan 6,
currently parked). Existing rows backfill to 'email' so they don't appear
as orphaned WhatsApp subs."
```

---

## Task 2 — Email pure helpers (TDD)

**Files:**
- Create: `apps/web/lib/email.ts` + `email.test.ts`

- [ ] **Step 1: Tests**

`apps/web/lib/email.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeEmail, hashEmail, maskEmail, looksLikeEmail } from './email.js';

describe('normalizeEmail', () => {
  it.each([
    ['Foo@Bar.com', 'foo@bar.com'],
    ['  hi@gmail.com  ', 'hi@gmail.com'],
    ['user+tag@gmail.com', 'user+tag@gmail.com'],
  ])('lowercases + trims: %s → %s', (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it('rejects empty, missing @, or whitespace-only', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail('notanemail')).toBeNull();
    expect(normalizeEmail('two@@signs.com')).toBeNull();
  });

  it('rejects clearly disposable domains', () => {
    expect(normalizeEmail('x@mailinator.com')).toBeNull();
    expect(normalizeEmail('x@10minutemail.com')).toBeNull();
  });
});

describe('hashEmail', () => {
  it('returns deterministic 64-char hex', () => {
    const a = hashEmail('foo@bar.com');
    const b = hashEmail('foo@bar.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('case insensitive', () => {
    expect(hashEmail('FOO@bar.com')).toBe(hashEmail('foo@bar.com'));
  });
});

describe('maskEmail', () => {
  it('keeps first 2 + first letter of domain', () => {
    expect(maskEmail('amanthapliyal@gmail.com')).toBe('am***@g***.com');
    expect(maskEmail('hi@downtimebhavan.in')).toBe('hi@d***.in');
  });
});

describe('looksLikeEmail', () => {
  it('quick predicate without throwing', () => {
    expect(looksLikeEmail('foo@bar.com')).toBe(true);
    expect(looksLikeEmail('not-email')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

`apps/web/lib/email.ts`:

```typescript
import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_EMAIL_PEPPER ?? 'dev-only-email-pepper-replace-in-prod';

const DISPOSABLE = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'temp-mail.org',
  'throwaway.email', 'yopmail.com', 'tempmail.com', 'fakeinbox.com',
]);

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(input: string): string | null {
  if (!input) return null;
  const e = input.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return null;
  const domain = e.split('@')[1]!;
  if (DISPOSABLE.has(domain)) return null;
  return e;
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase() + ':' + PEPPER).digest('hex');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const [host, tld] = domain.split(/\.(?=[^.]+$)/);
  const shownLocal = local.length <= 2 ? local : local.slice(0, 2) + '***';
  const shownHost = host ? host.charAt(0) + '***' : '?';
  return `${shownLocal}@${shownHost}.${tld ?? ''}`;
}

export function looksLikeEmail(s: string): boolean {
  return typeof s === 'string' && EMAIL_RE.test(s.trim().toLowerCase());
}
```

- [ ] **Step 3: Run + commit**

```bash
npm -w @dtb/web test
git add apps/web/lib/email.ts apps/web/lib/email.test.ts
git commit -m "feat(notify): pure email helpers — normalize, hash, mask

Lowercases + trims, rejects disposable domains + malformed addresses,
SHA-256 with pepper for de-dup, masks for display."
```

---

## Task 3 — NotifyAdapter interface + EmailAdapter (Resend)

**Files:**
- Create: `apps/web/lib/notify-adapter.ts`, `apps/web/lib/email-adapter.ts`
- Modify: `.env.example`

- [ ] **Step 1: Append to `.env.example`**

```bash
# === Email notify-me (Plan 8 — primary V1 channel) ===
# Resend API key. Free tier: 3,000 emails/month, 100/day. Sign up at resend.com
# When unset, falls back to DryRun adapter (logs to /tmp/dtb-emails.log).
DTB_EMAIL_API_KEY=

# Sender address. Resend's default 'onresend.dev' works instantly without domain
# verification — use it to launch. After verifying downtimebhavan.in in Resend,
# swap to alerts@downtimebhavan.in.
DTB_EMAIL_FROM=Downtime Bhavan <onboarding@resend.dev>

# Pepper for hashing email addresses at rest.
DTB_EMAIL_PEPPER=dev-only-email-pepper-replace-in-prod
```

- [ ] **Step 2: Unified adapter interface**

`apps/web/lib/notify-adapter.ts`:

```typescript
export interface SendOtpParams {
  to: string;          // E.164 phone OR email — adapter knows which
  otp: string;
  kind: 'email' | 'whatsapp';
}
export interface SendRecoveryParams {
  to: string;
  kind: 'email' | 'whatsapp';
  siteName: string;
  siteUrl: string;
}
export interface NotifyAdapter {
  sendOtp(p: SendOtpParams): Promise<{ ok: boolean; error?: string }>;
  sendRecovery(p: SendRecoveryParams): Promise<{ ok: boolean; error?: string }>;
}

/** Pick the right adapter based on env presence.
 *  Email is primary; WhatsApp comes back once Meta approves. */
export async function getNotifyAdapter(kind: 'email' | 'whatsapp'): Promise<NotifyAdapter> {
  if (kind === 'whatsapp') {
    const haveWa = !!process.env.DTB_WA_PHONE_NUMBER_ID && !!process.env.DTB_WA_TOKEN;
    if (haveWa) {
      const { CloudApiAdapter } = await import('./whatsapp-cloud.js');
      return new CloudApiAdapter(process.env.DTB_WA_PHONE_NUMBER_ID!, process.env.DTB_WA_TOKEN!);
    }
    // Fall through to DryRun for WhatsApp too
    const { DryRunAdapter } = await import('./whatsapp-dryrun.js');
    return new DryRunAdapter();
  }
  // kind === 'email'
  const haveEmail = !!process.env.DTB_EMAIL_API_KEY;
  if (haveEmail) {
    const { ResendEmailAdapter } = await import('./email-adapter.js');
    return new ResendEmailAdapter(process.env.DTB_EMAIL_API_KEY!);
  }
  const { DryRunEmailAdapter } = await import('./email-adapter.js');
  return new DryRunEmailAdapter();
}
```

- [ ] **Step 3: Email adapter (Resend + DryRun)**

`apps/web/lib/email-adapter.ts`:

```typescript
import type { NotifyAdapter, SendOtpParams, SendRecoveryParams } from './notify-adapter.js';
import { appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FROM = process.env.DTB_EMAIL_FROM ?? 'Downtime Bhavan <onboarding@resend.dev>';
const LOG = join(tmpdir(), 'dtb-emails.log');

function otpBody(otp: string): { subject: string; text: string; html: string } {
  const subject = `${otp} is your Downtime Bhavan code`;
  const text =
    `Your one-time code: ${otp}\n\n` +
    `Use this on downtimebhavan.in to activate your alert.\n` +
    `The code expires in 10 minutes.\n\n` +
    `Didn't request this? Ignore this email.\n\n` +
    `— Downtime Bhavan (unofficial observatory)`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0E1B2D">
      <p style="font-size:11px;letter-spacing:.18em;color:#9BA5B6;text-transform:uppercase;margin:0 0 12px">सूचना सेवा · Citizen Alert Service</p>
      <h1 style="font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 24px">${otp}</h1>
      <p>Your one-time code for <a href="https://downtimebhavan.in" style="color:#1E3A8A">downtimebhavan.in</a>. Expires in 10 minutes.</p>
      <p style="color:#6A7589;font-size:13px;margin-top:24px">Didn't request this? Ignore this email — nothing happens.</p>
      <p style="color:#9BA5B6;font-size:11px;margin-top:24px">— Downtime Bhavan · An unofficial observatory · Not affiliated with any government body.</p>
    </div>`;
  return { subject, text, html };
}

function recoveryBody(siteName: string, siteUrl: string): { subject: string; text: string; html: string } {
  const subject = `✓ ${siteName} is working again`;
  const text =
    `${siteName} is back up.\n\n` +
    `You set an alert for this. Here it is.\n` +
    `Visit ${siteUrl}\n\n` +
    `Don't want more alerts? Visit downtimebhavan.in/delete-my-data\n\n` +
    `— Downtime Bhavan`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0E1B2D">
      <p style="font-size:11px;letter-spacing:.18em;color:#138808;text-transform:uppercase;margin:0 0 12px;font-weight:600">● Site is back</p>
      <h1 style="font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px">${siteName}</h1>
      <p style="font-size:15px;color:#3C4A5E">is working again.</p>
      <p style="margin-top:24px"><a href="${siteUrl}" style="display:inline-block;background:#1E3A8A;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Visit ${siteUrl} →</a></p>
      <p style="color:#9BA5B6;font-size:12px;margin-top:32px">Don't want more alerts? <a href="https://downtimebhavan.in/delete-my-data" style="color:#9BA5B6">Delete my data</a></p>
    </div>`;
  return { subject, text, html };
}

export class ResendEmailAdapter implements NotifyAdapter {
  constructor(private apiKey: string) {}
  private async send(to: string, subject: string, text: string, html: string) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to, subject, text, html }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  async sendOtp({ to, otp }: SendOtpParams) {
    const { subject, text, html } = otpBody(otp);
    return this.send(to, subject, text, html);
  }
  async sendRecovery({ to, siteName, siteUrl }: SendRecoveryParams) {
    const { subject, text, html } = recoveryBody(siteName, siteUrl);
    return this.send(to, subject, text, html);
  }
}

export class DryRunEmailAdapter implements NotifyAdapter {
  private async log(line: string) {
    console.log('[email-dryrun]', line);
    try { await appendFile(LOG, line + '\n'); } catch { /* tmpfs full */ }
  }
  async sendOtp({ to, otp }: SendOtpParams) {
    await this.log(`OTP → ${to} :: ${otp}`);
    return { ok: true };
  }
  async sendRecovery({ to, siteName, siteUrl }: SendRecoveryParams) {
    await this.log(`RECOVERY → ${to} :: ${siteName} (${siteUrl}) is back up`);
    return { ok: true };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/notify-adapter.ts apps/web/lib/email-adapter.ts .env.example
git commit -m "feat(notify): unified NotifyAdapter + Resend EmailAdapter

Email is the primary V1 channel. WhatsApp falls back to the existing
Plan 6 adapter when DTB_WA_TOKEN is set. Both have DryRun fallbacks
that log to /tmp for development. Email templates: plain-text + HTML
with Devanagari eyebrow, navy CTA, masked footer link to /delete-my-data."
```

---

## Task 4 — API: /api/notify/request + /api/notify/verify accept email

**Files:**
- Modify: `apps/web/app/api/notify/request/route.ts`
- Modify: `apps/web/app/api/notify/verify/route.ts`

- [ ] **Step 1: Update request route**

Replace the entire file `apps/web/app/api/notify/request/route.ts` with a version that:

- Accepts `{ contact, siteId, kind?: 'email' | 'whatsapp', purpose?: 'notify_signup' | 'delete_data' }`
- If `kind === 'whatsapp'`, uses existing phone normalize. If `email`, uses normalizeEmail.
- Hashes contact via the right hasher.
- Inserts `kind` into `otp_attempts` and `subscriptions`.
- Picks adapter via `getNotifyAdapter(kind)`.
- Returns `{ ok: true, maskedContact, kind }` instead of `maskedPhone`.

Use the existing route as a starting point. Key changes:
1. New body shape: `{ contact, kind, siteId?, purpose? }` — `contact` is either phone or email depending on `kind`.
2. Default `kind = 'email'` for backward compat with old clients sending `{phone, siteId}` — detect by presence of `phone` field too.
3. Update all error messages to use `'contact'` instead of `'phone'`.

- [ ] **Step 2: Update verify route similarly**

Body: `{ contact, otp, kind?: 'email' | 'whatsapp' }`. Default `'email'`. Hash with the right hasher, look up OTP filtered by `kind`, activate subscription.

- [ ] **Step 3: Build + commit**

```bash
npm run -w @dtb/web build
git add apps/web/app/api/notify
git commit -m "feat(notify): API accepts email as primary channel

Both /api/notify/request and /api/notify/verify now take {contact, kind?}.
'email' is the default kind; 'whatsapp' still works when DTB_WA_TOKEN is set.
Body field renamed phone → contact, response masked* names updated."
```

---

## Task 5 — Recovery dispatcher: dispatch via kind

**Files:**
- Modify: `packages/monitor/src/recovery-dispatcher.ts`
- Create: `packages/monitor/src/email-send.ts`

- [ ] **Step 1: `email-send.ts`**

Minimal Resend client that mirrors `whatsapp-send.ts`. When `DTB_EMAIL_API_KEY` unset, DryRun-logs.

- [ ] **Step 2: dispatcher reads `kind`**

In `dispatchRecoveryAlerts`, for each subscription, branch on `sub.kind`:
- `'email'` → call `sendRecoveryEmail(contact, siteName, siteUrl)` from `email-send.ts`
- `'whatsapp'` → existing `sendRecoveryMessage(contact, siteName, siteUrl)` from `whatsapp-send.ts`

Also: decryption — the same AES-GCM key still decrypts the ciphertext column regardless of channel.

- [ ] **Step 3: Commit**

```bash
git add packages/monitor
git commit -m "feat(monitor): dispatch recovery alerts via subscription.kind"
```

---

## Task 6 — UI: NotifyFlow modal for email

**Files:**
- Modify: `apps/web/components/NotifyFlow.tsx`

- [ ] **Step 1: Replace phone field with email field**

Changes:
1. Remove the `+91` prefix span and `inputMode="numeric"` from phone input.
2. Replace with `<input type="email" placeholder="you@example.com">`.
3. Send `{ contact: email, siteId, kind: 'email' }` to `/api/notify/request`.
4. Confirmation step shows masked email like `am***@g***.com`.
5. Done step copy: "We'll **email** you the moment **{siteName}** starts working again."

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/NotifyFlow.tsx
git commit -m "feat(notify): NotifyFlow uses email instead of phone"
```

---

## Task 7 — Homepage hero: copy + "WhatsApp coming soon" pill

**Files:**
- Modify: `apps/web/components/NotifyHero.tsx`

- [ ] **Step 1: Copy updates**

1. Hero subtitle: change "Get a free **WhatsApp alert**..." to "Get a free **email alert**..."
2. Hint pills row: replace `'WhatsApp delivery'` with `'Email delivery'`
3. Add a small pill below the hint row: `🟢 WhatsApp alerts · coming soon` styled as a soft saffron chip

Example pill:

```tsx
<div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-saffron-soft)] text-[var(--color-saffron)] text-[11px] font-semibold">
  <span>📱</span>
  WhatsApp alerts · coming soon
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/NotifyHero.tsx
git commit -m "feat(web): hero copy → email primary, WhatsApp pill 'coming soon'"
```

---

## Task 8 — DeleteFlow: email

**Files:**
- Modify: `apps/web/components/DeleteFlow.tsx`
- Modify: `apps/web/app/api/notify/delete/route.ts` (already accepts contact, just confirm)

- [ ] **Step 1: Replace phone field with email field**

Same pattern as NotifyFlow Task 6.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/DeleteFlow.tsx apps/web/app/api/notify/delete
git commit -m "feat(notify): DeleteFlow uses email instead of phone"
```

---

## Task 9 — E2E + Deploy + Tag v1.1.0-email

- [ ] **Step 1: Update e2e tests**

Replace the 2 notify-me e2e tests in `apps/web/e2e/homepage.spec.ts` from phone (9876543210) to email (`test@example.com`). Update the maskedPhone regex to maskedContact.

- [ ] **Step 2: Run tests**

```bash
sqlite3 data/dtb.sqlite "DELETE FROM subscriptions; DELETE FROM otp_attempts;"
npm run test:e2e
```

Expected: all 11 tests pass (the 2 notify tests now exercise the email path).

- [ ] **Step 3: Commit + push + version + tag**

```bash
git add apps/web/e2e/homepage.spec.ts
git commit -m "test(web): e2e notify tests use email instead of phone"

npm version 1.1.0-email --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: v1.1.0-email

Plan 8 complete. Email is the V1 notify-me channel:
- Resend (free 3k/month) for delivery; DryRun in dev
- /api/notify/* accepts { contact, kind } — email default
- NotifyFlow + DeleteFlow modals take email
- Hero shows 'WhatsApp coming soon' pill
- Subscriptions + OTPs gain a 'kind' column for forward compat
- WhatsApp adapter + Plan 6 code path preserved; flips on when
  DTB_WA_TOKEN is set"
git tag v1.1.0-email
git push origin main
git push origin v1.1.0-email
```

- [ ] **Step 4: Push Resend secret + deploy**

```bash
# USER:
fly secrets set --app downtime-bhavan \
  DTB_EMAIL_API_KEY=<your Resend API key> \
  DTB_EMAIL_PEPPER=$(openssl rand -hex 32) \
  DTB_EMAIL_FROM="Downtime Bhavan <onboarding@resend.dev>"

fly deploy --app downtime-bhavan
```

- [ ] **Step 5: Live test**

Hit https://downtimebhavan.in, set an alert with your real email, confirm OTP arrives in your inbox, enter it, see success.

```bash
fly ssh console --app downtime-bhavan -C "sqlite3 /data/dtb.sqlite \"SELECT id, site_id, kind, status FROM subscriptions ORDER BY id DESC LIMIT 5;\""
```

Expected: your new sub with `kind=email, status=active`.

---

## Self-Review

**What changes:** Email replaces WhatsApp as the V1 primary channel. WhatsApp stays in the codebase as a parked feature.

**What stays:**
- All OTP flow logic (Plan 6 helpers still work)
- AES-GCM ciphertext storage (now stores encrypted email instead of encrypted phone)
- 5-active-cap, 3-OTP-per-hour limits (apply to email too)
- /admin moderation
- Janta Darbar, monitoring, every other v1.0.0 feature

**What goes away:**
- WhatsApp template approval blocker
- DLT registration headache
- Per-message cost worry (3k/mo email free; Resend → $20/mo for 50k beyond that)

**Resend domain verification (Plan 8.1, do later):**
1. Sign up at resend.com
2. Add domain `downtimebhavan.in` in Resend dashboard
3. Resend gives 3 records to add at your registrar: SPF, DKIM, DMARC
4. Wait for verification (~15 min)
5. Update `DTB_EMAIL_FROM="Downtime Bhavan <alerts@downtimebhavan.in>"` via `fly secrets set`

After verification, the From line is on your own domain — looks much more legitimate to inboxes (no more `onresend.dev`).

---

## Execution Handoff

Subagent-driven. ~9 tasks, ~1-2 hours of dispatch + review. After tag `v1.1.0-email` ships, the deploy + Resend signup + live test are user-side (15 min total).

Ready to start dispatching Task 1.
