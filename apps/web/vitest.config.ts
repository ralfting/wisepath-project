import { defineConfig } from 'vitest/config';
import path from 'node:path';

const resolve = {
  alias: {
    '@': path.resolve(__dirname),
    // Next resolves it to an empty module on the server; tests run server code, so they do the same
    'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
  },
};
const exclude = ['node_modules/**', '.next/**', '.next-e2e/**', 'e2e/**'];
const oxc = { jsx: { runtime: 'automatic' as const } };

export default defineConfig({
  test: {
    // Rules and use cases run in Node; components need a DOM, which only their tests pay for
    projects: [
      // tsconfig keeps JSX for Next ("preserve"); tests compile it themselves, a .test.ts too, for the modules it imports
      { resolve, oxc, test: { name: 'unit', include: ['**/*.test.ts'], exclude, environment: 'node' } },
      {
        resolve,
        oxc,
        test: { name: 'dom', include: ['**/*.test.tsx'], exclude, environment: 'happy-dom', setupFiles: ['./test/setup.ts'] },
      },
    ],
  },
});
