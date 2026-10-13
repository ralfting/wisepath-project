import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests boot the real Nest app against a throwaway Postgres
 * database (wisepath_test, reset before the run) and call it through the
 * client generated from the shared contract.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://wisepath:wisepath@localhost:5432/wisepath_test';

export default defineConfig({
  // Nest needs decorator metadata, which esbuild doesn't emit
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    env: { DATABASE_URL: testDatabaseUrl, JWT_SECRET: 'test-only', NODE_ENV: 'test' },
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
