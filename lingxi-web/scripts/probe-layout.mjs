/**
 * 版式溢出探测器 —— 用机器代替肉眼找「内容被裁 / 被折断」。
 *
 * 为什么需要：截图看着正常、四道门禁全绿，版式缺陷照样能溜过去。
 * 客户中心这一轮就是典型 —— 中文没有词间空格，一行变两行不刺眼，
 * 但英文态必炸；而「表格被撑宽把最右的操作列推出视野」更是在截图里
 * 只表现为「文字好像被切了一点」。这个脚本把问题变成可断言的数量，并按「处置方式」分三层：
 *
 *   1. CLIP   —— 藏了内容且**不给任何提示**（overflow:hidden/clip 且无 text-overflow），
 *                用户根本不知道丢了什么 → **唯一必须修的硬缺陷**
 *   2. SCROLL —— 横向滚动容器（overflow-x: auto/scroll）内容超出：内容没丢，但要用户
 *                自己滚（表格被撑宽属此类）→ 判断是否可接受
 *   3. ELLIP  —— 有省略号：用户知道"这里还有字"，是**有意的降级**（如 KPI 指标名在
 *                7 列窄卡下宁可截断也不破版）→ 只留意信息损失，不算缺陷
 *   4. WRAP   —— 声明了 nowrap 的叶子文本，实际占了 **≥2 个行盒**（本该一行却被折断）→ 硬缺陷
 *                （判据是 Range 取到的**行盒矩形数**，不是"元素高度 ÷ 行高" —— 后者在表格上
 *                 100% 误报，见下方 WRAP 规则处的说明）
 *   5. BOX    —— 关键容器的实测宽度 / 栅格列宽（用来判断该调多少像素，而不是靠猜）
 *   6. TDLINES—— 表格**列内行数分布**（诊断，非缺陷）：同一列里有的行 1 行、有的行 2 行。
 *                这一类前五类全拦不住 —— 普通文本被列宽折断时既不溢出、也无省略号、
 *                更没声明 nowrap，四类全绿而该行已被撑高。**只能靠它现形。**
 *
 * 为什么必须区分 CLIP 与 ELLIP：二者在 DOM 里都是 scrollWidth > clientWidth，
 * 混在一起报就会每次刷出一屏"缺陷"，久而久之**习惯性忽略**，真问题反而被淹掉。
 *
 * 用法（先起 dev server）：
 *   LAYOUT_ROUTE=/customer LAYOUT_LOCALE=zh-CN node scripts/probe-layout.mjs
 *   LAYOUT_ROUTE=/customer LAYOUT_LOCALE=en-US node scripts/probe-layout.mjs
 *   LAYOUT_BOXES=".lx-listblock,.lx-facetbar" LAYOUT_OUT=artifacts/tmp/x ...
 *
 * **折叠态的默认视图测不到展开后的东西**。筛选面板、抽屉、折叠区这类内容
 * 必须先用 `LAYOUT_CLICK` 点开再测，否则 `.lx-filterpanel` 永远报 MISSING、
 * 所有断言「通过」——探针自己把自己骗过去了：
 *   LAYOUT_ROUTE=/customer LAYOUT_CLICK=".lx-facetbar__toggle" LAYOUT_BOXES=".lx-filterpanel__grid" ...
 *
 * 环境变量：LAYOUT_BASE / LAYOUT_ROUTE / LAYOUT_LOCALE / LAYOUT_W / LAYOUT_H /
 *          LAYOUT_CLICK（先点击以进入目标状态的选择器）/ LAYOUT_BOXES（逗号分隔的选择器）/
 *          LAYOUT_GOTO_TIMEOUT（等 networkidle 的毫秒数，超时降级为 DOM 就绪，默认 30000）/
 *          LAYOUT_OUT（落盘目录，可选）
 *
 * 判读要点：汇报里只需盯 **CLIP 与 WRAP 非空**（这两类是硬缺陷）。
 * SCROLL 视页面性质判断 —— 表格页本来就允许横滚，但"两栏布局里列表被挤到横滚"是缺陷。
 * ELLIP 只需扫一眼有没有不该截断的（如完整句子、编号），其余是设计取舍。
 * TDLINES 逐列看：动作列堆叠多个链接（1~3 行）属设计；**纯文本列 1/2 混排才可疑**。
 * 已豁免 `lx-visually-hidden`（屏读标题，故意 clip）与 `ant-pagination`（AntD 自身的「•••」）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://127.0.0.1:5173';
const ROUTE = process.env.LAYOUT_ROUTE ?? '/customer';
const LOCALE = process.env.LAYOUT_LOCALE ?? 'zh-CN';
const W = Number(process.env.LAYOUT_W ?? 1682);
const H = Number(process.env.LAYOUT_H ?? 1400);
const BOXES = (process.env.LAYOUT_BOXES ?? '').split(',').filter(Boolean);
const OUT = process.env.LAYOUT_OUT ?? '';
/** 目标状态在折叠区里时，先进去再测（见文件头的说明） */
const CLICK = process.env.LAYOUT_CLICK ?? '';

