import { describe, it, expect } from 'vitest';
import { signAdminCookie, verifyAdminCookie } from './admin-auth.js';

const SECRET = 'test-secret-32-chars-xxxxxxxxxxxx';

describe('admin-auth', () => {
  it('signs and verifies a fresh cookie', async () => {
    const cookie = await signAdminCookie(SECRET);
    expect(await verifyAdminCookie(cookie, SECRET)).toBe(true);
  });

  it('rejects a tampered cookie', async () => {
    const cookie = await signAdminCookie(SECRET);
    const tampered = cookie.slice(0, -3) + 'aaa';
    expect(await verifyAdminCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects cookies signed with a different secret', async () => {
    const cookie = await signAdminCookie(SECRET);
    expect(await verifyAdminCookie(cookie, 'other-secret')).toBe(false);
  });

  it('rejects an empty/malformed cookie', async () => {
    expect(await verifyAdminCookie('', SECRET)).toBe(false);
    expect(await verifyAdminCookie('abc', SECRET)).toBe(false);
    expect(await verifyAdminCookie('a.b', SECRET)).toBe(false);
  });

  it('rejects a cookie older than 7 days', async () => {
    // Manually craft an old cookie
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const oldCookie = await signAdminCookie(SECRET, tenDaysAgo);
    expect(await verifyAdminCookie(oldCookie, SECRET)).toBe(false);
  });
});
