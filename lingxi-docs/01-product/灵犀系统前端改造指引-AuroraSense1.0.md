# 灵犀系统前端改造指引 · Aurora Sense 极光通感（1.0）

> 本文档是灵犀系统前端（`lingxi-web`）按「Aurora Sense 极光通感」设计语言完成视觉改造的**技术任务书**，供 AI-coding 工具（Cursor / CodeBuddy / Copilot 等）直接按步骤执行。文档中所有数值、色值、代码均以高保真原型为准，可直接落地。

---

## 0. 文档说明

### 0.1 用途与适用对象

- **用途**：把现有前端页面改造成「Aurora Sense 极光通感」设计风格，达到与高保真原型一致的精细度与专业度。
- **适用对象**：AI-coding 工具（执行者），以及前端开发人员（审核者）。
- **执行方式**：按第 2 → 3 → 4 → 5 → 6 → 7 章顺序执行，每章完成后再进入下一章。

### 0.2 视觉基准（唯一）

| 项 | 内容 |
|---|---|
| 原型文件 | `产品设计\灵犀系统原型-AuroraSense.html`（3 页：工作区选择 / 超级工作台 / 内容营销） |
| 基准原则 | 任何颜色、尺寸、间距、圆角、阴影、动效参数**以原型为准**；本文档是其工程化转译 |
| 验收方式 | 改造完成后，浏览器并排打开原型 HTML 与线上页面，逐项对照第 7 章验收清单 |

### 0.3 技术栈约束（与《灵犀系统技术规约 1.0》第 3 章一致，不可偏离）

| 层面 | 选型 | 改造相关约束 |
|---|---|---|
| 框架 | Next.js 15.5 App Router + React 19 + TS strict | 页面默认为 Server Component，交互组件标 `"use client"` |
| 样式 | Tailwind CSS v4 + tw-animate-css | **禁止内联 style 写布局样式**；自定义动画走 tw-animate-css 或 CSS keyframes |
| UI 组件 | shadcn/ui（@base-ui/react 版）+ CVA + clsx + tailwind-merge | 统一 Base UI 版，禁止混入 Radix UI 版 |
| 图标 | lucide-react | 禁止引入第二套图标库 |
| 主题 | next-themes | CSS 变量驱动主题，禁止 JS 切换样式文件 |
| 字体 | Manrope + Noto Sans SC（见 2.3） | 数字一律 `tabular-nums` |

> ⚠️ 原型中的内联 `style="..."` 是**演示写法**，改造到工程代码时必须转为 Tailwind 类名 / CSS 变量，不得照搬内联样式。

### 0.4 实施顺序（依赖关系）

```
2 设计令牌(globals.css) → 3 全局签名元素 → 4 lingxi-ui 基础组件
→ 5 逐页改造 → 6 明暗主题 → 7 验收对拍
```

- 第 2、3 章为**一次性全局改动**，改完即全站生效。
- 第 4 章新增/改造 `lingxi-ui` 可复用组件（LxKpi、LxAgentCard、LxTable 等），供 8 个子产品共用。
- 第 5 章按原型 3 页逐个改造对应路由页面。

---

## 1. 设计语言总述

**一句话定位**：以北极光的流动感与冰川的透明质感为隐喻，表达「全球信号持续流转、智能体在线值守」的产品气质——浅色高透、克制清新、数字感强。

**三大签名元素**（任何页面必须保留，缺一不可）：

1. **顶部极光色带**：全站固定 3px 渐变光带，`青(#0E7C86) → 蓝(#2E6BE6) → 绿(#3D9A6E) → 黄(#F0A91A)`，14s 缓慢左右漂移；
2. **玻璃拟态**：卡片 / 侧边栏 / 顶栏使用半透明白 + `backdrop-blur`，页面底色为霜白 `#F3F7FB`；
3. **数字优先**：所有数值使用 Manrope 等宽数字（`tabular-nums`），KPI 大数字是页面视觉锚点。

**色彩语义边界**（不得挪用色相）：

| 色 | Token | 用途边界（只允许以下场景） |
|---|---|---|
| 极光青 | `--color-primary` `#0E7C86` | 主操作按钮、激活态、链接、主渐变端点、选中态 |
| 冰川蓝 | `--color-secondary` `#2E6BE6` | 次强调、信息类图标、渐变第二端点 |
| 日光黄 | `--color-accent` `#F0A91A` | 预警、待办、关注标记、渐变末端 |
| 苔原绿 | `--color-success` `#3D9A6E` | 成功、正向、在线、涨幅 |
| 珊瑚红 | `--color-danger` `#E4644C` | 危险、告警、删除、跌幅 |
| 智能体紫 | `--color-violet` `#7A5AC0` | 智能体扩展色（第 5 个维度） |

