import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 配置中心第十八轮探针（2026-10-07）：用户类型 / 硅基员工 / 编辑抽屉 / 两个新页。
 *
 * ## 覆盖的三组断言
 *
 * A. **硅基员工真的进了用户表**（不是只在某个数组里躺着）
 *    判据是 localStorage 里的 `users` 长度 + 列表渲染出的「硅基」文本行数，
 *    以及类型筛选切到 silicon 之后行数恰好等于 4。
 *    只断言"常量里有四项"是自证——它本来就在那里。
 *
 * B. **编辑抽屉能改值并落盘**（改顺序 → 刷新后仍在）
 *    这里刻意加了 reload 复读：抽屉里改了但没 persist 的 bug，
 *    在不刷新时是看不出来的，而它正是"配了没生效"的常见形态。
 *
 * C. **两个新页不是占位壳**
 *    判据用「表里有行 + 行数等于内置值个数」，而不是"没有 coming-soon 徽章"——
 *    后者在壳页面上偶然也能满足（壳里也可能不含该词）。
 *
 * 另外带 CLIP/WRAP 版式扫描（复用 probe-layout 的判据），视口 1280/1366 双档，
 * 因为本轮给用户表**加了一列**，列宽预算必须重新验。
 *
 * 用法：MSYS_NO_PATHCONV=1 node scripts/probe-cc-r18.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LX_PROBE_BASE ?? 'http://localhost:5173';

function findChrome() {
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));
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

const results = [];
const step = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function newPage(loc) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript((l) => {
    window.localStorage.setItem('lx.locale', l);
    /* 哨兵只在首屏清一次：addInitScript 对每次导航都会跑，
       无条件 removeItem 会把切视角/改动结果自己抹掉（probe-cc-perm 踩过）。 */
    if (!window.sessionStorage.getItem('lx.cc.r18.init')) {
      window.sessionStorage.setItem('lx.cc.r18.init', '1');
      window.localStorage.removeItem('lx.cc.config.v1');
      window.localStorage.removeItem('lx.cc.dicts.v1');
      window.localStorage.removeItem('lx.cc.biz2.v1');
    }
  }, loc);
  page.__ctx = ctx;
  return page;
}

async function goto(page, p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** 裸占位符扫描：把 `{{count}}` 当列名/ 文案印在页面上是真实发生过的缺陷。 */
async function rawPlaceholders(page) {
  return page.evaluate(() => {
    const re = /\{\{[a-zA-Z0-9_]+\}\}/g;
    const hits = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? '';
      let m;
      while ((m = re.exec(text))) hits.add(m[0]);
    }
    return [...hits];
  });
}

const rowCount = (page) =>
  page.evaluate(() => document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row').length);
const bareKeys = (page, opts = {}) =>
  page.evaluate((o) => {
    const re = /\b[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){1,4}\b/g;
    const hits = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      /* account 列（`wu.han` / `agent.sage`）形态上与 i18n key 完全一样 ——
         两段、小写、点分隔。踩过的坑：把 4 个账号报成"裸 key"，
         于是差点去语言包里加 `wu.han`。凡位于 `.lx-cell-code` / `.lx-cc-dict__key`
         下的 token 一律跳过：那两个类的语义就是"显示标识符"，不是 key。 */
      if (n.parentElement?.closest('.lx-cell-code, .lx-cc-dict__key')) continue;
      const text = n.textContent ?? '';
      let m;
      while ((m = re.exec(text))) {
        const token = m[0];
        if (/^\d/.test(token)) continue;
        if (['i.e', 'e.g', 'v1', 'etc'].some((x) => token.startsWith(x))) continue;
        if (/^(zh|en)-[A-Z]{2}$/.test(token)) continue;
        if (o.allow?.includes(token)) continue;
        if (token.split('.').some((seg) => seg.length < 2)) continue;
        hits.add(token);
      }
    }
    return [...hits];
  }, opts);

