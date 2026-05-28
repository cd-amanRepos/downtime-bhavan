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
