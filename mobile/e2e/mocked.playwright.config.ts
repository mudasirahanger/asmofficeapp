/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import path from 'path';
import fs from 'fs';

// This sandbox has no root/apt access to install Chromium's system shared
// library deps via `playwright install --with-deps`. A single missing lib
// (libXdamage.so.1) was resolved by extracting the .deb directly (no
// install needed) into ~/extra-libs and pointing launchOptions at it. On a
// normal dev machine / CI image none of this override is needed — it's a
// no-op unless that exact env var is set.
const sandboxExecutablePath = path.join(os.homedir(), '.cache/ms-playwright/chromium-1228/chrome-linux/chrome');
const useSandboxOverride = process.env.PW_SANDBOX_CHROME === '1' && fs.existsSync(sandboxExecutablePath);

/**
 * Separate Playwright config for the mocked-API production-export suite
 * (mocked-production-build.spec.ts). Kept separate from playwright.config.ts
 * because that one targets a live backend + `expo start --web` dev server
 * on :8081; this one targets the static `expo export` output on :4173 with
 * no backend required. See mocked-production-build.spec.ts for details.
 *
 * Usage (from mobile/):
 *   npx expo export -p web --output-dir dist
 *   npx playwright test --config=e2e/mocked.playwright.config.ts
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'mocked-production-build.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...(useSandboxOverride ? { launchOptions: { executablePath: sandboxExecutablePath } } : {}),
  },
  webServer: {
    command: 'node support/static-server.js ../dist 4173',
    cwd: __dirname,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
