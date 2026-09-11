// 灵犀系统 ESLint 配置（flat config）
// 依据：技术规约2.0 §4.2.1（工具链强制）、附录D 规则 10/11/12（前端反模式）
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/coverage', '**/*.gen.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // 技术规约2.0 §4.2.1：新增代码禁止 any（第三方类型除外）
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',

      // 附录D 规则 10：禁止硬编码中文文案（必须走 i18n key）
      // 例外：注释、i18n key 定义文件
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/[\\u4e00-\\u9fa5]/]',
          message: '禁止硬编码中文文案，请使用 i18n key（技术规约2.0 附录D 规则10）',
        },
      ],

      // 附录D 规则 12：禁止组件内直调 HTTP
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: '请通过 @lingxi/request 统一封装调用（附录D 规则12）' },
            { name: 'antd', importNames: ['message', 'notification'], message: '请使用 @lingxi/ui 的统一反馈组件' },
          ],
        },
      ],
    },
  },
  // 语言包与测试文件豁免中文限制
  {
    files: ['**/locales/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
