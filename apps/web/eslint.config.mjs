import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/** Import bans that keep each layer in its lane (see README, "How the web app is organised") */
const effect = {
  group: ['effect', 'effect/*', '@effect/*'],
  message: 'Effect stays behind useCases: call a use-case hook instead.',
};
const infrastructure = {
  group: ['@/infrastructure', '@/infrastructure/*'],
  message: 'Only useCases (and API routes) may reach infrastructure.',
};
const features = { group: ['@/features', '@/features/*'], message: 'Lower layers must not depend on features.' };
const useCases = { group: ['@/useCases', '@/useCases/*'], message: 'Infrastructure must not depend on useCases.' };
const react = { group: ['react', 'react-dom', 'next', 'next/*', '@mantine/*'], message: 'Infrastructure is UI-free.' };

const ban = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { files: ['features/**'], rules: ban(effect, infrastructure) },
  { files: ['app/**'], ignores: ['app/api/**'], rules: ban(effect, infrastructure) },
  { files: ['useCases/**'], rules: ban(features) },
  { files: ['infrastructure/**'], rules: ban(features, useCases, react) },
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
