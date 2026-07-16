import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each dashboard test
    await page.goto('/');
    await page.getByPlaceholder(/username/i).first().fill('mudasir');
    await page.getByPlaceholder(/password/i).first().fill('mudasir123');
    await page.getByText('Sign In →').first().click();
    
    // Wait for the dashboard to load
    await expect(page.getByText(/active projects|welcome/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should render projects list', async ({ page }) => {
    // Navigate to projects or look for projects on dashboard
    const projectsLink = page.getByRole('link', { name: /projects/i }).first();
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
    } else {
      // Maybe it's in a drawer menu
      const menuButton = page.getByRole('button', { name: /menu|open drawer/i }).first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.getByRole('link', { name: /projects/i }).first().click();
      }
    }

    // Check if the project cards render
    // Look for a generic element that would appear in a ProjectCard
    await expect(page.getByText(/status|deadline|client/i).first()).toBeVisible({ timeout: 15000 });
  });
});
