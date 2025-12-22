import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auth state file paths
const authFile = join(__dirname, '.auth/user.json');
const adminAuthFile = join(__dirname, '.auth/admin.json');

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter configuration */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for the app */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying failed tests */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Reasonable timeouts */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Test timeout */
  timeout: 30000,

  /* Configure test projects */
  projects: [
    // Setup project - runs authentication
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Main tests - run with user authentication
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
      testIgnore: [/admin\.spec\.ts/, /auth\.spec\.ts/],
    },

    // Admin tests - run with admin authentication
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminAuthFile,
      },
      dependencies: ['setup'],
      testMatch: /admin\.spec\.ts/,
    },

    // Auth tests - run without pre-authentication (test login/register flows)
    {
      name: 'chromium-no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /auth\.spec\.ts/,
    },
  ],

  /* Run frontend dev server before starting tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
