const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'eslint.config.js',
      'dist/*',
      'src/lib/api/schema.ts',
      'src/theme/tokens.ts',
      'src/mocks/media.ts',
      'server/*',
      'design/*',
      'agent-skills/*',
      'api/*',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/no-cycle': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Import from the feature index instead: @/features/<name>',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/TakeOrder|ScanChop/i]',
          message: 'The product is called Ozaa.',
        },
      ],
    },
  },
]);
