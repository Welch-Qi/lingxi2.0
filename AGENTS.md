# AGENTS.md · lingxi-web（前端）

> 总纲见仓库组根级 `../AGENTS.md`（本文件冲突时以根级为准）。

## 构建与校验

```bash
pnpm install
pnpm -C apps/lingxi-web dev            # 开发（需 VITE_API_BASE_URL 指向后端网关）
pnpm -C apps/lingxi-web build          # tsc --noEmit + vite build
pnpm -C apps/lingxi-web test:unit      # vitest
pnpm -C apps/lingxi-web lint           # eslint（含附录 D 规则 10/12 的 restricted 规则）
```

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

## 路由分区（11 个）

`workbench` · `customer` · `product` · `order` · `service` · `marketing` · `intel` · `analytics` · `agent` · `knowledge` · `config`
