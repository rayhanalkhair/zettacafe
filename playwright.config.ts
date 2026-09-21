import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;

/**
 * End-to-end tests run against the PRODUCTION build (`npm run build`), served by a
 * plain static server. That is the artifact a visitor gets, so it is the one worth
 * testing: budgets, lazy chunks and compiled-out dev pages all apply.
 *
 * Isolation: every test gets a fresh browser context, and therefore an empty
 * IndexedDB and localStorage. The in-browser database re-seeds itself on first use,
 * so no test can see another's orders, credit or stock, and none needs a reset hook.
 */
export default defineConfig({
  testDir: './e2e/specs',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // The app follows the OS colour scheme; specs that care set it themselves.
    colorScheme: 'light',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
