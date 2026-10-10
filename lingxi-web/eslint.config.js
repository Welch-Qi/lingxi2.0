// 灵犀系统 ESLint 配置（flat config）
// 依据：技术规约2.0 §4.2.1（工具链强制）、附录D 规则 10/11/12（前端反模式）
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // eslint.config.js 自身不属于任何 tsconfig（projectService 会报解析错误），
  // 它是构建配置而非应用代码，直接排除在本仓 lint 范围之外。
  //
  // artifacts/**/tmp 也要排除：那是 .gitignore 划定的临时区，用来解压外部参考源码
  // （如灵犀 1.0 原型）做迁移比对。解压出来的 .tsx 里全是中文 JSX 文案，
  // 必然撞上「禁止硬编码中文」这条规则——但它们是**外部参考资料**，不是本仓源码，
  // 改了反而失去比对价值。ESLint 不读 .gitignore，所以这里必须显式再写一遍。
  {
    ignores: [
      '**/dist',
      // 构建快照（dist_prev_<日期>）同样不属于源码：文件名不是 dist，
      // projectService 会逐文件报「was not found by the project service」。
      '**/dist*/**',
      '**/node_modules',
      '**/coverage',
      '**/*.gen.ts',
      'artifacts/**/tmp/**',
      // monorepo 根的 tmp/：探针与门禁的临时产物（devserver.log、tsc 输出、
      // esbuild 产物）。与 .gitignore 的 `tmp/` 必须同步加 —— ESLint 不读 .gitignore，
      // 临时产物被扫进来的表现是「was not found by the project service」的解析错误。
      'tmp/**',
      // .trash/：本机删除 fail-closed 时的暂存区（`mv <目标> .trash/`）。
      // 与 .gitignore 的 `.trash/` 同步加 —— 里面的 .mjs/.py 会被 projectService
      // 逐文件报「was not found by the project service」，直接把 lint 打成 1 error。
      // **加任何新的忽略目录都必须同时改这两处**，否则门禁会以解析错误的形式失败，
      // 而失败信息里根本不出现"这是忽略目录"这几个字。
      '.trash/**',
      // esbuild/vite 的中间目录：构建时落盘又被清空，留下的残片会被
      // projectService 当成源码扫。与 .gitignore 的 `esbuild-tmp/` 同步。
      '**/esbuild-tmp/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
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
  // @lingxi/request 就是 axios 的封装层本身，规则 12 约束的是"应用代码绕过请求层"，
  // 故此处放行 axios，但仍保留 antd message/notification 的限制。
  {
    files: ['packages/lingxi-request/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'antd', importNames: ['message', 'notification'], message: '请使用 @lingxi/ui 的统一反馈组件' },
          ],
        },
      ],
    },
  },
  // scripts/ 下是开发工具脚本（截图验收等），不属于任何 tsconfig。
  // 直接排除会让它们完全失去检查；挂 allowDefaultProject 又会因为默认项目解析不到
  // node 内置模块类型，把每个 fs 调用报成 "error typed value"。
  // 取中间做法：保留语法与基础规则，仅关掉这一条路径的类型感知规则。
  //
  // 「禁止硬编码中文」对 scripts/ 同样放行：版式探针要按**用户看到的中文**定位元素
  // （`getByRole({ name: '列表' })`、量「客户主体」块的宽度），
  // 改成 i18n key 定位就等于放弃"验收的是中文态"这件事本身 ——
  // 规则 10 约束的是**面向用户的产品文案**，探针里的中文是选择器，不是文案。
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    /* rules 必须**合并**进 disableTypeChecked 自带的那一份，不能整块替换：
     * 该配置对象里已把所有类型感知规则置 off，写成 `rules: {...}` 会把它顶掉，
     * 于是 @typescript-eslint/await-thenable 等仍在跑，而解析器此时已无类型信息
     * → 整个 ESLint 启动即崩（"requires type information"），连源码都扫不到。 */
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-restricted-syntax': 'off',
    },
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: false, project: false, tsconfigRootDir: import.meta.dirname },
    },
  },
  prettier,
);
