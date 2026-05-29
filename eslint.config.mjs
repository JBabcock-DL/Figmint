import js from '@eslint/js';
import { importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'build/**',
    'node_modules/**',
    'coverage/**',
    '**/*.min.js',
    'packages/*/dist/**',
    'scripts/**',
    'packages/contracts/scripts/**',
    'vite.config.ts',
    // Per-ticket throwaway scripts under .github/Sprint N/{TICKET}/scripts/** are not
    // part of the plugin source set (they generate reference data, not runtime code).
    '.github/Sprint */**/scripts/**',
  ]),

  js.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ...importX.flatConfigs.recommended,
    ...importX.flatConfigs.typescript,
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: ['tsconfig.json', 'packages/*/tsconfig.json'],
          alwaysTryTypes: true,
        }),
      ],
    },
  },

  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Plugin + Figma API code: contracts branded IDs and sandbox globals confuse strict
      // type-checked unsafe-* rules; keep type safety via `npm run typecheck`.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      // ES2017 main thread + explicit indexed loops over Figma node trees.
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  {
    files: [
      'src/core/variables/**/*.ts',
      'src/core/audit/**/*.ts',
      'src/core/canvas/**/*.ts',
      'src/core/bootstrap/**/*.ts',
      'src/core/components/scaffold/**/*.ts',
      'src/io/messages/bootstrap.ts',
    ],
    rules: {
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // Figma main-thread canvas builders use explicit indexed loops and legacy Plugin API calls.
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/prefer-includes': 'off',
      '@typescript-eslint/array-type': 'off',
    },
  },

  {
    files: ['tests/unit/core/variables/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-deprecated': 'off',
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-deprecated': 'off',
    },
  },

  eslintConfigPrettier,
]);