---

## 2. 设计令牌（Design Tokens）

### 2.1 `globals.css` 完整代码（直接替换或合并）

文件位置：`apps/lingxi-web/src/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* ===== 品牌色 ===== */
  --color-primary: #0E7C86;                      /* 极光青：主色 */
  --color-primary-deep: #0A6870;                 /* 主色 hover 深一档 */
  --color-primary-soft: rgba(14, 124, 134, .08); /* 主色浅底（选中/胶囊背景） */
  --color-primary-line: rgba(14, 124, 134, .22); /* 主色描边 / focus 环 */
  --color-secondary: #2E6BE6;                    /* 冰川蓝 */
  --color-secondary-soft: rgba(46, 107, 230, .08);
  --color-accent: #F0A91A;                       /* 日光黄 */
  --color-accent-soft: rgba(240, 169, 26, .14);
  --color-success: #3D9A6E;                      /* 苔原绿 */
  --color-success-soft: rgba(61, 154, 110, .12);
  --color-danger: #E4644C;                       /* 珊瑚红 */
  --color-danger-soft: rgba(228, 100, 76, .12);
  --color-aurora: #7FD6DD;                       /* 极光浅青：深色品牌页强调字 */
  --color-violet: #7A5AC0;                       /* 智能体紫：第 5 维度 */
  --color-violet-soft: #F0EAFA;
  --color-amber-ink: #A8780B;                    /* 黄底深字（待审核/金牌徽章文字） */
  --color-bronze-bg: #F6EFE7;                    /* 铜牌徽章底 */
  --color-bronze-ink: #A9713B;                   /* 铜牌徽章字 */

  /* ===== 中性色 ===== */
  --color-ink: #1E293B;                          /* 主文本 */
  --color-slate: #475569;                        /* 次级文本 */
  --color-muted: #94A3B8;                        /* 弱化文本/辅助说明 */
  --color-faint: #CBD5E1;                        /* 占位/最弱 */
  --color-frost: #F3F7FB;                        /* 页面底色（霜白） */
  --color-card: rgba(255, 255, 255, .72);        /* 玻璃卡片底（半透明） */
  --color-card-solid: #FFFFFF;                   /* 实心卡片底 */
  --color-border: rgba(30, 41, 59, .08);         /* 常规描边 */
  --color-border-strong: rgba(30, 41, 59, .14);  /* 强化描边（可交互元件） */

  /* ===== 字体 ===== */
  --font-display: "Manrope", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  --font-body: "Noto Sans SC", "Microsoft YaHei", sans-serif;

  /* ===== 圆角 ===== */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* ===== 阴影（两层：常态 / 浮起） ===== */
  --shadow-card: 0 1px 2px rgba(15, 40, 60, .04), 0 8px 24px rgba(15, 40, 60, .05);
  --shadow-pop: 0 4px 12px rgba(15, 40, 60, .08), 0 16px 40px rgba(15, 40, 60, .10);
  --shadow-primary: 0 4px 14px rgba(14, 124, 134, .28);   /* 主按钮 hover */
  --shadow-agent: 0 3px 8px rgba(15, 40, 60, .15);        /* 智能体图标 */
}

@layer base {
  html { -webkit-font-smoothing: antialiased; }

  body {
    @apply bg-frost font-body text-ink;
    font-size: 14px;
    line-height: 1.6;
  }

  /* 数字专用类：所有数值/百分比/编码/日期必须加此样式（等价类名 num） */
  .num,
  .font-num {
    font-family: var(--font-display);
    font-variant-numeric: tabular-nums;
    letter-spacing: -.01em;
  }

  /* 玻璃卡片通用类 */
  .glass {
    background: var(--color-card);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
  }

  /* 顶部极光色带（全局签名元素，放在根 layout，z 高于一切内容） */
  .aurora {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    z-index: 100;
    pointer-events: none;
    background: linear-gradient(90deg, #0E7C86 0%, #2E6BE6 45%, #3D9A6E 80%, #F0A91A 100%);
    background-size: 200% 100%;
    animation: aurora-drift 14s ease-in-out infinite;
  }
  @keyframes aurora-drift {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  /* 在线脉冲点（状态栏 / 租户胶囊） */
  .pulse-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--color-success);
    animation: pulse-ring 2s infinite;
  }
  @keyframes pulse-ring {
    0%, 100% { box-shadow: 0 0 0 0 rgba(61, 154, 110, .4); }
    50%      { box-shadow: 0 0 0 5px rgba(61, 154, 110, 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .aurora, .pulse-dot { animation: none; }
    *, *::before, *::after { transition: none !important; }
  }
}
```

