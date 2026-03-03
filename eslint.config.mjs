import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      // Stylistic rules (airbnb-base formatting)
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/eol-last': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      }],

      // Best practices (airbnb-base)
      curly: ['error', 'multi-line'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-param-reassign': ['error', { props: false }],
      'no-return-assign': ['error', 'always'],

      // Variables (airbnb-base)
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',

      // ES6+ (airbnb-base)
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': ['error', {
        VariableDeclarator: { object: true, array: false },
        AssignmentExpression: { object: false, array: false },
      }],
      'prefer-template': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'test/fixtures/'],
  },
];
