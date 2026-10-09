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

python scripts/check-i18n.py   # i18n 门禁：中英 key 集对齐 + 静态引用存在 + 模板族匹配

NODE_OPTIONS= node scripts/verify-locale-switch.mjs   # 语言切换交互验证（真实点击，端口默认 5180）

NODE_OPTIONS= node scripts/check-running-app.mjs      # 巡检**已在运行**的 dev server（默认 127.0.0.1:5173）

NODE_OPTIONS= node scripts/screenshot-states.mjs /workbench   # 三态截图（中/英/暗），--click 可截展开态
#   只跑其中若干态：SHOT_STATES=zh,dark SHOT_OUT=artifacts/screenshots/wb-v5 ...

NODE_OPTIONS= node scripts/probe-kpi-labels.mjs   # 逐档视口量指标名是否折行/截断/溢出（自带反向对照）
#   PROBE_ROUTES=/workbench,/analytics PROBE_WIDTHS=1680,1366
#   PROBE_OLD=1 复现"改前几何"（胶囊占着标签行 + 允许折行），用来回答"折行是不是改前就有"
```

`check-running-app.mjs` 与 `verify-locale-switch.mjs` 分工不同：前者不自起服务、只连既有地址，
验"用户此刻打开的那个地址正不正常"；后者自起服务，验语言切换逻辑。
**判据不是 HTTP 状态码而是「可见文字量 + 卡片数 + 运行时错误数 + 非 2xx 响应数」**——
`200` 只说明服务器活着，白屏（`#root` 为空）和 favicon 404 都会给出 200。
`/api/**` 的失败在脚本里视为预期（后端未起），不计为失败。

改过页面文案后**必须**跑 `check-i18n.py`（它不在 `pnpm lint` 里）。
**注意门禁的边界：它只校验「引用的 key 存在」，不校验「key 被引用」。**
所以页面改版留下的死文案不会报任何错——清理要靠全仓文本扫描，
扫描时 **glob 在 Windows 返回反斜杠路径，比对前必须 `replace('\\','/')` 归一化**，
否则 `/locales/` 之类的跳过规则形同虚设、语言包自身被当成引用来源。

**ESLint 禁中文的规则只匹配 `Literal` 节点，模板字符串的 quasi 不在其内。**
所以 `scripts/` 下的工具脚本要输出中文提示（"折成 2 行"之类），写进模板字符串即可通过；
写成普通单引号字符串会被拦（规则对脚本同样生效，`scripts/**/*.mjs` 那段只关掉了类型感知规则）。
语言包与测试文件另有豁免，见 `eslint.config.js`。

**`pnpm build` 约 1 分 45 秒，且必须后台跑 + 放行沙箱。** 三种失败长得很像，按症状区分：

| 症状 | 真因 | 处置 |
|---|---|---|
| SIGTERM、零输出、退出码 1 | 前台撞 2 分钟默认超时（**不是**权限） | 改后台执行、输出落日志 |
| 报错栈指向 `vite/.../config.js` 的 handler | 沙箱拦住写 `dist/` | 放行沙箱重跑 |
| **不报错，日志停在 `✓ N modules transformed.` 之后不动** | 同样是沙箱拦写 `dist/` | `TaskStop` 杀进程 → `rm -rf apps/lingxi-web/dist` → 放行沙箱重跑 |

**判据：`tsc` 单独过（typecheck exit 0）、build 卡在 vite 阶段 → 先怀疑权限与超时，不是代码。**

## 页面验收（截图）

静态页面是否真的渲染出来，凭产物判断，不凭自报：

```bash
node scripts/screenshot-routes.mjs                       # 启动 dev server 并逐路由截图
node scripts/screenshot-routes.mjs /workbench /config    # 只截指定路由，改完单页时用
python scripts/contact-sheet.py                          # 拼成一张总览图
```