### 2.2 Token → Tailwind 类名速查

Tailwind v4 中 `@theme` 定义即生成对应工具类，改造时直接使用：

| Token | 生成类（示例） | 用途 |
|---|---|---|
| `--color-primary` | `bg-primary` / `text-primary` / `border-primary` / `ring-primary` | 主色 |
| `--color-primary-soft` | `bg-primary-soft` | 选中底、胶囊底 |
| `--color-primary-line` | `border-primary-line` / `ring-primary-line` | focus 环、描边 |
| `--color-*`（全部） | `bg-*` / `text-*` / `border-*` | 全色域 |
| `--color-frost` | `bg-frost` | 页面底、hover 底 |
| `--color-card` | `bg-card` | 玻璃卡（自带半透明） |
| `--color-card-solid` | `bg-card-solid` | 实心卡 |
| `--font-display` | `font-display` | 数字/英文标题字体 |
| `--font-body` | `font-body` | 正文（body 默认） |
| `--radius-sm/md/lg/xl` | `rounded-sm/md/lg/xl` | 圆角 |
| `--shadow-card` | `shadow-card` | 卡片常态阴影 |
| `--shadow-pop` | `shadow-pop` | 卡片 hover/浮起 |
| `--shadow-primary` | `shadow-primary` | 主按钮 hover |

### 2.3 字体规范

| 场景 | 字体 | 字重 | 字号 | 备注 |
|---|---|---|---|---|
| 页面标题（顶栏/章节） | Manrope | 700 | 15–16px | `font-display` |
| 品牌大字（工作区选择页 H1） | Manrope | 800 | 40px | 字距 `-0.02em` |
| KPI 大数字 | Manrope | 700 | 24px（内容营销 22px） | 必须 `num`（tabular-nums），字距 `-0.02em` |
| 正文 | Noto Sans SC | 400 | 14px | 行高 1.6 |
| 次要说明 | Noto Sans SC | 400 | 12–12.5px | 颜色 `text-muted` |
| 表头/胶囊/徽章 | Manrope | 500–600 | 10.5–12px | 数字类加 `num` |

**引入方式**：`next/font/google` 引入 `Manrope`（weights 400–800，`variable`）与 `Noto_Sans_SC`（400/500/700）；或沿用根 layout 的 Google Fonts link（`Manrope:wght@400;500;600;700;800` + `Noto+Sans+SC:wght@400;500;700`）。

### 2.4 间距 / 布局基准

| 场景 | 值 |
|---|---|
| 内容区左右内边距 | 28px（≤768px 时为 16px） |
| 内容区纵向间距（卡片之间） | 22px |
| 卡片内边距 | KPI 14px 16px / 智能体 20px / 表格工具条 14px 18px |
| 页面最大宽度 | 1280px 居中 |
| 断点 | ≤1100px：KPI 6→3 列、智能体 4→2 列；≤768px：侧边栏隐藏、单列 |

---

## 3. 全局签名元素实现

### 3.1 顶部极光色带

- 放在根 `layout.tsx`，作为第一个子元素：`<div className="aurora" aria-hidden="true" />`。
- **所有 sticky 元素（顶栏、侧边栏）的 top 偏移必须是 3px**（`top-[3px]`），让色带始终可见。

### 3.2 页面应用骨架（P2/P3 类页面通用）

```
┌──────────────────────────────────────────────┐
│ ▓ 极光色带 3px（fixed，全局）                  │
├──────────┬───────────────────────────────────┤
│ 侧边栏    │ 顶栏（sticky top-3，glass）        │
│ 224px    ├───────────────────────────────────┤
│ glass    │ 内容区（max-w-1280 居中）          │
│          │   卡片们（gap-5.5 / 22px）          │
│          ├───────────────────────────────────┤
│          │ 状态栏（底部，glass）               │
└──────────┴───────────────────────────────────┘
```

```tsx
<div className="grid min-h-screen grid-cols-[224px_1fr] pt-[3px]">
  <LxSidebar />                    {/* sticky top-[3px] h-[calc(100vh-3px)] */}
  <div className="flex min-w-0 flex-col">
    <LxTopbar />                   {/* sticky top-[3px] z-20 */}
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-[22px] px-7 pb-12 pt-6">
      {children}
    </main>
    <LxStatusbar />
  </div>
</div>
```

### 3.3 交互反馈统一规范

| 场景 | 效果 |
|---|---|
| 卡片 hover | `-translate-y-0.5` + `shadow-pop` + `border-border-strong`，过渡 0.2s |
| 可点击行/条目 hover | 背景 `bg-frost` |
| focus 可见 | `focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary-line focus-visible:outline-offset-2` |
| 所有 transition | `transition-all duration-150`（卡片 200） |
| 进度条动画 | 宽度由数据驱动，不额外动画 |