function findChrome() {
  return ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) =>
    fs.existsSync(p),
  );
}
function resolvePlaywright() {
  const pnpmDir = path.join(WEB, 'node_modules', '.pnpm');
  const hit = fs
    .readdirSync(pnpmDir)
    .filter((n) => n.startsWith('playwright@'))
    .sort()
    .reverse()
    .find((n) => fs.existsSync(path.join(pnpmDir, n, 'node_modules', 'playwright')));
  if (!hit) throw new Error('playwright not found');
  return createRequire(path.join(pnpmDir, hit, 'node_modules', 'playwright', 'package.json')).resolve('playwright');
}

const pw = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const context = await browser.newContext({ viewport: { width: W, height: H } });
await context.addInitScript((loc) => {
  window.localStorage.setItem('lx.locale', loc);
}, LOCALE);

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
/* `networkidle` 在 Vite dev 上**天生不可靠**：HMR 是长连接、模块是按需编译的，
   页面可能永远不进入"500ms 内 ≤2 个连接"的状态 —— 2026-09-24 冷启动的 dev server 上
   实测卡满 30s 超时，可 DOM 其实早就渲染完了（探针自己把"已就绪"判成失败）。
   故超时**降级**为"DOM 就绪即继续"，其余错误照抛。 */
try {
  await page.goto(`${BASE}${ROUTE}`, {
    waitUntil: 'networkidle',
    timeout: Number(process.env.LAYOUT_GOTO_TIMEOUT ?? 30000),
  });
} catch (e) {
  if (!/Timeout/i.test(String(e))) throw e;
  // 中文必须写进**模板字符串**：ESLint 的 no-restricted-syntax 只放过 TemplateLiteral，
  // 普通字符串字面量会被「禁止硬编码中文」拦下（scripts/ 未豁免）—— 这条门禁真会拦。
  console.error(`[warn] networkidle 超时（Vite dev 的 HMR 长连接所致），降级为 DOM 就绪判据`);
}
/* 页面已渲染判据：常规页用 .lx-page__body（PageContainer 渲染）；
 * 客服工作台是自定义全高布局（.lx-svc / .lx-svc-shell，不用 PageContainer），也认。 */
await page.waitForSelector('.lx-page__body, .lx-svc, .lx-svc-shell', { timeout: 20000 });
await page.waitForTimeout(600);

/* 进入目标状态。点击失败要**抛出**而不是静默继续 ——
   静默继续会去测一个还没展开的页面，所有断言照样"通过"，等于白跑。 */
if (CLICK) {
  await page.click(CLICK, { timeout: 8000 });
  await page.waitForTimeout(500);
}

