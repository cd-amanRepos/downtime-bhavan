import { test, expect } from '@playwright/test';

test('homepage renders the 3-column layout with real status data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Department Status/ })).toBeVisible();
  await expect(page.getByText(/Aadhaar/).first()).toBeVisible();
  await expect(page.getByText(/Don't worry/)).toBeVisible();
  await expect(page.getByText(/Janta Darbar/).first()).toBeVisible();
  await expect(page.getByText(/Unofficial Observatory/)).toBeVisible();
});

test('focus mode: clicking notify input collapses side panels', async ({ page }) => {
  await page.goto('/');
  const leftPanel = page.locator('section.col-side').first();
  await expect(leftPanel).toBeVisible();

  const initialBox = await leftPanel.boundingBox();
  expect(initialBox).not.toBeNull();
  expect(initialBox!.width).toBeGreaterThan(100);

  await page.getByPlaceholder(/Aadhaar update portal/).click();
  await page.waitForTimeout(500); // wait for transition

  const collapsedBox = await leftPanel.boundingBox();
  // Either 0-width or hidden — both indicate focus mode active.
  expect(collapsedBox === null || collapsedBox.width < 5).toBeTruthy();

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const restoredBox = await leftPanel.boundingBox();
  expect(restoredBox!.width).toBeGreaterThan(100);
});

test('janta darbar: submitting a grievance shows it in the feed', async ({ page }) => {
  await page.goto('/');

  // Open form
  await page.getByRole('button', { name: /\+ File a grievance/ }).click();

  // Fill form
  await page.getByRole('combobox').first().selectOption({ index: 0 }); // first site
  await page.getByRole('combobox').nth(1).selectOption('otp-not-coming');
  await page.getByPlaceholder('What happened?').fill('e2e test grievance from playwright');

  // Wait for Turnstile to load. In dev with the always-pass key, just wait a moment.
  await page.waitForTimeout(2_500);

  // Submit
  await page.getByRole('button', { name: /^File grievance$/ }).click();

  // Verify it appears in the feed
  await expect(page.getByText('e2e test grievance from playwright')).toBeVisible({ timeout: 8_000 });
});

test('janta darbar: same-here reaction toggles count', async ({ page, request }) => {
  // Seed a grievance via API so the test doesn't depend on the previous test
  await request.post('http://localhost:3210/api/grievance', {
    data: {
      siteId: 'aadhaar-ssup',
      tag: 'blank-page',
      body: 'reaction-test seed grievance',
      turnstileToken: 'dev-token',
    },
  });

  await page.goto('/');
  const griev = page.getByText('reaction-test seed grievance').locator('xpath=ancestor::article');
  await expect(griev).toBeVisible({ timeout: 4_000 });

  const sameBtn = griev.getByRole('button', { name: /same/ });
  const initial = await sameBtn.innerText();

  await sameBtn.click();
  await page.waitForTimeout(500);
  const after = await sameBtn.innerText();
  expect(after).not.toBe(initial);
});

test('nav: all header links resolve to real pages', async ({ page }) => {
  const targets: Array<[string, RegExp]> = [
    ['Status',        /Department Status|Department Register/],
    ['Janta Darbar',  /Janta Darbar/],
    ['Leaderboard',   /Worst Performing/],
    ['Methodology',   /How we know|Where we check/],
    ['API',           /Read-only endpoints/],
  ];
  for (const [link, expected] of targets) {
    await page.goto('/');
    await page.getByRole('navigation').getByText(link, { exact: true }).first().click();
    await expect(page.locator('body')).toContainText(expected);
  }
});

test('footer: donate page loads with UPI ID', async ({ page }) => {
  await page.goto('/donate');
  await expect(page.getByText(/Office of the Chai Fund/)).toBeVisible();
  await expect(page.getByText(/UPI ID/i).first()).toBeVisible();
  // The default UPI fallback is shown when env is unset:
  await expect(page.getByText(/@oksbi|@/)).toBeVisible();
});

test('departments: list shows all enabled sites + links to detail', async ({ page }) => {
  await page.goto('/departments');
  await expect(page.getByRole('heading', { name: /Department Register/ })).toBeVisible();
  await expect(page.getByText(/Aadhaar/)).toBeVisible();
  // Click into the first site row
  const aadhaarLink = page.getByRole('link', { name: /Aadhaar/ }).first();
  await aadhaarLink.click();
  await expect(page.getByText(/All departments|Past 7 days/).first()).toBeVisible({ timeout: 5000 });
});

test('admin: unauth redirects to login', async ({ page }) => {
  await page.goto('/admin/grievances');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin: wrong token shows error, right token enters', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/admin/login');
  await page.getByLabel(/Admin token/i).fill('wrong-token');
  await page.getByRole('button', { name: /Enter/i }).click();
  await expect(page.getByText(/Wrong token/i)).toBeVisible();

  await page.getByLabel(/Admin token/i).fill('dev-admin');
  await page.getByRole('button', { name: /Enter/i }).click();
  await expect(page.getByRole('heading', { name: /Overview/ })).toBeVisible({ timeout: 5_000 });
});

test('notify: request OTP via email returns ok + maskedContact', async ({ request }) => {
  const r = await request.post('http://localhost:3210/api/notify/request', {
    data: { contact: 'test1@example.com', siteId: 'aadhaar-ssup', kind: 'email' },
  });
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.ok).toBe(true);
  expect(data.maskedContact).toMatch(/^te\*\*\*@/);
  expect(data.kind).toBe('email');
});

test('notify: verify with wrong OTP fails 403', async ({ request }) => {
  await request.post('http://localhost:3210/api/notify/request', {
    data: { contact: 'test2@example.com', siteId: 'aadhaar-ssup', kind: 'email' },
  });
  const r = await request.post('http://localhost:3210/api/notify/verify', {
    data: { contact: 'test2@example.com', otp: '000000', kind: 'email' },
  });
  expect(r.status()).toBe(403);
});