---

## 4. 组件级改造指引（lingxi-ui）

> 以下组件进 `packages/lingxi-ui`（业务组件库），命名前缀 `Lx`。已存在者按目标效果改造；不存在者新增。

### 4.1 侧边栏 `LxSidebar`

**目标效果**：玻璃质感、激活项主色浅底 + 主色文字 + 圆角 10px、分组英文小标签、徽标胶囊。

| 元素 | 目标值 / 实现要点 |
|---|---|
| 容器 | 宽 224px，`bg-white/86 backdrop-blur-xl border-r border-border`，`sticky top-[3px] h-[calc(100vh-3px)]`，内边距 20px 14px |
| Logo | 28px 圆角 8px 渐变块 `linear-gradient(135deg,#2E6BE6,#0E7C86)` + 白色三角标；名称 Manrope 700 15px；英文小字 10px `tracking-[.12em] uppercase text-muted` |
| 分组标签 | 10.5px，500，`tracking-[.1em] uppercase text-muted`，`mt-3.5 mb-1.5` |
| 菜单项 | 13.5px `text-slate`，图标 16px `opacity-75`；hover `bg-frost text-ink`；**激活态 `bg-primary-soft text-primary font-medium`**，图标 `opacity-100` |
| 角标（如销售转化 8） | `bg-danger text-white` 10.5px Manrope 600，圆角胶囊 999px，`ml-auto` |
| 底部退出 | `text-muted`，hover `bg-danger-soft text-danger` |

```tsx
<aside className="sticky top-[3px] flex h-[calc(100vh-3px)] flex-col border-r border-border bg-white/86 px-3.5 py-5 backdrop-blur-xl">
  <div className="mb-5.5 flex items-center gap-2.5 px-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#2E6BE6,#0E7C86)]">
      <LogoMark className="h-3.5 w-3.5" />
    </div>
    <div>
      <div className="font-display text-[15px] font-bold">Lingxi Brain</div>
      <div className="font-display text-[10px] uppercase tracking-[.12em] text-muted">Growth OS</div>
    </div>
  </div>
  <div className="mb-1.5 mt-3.5 px-2.5 text-[10.5px] font-medium uppercase tracking-[.1em] text-muted">业务</div>
  {/* 菜单项：激活项示例 */}
  <button className="relative flex items-center gap-2.5 rounded-[10px] bg-primary-soft px-2.5 py-2 text-[13.5px] font-medium text-primary transition-all duration-150">
    <LayoutGrid className="h-4 w-4 opacity-100" />
    超级工作台
  </button>
  {/* ... 其余菜单项同结构，未激活为 text-slate hover:bg-frost */}
  <button className="mt-auto flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] text-muted transition-all duration-150 hover:bg-danger-soft hover:text-danger">
    <LogOut className="h-3.5 w-3.5" /> 退出当前工作区
  </button>
</aside>
```

### 4.2 顶栏 `LxTopbar`

**目标效果**：玻璃白、左侧页面标题+副标题、中央圆角搜索框、右侧租户胶囊/角色胶囊/通知/头像。

| 元素 | 目标值 |
|---|---|
| 容器 | `sticky top-[3px] z-20 flex items-center gap-3.5 border-b border-border bg-white/86 px-7 py-3.5 backdrop-blur-xl` |
| 标题 | Manrope 700 16px；副标题 12px `text-muted` |
| 搜索框 | `max-w-[420px] flex-1`，圆角胶囊 999px，`bg-frost`，占位 13px `text-muted`；hover `border-border`；**focus-within：`border-primary-line bg-white shadow-[0_0_0_3px_var(--color-primary-soft)]`** |
| 租户胶囊 | `chip`：12.5px，`border-border-strong rounded-full px-3 py-1.5 bg-card`，左侧 6px 绿点；hover `border-primary-line text-primary` |
| 角色胶囊 | 同 chip，右侧 12px 下箭头 |
| 通知按钮 | 34px 圆角 10px，`border-border bg-card text-slate`；hover 主色；右上角 6px 红点（`top-[7px] right-2`） |
| 头像 | 34px 圆角 10px `bg-[linear-gradient(135deg,#2E6BE6,#0E7C86)] text-white` Manrope 700 13px，内容取姓氏单字 |

### 4.3 KPI 卡片 `LxKpi`

**目标效果**：玻璃卡、左侧 3px 色条 tick、Manrope 大数字、趋势胶囊、迷你 sparkline。

