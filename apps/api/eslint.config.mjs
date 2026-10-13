import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Lint for the API, including the layer boundaries (see README, "How the API
 * is organised"): application code is plain Effect, with no Nest, Express or
 * infrastructure; only infrastructure and the modules wire things to Nest.
 */
const nest = {
  group: ['@nestjs/*', 'express', 'cookie-parser'],
  message: 'Application code is plain Effect: Nest and Express belong in infrastructure.',
};
const infrastructure = {
  group: ['**/infrastructure', '**/infrastructure/*'],
  message: 'Application code depends on ports (Context.Service), not on their implementations.',
};
const prisma = {
  group: ['@prisma/client'],
  message: 'Prisma is for the schema and migrations only; query with @effect/sql.',
};

const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.prisma/**', 'prisma/**', 'webpack.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  { files: ['src/**'], rules: ban(prisma) },
  { files: ['src/**/application/**'], rules: ban(nest, infrastructure, prisma) },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
