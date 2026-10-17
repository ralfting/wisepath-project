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
const domain = { group: ['@wisepath/*'], message: 'ui/ holds primitives with no domain in them: take plain props instead.' };
const upward = { group: ['@/useCases', '@/useCases/*', '@/features', '@/features/*'], message: 'ui/ sits below features and use cases.' };
/** A feature is features/<domain>/<feature> for paths and inbox, features/<feature> otherwise; others see only its index.ts */
const featureInternals = {
  regex: '^@/features/((paths|inbox)/[^/]+|auth|search|help|shell)/.+',
  message: "Import another feature through its index.ts (export what you need there); inside a feature, use relative paths.",
};
const validation = {
  group: ['zod', 'zod/*', 'yup', 'valibot', 'io-ts', 'io-ts/*', 'arktype', 'joi', 'superstruct'],
  message: 'Effect Schema is the only validation library.',
};

// A later block's rule replaces an earlier one's for the same file, so every ban carries the validation one
const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns: [validation, ...patterns] }] });

/** Env vars are read in one module; Next inlines NODE_ENV and NEXT_PUBLIC_* only when written literally there */
const envMessage = 'Read env vars only in a config module (infrastructure/http/ApiClient.ts, infrastructure/server/ServerApiClient.ts).';
const processEnv = {
  selector: "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
  message: envMessage,
};
const processEnvDestructured = { selector: "VariableDeclarator[init.object.name='process'][init.property.name='env']", message: envMessage };
/** Effects run at an edge (use-case hooks, server queries and actions), never inside a Layer */
const runMessage = 'Layers never run Effects: return the Effect and let the edge run it (infrastructure/server/ServerLayer.ts).';
const runEffect = { selector: "CallExpression[callee.property.name=/^run(Promise|Sync|Fork)/]", message: runMessage };
const runEffectBare = { selector: "CallExpression[callee.name=/^run(Promise|Sync|Fork)/]", message: runMessage };
const restrict = (...selectors) => ({ 'no-restricted-syntax': ['error', ...selectors] });

const config = [
  { ignores: ['.next/**', '.next-e2e/**', 'node_modules/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { ...ban(), ...restrict(processEnv, processEnvDestructured), 'react/no-danger': 'error' } },
  { files: ['features/**'], rules: ban(effect, infrastructure, featureInternals) },
  { files: ['app/**'], rules: ban(effect, infrastructure, featureInternals) },
  { files: ['useCases/**'], rules: ban(features) },
  { files: ['ui/**'], rules: ban(effect, infrastructure, upward, domain) },
  { files: ['infrastructure/**'], rules: { ...ban(features, useCases, react), ...restrict(processEnv, processEnvDestructured, runEffect, runEffectBare) } },
  // The config modules (and Next's config) read env vars
  { files: ['infrastructure/http/ApiClient.ts', 'next.config.js', 'playwright.config.ts', 'e2e/**'], rules: { 'no-restricted-syntax': 'off' } },
  { files: ['infrastructure/server/ServerApiClient.ts'], rules: restrict(runEffect, runEffectBare) },
  // The server's one edge: it runs use cases for useCases/server.ts
  { files: ['infrastructure/server/ServerLayer.ts'], rules: restrict(processEnv, processEnvDestructured) },
  {
    // Component tests wire the use cases to Memory* Layers (useCases/testing.ts), which needs Effect and infrastructure
    files: ['features/**/*.test.tsx'],
    rules: ban(featureInternals),
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
