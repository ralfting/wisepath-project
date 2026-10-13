/**
 * The API is bundled with webpack (Nest CLI's builder) so it can use the
 * workspace packages, which ship TypeScript source, and Effect, which ships
 * ES modules only. Both are compiled into the CommonJS bundle; every other
 * dependency stays in node_modules.
 */
const nodeExternals = require('webpack-node-externals');

const bundled = [/^@wisepath\//, /^effect(\/|$)/, /^@effect\//];

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({ allowlist: bundled }),
    // pnpm keeps the root's hoisted packages (Prisma) apart from the app's own
    nodeExternals({ modulesDir: '../../node_modules', allowlist: bundled }),
  ],
  resolve: {
    ...options.resolve,
    // Effect's ES modules import their own files with the .js extension
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
});
