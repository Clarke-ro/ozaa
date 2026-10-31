// Expo's flat config plus a few Ozaa rules. Run with: npx expo lint
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['eslint.config.js', 'dist/*', 'src/lib/api/schema.ts', 'src/theme/tokens.ts', 'server/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/no-cycle': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Features talk to each other only through their index.ts
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/features/*/*'], message: 'Import from the feature index instead: @/features/<name>' }],
      }],
      'no-restricted-syntax': ['error', {
        selector: "Literal[value=/TakeOrder|ScanChop/i]",
        message: 'The product is called Ozaa.',
      }],
    },
  },
]);
