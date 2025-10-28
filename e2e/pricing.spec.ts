import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Pricing dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders base rates and discounts table', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'Pricing' })).toBeVisible();
    await expect(page.getByText('Base rates')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New discount' })).toBeVisible();
  });

  test('can create and delete a discount', async ({ page }) => {
    await page.goto('/pricing');

    const discountCode = `DISC-${Date.now()}`;

    await page.getByRole('button', { name: 'New discount' }).click();
    await page.getByLabel('Code').fill(discountCode);
    await page.getByLabel('Type').selectOption('percentage');
    await page.getByLabel('Value').fill('5');
    await page.getByLabel('Minimum purchase').fill('10000');
    await page.getByRole('checkbox', { name: 'Active discount' }).check();
    await page.getByRole('button', { name: 'Create discount' }).click();

    const row = page.locator('table tbody tr', { hasText: discountCode });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('table tbody tr', { hasText: discountCode })).toHaveCount(0);
  });
});
