import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Workflow simulator', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('completes motor workflow and receives quote id', async ({ page }) => {
    await page.goto('/workflows');

    await expect(page.getByRole('heading', { name: 'Workflow simulator' })).toBeVisible();
    await expect(page.getByText('Motor Insurance - 3 Step')).toBeVisible();

    await page.getByRole('combobox').first().selectOption('Car');
    await page.getByLabel('Make and model (e.g., Toyota Corolla)').fill('Toyota Corolla');
    await page.getByLabel('Year').fill('2020');
    await page.getByRole('radio', { name: 'Private' }).check();
    await page.getByRole('button', { name: 'Next step' }).click();

    await page.getByRole('radio', { name: 'Comprehensive' }).check();
    await page.getByRole('combobox').first().selectOption('12 months');
    await page.getByRole('button', { name: 'Next step' }).click();

    await page.getByLabel('First Name').fill('Playwright');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Email Address').fill('playwright@example.com');
    await page.getByLabel('Phone Number').fill('+254700000999');
    await page.getByRole('checkbox', { name: /terms and conditions/i }).check();

    await page.getByRole('button', { name: 'Submit flow' }).click();

    await expect(page.getByText('Quote ID:')).toBeVisible({ timeout: 15000 });
  });
});