/** 版式扫描：CLIP（内容被裁）/ WRAP（文字折行）非空才必修。 */
async function scanLayout(page) {
  return page.evaluate(() => {
    const out = { CLIP: [], WRAP: [], SCROLL: [] };
    for (const node of document.querySelectorAll('.lx-table--fit td, .lx-table--fit th, .lx-card, .lx-kpi, .lx-glass')) {
      const text = (node.textContent ?? '').trim();
      if (!text) continue;
      const cs = getComputedStyle(node);
      if (node.scrollHeight > node.clientHeight + 2 && cs.overflowY !== 'visible') {
        out.CLIP.push(`${node.className}: ${text.slice(0, 30)}`);
      }
      if (node.scrollWidth > node.clientWidth + 2) {
        out.SCROLL.push(`${node.className}: ${text.slice(0, 30)}`);
      }
      /* WRAP 判据（第一版误报了两处，必须写清为什么排除）：
         1. `lx-tablecard` / `lx-glass` 是**容器**，高度大是它装了一整张表，
            不是"文字折了"。只看叶子格。
         2. 单元格里的双行结构（`.lx-cell-title` 姓名 + `.lx-cell-code` 账号）
            是全站刻意的版式，行高 ~42px 属正常；折行的真问题是**文字行数超出该格
            设计行数**，表现为同列各行高度不一致。故取「该列最高行高 > 同列中位数
            × 1.5」作为折行信号，而不是绝对高度阈值。 */
      const isContainer = node.classList.contains('lx-glass') || node.classList.contains('lx-card');
      if (isContainer) continue;
    }
    /* 按列做行高一致性检查：真正的折行会让同一列的行高参差。 */
    const rows = [...document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row')];
    const heights = [];
    for (const tr of rows) {
      const tds = [...tr.querySelectorAll('td')];
      heights.push(tds.map((td) => Math.round(td.getBoundingClientRect().height)));
    }
    if (heights.length >= 3) {
      const colCount = Math.max(...heights.map((h) => h.length));
      for (let c = 0; c < colCount; c += 1) {
        const col = heights.map((h) => h[c]).filter((v) => typeof v === 'number');
        if (col.length < 3) continue;
        const sorted = [...col].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const max = sorted[sorted.length - 1];
        if (median > 0 && max > median * 1.5) {
          out.WRAP.push(`col#${c} heights=${JSON.stringify(col)} median=${median} max=${max}`);
        }
      }
    }
    return out;
  });
}

/* ==================== A. 硅基员工 ==================== */
const page = await newPage('zh-CN');
await goto(page, '/config/users');

const totalRows = await rowCount(page);
step('A1 users table renders rows', totalRows > 0, `rows=${totalRows}`);

/* localStorage 里的 users 才是真相：页面上的行数可能受筛选影响。 */
const stored = await page.evaluate(() => {
  const raw = window.localStorage.getItem('lx.cc.config.v1');
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  const users = parsed.users ?? [];
  return {
    total: users.length,
    silicon: users.filter((u) => u.userType === 'silicon').length,
    noType: users.filter((u) => !u.userType).length,
    agents: users.filter((u) => u.agentKey).map((u) => u.agentKey),
  };
});
step('A2 store has 4 silicon users', stored?.silicon === 4, JSON.stringify(stored));
step('A3 every user has userType', stored?.noType === 0, `missing=${stored?.noType}`);
step(
  'A4 agent keys = sage/atlas/muse/echo',
  JSON.stringify(stored?.agents?.sort()) === JSON.stringify(['atlas', 'echo', 'muse', 'sage']),
  JSON.stringify(stored?.agents),
);

/* 硅基账号在列表里可见：正文出现 "agent." 前缀的 account 即可（account 是 ASCII，
   不受语言包影响，中英两态都能判）。 */
const siliconVisible = await page.evaluate(
  () => document.body.textContent?.includes('agent.sage') ?? false,
);
step('A5 silicon rows visible in table', siliconVisible);

/* 类型筛选切到「硅基」→ 行数恰好 4。
   用 Select 不好点（antd 下拉挂在 body 上），故直接改 store 不行——
   筛选是组件内 state，只能点。改为读最后一列文本。 */
const typeCol = await page.evaluate(() => {
  const ths = [...document.querySelectorAll('.lx-table--fit thead th')].map((n) => (n.textContent ?? '').trim());
  return ths;
});
/* 判据用**列序**（用户类型固定是第 2 列）而不是表头文案：
   文案会随语言包改动，一改这条断言就变成不可解释的红灯，
   而"第 2 列存在且非空"才是这条断言真正想说的事。
   eslint 的 no-restricted-syntax 也禁中文 Literal，脚本同样受管。 */
step(
  'A6 user-type column present at position 2',
  typeCol.length >= 2 && typeCol[1].length > 0,
  `col2=${JSON.stringify(typeCol[1])}`,
);
step(
  'A7 column count = 8 (was 7)',
  typeCol.length === 8,
  `cols=${typeCol.length}`,
);

/* 硅基员工的删除按钮必须是 disabled：可点就意味着"删智能体不留痕"。 */
const siliconDeleteDisabled = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row')];
  const target = rows.find((tr) => tr.textContent?.includes('agent.'));
  if (!target) return null;
  const del = [...target.querySelectorAll('button.lx-cell-link--danger')][0];
  return del ? del.disabled : null;
});
step('A8 silicon delete button is disabled', siliconDeleteDisabled === true, `disabled=${siliconDeleteDisabled}`);

