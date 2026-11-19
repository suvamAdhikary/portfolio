import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright specs and browser scripts use DOM/Node globals; TypeScript already checks them.
    files: ['tests/**/*.ts', 'playwright.config.ts', 'src/**/*.ts'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
      '**/*.astro',
      'test-results/',
      'playwright-report/',
      'blob-report/',
    ],
  },
];
