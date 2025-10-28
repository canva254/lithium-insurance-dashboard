import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Authentication guard', () => {
  test('signs out and redirects to login', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL('**/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