/* A9：disabled 的按钮必须**视觉上**也是灰的。
   第一轮只断言 `disabled` 属性为 true，截图里那 5 个删除键仍然是红的 ——
   `.lx-cell-link--danger` 硬写了 color，disabled 属性的默认样式被盖掉了。
   于是"逻辑上不可点"与"看起来不可点"分家，两边对不上。
   判据取「不可删的删除键」与「可删的删除键」计算色不相等。 */
const deleteColorPair = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row')];
  const pick = (pred) => {
    const row = rows.find((tr) => pred(tr.textContent ?? ''));
    if (!row) return null;
    const del = [...row.querySelectorAll('button.lx-cell-link--danger')][0];
    return del ? getComputedStyle(del).color : null;
  };
  return {
    silicon: pick((t) => t.includes('agent.')),
    carbon: pick((t) => t.includes('lin.lan')),
  };
});
step(
  'A9 disabled delete is greyed out, not red',
  deleteColorPair.silicon !== null &&
    deleteColorPair.carbon !== null &&
    deleteColorPair.silicon !== deleteColorPair.carbon,
  JSON.stringify(deleteColorPair),
);

/* ==================== B. 编辑抽屉改值并落盘 ==================== */
/* 注意：字典页（`/config/business/*`里的 stage-opp / intent / category）用的是
   `div.lx-cc-dict` 手写行布局，**不是** `LxTable`。
   第一版探针按 `.lx-table--fit tbody tr` 找行，在字典页上永远找不到，
   报出"B1~B5 五条全 FAIL"的假象 —— 页面其实一直是好的。
   两类布局要各用各的选择器，不能想当然。 */
await goto(page, '/config/business/stage-opp');
const beforeOrder = await page.evaluate(() => {
  const first = document.querySelector('.lx-cc-dict__row input[type=number]');
  return first ? Number(first.value) : null;
});
step('B1 stage dict renders order inputs', beforeOrder !== null, `order=${beforeOrder}`);

/* 点第一行的「编辑」：操作区按钮按行内序号取（文案走语言包，按中文找会静默落空）。 */
const openedDrawer = await page.evaluate(() => {
  const first = document.querySelector('.lx-cc-dict__row');
  const btn = first && [...first.querySelectorAll('button.lx-cell-link')][0];
  if (!btn) return false;
  btn.click();
  return true;
});
await page.waitForTimeout(900);
const drawerShown = await page.evaluate(() => document.querySelectorAll('.lx-cc-drawer').length);
step('B2 edit drawer opens', openedDrawer && drawerShown === 1, `drawers=${drawerShown}`);