const report = await page.evaluate((boxSelectors) => {
  const sel = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 4) {
      let s = cur.tagName.toLowerCase();
      if (cur.classList.length) s += '.' + [...cur.classList].slice(0, 2).join('.');
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const clips = [];
  const ellips = [];
  const scrolls = [];
  const wraps = [];

  /* 豁免：这两类不是"内容被裁"。
     - lx-visually-hidden 是屏读专用标题，故意 clip 到 1px；
     - ant-pagination 的「•••」内部是 overflow:visible 的层级实现，渲染正常。 */
  const waived = (el) => {
    const c = typeof el.className === 'string' ? el.className : '';
    return /lx-visually-hidden|ant-pagination/.test(c);
  };

  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    // 只看"叶子级文本容器"与可能有固定宽度的盒子
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    const cs = getComputedStyle(el);
    const isRow = cs.display === 'flex' || cs.display === 'inline-flex' || cs.display === 'grid';
    // 滚动容器（overflow-x: auto/scroll）内容超出即"被迫横向滚动"，也是一种版式缺陷
    const isScrollBox = /auto|scroll/.test(cs.overflowX);

    if (el.scrollWidth > el.clientWidth + 1 && (own || el.children.length === 0 || isScrollBox)) {
      if (waived(el)) continue;
      const rec = {
        s: sel(el),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 46),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        overflowX: cs.overflowX,
      };
      /* 三分类，因为处置完全不同：
         SCROLL —— 容器可横滚，内容没丢但要用户自己滚（表格撑宽属此类）
         ELLIP  —— 有省略号，用户知道"这里还有字"，是有意的降级
         CLIP   —— 藏了且不给任何提示，用户根本不知道丢了什么 → 只有这类才是硬缺陷 */
      if (isScrollBox) scrolls.push(rec);
      else if (cs.textOverflow === 'ellipsis') ellips.push(rec);
      else clips.push(rec);
    }
    /* WRAP：判据 = 叶子文本容器的**内容盒高度**超过一行，且它声明了 nowrap（"本该一行"）。
       必须做两件事，否则这条规则在表格上 100% 误报（2026-09-25 在五张表上实测，48 条全是假阳性）：
         · **减掉上下 padding 与边框** —— `th` 实测高 42px，其中 25px 是 padding，
           不减就会把"本来就该一行"的每一个表头都报成折行；
         · **跳过 `display: table-cell / table-row`** —— `td` 的高度是**整行高度**，
           同一行只要动作列堆叠了多行链接，全行每一格都被撑到 64px（行高才 19px），
           与"文字有没有被折断"毫无关系（TDLINES 那一节踩的正是同一个坑）。
       另：**不要**改用 `Range.getClientRects()` 数行盒 —— 对被 `text-overflow: ellipsis`
       截断的元素，Chromium 会把溢出部分也算成一个 rect，单行文本同样报 2 个（实测如此）。 */
    if (own && !isRow && el.children.length === 0 && own.length <= 40 && cs.whiteSpace === 'nowrap') {
      const lh = parseFloat(cs.lineHeight) || 0;
      const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const bord = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      const contentH = el.getBoundingClientRect().height - pad - bord;
      const isCell = cs.display === 'table-cell' || cs.display === 'table-row';
      if (!isCell && lh > 0 && contentH >= lh * 1.85) {
        wraps.push({
          s: sel(el),
          text: own.slice(0, 40),
          lines: Math.round(contentH / lh),
          h: Math.round(contentH),
          lh: Math.round(lh),
        });
      }
    }
  }

  // 去重：同一祖先的多个文本节点只留一次
  const uniq = (arr) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = x.s + '|' + x.text;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const boxes = boxSelectors.map((q) => {
    const el = document.querySelector(q);
    if (!el) return { q, missing: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      q,
      w: Math.round(r.width),
      h: Math.round(r.height),
      cols: cs.gridTemplateColumns,
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    };
  });

  // 表格列宽（表头 th）
  const ths = [...document.querySelectorAll('.ant-table-thead th')].map((th) => ({
    t: th.textContent.trim().slice(0, 12),
    w: Math.round(th.getBoundingClientRect().width),
  }));

  /* 列内折行数分布 —— 第 6 类，也是**前五类全拦不住的那一类**：
     单元格里一句普通文本被列宽折断时，它既没溢出（不报 CLIP/SCROLL）、
     也没省略号（不报 ELLIP）、更没声明 nowrap（上面那条 WRAP 显式要求
     `cs.whiteSpace === 'nowrap'`，所以也不报）。四类全绿，而该行实际被撑高、
     与相邻单行行高不齐 —— 2026-09-24 收紧「意向等级」列宽就是这样漏过一次回归的
     （`已关闭不评估` 折成 2 行、英文 `Not scored once closed` 折成 3 行），
     最后靠与改版前基线截图对照才发现。这里把它变成可断言的数量。

     量的是**单元格内首个子元素自身**的高度，不是 `td` 的高度 —— 后者是整行高度，
     同一行只要有一列内容高（如动作列堆叠 3 个链接），所有单元格都被撑到同一高度，
     于是每一列都被误报成"4 行"（首版正是这么错的，10 列全报 1/2/4 = 满屏噪声）。

     判读是**人工**的：动作列堆叠多个链接（1~3 行）属设计、属正常；
     纯文本列出现 1/2 混排才可疑。 */
  const tdlines = [];
  const tbody = document.querySelector('.ant-table-tbody');
  if (tbody) {
    const headers = [...document.querySelectorAll('.ant-table-thead th')].map((th) =>
      th.textContent.trim().slice(0, 10),
    );
    const perColMap = new Map();
    /* 必须量**单元格内首个元素子节点自身**的高度，不能量 `td` 的高度：
       `td.getBoundingClientRect().height` 是**整行高度** —— 同一行里只要有一列内容高
       （如动作列堆叠 3 个链接），这一行所有单元格都会被撑到同一高度，于是每一列都被
       误报成"4 行"（首版就是这么错的：10 列全报 1/2/4，满屏噪声）。
       本表每列 render 都返回一个元素，故取首个子元素是稳的；它不被行高拉伸。 */
    for (const tr of tbody.querySelectorAll('tr')) {
      if (tr.classList.contains('ant-table-measure-row')) continue;
      [...tr.children].forEach((td, i) => {
        const child = td.firstElementChild;
        if (!child) return; // 空单元格（无内容）不计入
        const cs = getComputedStyle(child);
        const lh = parseFloat(cs.lineHeight) || 22;
        const h = child.getBoundingClientRect().height;
        const lines = Math.max(1, Math.round(h / lh));
        if (!perColMap.has(i)) perColMap.set(i, new Map());
        const m = perColMap.get(i);
        if (!m.has(lines)) m.set(lines, (child.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26));
      });
    }
    for (const [i, m] of [...perColMap.entries()].sort((a, b) => a[0] - b[0])) {
      const vals = [...m.keys()].sort((a, b) => a - b);
      if (vals.length < 2) continue; // 整列行数一致 = 没有折行异常，不报
      tdlines.push({
        col: i + 1,
        name: headers[i] ?? `#${i + 1}`,
        lines: vals,
        sample: vals
          .filter((v) => v > 1)
          .map((v) => `${v}行「${m.get(v)}」`)
          .join(' / '),
      });
    }
  }

  return {
    clips: uniq(clips).slice(0, 30),
    ellips: uniq(ellips).slice(0, 30),
    scrolls: uniq(scrolls).slice(0, 30),
    wraps: uniq(wraps).slice(0, 20),
    boxes,
    ths,
    tdlines,
    docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}, BOXES);

