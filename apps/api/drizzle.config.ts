import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit generates the migrations (pnpm db:generate) from the schema.
 * They are applied by dist/migrate.js (pnpm db:migrate), not by drizzle-kit.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/infrastructure/database/schema.ts',
  out: './drizzle',
});
