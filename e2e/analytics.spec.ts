import { test, expect } from '@playwright/test';

import { loginAsAdmin } from './utils';

test.describe('Analytics dashboard', () => {
  test('renders summary and activity panels', async ({ page }) => {
    await loginAsAdmin(page);

    try {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    } catch (error) {
      if (!page.url().includes('/analytics')) {
        throw error;
      }
    }

    await page.waitForURL('**/analytics', { timeout: 120_000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 120_000 });

    await expect(page.getByRole('heading', { name: 'Advanced analytics' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Event volume' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Activity stream' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible({ timeout: 120_000 });
  });
});
