import js from '@eslint/js';
import globals from 'globals';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'blob-report/', 'self-heal/', 'results.json'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Destructuring a field out to omit it (const { x, ...rest } = obj) is a
    // deliberate idiom, not a dead variable.
    rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
  {
    // Playwright specs: the plugin's recommended rules catch floating
    // promises on actions/assertions, missing assertions, waitForTimeout,
    // non-web-first assertions and similar flake sources.
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
  },
  {
    // Standalone Node tooling (CommonJS scripts, not part of the suite).
    files: ['scripts/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // The self-healing locator is an explicitly labelled proof of concept whose
    // control flow depends on a live model response (candidate loop, outcome
    // branching) and which skips itself when no API key is set. Those are
    // inherent to the experiment, so the "no conditionals / no skips in tests"
    // rules are relaxed for this one file rather than for the suite.
    files: ['tests/ui/self-healing-locator.spec.ts'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-skipped-test': 'off',
    },
  },
);
