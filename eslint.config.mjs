import globals from 'globals'

import pluginDependencies from '@omnicajs/eslint-plugin-dependencies'
import pluginImport from 'eslint-plugin-import-x'
import pluginJs from '@eslint/js'
import pluginTs from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

import vueParser from 'vue-eslint-parser'

const sourceFiles = ['**/*.{js,mjs,cjs,ts,vue}']

export default [
  {
    ignores: ['artifacts/**', 'dist/**', 'node_modules/**', 'test-results/**'],
  },
  { files: sourceFiles },
  pluginJs.configs.recommended,
  ...pluginTs.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      dependencies: pluginDependencies,
      'import-x': pluginImport,
    },
    settings: {
      ...pluginImport.flatConfigs.typescript.settings,
      'import-x/resolver': {
        node: {
          extensions: [
            '.js',
            '.mjs',
            '.cjs',
            '.ts',
            '.tsx',
            '.d.ts',
            '.vue',
          ],
        },
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      ...pluginImport.flatConfigs.recommended.rules,
      ...pluginImport.flatConfigs.typescript.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
        imports: 'always-multiline',
        objects: 'always-multiline',
      }],
      'complexity': ['error', 5],
      'dependencies/import-style': ['error', {
        maxSingleLineLength: 90,
        maxSingleLineSpecifiers: 3,
      }],
      'dependencies/separate-type-imports': 'error',
      'dependencies/separate-type-partitions': 'error',
      'dependencies/sort-named-imports': ['error', {
        type: 'alphabetical',
        ignoreAlias: true,
      }],
      'dependencies/sort-imports': ['error', {
        type: 'alphabetical',
        imports: {
          orderBy: 'alias',
          splitDeclarations: true,
        },
        groups: [
          'side-effect-style',
          'side-effect',
          [
            'type-import',
            'type-external',
            'type-vue-components',
            'type-internal',
            'type-parent',
            'type-sibling',
            'type-index',
          ],
          'builtin',
          'value-external',
          'value-vue-components',
          'value-internal',
          ['value-parent', 'value-sibling'],
          'index',
          'ts-equals-import',
          'unknown',
        ],
        customGroups: [
          {
            groupName: 'type-vue-components',
            selector: 'type',
            elementNamePattern: ['\\.(svg|vue)$'],
          },
          {
            groupName: 'value-vue-components',
            elementNamePattern: ['\\.(svg|vue)$'],
          },
        ],
        newlinesInside: 1,
        partitions: {
          orderBy: 'type-first',
          splitBy: {
            comments: false,
            newlines: true,
          },
        },
      }],
      'eqeqeq': ['error', 'always'],
      'import-x/no-duplicates': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
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
      'vue/block-lang': ['error', {
        script: {
          lang: 'ts',
        },
      }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        globals: ['RouterLink', 'RouterView'],
        registeredComponentsOnly: true,
      }],
      'vue/html-closing-bracket-spacing': ['error', {
        startTag: 'never',
        endTag: 'never',
        selfClosingTag: 'always',
      }],
      'vue/html-indent': ['error', 4, {
        baseIndent: 1,
      }],
      'vue/max-attributes-per-line': ['error', {
        singleline: 2,
        multiline: {
          max: 1,
        },
      }],
      'vue/multi-word-component-names': 'error',
      'vue/multiline-html-element-content-newline': ['error', {
        ignoreWhenEmpty: true,
        allowEmptyLines: true,
      }],
      'vue/require-default-prop': 'off',
      'vue/singleline-html-element-content-newline': ['off', {
        ignores: ['pre', 'textarea'],
        ignoreWhenEmpty: true,
        ignoreWhenNoAttributes: true,
      }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: pluginTs.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      'max-lines': ['warn', {
        max: 400,
        skipBlankLines: true,
      }],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
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
    files: ['*.config.{js,mjs,ts}', 'eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'no-magic-numbers': 'off',
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
