import { test, expect } from '@playwright/test';

test.describe('Role-based Access Control', () => {
  test('Edit button should be visible for Founder', async ({ page }) => {
    // Mock login response as founder
    await page.route('**/api/login', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-token',
        user: { id: 1, name: 'Founder User', email: 'founder@example.com', role: 'founder' }
      })
    }));

    // Mock projects response
    await page.route('**/api/projects', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 1, title: 'Test Project', status: 'assigned' }
        ]
      })
    }));

    // Mock project detail response
    await page.route('**/api/projects/1', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: { id: 1, title: 'Test Project', status: 'assigned', department: { name: 'IT' } },
        progress: [],
        overdue: false,
        progress_percentage: 0
      })
    }));

    await page.goto('/');

    // Assuming login redirects to dashboard
    // We would simulate filling login form here
    // But since this is a unit test of the UI, we can just navigate to the project detail page
    // if the app supports direct navigation when authenticated.
    
    // For simplicity, we just assert the edit button exists on the project detail page when we get there
    // In a real app we'd interact with the login form first:
    await page.fill('input[placeholder="Email"]', 'founder@example.com');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Login")');

    // Wait for projects page or click project
    await page.waitForURL('**/dashboard**');
    await page.goto('/projects/1');
    
    // Check if Edit button exists
    await expect(page.locator('text=Edit')).toBeVisible();
  });

  test('Edit button should NOT be visible for Employee', async ({ page }) => {
    // Mock login response as standard employee
    await page.route('**/api/login', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-token',
        user: { id: 2, name: 'Standard User', email: 'user@example.com', role: 'employee' }
      })
    }));

    await page.route('**/api/projects', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 1, title: 'Test Project', status: 'assigned' }
        ]
      })
    }));

    await page.route('**/api/projects/1', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: { id: 1, title: 'Test Project', status: 'assigned', department: { name: 'IT' } },
        progress: [],
        overdue: false,
        progress_percentage: 0
      })
    }));

    await page.goto('/');
    
    await page.fill('input[placeholder="Email"]', 'user@example.com');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Login")');

    await page.waitForURL('**/dashboard**');
    await page.goto('/projects/1');
    
    // Check if Edit button does NOT exist
    await expect(page.locator('text=Edit')).toBeHidden();
  });
});