| 元素 | 目标值 |
|---|---|
| 容器 | `glass`（半透明 + blur），`p-3.5`，cursor-pointer，hover 上浮（见 3.3） |
| 指标名 | 11.5px 500 `text-muted`，前置 3×11px 圆角 2px 色条（`bg-primary`，**颜色随指标语义可换**：secondary/accent/success/violet） |
| 大数字 | `font-display text-2xl font-bold num tracking-[-.02em] leading-[1.1]` |
| 副行 | 11px `text-muted`，左侧「年累计 18,642」，右侧涨跌胶囊 |
| 涨跌胶囊 | `.up`：`bg-success-soft text-success`；`.dn`：`bg-danger-soft text-danger`；`.fl`（持平）：`bg-frost text-slate`；10.5px Manrope 600，圆角胶囊 999px |
| sparkline | 高 18px 全宽 SVG polyline，`stroke-width 1.6`，`stroke-linecap round`，颜色与 tick 一致；无填充 |

```tsx
// lingxi-ui LxKpi props: { label, value, sub, trend: 'up'|'dn'|'fl', delta, color='primary', spark: [number] }
<div className="glass cursor-pointer p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop">
  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
    <span className={`h-[11px] w-[3px] rounded-sm bg-${color}`} />
    {label}
  </div>
  <div className="num mt-1.5 font-display text-2xl font-bold leading-[1.1] tracking-[-.02em]">{value}</div>
  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
    <span>{sub}</span>
    <span className={`rounded-full px-1.5 py-px font-display text-[10.5px] font-semibold num ${
      trend === 'up' ? 'bg-success-soft text-success' : trend === 'dn' ? 'bg-danger-soft text-danger' : 'bg-frost text-slate'}`}>
      {delta}
    </span>
  </div>
  <Sparkline data={spark} color={colorMap[color]} className="mt-2 h-[18px] w-full" />
</div>
```

> 注意：Tailwind 不支持动态拼接 `bg-${color}`，色条颜色用映射表（`const tickColor = { primary:'bg-primary', secondary:'bg-secondary', ... }`）或直接写死类名。

### 4.4 智能体卡片 `LxAgentCard`

**目标效果**：浅底卡片、渐变圆角图标、等级徽章、进度条、dashed 分隔的 meta 区。

| 元素 | 目标值 |
|---|---|
| 容器 | `bg-frost border border-border rounded-md p-3.5`；hover 上浮 + `border-primary-line`；**busy 态：`border-primary-line bg-[linear-gradient(0deg,var(--color-primary-soft),var(--color-frost))]`** |
| 图标 | 34px 圆角 11px，白色图标，渐变按角色：经营分析 `#0E7C86→#2E6BE6`、产品开发 `#2E6BE6→#7A5AC0`、内容营销 `#F0A91A→#E4644C`、销售转化 `#3D9A6E→#0E7C86`；`shadow-agent` |
| 名称/职责 | 名称 13px 500；职责 10.5px `text-muted` |
| 等级徽章 | 9.5px Manrope 700 `tracking-[.06em]` 圆角胶囊：金 `bg-accent-soft text-amber-ink` / 银 `bg-frost text-muted border border-border` / 铜 `bg-bronze-bg text-bronze-ink` |
| 当前任务 | 12px `text-slate` 行高 1.5 |
| 进度条 | 高 5px 圆角 99px `bg-border`；填充渐变：默认 `primary→secondary`、good `success→primary`、warn `accent→danger` |
| 百分比 | 11px Manrope 600 `text-slate num` |
| meta 区 | `mt-2.5 pt-2.5 border-t border-dashed border-border`，11px `text-muted`，数值 `b` 用 Manrope 600 `text-ink num` |

### 4.5 决策卡片 `LxInsightCard`（今日要点）

**目标效果**：玻璃卡 + 左侧 3px 强调色条（默认 accent 黄）、类型标签、洞察正文、来源标注。

```tsx
<div className="glass cursor-pointer border-l-[3px] border-l-accent p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
  <div className="text-[11px] font-medium text-muted">市场预警 · 德国</div>
  <div className="mt-1.5 text-[13.5px] font-medium leading-[1.55]">"便携储能"搜索指数 7 日环比 +38%，竞品均价下降 6%...</div>
  <div className="mt-2.5 flex items-center gap-2">
    <span className="flex h-5 w-5 items-center justify-center rounded-[7px] bg-secondary text-white">图标</span>
    <span className="text-[11.5px] text-muted">Atlas 于 2 小时前发现</span>
  </div>
</div>
```

- 来源头像颜色与智能体色一致（Atlas 蓝 / Echo 绿 / Sage 青）。
- 强调色条可按类别替换（市场预警 `accent`、商机提醒 `success`、经营洞察 `primary`）。

