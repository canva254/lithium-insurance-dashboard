import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Packages management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('lists seeded packages with actions', async ({ page }) => {
    await page.goto('/packages');

    await expect(page.getByRole('heading', { name: 'Packages' })).toBeVisible();
    await expect(page.getByText('Motor Comprehensive')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New package' })).toBeVisible();

    const actionButtons = page.locator('table tbody tr').first().getByRole('button');
    await expect(actionButtons.filter({ hasText: 'Edit' })).toHaveCount(1);
  });

  test('can create, update, and delete a package', async ({ page }) => {
    await page.goto('/packages');

    const uniqueName = `Playwright Package ${Date.now()}`;

    await page.getByRole('button', { name: 'New package' }).click();
    await page.getByLabel('Name').fill(uniqueName);
    await page.getByLabel('Category').selectOption('motor');
    await page.getByLabel('Base price').fill('12345');
    await page.getByLabel('Description').fill('Automated test package');
    await page.getByLabel('Features').fill('Feature 1\nFeature 2');
    await page.getByRole('button', { name: 'Create package' }).click();

    const row = page.locator('table tbody tr', { hasText: uniqueName });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Description').fill('Updated automated package');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(row.getByText('Updated automated package')).toBeVisible();

    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('table tbody tr', { hasText: uniqueName })).toHaveCount(0);
  });
});