**前置条件：`apps/lingxi-web/.env.development` 里 `VITE_LX_STATIC_PREVIEW=true`。**
否则认证守卫会把所有路由重定向到登录页——截出来 12 张一模一样的登录页。
该文件不入库（`.gitignore` 有意忽略，避免把"默认关掉认证"变成全组默认值），
新环境要先从 `.env.example` 复制一份。

产物落在 `artifacts/screenshots/`（12 张路由图 + `_all-pages.png` 总览图）。
页面改版时用 `SHOT_OUT` 另出一套，保住旧图做前后对比：

```bash
SHOT_OUT=artifacts/screenshots/v2 node scripts/screenshot-routes.mjs
python scripts/contact-sheet.py artifacts/screenshots/v2 artifacts/screenshots/_all-pages-v2.png
```

`contact-sheet.py` 依赖 Pillow，请用项目内 venv，不要往全局装。
`SHOT_OUT` 传相对路径或绝对路径都可以（脚本会统一转成绝对路径）；
不要传相对路径给 Chrome 的其他调用方——Chrome 对相对路径处理不可靠，会静默写不出文件。

**默认高度 1500 会把长页面切掉。** 工作台内容底 ≈1460、经营分析 ≈1583，都在这个高度上
贴边或被切。判据：**内容底边 > 画布高 − 100 即视为贴边**（量法：逐行算主内容列的像素
标准差，从底部往上找第一行"有花样"的）。长页面统一 `SHOT_HEIGHT=1700`。

**同一路由的多个状态不要共用一个输出目录。** 截图脚本只认「路由 → 同名文件」，
不会替你区分状态：`/intel` 的机会态 / 创意态 / 英文态会互相覆盖，最终只活下来最后一个。
**改名必须在下一次截图之前做完**，不能等五轮跑完再统一改名。

**`SHOT_WIDTH` / `SHOT_HEIGHT` 的口径是 CSS 视口，不是窗口尺寸。**
实测（往页面副标题注入 `window.innerWidth` 截几张比对）：传 `--window-size=1440` 得到 1418、
传 1680 得到 1658、传 1250 得到 1228，**恒定差 22px**（不参与布局的窗口装饰/滚动条槽）。
脚本已把那 22px 补回去，所以 `SHOT_WIDTH=1366` 就是"页面实际拿到 1366px 宽"。
**验响应式断点必须走它**：边界上差 22px 就会得出相反的结论（"能不能一行放下 7 张"），
而截出来的图看起来完全正常，不会有人怀疑。别试图用 `--force-device-scale-factor`
去"统一口径"——本环境实测该参数无效（加上之后截图逐字节不变）。

**临时置位必须与还原锁在同一次执行里。** 出图前常要临时改 `lng`、`data-lx-theme` 或某个
`useState` 的默认值——这类残留不会被 typecheck / lint / build / i18n 门禁的任何一项拦住
（`lng: 'en-US'` 语法完全合法，`data-lx-theme="dark"` 也只是个属性）。写个小 driver，把
置位、截图、还原放进同一个 `try/finally`。driver 里**读写一律用 bytes**：
`Path.read_text()` 会把 CRLF 归一化成 LF，还原时写回等于偷偷把整个文件的换行符改掉，
`git diff` 显示全文改动，评审时看不出真正改了什么。

**多态截图优先用 `scripts/screenshot-states.mjs`——它注入而非改文件，没有还原风险。**
`screenshot-routes.mjs` 走 Chrome `--screenshot`，够不到"要交互才出现的状态"：
语言切换是运行时行为、暗色主题要 html 属性、展开态必须真实点击。
新脚本用 Playwright 连**已在运行**的 dev server（默认 127.0.0.1:5173），
把 中文亮色 / 英文亮色 / 中文暗色 三态各截一张，加 `--click <选择器>` 再按三态各截一张展开态，
上面那套 driver 的 `finally` 兜底逻辑在这里就不需要了。两个细节必须知道，否则会各踩一次：

