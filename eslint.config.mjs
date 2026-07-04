import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.nuxt/**',
      '**/coverage/**',
      '**/tsp-output/**',
      '**/generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // JSDoc 強制（house 慣習）: controller の全ハンドラと application の entry-point（execute）に JSDoc を必須化する。
  // 型はシグネチャが真実なので型ブレース系は off。@param 名の一致（check-param-names）も担保する（→ colon 併記は不可・dash スタイル）。
  {
    files: [
      'apps/backend-*/src/**/*.controller.ts',
      'apps/backend-*/src/**/application/**/*.usecase.ts',
      'apps/backend-*/src/**/application/**/*.query.ts',
      'apps/backend-*/src/**/application/**/*.query-service.ts',
      'apps/backend-*/src/**/application/**/*.validator.ts',
    ],
    plugins: { jsdoc },
    rules: {
      // constructor は対象外（薄い委譲層のハンドラ／execute にのみ JSDoc を要求）
      'jsdoc/require-jsdoc': [
        'error',
        { require: { MethodDefinition: true }, checkConstructors: false },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      // TypeScript: 型は書かない（シグネチャが source of truth）
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
    },
  },
);
