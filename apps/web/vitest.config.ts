import { defineConfig } from 'vitest/config';
import path from 'node:path';

const resolve = { alias: { '@': path.resolve(__dirname) } };
const exclude = ['node_modules/**', '.next/**'];

export default defineConfig({
  test: {
    // Rules and use cases run in Node; components need a DOM, which only their tests pay for
    projects: [
      { resolve, test: { name: 'unit', include: ['**/*.test.ts'], exclude, environment: 'node' } },
      {
        resolve,
        // tsconfig keeps JSX for Next ("preserve"); component tests compile it themselves
        oxc: { jsx: { runtime: 'automatic' } },
        test: { name: 'dom', include: ['**/*.test.tsx'], exclude, environment: 'happy-dom', setupFiles: ['./test/setup.ts'] },
      },
    ],
  },
});