- **主题不要在 `addInitScript` 里 `setAttribute`**：实测那时 `document.documentElement`
  仍是 `null`（报 `Cannot read properties of null`）。改为在文档响应上改写 `<html>`——
  `page.route(<精确文档 URL>, ...)` 取到 response 后 `replace(/<html/i, '<html data-lx-theme="dark"')`。
  首帧即目标主题，ECharts 取到的就是暗色令牌，不会截出"亮底暗卡"的中间态。
  拦截 pattern 必须**精确到那个文档 URL**：用 `'**/*'` 会把 Vite 的 HMR WebSocket 一起带进
  代理路径，触发 `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`，每次暗色截图凭空多出几条 console 错误。
- **pnpm isolated 布局下不能靠 `require.resolve('playwright')`**：包体在
  `.pnpm/playwright@<ver>/node_modules/playwright/`，而 `.pnpm/playwright@<ver>/` 这一层**没有**
  package.json——探测条件写错会在"明明装着"的情况下报"没装"。Windows 下动态 import 还必须经
  `pathToFileURL()` 转成 file:// URL，直接给 `D:\...` 会报 `ERR_UNSUPPORTED_ESM_URL_SCHEME`。

**交互态要有独立断言，截图管不了。** 悬浮面板的「输入 → 发送 → 回执 → Esc 关闭」、
实时动态轮播的按钮边界、7 张指标卡的结构，全是纯前端状态机——**四道门禁一道都碰不到，
截出来的图也看不出对错**（按钮点不动和按钮没点，图长得一样）。写个 Playwright 脚本逐条断言，
判据落到 DOM 状态（disabled、文本内容、元素数量）而不是"图片看起来对不对"。

**driver 开跑前先断言源码基线，还原后再校验一次写回内容。**
踩过的坑：同一文件的两个 Edit **并行**发出会互相覆盖（后写的基于同一份旧内容，
把先写的改动抹掉）——那次 `disabled={thinking}` 留下了，`run()` 里的空输入兜底丢了，
而截出来的图看起来一切正常，直到核对 i18n key 引用数才发现。
所以 driver 现在启动时先断言几处关键源码事实（`REQUIRED`），不满足就拒绝截图：
**被悄悄回退过的源码，不能拿来当待验收的对象。**

**`contact-sheet.py` 的单元格按 `ORDER` 硬编码取**（与 `app/router/modules.ts` 对齐），
目录里的额外文件（如 `en-*` / `dark-*` / 交互态截图）会被静默忽略，不报错也不提示。

> 服务与截图必须在**同一个进程**内完成（脚本已如此实现）：长驻后台 shell 会被环境回收，
> 之后所有路由会返回同一张兜底页，截出一批"看起来成功"的假图。
> 判据：若一批截图字节数高度雷同，先怀疑服务已死或应用被前置关卡拦下，**打开图看**再下结论。

## 本机命令路径（2026-09-21 实测）

- **pnpm 用全局的**：`pnpm`（位于 `C:/devtools/nodejs/pnpm`）。
  `./node_modules/.bin/pnpm` **不存在**——根 `node_modules/.bin` 里只有
  `eslint` / `tsc` / `prettier` / `playwright` 这些依赖的可执行文件，没有包管理器本身。
- **Node 用 `C:/devtools/nodejs/node`**；本仓 `node_modules` 是 pnpm 默认的
  isolated 布局，`playwright` 不在根 `node_modules` 下，只在
  `node_modules/.pnpm/playwright@*/node_modules/playwright/`。
  需要用 Playwright 时直接从该路径 import，或走 `scripts/screenshot-routes.mjs`
  （它用系统 Chrome 的 `--screenshot`，不依赖 Playwright 浏览器包）。
- **Playwright 浏览器未安装**（`~/AppData/Local/ms-playwright` 为空）。
  要自己写脚本截图，用 `chromium.launch({ channel: 'chrome' })` 走系统 Chrome/Edge，
  不要直接 `chromium.launch()`（会因缺浏览器而失败）。
