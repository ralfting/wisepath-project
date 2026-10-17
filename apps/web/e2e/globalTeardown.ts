import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Leaves the dev setup as it was. The e2e build points next-env.d.ts at .next-e2e and writes route types there
 * that tsconfig includes; left behind, a renamed route would fail the dev typecheck until the next e2e run.
 */
export default function globalTeardown() {
  const web = path.resolve(__dirname, '..');
  rmSync(path.join(web, '.next-e2e', 'types'), { recursive: true, force: true });
  execFileSync('git', ['checkout', '--', 'next-env.d.ts'], { cwd: web });
}
