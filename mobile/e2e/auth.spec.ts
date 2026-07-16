import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Go to the app
    await page.goto('/');

    // Check if we are on the login page by looking for the email input
    await expect(page.getByPlaceholder(/username/i).first()).toBeVisible();

    // Fill in credentials
    await page.getByPlaceholder(/username/i).first().fill('mudasir');
    await page.getByPlaceholder(/password/i).first().fill('mudasir123');
    await page.getByText('Sign In →').first().click();

    // Wait for navigation or successful login indicator
    await expect(page.getByText(/active projects|welcome/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/username/i).first().fill('invalid_user');
    await page.getByPlaceholder(/password/i).first().fill('wrong_password');
    await page.getByText('Sign In →').first().click();

    // Look for error message Toast or Text
    await expect(page.getByText(/invalid|unauthorized|failed/i).first()).toBeVisible({ timeout: 5000 });
  });
});
