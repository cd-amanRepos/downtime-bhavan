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
