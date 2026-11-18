// ESLint: the rules of docs/coding-guidelines.md that a linter can check (section 3 there).
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

/** Size and shape of the code: guidelines 1.2, 1.3, 2.2 and 2.3. */
const shape = {
  'max-lines-per-function': [
    'error',
    { max: 15, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
  'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  'max-classes-per-file': ['error', 1],
  'max-len': ['error', { code: 100, ignoreUrls: true, ignoreRegExpLiterals: true }],
  'max-statements-per-line': ['error', { max: 1 }],
  'no-nested-ternary': 'error',
  'max-depth': ['error', 3],
  complexity: ['error', 10],
  'max-params': ['error', 3],
  // Property names often come from Home Assistant's data formats, so only variables are checked.
  'id-length': [
    'error',
    { min: 2, properties: 'never', exceptions: ['i', 'j', 'x', 'y', 'a', 'b', '_'] },
  ],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-empty': 'error',
};

/** Explanatory comments: guideline 1.1. Every function, method, class and exported constant. */
const comments = {
  'jsdoc/require-jsdoc': [
    'error',
    {
      require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
      contexts: [
        'Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
        'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
      ],
    },
  ],
  'jsdoc/require-param': ['error', { checkDestructured: false }],
  'jsdoc/require-param-type': 'error',
  'jsdoc/require-returns': ['error', { forceReturnsWithAsync: false }],
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-returns-description': 'off',
  'jsdoc/require-property-description': 'off',
  'jsdoc/no-undefined-types': 'off',
  'jsdoc/tag-lines': 'off',
};

export default [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { ...shape, ...comments },
  },
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['tests/**', 'tools/**', '*.js'], languageOptions: { globals: globals.node } },
  // Texts are sentences: a line may be as long as its sentence.
  { files: ['src/i18n/*.js'], rules: { 'max-len': ['error', { code: 100, ignoreStrings: true }] } },
];