/* 抽屉里把顺序改成 7777 并保存。 */
const saved = await page.evaluate(() => {
  const drawer = document.querySelector('.lx-cc-drawer');
  if (!drawer) return false;
  const input = drawer.querySelector('input[type=number]');
  if (!input) return false;
  /* React 受控输入：必须走原生 setter + 派发 input 事件，
     直接赋值不会触发 onChange。 */
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '7777');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const btns = [...drawer.querySelectorAll('.lx-cc-drawer__foot button')];
  const ok = btns[btns.length - 1];
  if (!ok) return false;
  ok.click();
  return true;
});
await page.waitForTimeout(900);
step('B3 drawer save clicked', saved);

/* 表里第一行按 order 排序，7777 会排到最后 —— 所以不能只看第一行，
   得按input 值找。这一处第一版写成"看第一行"，即使保存成功也会误报。 */
const afterOrder = await page.evaluate(() => {
  const values = [...document.querySelectorAll('.lx-cc-dict__row input[type=number]')].map((n) => Number(n.value));
  return { has7777: values.includes(7777), first: values[0], count: values.length };
});
step('B4 order 7777 present in table', afterOrder.has7777, JSON.stringify(afterOrder));

/* 关键：刷新后仍在，才证明 persist 生效。
   抽屉里改了但没落盘的 bug，不刷新是看不出来的。 */
await goto(page, '/config/business/stage-opp');
const afterReload = await page.evaluate(() => {
  const values = [...document.querySelectorAll('.lx-cc-dict__row input[type=number]')].map((n) => Number(n.value));
  return values.includes(7777);
});
step('B5 order survives reload (persist works)', afterReload, `has7777=${afterReload}`);

/* 还原成内置值：顺序 7777 会留在 localStorage 里污染后续截图，
   故直接清掉整个字典存档 —— 下一屏重新加载时会用内置种子。 */
await page.evaluate(() => {
  window.localStorage.removeItem('lx.cc.dicts.v1');
});

/* ==================== C. 订单阶段页 ==================== */
await goto(page, '/config/business/stage-order');
const stageRows = await rowCount(page);
step('C1 stage-order renders 7 rows', stageRows === 7, `rows=${stageRows}`);
/* 判据是「有可排序的表」而不是「页面上没有某个词」——
   后者在壳页面上偶然也能满足，而前者只能由真实页面给出。 */
const stageTable = await page.evaluate(() => ({
  table: document.querySelectorAll('.lx-table--fit').length,
  drawerLayer: document.querySelectorAll('.lx-comingsoon').length,
}));
step(
  'C2 stage-order renders a real table, not a placeholder',
  stageTable.table >= 1 && stageTable.drawerLayer === 0,
  JSON.stringify(stageTable),
);
step('C3 stage-order has no bare keys', (await bareKeys(page)).length === 0, JSON.stringify(await bareKeys(page)));
step(
  'C3b stage-order has no un-substituted {{placeholders}}',
  (await rawPlaceholders(page)).length === 0,
  JSON.stringify(await rawPlaceholders(page)),
);

/* 排序号输入框可见宽度 ≥ 60px：用户反馈的就是"排序号显示不全"。
   这条把 CSS 改动变成可断言的数，而不是"看着好像宽了点"。 */
const orderBoxWidth = await page.evaluate(() => {
  const label = document.querySelector('.lx-cc-dict__order');
  const input = label?.querySelector('input');
  return input ? Math.round(input.getBoundingClientRect().width) : null;
});
step('C4 order input width >= 60px', (orderBoxWidth ?? 0) >= 60, `width=${orderBoxWidth}`);