- 系统 Chrome 与 Edge 均已安装，`scripts/screenshot-routes.mjs` 的 `findChrome()` 能自动找到。
- **`pnpm build` 要放行沙箱**。在受限沙箱下 `vite build` 写 `dist/` 会被拦：
  一种表现是报错形似代码问题（堆栈指向 `vite/dist/node/chunks/config.js` 的 handler，
  末尾只有 `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL ... Exit status 1`）；
  **另一种表现更隐蔽——不报错，直接挂住**：日志停在 `✓ 3975 modules transformed.` 之后，
  十几分钟不动（正常全程约 1 分 45 秒）。**判据：typecheck 单独过、build 停在 vite 的
  transform 之后且无报错 → 先怀疑权限，不是代码。** 处置：`TaskStop` 杀掉、
  `rm -rf apps/lingxi-web/dist`、放行沙箱重跑。
- **dev server 默认只监听 IPv6 `[::1]`**（Vite 的 `host` 默认值 `localhost` 在 Windows 上
  解析成 `::1`）。所以 `127.0.0.1:5173` 会连接被拒，容易被误判成"服务没起来"。
  两条对策：
  ① 人工探活用 `http://localhost:5173`（浏览器会做 IPv6/IPv4 fallback，能通）；
  ② 要给**只认 IPv4 的调用方**（截图脚本、自检脚本、其它工具）用，
  起服务时显式 `--host 127.0.0.1`：
  `node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`。

  ⚠️ **判断"服务活着"不能只看 HTTP 状态码**：`curl -s -o /dev/null -w '%{http_code}'`
  在 Git Bash 下遇到连接失败会静默给出 `200` + `0 bytes`，看起来像"返回了空页面"。
  用 `curl -s URL | wc -c` 看**实际字节数**才算证据。
- 用 `&` 起的后台进程随 shell 会话结束即被回收，需要长驻请走工具的后台托管启动。
- **临时脚本用完即清**：`pnpm lint` 是 `eslint .`，会扫到 `artifacts/` 下的临时 `.mjs`/`.ts`，
  未纳入 tsconfig 的文件会报 `was not found by the project service`，
  一次 lint 失败就是一次误判。`artifacts/` 按 `_README.md` 只存验收证据。
- **ESLint 不读 `.gitignore`**：忽略规则必须在 `eslint.config.js` 的 `ignores` 里**再写一遍**。
  解压到 `artifacts/**/tmp/` 的 1.0 参考源码含中文 JSX，会撞规则 10（禁止硬编码中文）——
  那是外部参考资料不是本仓源码，改了就失去比对价值，正确做法是显式排除。

## 本仓库特有约束

1. **包管理只用 pnpm**；内部包引用一律 `workspace:*`，出现具体版本号即驳回。
2. **接口类型禁止手写**：`packages/lingxi-types` 由后端 OpenAPI 契约生成（`openapi/gen-types.sh`）。
3. **接口数据只由 TanStack Query 管理**；Zustand 只存 UI 状态，禁止第二份真相。
4. **禁止在组件内直调 `axios` / `fetch`**（附录 D 规则 12）；一律经 `@lingxi/request`。
5. **新增模块 = 新增 `routes/{分区}/` + 在 `app/router/modules.ts` 登记一行**；
   禁止私挂路由与菜单（`routes/` 下 13 个分区与 13 个一级菜单一一对应）。
6. **文案一律走 i18n key**，`zh-CN` / `en-US` 必须成对（缺键会在界面显示成裸 key）。
   批量改写页面文案时，**插入锚点必须选「改版后仍存活」的 key**——锚点选在被本次改版
   删掉的旧 key 上，会随旧界面一起消失。门禁细节见上节「构建与校验」。
