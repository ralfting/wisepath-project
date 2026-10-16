import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Lint for the API, including the layer boundaries (see README, "How the API
 * is organised"): application code is plain Effect, with no Nest, Express or
 * infrastructure (Drizzle included); only infrastructure and the modules
 * wire things to Nest and the database.
 */
const nest = {
  group: ['@nestjs/*', 'express', 'cookie-parser'],
  message: 'Application code is plain Effect: Nest and Express belong in infrastructure.',
};
const database = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'effect/sql', '@effect/sql-pg'],
  message: 'Application code reaches the database through its ports (ProjectStore, UserStore).',
};
const infrastructure = {
  group: ['**/infrastructure', '**/infrastructure/*'],
  message: 'Application code depends on ports (Context.Service), not on their implementations.',
};

const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'drizzle/**', 'webpack.config.js', 'api/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  { files: ['src/**/application/**'], rules: ban(nest, database, infrastructure) },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