const lines = [];
const log = (s) => {
  console.log(s);
  lines.push(s);
};
/* 状态写进标题 —— 展开态与折叠态的结论完全不同，报告里不写清楚就没法比对 */
log(`### ${ROUTE}  locale=${LOCALE}  viewport=${W}x${H}${CLICK ? `  click=${CLICK}` : ''}  errors=${errors.length}`);
if (errors.length) log(`    ${errors.slice(0, 2).join(' | ').slice(0, 300)}`);
log(`docOverflowX=${report.docOverflowX}`);
if (report.boxes.length) {
  log(`-- BOX --`);
  for (const b of report.boxes) {
    log(b.missing ? `   ${b.q}  MISSING` : `   ${b.q}  w=${b.w} h=${b.h} scrollW=${b.scrollW} cols=${b.cols}`);
  }
}
if (report.ths.length) {
  log(`-- TH --`);
  log('   ' + report.ths.map((x) => `${x.t}:${x.w}`).join('  '));
}
log(`-- CLIP (${report.clips.length})  【硬缺陷】藏了内容且无任何提示，用户不知道丢了什么 --`);
for (const c of report.clips) log(`   ${c.scrollW}>${c.clientW} ovf=${c.overflowX}  ${c.s}  「${c.text}」`);
log(`-- SCROLL (${report.scrolls.length})  【需横滚】内容没丢，但要用户自己滚（表格撑宽属此类） --`);
for (const c of report.scrolls) log(`   ${c.scrollW}>${c.clientW} ovf=${c.overflowX}  ${c.s}  「${c.text}」`);
log(`-- ELLIP (${report.ellips.length})  【有意降级】显示了省略号，属设计取舍，只需留意信息损失 --`);
for (const c of report.ellips) log(`   ${c.scrollW}>${c.clientW}  ${c.s}  「${c.text}」`);
log(`-- WRAP (${report.wraps.length})  【硬缺陷】声明了 nowrap 却被折断（内容盒高 ≥1.85 行高） --`);
for (const w of report.wraps) log(`   内容高=${w.h} 行高=${w.lh}  约 ${w.lines} 行  ${w.s}  「${w.text}」`);
log(`-- TDLINES (${report.tdlines.length})  【诊断·非缺陷】同列内行数不一致（普通文本折行前五类全不可见）--`);
for (const r of report.tdlines) log(`   #${r.col} ${r.name}: 行数 ${r.lines.join('/')}  ${r.sample}`);

await browser.close();
if (OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const tag = `${LOCALE.replace(/-/g, '')}${ROUTE.replace(/[/:]/g, '_')}${CLICK ? '-expanded' : ''}`;
  fs.writeFileSync(path.join(OUT, `layout-${tag}.txt`), lines.join('\n') + '\n');
}
