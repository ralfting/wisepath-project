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

const validation = {
  group: ['zod', 'zod/*', 'yup', 'valibot', 'io-ts', 'io-ts/*', 'arktype', 'joi', 'superstruct', 'class-validator', 'class-transformer'],
  message: 'Effect Schema is the only validation library: decode with SchemaPipe.',
};

// A later block's rule replaces an earlier one's for the same file, so every ban carries the validation one
const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns: [validation, ...patterns] }] });

/** New config goes through Effect Config (see Sql.ts); these files predate it and read process.env */
const processEnv = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: 'Read config with Effect Config (as Sql.ts does), not process.env.',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'drizzle/**', 'webpack.config.js', 'api/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  { rules: { ...ban(), 'no-restricted-syntax': ['error', processEnv] } },
  {
    files: ['src/main.ts', 'src/setup.ts', 'src/auth/auth.module.ts', 'src/auth/infrastructure/session.ts', 'test/**', '*.config.*', 'drizzle.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  { files: ['src/**/application/**'], rules: ban(nest, database, infrastructure) },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