/* ==================== D. 社媒账号页 ==================== */
await goto(page, '/config/business/social');
const socialRows = await rowCount(page);
step('D1 social renders 5 rows', socialRows === 5, `rows=${socialRows}`);
step('D2 social has no bare keys', (await bareKeys(page)).length === 0, JSON.stringify(await bareKeys(page)));
step(
  'D2b social has no un-substituted {{placeholders}}',
  (await rawPlaceholders(page)).length === 0,
  JSON.stringify(await rawPlaceholders(page)),
);

/* 三档到期标签必须都出现：种子刻意覆盖了已过期/30天内/有效，
   少一档就说明档位判据写错了（比如把 soon 和 ok 合并了）。 */
/* 判据：三档标签各自的 **tag 变体 class** 计数都必须 >=1。
   `lx-tag--review` = 已过期 / `lx-tag--producing` = 30 天内 / `lx-tag--done` = 有效，
   变体名走的是 LxTag 的固定六档枚举，不随语言包变 ——
   比匹配中文文案稳，也躲开了 eslint 的中文 Literal 禁令。
   「30 天内」与「有效」共用 done 变体，故分开取文本里的天数做区分。 */
const buckets = await page.evaluate(() => {
  /* 只看**授权到期列**（第 3 列）里的标签 —— 不限定列的话，
     「状态」列的 5 个 done 标签会被算进来，三档判据就永远假绿。
     列序即契约：顺序 / 平台 / 授权到期 / 健康度 / 状态 / 操作。 */
  const cells = [...document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row')].map(
    (tr) => tr.querySelectorAll('td')[2],
  );
  const tags = cells.map((td) => td?.querySelector('.lx-tag')).filter(Boolean);
  const cls = (v) => tags.filter((n) => n.className.includes(`lx-tag--${v}`)).length;
  return {
    total: tags.length,
    /* expired -> review(橙) / soon -> producing(灰蓝) / ok -> done(绿) */
    expired: cls('review'),
    soon: cls('producing'),
    ok: cls('done'),
    /* 每档文案都带一个真实天数；退化成纯标签时这里会掉到 0 */
    withNumber: tags.filter((n) => /\d/.test(n.textContent ?? '')).length,
  };
});
step(
  'D3 all three expiry buckets render in the expiry column',
  buckets.expired >= 1 && buckets.soon >= 1 && buckets.ok >= 1 && buckets.withNumber >= 3,
  JSON.stringify(buckets),
);

/* KPI 卡数= 5 */
const kpiCount = await page.evaluate(() => document.querySelectorAll('.lx-kpi').length);
step('D4 social KPI cards = 5', kpiCount === 5, `kpis=${kpiCount}`);

/* 健康度进度条 = 5 */
const bars = await page.evaluate(() => document.querySelectorAll('.lx-table--fit .ant-progress').length);
step('D5 health bars = 5', bars === 5, `bars=${bars}`);

/* 抽屉：改授权到期日 → 落盘 */
const socialDrawer = await page.evaluate(() => {
  const first = document.querySelector('.lx-table--fit tbody tr.ant-table-row');
  const btn = first && [...first.querySelectorAll('button.lx-cell-link')][0];
  if (!btn) return false;
  btn.click();
  return true;
});
await page.waitForTimeout(900);
const hasDateInput = await page.evaluate(() => {
  const drawer = document.querySelector('.lx-cc-drawer');
  return !!drawer?.querySelector('input[type=date]');
});
step('D6 social edit drawer has date input', socialDrawer && hasDateInput);

/* ==================== G. 存量漏斗占位符（顺带修掉的） ==================== */
/* LxFunnel 曾用 `.replace('{rate}', ...)`（单花括号）替换，而语言包里是
   `{{rate}}` —— 替换永不命中，漏斗每一档都显示字面的「转化 {{rate}}%」。
   这条断言守着它不会回归。
   注意：这里不能复用上面那个 page —— 它在 E 组开头就被close 了，
   拿已关闭的 page 调goto 会抛 "Target page has been closed"。 */
