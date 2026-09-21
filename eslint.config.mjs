// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import globals from 'globals';

/**
 * Architecture boundaries. The load-bearing rule is that nothing outside
 * `core/graphql` may import `@server/*`: it keeps the in-browser GraphQL server
 * (graphql, @graphql-tools, idb, resolvers, seeds) out of the main bundle and
 * keeps the SchemaLink -> HttpLink swap a one-line change.
 */
const boundary = (/** @type {string[]} */ group, /** @type {string} */ message) => ({
  group,
  message,
});

const NO_SERVER = boundary(
  ['@server/*', '**/server/**'],
  'Only src/app/core/graphql may import the in-browser server. Go through Apollo.',
);
const NO_FEATURES = boundary(
  ['@features/*'],
  'Features are leaves: they may not be imported from core, shared or other features.',
);
const NO_CORE = boundary(
  ['@core/*'],
  'shared/ui is presentational and must not depend on core stores.',
);
const NO_SHARED = boundary(
  ['@shared/*'],
  'src/server is framework-free and must not import app code.',
);
const NO_ANGULAR = boundary(['@angular/*'], 'src/server is framework-free: no Angular imports.');

export default defineConfig([
  {
    // v1 sources live in legacy-src until the final commit. They must stay inert.
    ignores: [
      'legacy-src/**',
      '.kilo/**',
      'dist/**',
      '.angular/**',
      'coverage/**',
      'e2e/.results/**',
      'playwright-report/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/app/core/graphql/generated/**',
      'src/app/features/**/graphql.generated.ts',
      'src/server/generated/**',
    ],
  },

  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.spec.json', './e2e/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'zc', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'zc', style: 'kebab-case' },
      ],
      // Zoneless: OnPush semantics everywhere.
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Angular validators (Validators.required) are static methods meant to be passed by reference.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // --- Layer boundaries -------------------------------------------------------
  {
    files: ['src/app/features/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_FEATURES] }],
      // Zoneless + manual subscribe = state written to plain fields, which never re-renders.
      // Use signals, toSignal, rxResource or the async pipe instead.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='subscribe']",
          message:
            'No manual .subscribe() in features. Use toSignal(), rxResource() or the async pipe.',
        },
      ],
    },
  },
  {
    files: ['src/app/shared/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_FEATURES, NO_CORE] }],
    },
  },
  {
    // Dialogs used by more than one page (add or edit a cart line, top up). They may use
    // core stores, but no feature, since features are leaves.
    files: ['src/app/shared/dialogs/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_FEATURES] }],
    },
  },
  {
    files: ['src/app/shared/forms/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_FEATURES] }],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['src/app/core/graphql/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_FEATURES] }],
    },
  },
  {
    // core/graphql is the one place allowed to reach the server (dynamic import only).
    files: ['src/app/core/graphql/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_FEATURES] }],
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_ANGULAR,
            NO_SHARED,
            NO_FEATURES,
            boundary(['@core/*'], 'src/server is framework-free and must not import app code.'),
          ],
        },
      ],
    },
  },

  // localStorage is touched in exactly one file (core/storage). v1 read it in about
  // eight places, and a failed login could store the string "undefined".
  {
    files: ['src/**/*.ts'],
    ignores: ['src/app/core/storage/**', 'src/testing/**', '**/*.spec.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use LocalStorageService (core/storage).' },
        { name: 'sessionStorage', message: 'Use LocalStorageService (core/storage).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use LocalStorageService.' },
        { object: 'window', property: 'sessionStorage', message: 'Use LocalStorageService.' },
      ],
    },
  },

  // --- Tests -------------------------------------------------------------------
  {
    files: ['**/*.spec.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // --- Templates (accessibility rules at error, per the plan) -------------------
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/role-has-required-aria': 'error',
      '@angular-eslint/template/no-autofocus': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/mouse-events-have-key-events': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',
    },
  },

  // --- Node scripts and config files --------------------------------------------
  {
    files: ['**/*.mjs', '**/*.js'],
    extends: [eslint.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },
]);
