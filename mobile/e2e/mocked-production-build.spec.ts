import { test, expect } from '@playwright/test';
import { mockCoreApi, ACTIVE_PROJECT } from './support/mock-api';

/**
 * E2E tests for the PRODUCTION `expo export -p web` output, run with the
 * real Laravel API mocked at the network layer (see support/mock-api.ts).
 *
 * Why mocked instead of a live backend: this suite is designed to run
 * anywhere (CI, this sandbox) without requiring PHP/Composer/a database.
 * It is NOT a substitute for auth.spec.ts / dashboard.spec.ts, which hit a
 * real running backend + `expo start --web` and should be run against a
 * live `php artisan serve` locally before every release (see
 * DEVELOPER_GUIDE.md / RELEASE_CHECKLIST.md). What this suite verifies
 * that those can't easily: exact request shapes (method + URL) reaching
 * the network layer, which is how PRODUCTION_AUDIT.md D-14 (the broken
 * "Mark Complete" flow) was confirmed fixed end-to-end.
 *
 * Run against the static production export:
 *   npx expo export -p web --output-dir dist
 *   node e2e/support/static-server.js dist 4173   # separate terminal
 *   npx playwright test e2e/mocked-production-build.spec.ts --config=e2e/mocked.playwright.config.ts
 */

test.describe('Production export — mocked API', () => {
  test('logs in and reaches the dashboard', async ({ page }) => {
    await mockCoreApi(page);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto('/');

    await expect(page.getByPlaceholder(/username/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/username/i).first().fill('mudasir');
    await page.getByPlaceholder(/password/i).first().fill('mudasir123');
    await page.getByText('Sign In →').first().click();

    await expect(page.getByText(/active projects|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 });

    // Production web export must not throw during a normal login+dashboard
    // load. (This is exactly the class of regression D-13/D-14/D-15 left
    // undetected before this session, since the Jest suite wasn't running
    // and nothing exercised the app in a real browser.)
    expect(consoleErrors, `Unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('shows an error toast on invalid credentials and does not navigate', async ({ page }) => {
    await mockCoreApi(page, { loginShouldFail: true });
    await page.goto('/');

    await page.getByPlaceholder(/username/i).first().fill('nobody');
    await page.getByPlaceholder(/password/i).first().fill('wrong');
    await page.getByText('Sign In →').first().click();

    await expect(page.getByText(/invalid username or password/i).first()).toBeVisible({ timeout: 5000 });
    // Still on the login screen.
    await expect(page.getByPlaceholder(/username/i).first()).toBeVisible();
  });

  test('"Mark Complete" calls the dedicated /complete endpoint, not a plain update (D-14 regression)', async ({ page }) => {
    await mockCoreApi(page);
    await page.goto('/');

    await page.getByPlaceholder(/username/i).first().fill('mudasir');
    await page.getByPlaceholder(/password/i).first().fill('mudasir123');
    await page.getByText('Sign In →').first().click();
    await expect(page.getByText(/active projects|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 });

    // Navigate via the UI (click the project card) rather than guessing the
    // resolved URL for an Expo Router group route — this also exercises
    // the real in-app navigation path (ProjectCard -> router.push(...)).
    //
    // Using dispatchEvent instead of click(): the dashboard's ProjectCard
    // list re-renders continuously enough (root cause not chased down as
    // part of this pass — see PRODUCTION_AUDIT.md D-17) that Playwright's
    // normal actionability wait ("element must stay attached/stable for a
    // frame") never settles and times out. dispatchEvent fires the click
    // on whatever element currently matches without waiting for stability,
    // which is enough to prove the navigation + API call this test cares
    // about, but doesn't exercise real pointer/gesture behavior.
    await page.getByText(ACTIVE_PROJECT.title).first().dispatchEvent('click');
    await expect(page.getByText('✅ Mark Complete')).toBeVisible({ timeout: 15000 });

    const completeRequest = page.waitForRequest(
      (req) => req.url().includes(`/projects/${ACTIVE_PROJECT.id}/complete`) && req.method() === 'PATCH'
    );

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByText('✅ Mark Complete').click();

    const req = await completeRequest;
    expect(req.method()).toBe('PATCH');
    expect(req.url()).toContain(`/projects/${ACTIVE_PROJECT.id}/complete`);

    // The "Mark Complete" action button only renders while the project is
    // not yet finished (see app/(drawer)/projects/[id].tsx: `canProgress &&
    // !finished`), so its disappearance after the mutation's cache
    // invalidation re-fetches the (now-completed) project is a reliable,
    // specific signal that the UI actually reflected the change — more
    // reliable here than matching "completed" text, which also matches
    // hidden status-dropdown options elsewhere on the page.
    await expect(page.getByText('✅ Mark Complete')).toBeHidden({ timeout: 5000 });
  });

  test('refreshing on a nested route does not blank-screen (SPA fallback)', async ({ page }) => {
    await mockCoreApi(page);
    await page.goto('/');
    await page.getByPlaceholder(/username/i).first().fill('mudasir');
    await page.getByPlaceholder(/password/i).first().fill('mudasir123');
    await page.getByText('Sign In →').first().click();
    await expect(page.getByText(/active projects|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 });

    await page.reload();

    await expect(page.getByText(/active projects|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 });
    // A blank body here would mean the static host / electron-serve
    // equivalent isn't falling back to index.html correctly for this route.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});