7. **设计令牌双轨**：CSS 变量（`styles/design-tokens.css`）+ AntD theme token（`app/theme/tokens.ts`）；
   禁止写死颜色/字号/圆角。风格为「极光通感」，主色 `#0E7C86`。
8. **权限判断用 `<LxPermission>`**：无权限不渲染，而不是渲染后禁用。
9. **AI 产出必须用 `<LxAgentSourceTag>` 标记**；智能体任务必须可接管（`<LxTakeoverButton>`，接管原因强制填写）。
10. **不要用 flex / 行内容器承载多段文本**。两个已踩的实例：
    - **句子内嵌高亮数字**：形如「今日已代拟 `<b>6</b>` 份报价方案」的句子，若父元素是
      `display: flex / inline-flex`，每段文本都会变成独立 flex item 并排——中文文案短时
      看不出问题，英文一长就折成多列、数字被挤到行首与句子脱节（`.lx-actionbar__note` 踩过）。
      交给块级文本流排版（`text-align` + `line-height`），数字才会留在句中。
    - **标题 + 说明并排**：`LxQuickAction` 的标题与说明原本是两个并排 `<span>`，en-US 下渲染成
      `New customerEnter a company; AI fills in background`（标题末尾直接黏上说明首字）。
      加一层竖排 body 容器（`.lx-quick__body`，flex column + gap）即可。

    **判据：任何承载多段文本的组件，收工前切到 `en-US` 看一眼。**
    **中文没有词间空格，会把「两段文本并排」伪装成「一句长话」——这个缺陷只在英文下现形。**

11. **承载关键设置的按钮必须一眼可辨：通用语义图标 + 可见文字（至少要有 `title`）。**
    反面实例（2026-09-22 真实事故）：顶栏语言切换原为 `SwapOutlined`（一个左右箭头）纯图标按钮，
    无文字、无 tooltip、无当前状态，与旁边的铃铛/头像无法区分。后果不是"不好看"——
    用户误点一次，偏好就写进 `localStorage['lx.locale']` 并被 `detectLocale()` **永久优先**，
    而界面上再没有任何能切回来的入口，用户只能认定"系统变成英文且改不回去"。

    **这类故障四道门禁一道都拦不住**：`lng: 'en-US'` 语法完全合法、按钮"存在"也是事实、
    i18n 门禁只校验「引用的 key 存在」，不校验「入口可见」。
    故凡是"改错了用户无法自救"的设置项（语言、时区、主题、租户），
    入口必须可见且带说明，并配一条交互验证：
    `NODE_OPTIONS= node scripts/verify-locale-switch.mjs`
    （真实点击 → 断言 `html lang` 与 `localStorage`，不是"置位后截图"）。
    语言按钮的类名 `.lx-chip--lang` 是该脚本的选择器契约，改名即视为破坏回归检查。

12. **内部系统的默认语言是中文，不探测 `navigator.language`。**
    本系统用户全在天能（湖州），但相当一部分人装的是英文版系统/浏览器。跟随浏览器语言
    的结果是这些人**一进系统就是英文**，而他们无从知道这是浏览器决定的——只会判断成
    "系统有问题"（见第 11 条的真实事故）。故 `detectLocale()` 的优先级是
    **「`localStorage['lx.locale']` 偏好 > 默认 `zh-CN`」，没有浏览器探测这一层**。
    代价是英文偏好用户首次进入需自己切一次，之后由偏好记住——这是有意取舍，不是遗漏。
    多租户场景下默认语言应由调用方通过 options 覆盖，而不是重新引入浏览器探测。

    **回归判据**：`scripts/verify-locale-switch.mjs` 的第 [1] 段在 `locale: 'en-US'`
    的 context 里断言首访必须是 `zh-CN`。若有人把它改回断言 `en-US`，就是在无意中
    恢复浏览器探测——这条断言的方向本身就是约定的一部分。