### 4.6 数据表格 `LxTable`

**目标效果**：玻璃卡容器、浅灰表头、行 hover 霜白、内容缩略图 + 标题 + 编码、类型/语言/状态标签、链接操作。

| 元素 | 目标值 |
|---|---|
| 容器 | `glass overflow-hidden`；工具条 `flex items-center gap-2.5 border-b border-border px-4.5 py-3.5` |
| 工具条搜索 | `max-w-[280px] flex-1` 胶囊 `bg-frost`（同顶栏搜索样式） |
| 工具条筛选 | 12.5px `text-slate` 胶囊 `border-border-strong`，hover 主色 |
| 表头 | 11px 500 `text-muted` 左对齐，`px-4.5 py-2.75 border-b border-border bg-frost/60 whitespace-nowrap` |
| 单元格 | 13px，`px-4.5 py-3.25 border-b border-border`，末行无边框 |
| 行 hover | `bg-frost` |
| 缩略图 | 44×32px 圆角 8px 白色渐变 + 白色图标（渐变按内容类型，与智能体色系一致） |
| 标题/编码 | 标题 13px 500；编码 `font-display text-[11px] text-muted num` |
| 操作链接 | 12.5px 500 `text-primary`，hover 下划线 |

**标签色板**（内容队列）：

| 类型 | 类 |
|---|---|
| 视频 | `bg-secondary-soft text-secondary` |
| 图文 | `bg-primary-soft text-primary` |
| 语言 | `bg-frost text-slate border border-border` |
| 已完成 | `bg-success-soft text-success` |
| 待审核 | `bg-accent-soft text-amber-ink` |
| 生产中 | `bg-frost text-muted` |

### 4.7 徽章 / 胶囊 `LxBadge` / `LxChip`

- 所有胶囊统一：`rounded-full`，字号 10.5–12.5px，Manrope 数字加 `num`。
- `LxChip`（顶栏租户/角色）：`border-border-strong bg-card px-3 py-1.5 text-[12.5px] text-slate`，hover 主色描边。

### 4.8 按钮 `LxButton`

| 变体 | 目标值 |
|---|---|
| 主按钮 | `bg-primary text-white rounded-md px-5.5 py-2.75 text-sm font-medium`；hover `bg-primary-deep shadow-primary`；focus `outline-3 outline-primary-line outline-offset-2` |
| 幽灵按钮 | `border-border-strong text-slate`；hover `border-primary-line text-primary` |

### 4.9 步骤条（内容营销）

**目标效果**：玻璃容器内 3 个等分步骤，激活项主色浅底 + 主色数字块。

```tsx
<div className="glass flex p-2">
  {steps.map((s, i) => (
    <button key={s} className={`relative flex flex-1 items-center gap-2.5 rounded-[10px] px-4 py-2.5 text-[13px] transition-all duration-150 ${
      active === i ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:bg-frost hover:text-slate'}`}>
      <span className={`num flex h-6 w-6 items-center justify-center rounded-lg font-display text-xs font-bold ${
        active === i ? 'bg-primary text-white' : 'bg-frost'}`}>
        {String(i + 1).padStart(2, '0')}
      </span>
      {s}
      {i < steps.length - 1 && <ChevronRight className="absolute -right-0.5 h-3.5 w-3.5 text-faint" />}
    </button>
  ))}
</div>
```

### 4.10 状态栏 `LxStatusbar`

- 底部通栏：`border-t border-border bg-white/86 backdrop-blur-xl px-7 py-3 text-xs text-muted`。
- 在线指示：`pulse-dot` + `text-success font-medium`（如「4 智能体在线」）。
- 右侧 `ml-auto` 区域信息（如「区域：亚太 · UTC+8」）。

### 4.11 Banner（问候/提示条）

- `rounded-lg border border-primary-line p-4 px-5`，背景 `bg-[linear-gradient(120deg,var(--color-primary-soft),var(--color-secondary-soft)_60%,var(--color-accent-soft))]`。
- 左侧 38px 圆角 12px 渐变图标块（`#0E7C86→#2E6BE6`，白色星形图标，`shadow-primary`）。
- 标题 14px 500；说明 12.5px `text-slate`；右侧 `ml-auto` 主色链接。

### 4.12 工作区选择页专属组件（P1）

