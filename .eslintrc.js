/* eslint-disable */
module.exports = {
  root: true,
  env: {
    node: true,
    jquery: true,
  },
  extends: [
    '@vue/standard',
    '@vue/typescript',
    '@vue/typescript/recommended',
    'plugin:vue/base',
    'plugin:vue/essential',
    'plugin:vue/recommended',
    'plugin:vue/strongly-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/member-delimiter-style': ['warn', {
      multiline: {
        delimiter: 'none',
        requireLast: false,
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
    }],
    'comma-dangle': ['error', 'only-multiline'],
    'complexity': ['error', 5],
    'eqeqeq': ['error', 'always'],
    'max-depth': ['error', 3],
    'max-lines': ['error', 200],
    'max-lines-per-function': ['error', 20],
    'max-nested-callbacks': ['error', 2],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-magic-numbers': ['error', {
      'detectObjects': true, 'ignore': [0, 1, -1], 'ignoreArrayIndexes': true,
    }],
    'no-octal': 'error',
    'no-redeclare': 'error',
    'no-useless-escape': 'off',
    'prefer-const': 'error',
    'use-isnan': 'error',
    'vue/html-indent': ['error', 4, {
      baseIndent: 1,
    }],
    'vue/max-attributes-per-line': ['error', {
      singleline: 2,
      multiline: {
        max: 1,
        allowFirstLine: false,
      },
    }],
    'vue/html-closing-bracket-spacing': ['error', {
      'startTag': 'never', 'endTag': 'never', 'selfClosingTag': 'always',
    }],
    'vue/multiline-html-element-content-newline': ['error', {
      ignoreWhenEmpty: true,
      allowEmptyLines: true,
    }],
    'vue/singleline-html-element-content-newline': ['off', {
      ignores: ['pre', 'textarea'],
      ignoreWhenEmpty: true,
      ignoreWhenNoAttributes: true,
    }],
    'vue/script-indent': ['warn', 2, {
      baseIndent: 1,
      switchCase: 1,
    }],
  },
  overrides: [{
    files: ['*.spec.js', '*.e2e.js'],
    rules: {
      'max-lines-per-function': 'off',
      'no-undef': 'off',
      'no-unused-expressions': 'off',
    },
  }, {
    files: ['*.vue'],
    rules: {
      'ember-suave/lines-between-object-properties': 'off',
      indent: 'off',
      'max-lines': ['warn', 400],
    },
  },  {
    files: ['*.ts'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': ['error', {
        ignoreEnums: true
      }],
    },
  }, {
    files: ['vue.config.js'],
    rules: {
      'max-lines-per-function': 'off',
    },
  }],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaFeatures: { legacyDecorators: true },
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
    project: './tsconfig.json'
  },
}
