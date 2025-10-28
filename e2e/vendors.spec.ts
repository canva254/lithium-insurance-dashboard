import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Vendors management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('lists vendors and exposes toggle actions', async ({ page }) => {
    await page.goto('/vendors');

    await expect(page.getByRole('heading', { name: 'Vendors' })).toBeVisible();
    await expect(page.getByText('Lithium Motor Insurance')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New vendor' })).toBeVisible();
  });

  test('can create, update, and delete a vendor', async ({ page }) => {
    await page.goto('/vendors');

    const uniqueName = `Playwright Vendor ${Date.now()}`;

    await page.getByRole('button', { name: 'New vendor' }).click();
    await page.getByLabel('Name').fill(uniqueName);
    await page.getByLabel('Website').fill('https://playwright.vendor');
    await page.getByLabel('Contact email').fill('playwright-vendor@example.com');
    await page.getByLabel('Phone').fill('+254700123456');
    await page.getByLabel('Logo URL').fill('https://example.com/logo.png');
    await page.getByLabel('Description').fill('Automated vendor for testing');
    await page.getByRole('button', { name: 'Create vendor' }).click();

    const row = page.locator('table tbody tr', { hasText: uniqueName });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Description').fill('Updated automated vendor');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(row.getByText('Updated automated vendor')).toBeVisible();

    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('table tbody tr', { hasText: uniqueName })).toHaveCount(0);
  });
});