| 组件 | 要点 |
|---|---|
| 左品牌区 | `bg-[linear-gradient(150deg,#0B1B2B_0%,#0E3A4D_55%,#0E7C86_130%)]`，叠加两处径向光斑：`bg-[radial-gradient(1200px_500px_at_80%_-10%,rgba(46,107,230,.35),transparent_60%),radial-gradient(900px_400px_at_10%_110%,rgba(14,124,134,.45),transparent_55%)]`；内容 `relative z-10` |
| 品牌 H1 | Manrope 800 40px 白，`em` 强调字用 `text-aurora`（#7FD6DD） |
| 数据条 | `bg-white/8 border-white/14 rounded-md p-4 backdrop-blur`，数值 Manrope 700 22px 白，说明 12px `text-white/60` |
| 登录卡 | `bg-card-solid rounded-[20px] shadow-pop p-10 pb-8 max-w-[480px]` |
| 安全胶囊 | `bg-primary-soft border-primary-line text-primary rounded-full px-3 py-1 text-xs font-medium`（含锁图标） |
| 租户选择框 | `border-border-strong rounded-md p-3.5 bg-card`，hover `border-primary-line shadow-[0_2px_8px_rgba(14,124,134,.08)]`；图标 34px 圆角 10px `bg-primary-soft text-primary` |
| 角色卡 | 两列网格（第 5 个跨两列），`border-[1.5px] border-border rounded-md p-3`，hover 上浮；**选中态：`border-primary bg-[linear-gradient(0deg,var(--color-primary-soft),rgba(255,255,255,.9))]` + 圆形选中勾（白勾主色底）** |
| 角色图标色 | CEO 主青 / 产品总监 蓝 / 营销总监 黄(`text-amber-ink`) / 销售总监 绿 / 智能体架构师 紫(`bg-violet-soft text-violet`) |

---

## 5. 页面级改造指引（对照原型 3 页）

### 5.1 P1 工作区选择（路由：登录后首屏 / `(workbench)/workspace-select`）

1. 整页网格 `grid grid-cols-[1.05fr_1fr] min-h-screen`（≤768px 单列，品牌区在上）。
2. 左区：品牌 + 标语 + 3 条数据；右区：登录卡（安全工作区 → 企业空间选择 → 角色选择 → 进入按钮 + 底部链接）。
3. 角色选择为单选，勾选逻辑用客户端状态（Zustand 或 useState），选中态样式见 4.12。
4. 「进入工作区」跳转 `/dashboard`（超级工作台），「创建企业空间」为幽灵按钮。

### 5.2 P2 超级工作台（路由：`(workbench)/dashboard`）

自上而下：

1. **问候 Banner**（4.11）：文案「早上好，林总 —— 亚太区今日有 6 项待办」+ 副说明 + 右侧「查看今日简报 →」。
2. **KPI 网格**（4.3）：6 列（≤1100px 3 列，≤768px 2 列），6 个指标：新增客户/客户建档/高意向客户/成交客户/曝光数/点击转化；tick 色依次 primary/secondary/accent/success/primary/violet；sparkline 与 tick 同色。
3. **智能体协作网络**（4.4）：章节头（标题 + 副标题 + 右侧「管理智能体 →」）+ 4 列流动卡片（≤1100px 2 列），中间一条渐变连接线（`before` 伪元素：`top-1/2 left-[6%] right-[6%] h-0.5 bg-[linear-gradient(90deg,var(--color-primary-line),var(--color-secondary),var(--color-success))] opacity-50`，仅在 ≥4 列时显示）；四个智能体 Sage/Atlas/Muse/Echo 按 4.4 的渐变与 busy 态配置。
4. **今日要点**（4.5）：3 列决策卡（≤1100px 单列）。
5. **快捷操作**（4.11 快捷入口）：3 列（≤1100px 单列），图标块 36px 圆角 11px 色底（新建客户主青/创建内容黄/生成经营报告蓝）。

### 5.3 P3 内容营销（路由：`(biz)/marketing`）

自上而下：

1. **Muse 协调条**：`rounded-lg border-[rgba(240,169,26,.25)] bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-secondary-soft)_70%)] p-3.5 px-4.5`；左侧 32px 渐变图标（`#F0A91A→#E4644C`），正文含 `<b className="text-amber-ink">Muse 正在协调…</b>`，右侧「查看任务轨迹 →」。
2. **步骤条**（4.9）：内容生产（激活）/ 内容分发 / 投放管理。
3. **内容 KPI**（4.3）：4 列，tick 色 secondary/accent/success/violet，数字 22px。
4. **内容生产队列**（4.6）：工具条（搜索 + 排序 + 状态筛选）+ 表格，列：内容（缩略图+标题+编码）/ 类型 / 语言 / 目标渠道 / 状态 / 更新时间 / 操作。4 行示例数据按原型填充。

---

## 6. 明暗主题适配（next-themes）

- **主推 light**：与原型完全一致（第 2 章 token 即 light 值）。
- **dark（可选扩展）**：在 `globals.css` 的 `.dark` 作用域覆盖以下 token，组件代码无需改动：

