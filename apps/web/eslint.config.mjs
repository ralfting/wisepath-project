import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** Import bans that keep each layer in its lane (see .claude/rules/architecture.md) */
const effect = {
  group: ['effect', 'effect/*', '@effect/*'],
  message: 'Effect stays behind useCases: call a use-case hook instead.',
};
const infrastructure = {
  group: ['@/infrastructure', '@/infrastructure/*'],
  message: 'Only useCases may reach infrastructure.',
};
const features = { group: ['@/features', '@/features/*'], message: 'Lower layers must not depend on features.' };
const useCases = { group: ['@/useCases', '@/useCases/*'], message: 'Infrastructure must not depend on useCases.' };
const react = { group: ['react', 'react-dom', 'next', 'next/*', '@mantine/*'], message: 'Infrastructure is UI-free.' };
const validation = {
  group: ['zod', 'zod/*', 'yup', 'valibot', 'io-ts', 'io-ts/*', 'arktype', 'joi', 'superstruct'],
  message: 'Effect Schema is the only validation library.',
};

// A later block's rule replaces an earlier one's for the same file, so every ban carries the validation one
const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns: [validation, ...patterns] }] });

/** Env vars are read in one module; Next inlines NODE_ENV and NEXT_PUBLIC_* only when written literally there */
const processEnv = {
  selector: "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
  message: 'Read env vars only in the config module (today infrastructure/http/ApiClient.ts).',
};
/** Effects run at an edge (use-case hooks, server queries and actions), never inside a Layer */
const runEffect = {
  selector: "CallExpression[callee.object.name='Effect'][callee.property.name=/^run/]",
  message: 'Layers never run Effects: return the Effect and let the edge run it.',
};
const restrict = (...selectors) => ({ 'no-restricted-syntax': ['error', ...selectors] });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { ...ban(), ...restrict(processEnv), 'react/no-danger': 'error' } },
  { files: ['features/**'], rules: ban(effect, infrastructure) },
  { files: ['app/**'], rules: ban(effect, infrastructure) },
  { files: ['useCases/**'], rules: ban(features) },
  { files: ['infrastructure/**'], rules: { ...ban(features, useCases, react), ...restrict(processEnv, runEffect) } },
  // The config module itself (and Next's config) read env vars
  { files: ['infrastructure/http/ApiClient.ts', 'next.config.js'], rules: { 'no-restricted-syntax': 'off' } },
  {
    // Component tests wire the use cases to Memory* Layers (useCases/testing.ts), which needs Effect and infrastructure
    files: ['features/**/*.test.tsx'],
    rules: ban(),
  },
  {
    // Service.use(...) in Effect programs is not a React hook
    files: ['useCases/**/programs.ts', 'infrastructure/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];

export default config;
