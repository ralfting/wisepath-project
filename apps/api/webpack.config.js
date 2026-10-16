/**
 * The API is bundled with webpack (Nest CLI's builder) so it can use the
 * workspace packages, which ship TypeScript source, and Effect, which ships
 * ES modules only. Both are compiled into the CommonJS bundle; every other
 * dependency stays in node_modules.
 *
 * Four bundles: the API (main.js), the API as a Vercel Function (vercel.js),
 * the migrations (migrate.js) and the seed (seed.js).
 */
const nodeExternals = require('webpack-node-externals');

const bundled = [/^@wisepath\//, /^effect(\/|$)/, /^@effect\//];

module.exports = (options) => ({
  ...options,
  entry: { main: options.entry, vercel: './src/vercel.ts', migrate: './src/migrate.ts', seed: './src/seed.ts' },
  // commonjs2 so vercel.js exports its handler
  output: { ...options.output, filename: '[name].js', library: { type: 'commonjs2' } },
  externals: [nodeExternals({ allowlist: bundled })],
  resolve: {
    ...options.resolve,
    // Effect's ES modules import their own files with the .js extension
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
});
