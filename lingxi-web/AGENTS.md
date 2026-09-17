# AGENTS.md · lingxi-web（前端）

> 总纲见仓库根级 `../AGENTS.md`（本文件冲突时以根级为准）。

## 构建与校验

所有命令都在**本目录（`lingxi-web/`）根**执行——`lint` / `typecheck` 等校验脚本定义在仓库根，
不在 `apps/lingxi-web` 下（此处曾误写为 `pnpm -C apps/lingxi-web lint`，该脚本不存在）。

```bash
pnpm install

pnpm dev            # 开发（需 VITE_API_BASE_URL 指向后端网关）
pnpm build          # 生产构建（apps/lingxi-web 内为 tsc --noEmit && vite build）
pnpm preview        # 预览构建产物

pnpm lint           # eslint .（含附录 D 规则 10/12 的 restricted 规则）
pnpm lint:fix       # eslint . --fix
pnpm typecheck      # pnpm -r --parallel exec tsc --noEmit（全包类型检查）
pnpm format         # prettier --write
pnpm test:unit      # vitest
pnpm test:e2e       # playwright
pnpm gen:types      # 由后端 OpenAPI 契约生成 @lingxi/types
```

## 页面验收（截图）

静态页面是否真的渲染出来，凭产物判断，不凭自报：

```bash
node scripts/screenshot-routes.mjs                       # 启动 dev server 并逐路由截图
node scripts/screenshot-routes.mjs /workbench /config    # 只截指定路由
python scripts/contact-sheet.py                          # 拼成一张总览图
```

产物落在 `artifacts/screenshots/`（12 张路由图 + `_all-pages.png` 总览图）。
`contact-sheet.py` 依赖 Pillow，请用项目内 venv，不要往全局装。

> 服务与截图必须在**同一个进程**内完成（脚本已如此实现）：长驻后台 shell 会被环境回收，
> 之后所有路由会返回同一张兜底页，截出一批"看起来成功"的假图。
> 判据：若一批截图字节数高度雷同，先怀疑服务已死或应用被前置关卡拦下，**打开图看**再下结论。

## 本仓库特有约束

1. **包管理只用 pnpm**；内部包引用一律 `workspace:*`，出现具体版本号即驳回。
2. **接口类型禁止手写**：`packages/lingxi-types` 由后端 OpenAPI 契约生成（`openapi/gen-types.sh`）。
3. **接口数据只由 TanStack Query 管理**；Zustand 只存 UI 状态，禁止第二份真相。
4. **禁止在组件内直调 `axios` / `fetch`**（附录 D 规则 12）；一律经 `@lingxi/request`。
5. **新增模块 = 新增 `routes/{分区}/` + 在 `app/router/modules.ts` 登记一行**；
   禁止私挂路由与菜单（`routes/` 下 11 个分区与 11 个一级菜单一一对应）。
6. **文案一律走 i18n key**，`zh-CN` / `en-US` 必须成对（缺键会在界面显示成裸 key）。
7. **设计令牌双轨**：CSS 变量（`styles/design-tokens.css`）+ AntD theme token（`app/theme/tokens.ts`）；
   禁止写死颜色/字号/圆角。风格为「极光通感」，主色 `#0E7C86`。
8. **权限判断用 `<LxPermission>`**：无权限不渲染，而不是渲染后禁用。
9. **AI 产出必须用 `<LxAgentSourceTag>` 标记**；智能体任务必须可接管（`<LxTakeoverButton>`，接管原因强制填写）。

## 已知环境故障：工具链被隔离成 `.ignored_*`（2026-09-16）

现象：`pnpm lint` 报 `Cannot find module '...node_modules\eslint\bin\eslint.js'`，
`pnpm typecheck` 报 `error TS2688: Cannot find type definition file for 'node'`，
但 `node_modules/eslint` / `node_modules/typescript` / `node_modules/@types/node` 这些目录**存在**。

根因：这些包的规范目录被换成了 **0 条目的空壳**，真正完好的副本被改名为 `.ignored_<包名>`。
曾一次性命中 10 个包：`eslint`、`typescript`、`prettier`、`globals`、
`eslint-config-prettier`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`、
`typescript-eslint`、`@types/node`、`@playwright/test`。

排查：`node -e "console.log(require('fs').readdirSync('node_modules/eslint').length)"` 得 0 即是空壳；
再 `ls node_modules/.ignored_* node_modules/@types/.ignored_*` 找副本。

恢复：**删掉空壳目录、把 `.ignored_<包名>` 改名回规范名**即可（副本版本与 `.pnpm` 存储一致）。
不要直接 `pnpm install` 覆盖——那样会丢失 `.ignored_*` 里的现有版本。

## 路由分区（11 个）

`workbench` · `customer` · `product` · `order` · `service` · `marketing` · `intel` · `analytics` · `agent` · `knowledge` · `config`