13. **窄容器里的文案按「最长语言」定词，不是按中文。** 第 10 条讲的是并排文本黏连，
    这条是同一根源的另一副面孔：**长度溢出**。中文四个字能表达的东西，英文常要十几个字符
    （「本月」→ `This month`）。容器宽度由栅格固定时（如 7 张指标卡一行，每张内容区约 150px），
    中文版富余四成、英文版正好顶到边界，而 `text-overflow: ellipsis` 会把**数值**截掉，
    留下一个看着像正常标签的 `This mont…`。

    真实缺陷（2026-09-23）：指标卡的「本月 128」在 en-US 下渲染成 `This mont…`，
    数字完全不可见。而中文态截图、typecheck、lint、build、i18n 门禁**五项全绿**——

    **判据：**
    - 固定宽度容器里的文案先量英文再定词，能用两个词的别用三个
      （`This month` → `Month`，在指标卡语境下语义不减）。
    - 标签与数值同行时：**标签可省略，数值不可省略**。做不到就换短词，不要让省略号落在数值上。
    - 收工前切到 `en-US` 逐张看——与第 10 条同一个动作、同一条理由。

14. **指标名不折行——它是栅格行的一部分，不是普通文案。**
    7 张指标卡排一行时，每张内容区只有约 125px（1366 视口）。指标名折成两行，同一行的卡片
    就被撑成不同高度，整排列对齐随之失效：折行不是排版细节，是**这一行的读数节拍被打断**。

    真实缺陷（2026-09-23）：「高意向客户数」（6 字约 66px）在 1366 视口只剩 27–45px 余量，
    而标签行右端的「今日」时点胶囊要吃掉约 38px（胶囊 + gap）→ 必然折行。
    改法不是"把字号调小"（治不了更长的指标名），而是两件事：
    - **把挤占宽度的元素移出这一行**：时点胶囊从标签行挪到数值行右端，标签行整行归指标名。
    - **给指标名一个可收缩的单元**：`<span class="lx-kpi__name">` 包住文字，
      配 `min-width:0 + nowrap + ellipsis`。裸文本在 flex 里是匿名项，既加不了 `min-width:0`
      也截不断，加 `nowrap` 只会直接溢出去压隔壁卡——**宁可截断，不可溢出**。

    **验证方式是量宽度，且必须带反向对照。** 折行是边界现象：宽一档就好、窄一档才坏，
    看图只能证明"这一张图没折行"。逐档量 `scrollWidth / clientWidth` 与行盒高度，
    并在同一轮里**主动把版式弄坏一次**，确认探针真能报出来——
    **选择器没命中时，所有断言都会"通过"**（本次探针就靠这条才没白跑）。

    现成工具：`NODE_OPTIONS= node scripts/probe-kpi-labels.mjs`
    （`PROBE_ROUTES` / `PROBE_WIDTHS` 可覆盖；`PROBE_OLD=1` 复现改前几何做对照；
    自带三条反向对照）。实测结论：**破损带是 1241–1440**——
    ≥1500 时胶囊占掉 44px 仍剩 6px、≤1240 栅格降 4 列卡变宽，
    所以 **1680 的截图永远拍不到这个缺陷**。

15. **页标题不是每页都必须有；但 h1 必须留在 DOM 里。**
    工作台（2026-09-23）视觉上撤掉了「经营总览 + 副标题」：页名在侧栏与顶栏都已标出，
    副标题是给导航做注释的，首屏第一行更该是数据。实现走 `PageContainer` 的 `hideTitle`，
    **不是"不传 titleKey"**——后者的收益只是少写几行 JSX，代价是页面失去标题层级
    （读屏拿不到"这是哪一页"，浏览器大纲也断）。
    无标题时页头只剩右侧操作区，靠 `.lx-page__header--bare` 就近右对齐
    （`space-between` 会把单独的 extra 甩到左边；768px 以下页头转竖排后
    对齐改由 `align-items` 管，那里要再声明一次）。

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
