import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Leaves the dev setup as it was. The e2e build points next-env.d.ts at .next-e2e and writes route types there
 * that tsconfig includes; left behind, a renamed route would fail the dev typecheck until the next e2e run.
 * next-env.d.ts gets back what it held before the run (read by playwright.config.ts).
 */
export default function globalTeardown() {
  const web = path.resolve(__dirname, '..');
  rmSync(path.join(web, '.next-e2e', 'types'), { recursive: true, force: true });
  if (process.env.E2E_NEXT_ENV !== undefined) writeFileSync(path.join(web, 'next-env.d.ts'), process.env.E2E_NEXT_ENV);
}