```css
.dark {
  --color-frost: #0B1220;                      /* 深底 */
  --color-ink: #E6EDF5;                        /* 主文本反白 */
  --color-slate: #B6C2D4;
  --color-muted: #7A8BA3;
  --color-faint: #56677F;
  --color-card: rgba(15, 26, 44, .72);         /* 深玻璃 */
  --color-card-solid: #101B2E;
  --color-border: rgba(148, 163, 184, .12);
  --color-border-strong: rgba(148, 163, 184, .22);
  --color-frost: #0B1220; /* hover 底 */
}
```

- dark 下智能体卡背景、表格表头背景的 `bg-frost` 会自动取深色值；玻璃 `backdrop-blur` 不变。
- 主题切换类名由 `next-themes` 的 `ThemeProvider`（`attribute="class"`）控制，禁止 JS 动态改样式文件。

---

## 7. 验收清单（逐项对拍原型 `灵犀系统原型-AuroraSense.html`）

> 执行完第 2–5 章后，逐项勾选；全部通过才可交付。

### 7.1 全局

- [ ] 顶部 3px 极光色带存在，渐变方向 青→蓝→绿→黄，14s 漂移，任何滚动位置可见
- [ ] 页面底色为霜白 `#F3F7FB`
- [ ] 所有数字/百分比/编码/日期为 Manrope tabular-nums（无错位跳动）
- [ ] 正文 Noto Sans SC，无系统默认字体回退（微软雅黑为末级回退）
- [ ] 无内联 style 写布局样式（除动态数值类）
- [ ] prefers-reduced-motion 下无动画

### 7.2 侧边栏与顶栏

- [ ] 侧边栏 224px，玻璃白半透明 + blur
- [ ] 激活菜单项为主色浅底 + 主色文字 + 主色图标，其余 hover 霜白
- [ ] 分组标签「业务 / 平台」英文小字大写
- [ ] 「销售转化」右侧红色 8 徽标
- [ ] 顶栏 sticky 且位于色带之下（top 3px）
- [ ] 搜索框聚焦：主色描边 + 3px 主色浅环 + 白底

### 7.3 KPI 与卡片

- [ ] KPI 卡片半透明玻璃 + blur，数字 24px Manrope 700
- [ ] 每张 KPI 左侧 3px 色条颜色与语义一致（6 卡 5 色）
- [ ] 涨跌胶囊：绿涨红跌黄平，圆角胶囊
- [ ] 智能体卡片 hover 上浮，busy 卡有主色描边 + 浅青渐变底
- [ ] 智能体图标渐变与角色一一对应，等级徽章金/银/铜三色正确
- [ ] 进度条渐变三态（默认/好/预警）正确
- [ ] 决策卡左侧 3px 强调色条 + 来源标注（头像色与智能体一致）

### 7.4 内容营销页

- [ ] Muse 协调条黄蓝渐变 + 左侧黄红渐变图标
- [ ] 步骤条 3 步，激活步主色数字块 + 主色浅底，步骤间有小箭头
- [ ] 表格表头浅灰、行 hover 霜白、末行无底边框
- [ ] 标签色板 6 种与 4.6 表格完全一致
- [ ] 操作链接为主色，hover 下划线

### 7.5 响应式

- [ ] ≤1100px：KPI 3 列、智能体 2 列、决策/快捷/内容 KPI 相应折行，连接线隐藏
- [ ] ≤768px：侧边栏隐藏、内容单列、搜索框整行、切换器移至底部居中

---

## 8. 禁忌与注意

1. **禁止**去掉或压扁极光色带（签名元素）。
2. **禁止**把玻璃卡改成实心纯白/纯深色（失去通透感）。
3. **禁止**挪用色彩语义（例如用绿色做预警、用红色做成功）。
4. **禁止**数字不用 `tabular-nums`（表格会对不齐）。
5. **禁止**在 KPI/卡片上用深色大字报式排版（如黑底大数字），保持浅色克制。
6. **禁止**内联 style 写布局样式（技术规约【强制】），动态数值样式除外。
7. **禁止**引入第二套图标库；图标一律 lucide-react。
8. 智能体/内容封面渐变色应保持在固定色域内（青/蓝/紫/黄/绿五维），不要新增任意色相。
9. 表格/列表在数据为空时必须有空态（`empty` 状态：居中图标 + 主色文字说明），与玻璃卡风格一致。

---

*文档版本：1.0 ｜ 设计基准：灵犀系统原型-AuroraSense.html（2026-08-17）｜ 技术基线：灵犀系统技术规约 1.0 第 3 章*