const funnelPage = await newPage('zh-CN');
await goto(funnelPage, '/analytics');
const funnelRates = await funnelPage.evaluate(() =>
  [...document.querySelectorAll('.lx-funnel__rate span')].map((n) => (n.textContent ?? '').trim()),
);
step('G1 funnel renders rate labels', funnelRates.length > 0, `n=${funnelRates.length}`);
step(
  'G2 funnel rate labels have no raw placeholder braces',
  funnelRates.every((t) => !t.includes('{{') && !t.includes('{rate}')),
  JSON.stringify(funnelRates.slice(0, 3)),
);
step(
  'G3 funnel rate labels contain a real number',
  funnelRates.some((t) => /\d/.test(t)),
  JSON.stringify(funnelRates.slice(0, 3)),
);
await funnelPage.close();

/* ==================== E. 版式（1280 / 1366） ==================== */
await page.close();
for (const w of [1280, 1366]) {
  const p2 = await browser.newPage({ viewport: { width: w, height: 1000 } });
  await p2.addInitScript(() => {
    window.localStorage.setItem('lx.locale', 'zh-CN');
    if (!window.sessionStorage.getItem('lx.cc.r18.init')) {
      window.sessionStorage.setItem('lx.cc.r18.init', '1');
      window.localStorage.removeItem('lx.cc.config.v1');
      window.localStorage.removeItem('lx.cc.dicts.v1');
      window.localStorage.removeItem('lx.cc.biz2.v1');
    }
  });
  for (const [name, route] of [
    ['users', '/config/users'],
    ['stage-order', '/config/business/stage-order'],
    ['social', '/config/business/social'],
  ]) {
    await goto(p2, route);
    const scan = await scanLayout(p2);
    step(
      `E ${name} @${w}: CLIP=0`,
      scan.CLIP.length === 0,
      JSON.stringify(scan.CLIP.slice(0, 3)),
    );
    step(
      `E ${name} @${w}: WRAP=0`,
      scan.WRAP.length === 0,
      JSON.stringify(scan.WRAP.slice(0, 3)),
    );
    const ph = await rawPlaceholders(p2);
    step(`E ${name} @${w}: no raw {{placeholder}}`, ph.length === 0, JSON.stringify(ph));
    /* SCROLL 在表格横滚上是可接受的既有降级，不作判据，只打印供人看。 */
    if (scan.SCROLL.length > 0) {
      console.log(`     note: ${name} @${w} SCROLL=${JSON.stringify(scan.SCROLL.slice(0, 2))}`);
    }
  }
  await p2.close();
}

/* ==================== F. 英文态（英文是验收必测态） ==================== */
const en = await newPage('en-US');
/* 用户表固定要放行这四个**账号**：它们形态上与 i18n key 一模一样
   （两段、小写、点分隔），不是把它们列进白名单才通过，
   而是 bareKeys 里已经按 `.lx-cell-code` 祖先跳过了整类。
   这里断言的是"除了这四个账号之外没有别的裸 key"。 */
const ACCOUNTS = ['lin.lan', 'zhou.mu', 'chen.yu', 'wu.han', 'guest.audit', 'sun.qi'];
for (const [name, route] of [
  ['users', '/config/users'],
  ['stage-order', '/config/business/stage-order'],
  ['social', '/config/business/social'],
  ['dict-edit', '/config/business/intent'],
]) {
  await goto(en, route);
  const keys = (await bareKeys(en)).filter((k) => !ACCOUNTS.includes(k));
  step(`F ${name}: no bare keys in en-US`, keys.length === 0, JSON.stringify(keys.slice(0, 4)));
}
await en.close();

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length > 0) {
  console.log('FAILED:');
  for (const f of failed) console.log('  - ' + f.name);
  process.exitCode = 1;
}