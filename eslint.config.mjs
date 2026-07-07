import js from '@eslint/js'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: ['artifacts/**', 'dist/**', 'node_modules/**', 'test-results/**'],
  },
  {
    files: ['*.config.{js,mjs,ts}', 'eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      'comma-dangle': ['error', 'only-multiline'],
      'complexity': ['error', 5],
      'eqeqeq': ['error', 'always'],
      'max-depth': ['error', 3],
      'max-lines': ['error', 200],
      'max-lines-per-function': ['error', 20],
      'max-nested-callbacks': ['error', 5],
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-magic-numbers': ['error', {
        detectObjects: true,
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
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
        },
      }],
      'vue/html-closing-bracket-spacing': ['error', {
        startTag: 'never',
        endTag: 'never',
        selfClosingTag: 'always',
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
      'vue/block-lang': ['error', {
        script: {
          lang: 'ts',
        },
      }],
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'max-lines': ['warn', 400],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': ['error', {
        ignore: [0, 1, -1],
        ignoreEnums: true,
      }],
    },
  },
  {
    files: ['tests/playwright/**/*.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'complexity': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
    },
  },
]
