import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='PrismaClient']",
          message:
            'Use the shared Prisma client helper from src/api/prismaClient.js instead of instantiating PrismaClient directly.',
        },
      ],
    },
  },
  {
    files: ['src/api/prismaClient.js'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
])
