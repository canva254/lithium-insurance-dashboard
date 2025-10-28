import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Authentication', () => {
  test('allows admin to sign in and reach dashboard', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByText('Real-time insight into policies, revenue, and portfolio distribution.')).toBeVisible();
  });
});
