import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end: the built web app against the built API and a database of its own (wisepath_e2e, wiped and migrated
 * on every run by e2e/prepareDatabase.mjs). Ports 4201/4202 leave the dev servers (4001/4002) alone.
 */
const API = 'http://localhost:4201';
const WEB = 'http://localhost:4202';
const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://wisepath:wisepath@localhost:5432/wisepath_e2e';

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/globalTeardown.ts',
  // Each test signs up its own learner, so tests share nothing
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: WEB, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // From apps/api: its migrator reads drizzle/ relative to where it runs
      command: 'node ../web/e2e/prepareDatabase.mjs && node dist/migrate.js && node dist/main.js',
      cwd: '../api',
      url: `${API}/api`,
      env: { DATABASE_URL: databaseUrl, JWT_SECRET: 'e2e-only-secret', FRONTEND_URL: WEB, PORT: '4201', NODE_ENV: 'test' },
      timeout: 60_000,
    },
    {
      command: 'pnpm exec next build && pnpm exec next start -p 4202',
      url: `${WEB}/login`,
      env: { NEXT_PUBLIC_API_URL: `${API}/api`, NEXT_DIST_DIR: '.next-e2e' },
      timeout: 240_000,
    },
  ],
});
