import { execSync } from 'node:child_process';

/** A fresh, fully migrated test database for every run */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://wisepath:wisepath@localhost:5432/wisepath_test';
  // Resetting wipes the database: never point it at anything but a test one
  if (!/_test\b/.test(new URL(url).pathname))
    throw new Error(`Refusing to reset ${new URL(url).pathname}: not a test database`);
  execSync('pnpm exec prisma migrate reset --force --skip-seed --skip-generate', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
