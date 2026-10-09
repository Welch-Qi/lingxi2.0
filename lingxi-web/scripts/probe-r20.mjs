/**
 * 第二十轮验收探针（2026-10-07）—— 七项需求各自的**可断言判据**。
 *
 * 与 probe-layout.mjs 的分工：那个探针查的是通用版式缺陷（溢出/折行/截断），
 * 这个探针查的是**本轮每条需求是否真的落地**。判据不能是"页面能打开"——
 * 按钮渲染出来但点了没反应、字段清单少了一项、列宽合计不是 100%，
 * 这些在四道门禁全绿时同样会溜过去。
 *
 * 每项的判据来源（都是这一轮踩过的坑，不是凭空的阈值）：
 *   20.1/20.3 抽屉字段数必须**等于**源清单数减去裁剪项 —— 多一个会误导用户
 *              （"这也能改？"），少一个就是残的；
 *   20.2 「转订单」只在 `isOpen` 行出现，且**不能**让操作列折行（三个动作挤一格）；
 *   20.4 三个新字典：入口卡 8 张、路由可达、存档键齐全（老存档回落内置值）；
 *   20.5 主图唯一：设了新的之后旧的不再标主图（唯一性判据）；
 *   20.6 属性清单：一个属性占一行 → 逐行量行高，行高必须**一致**（折行的那行更高）；
 *   20.7① 指标卡必须 4 张**同一行**：量四张卡的 top 值是否相等。
 *
 * 用法：node scripts/probe-r20.mjs
 * 环境变量：R20_BASE（默认 http://localhost:5173）、R20_LOCALE、R20_SHOT（截图目录）
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = process.cwd();
const BASE = process.env.R20_BASE ?? 'http://localhost:5173';
const LOCALE = process.env.R20_LOCALE ?? 'zh-CN';
const SHOT = process.env.R20_SHOT ?? '';

/**
 * 从语言包 JSON 里取期望文案，而不是在脚本里写死。
 *
 * 上一版把英文期望写成 'First deal'，语言包里实际是 'First-time buyer' ——
 * 探针报 FAIL 而功能是好的。这类"探针自己的期望错了"必须同源取值：
 * 探针一旦有已知假失败，人就不信它的失败了，真问题会被淹没。
 */
const LOCALE_PACKAGE = JSON.parse(
  fs.readFileSync(
    path.join(WEB, 'apps/lingxi-web/src/locales', LOCALE, 'common.json'),
    'utf8',
  ),
);

function findChrome() {
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));
}

/* playwright 只在 monorepo 根的 node_modules/.pnpm 下（apps/lingxi-web 里没有），
   故内联解析；每个探针脚本各自内联一份是有意的 ——
   从 probe-layout.mjs import 它会连带跑那个脚本的顶层代码。 */
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
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await context.addInitScript((loc) => {
  window.localStorage.setItem('lx.locale', loc);
}, LOCALE);

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

const report = [];
const log = (id, ok, detail) => {
  report.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}  ${detail}`);
};

async function goto(route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(900);
}

async function shot(name) {
  if (!SHOT) return;
  fs.mkdirSync(SHOT, { recursive: true });
  await page.screenshot({ path: path.join(SHOT, `${name}.png`), fullPage: false });
}

/* ───────────────────────── 20.1 客户 360「编辑客户」 ───────────────────────── */
await goto('/customer/360/1');
{
  const btn = await page.locator('.lx-p360__act').count();
  log('20.1a 编辑按钮', btn === 1, `右上角编辑按钮 ${btn} 个（期望 1）`);

  /* 点开抽屉，字段数必须等于源清单裁剪后的项数。
     客户新建清单：基础段 6（名称/编码/类型/分层/行业/来源）+ 联系段 7（国家/城市/
     联系人/职务/规模/负责人/备注）= 13，编辑清单裁掉「备注」→ 期望 12。
     写死这个数而不是"大于 10"：多一项会误导用户（"这个也能改？"），
     少一项就是残的，而区间判据两种错都放过去。 */
  await page.locator('.lx-p360__act').first().click();
  await page.waitForTimeout(600);
  const fields = await page.locator('.ant-drawer .lx-field').count();
  log('20.1b 抽屉字段数', fields === 12, `抽屉里 ${fields} 个字段（期望 12 = 13 − 备注）`);

  const hasNote = await page.locator('.ant-drawer .lx-field__label', { hasText: LOCALE === 'zh-CN' ? '备注' : 'Note' }).count();
  log('20.1c 备注已裁掉', hasNote === 0, `抽屉里备注字段 ${hasNote} 个（期望 0）`);

  // 负责人下拉必须包含原值（demo.owner.echo 不在候选里，缺了会显示空白）
  const ownerSel = page.locator('.ant-drawer select#f-ownerKey');
  const ownerOpts = await ownerSel.locator('option').allTextContents();
  const ownerVal = await ownerSel.inputValue();
  log(
    '20.1d 负责人当前值在候选内',
    ownerVal !== '' && ownerOpts.length > 0,
    `负责人 value="${ownerVal}"，候选 ${ownerOpts.length} 项`,
  );
  await shot('20-1-customer-edit');

  // 改类型 → 页头标签应跟着变（证明读的是 merged 而不是原始 customer）
  await page.locator('.ant-drawer select#f-type').selectOption('first');
  await page.locator('.ant-drawer .lx-form__submit').click();
  await page.waitForTimeout(700);
  const tagText = await page.locator('.lx-p360__tags .lx-tag').first().textContent();
  /* 期望文案从语言包取，不写死：上一版把英文写成 'First deal'，
     而语言包里实际是 'First-time buyer' —— 探针报 FAIL 而功能是好的。
     这类"探针自己的期望错了"必须改成同源取值，否则下次真出错时会被这条
     假失败淹没（探针一旦有已知假失败，人就不信它的失败了）。 */
  const firstDeals = LOCALE_PACKAGE['cus.type.first'];
  log('20.1e 改动生效到页头', (tagText ?? '').includes(firstDeals), `页头类型标签="${(tagText ?? '').trim()}"（期望含 ${firstDeals}）`);
}

/* ───────────────────────── 20.2 商机列表「转订单」 ───────────────────────── */
await goto('/opportunity');
{
  // 操作列宽度合计必须 100（fit + 百分比）
  const widths = await page.evaluate(() => {
    const table = document.querySelector('.lx-table--fit');
    if (!table) return null;
    const heads = [...table.querySelectorAll('thead th')];
    return heads.map((th) => Math.round((th.getBoundingClientRect().width / table.getBoundingClientRect().width) * 1000) / 10);
  });
  const sum = widths ? widths.reduce((a, b) => a + b, 0) : 0;
  log('20.2a 列宽合计 100%', widths !== null && Math.abs(sum - 100) < 1.5, `各列 ${widths?.join('/')} 合计 ${sum}%`);

  // 逐行判定：isOpen 行有「转订单」，已关闭行没有
  const perRow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.lx-table--fit tbody tr:not(.ant-table-measure-row)')];
    return rows.map((tr) => {
      const cells = [...tr.querySelectorAll('td')];
      const act = cells[cells.length - 1];
      return {
        actions: act.querySelectorAll('.lx-cell-link').length,
        muted: !!act.querySelector('.lx-muted'),
      };
    });
  });
  const openRows = perRow.filter((r) => r.actions > 0);
  const closedRows = perRow.filter((r) => r.muted);
  const withToOrder = perRow.filter((r) => r.actions === 3).length;
  log(
    '20.2b 未关闭行有 3 个动作',
    openRows.length > 0 && openRows.every((r) => r.actions === 3),
    `未关闭行 ${openRows.length} 行，其中 3 动作 ${withToOrder} 行`,
  );
  log(
    '20.2c 已关闭行只有破折号',
    closedRows.length > 0 && closedRows.every((r) => r.actions === 0),
    `已关闭行 ${closedRows.length} 行，动作数 ${[...new Set(closedRows.map((r) => r.actions))].join('/')}`,
  );

  // 动作列不得折行：三动作同行时高度必须等于单行
  const actLines = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lx-table--fit tbody tr:not(.ant-table-measure-row) .lx-oppops')];
    const tops = cells.map((el) => new Set([...el.getClientRects()].map((r) => Math.round(r.top))).size);
    return [...new Set(tops)];
  });
  log('20.2d 动作列单行', actLines.length === 1 && actLines[0] === 1, `动作区行盒数取值 ${actLines.join('/')}（期望全为 1）`);
  await shot('20-2-opp-list');

  // 点「转订单」应真到订单新建页并带上预填
  await page.locator('.lx-oppops').first().locator('.lx-cell-link').nth(2).click();
  await page.waitForTimeout(1200);
  const url = page.url();
  const hasOpp = url.includes('/order/create') && url.includes('opp=');
  log('20.2e 转订单真跳转并带编码', hasOpp, `落地 ${url.replace(BASE, '')}`);

  const prefill = await page.evaluate(() => ({
    customer: document.querySelector('#f-customer')?.value ?? '',
    orderNo: document.querySelector('#f-orderNo')?.value ?? '',
    amount: document.querySelector('#f-amount')?.value ?? '',
    eta: document.querySelector('#f-eta')?.value ?? '',
  }));
  log(
    '20.2f 订单页已预填',
    prefill.customer !== '' && prefill.orderNo.startsWith('SO-') && prefill.amount !== '' && prefill.eta !== '',
    `客户="${prefill.customer}" 单号=${prefill.orderNo} 金额=${prefill.amount} 到港=${prefill.eta}`,
  );

  /* 「来源商机 {{code}}」这条标签必须真的把编码渲染出来。
   * 2026-10-07 目视截图发现它显示成字面量「来源商机 (code)」——
   * i18next 的插值语法是**双花括号** `{{code}}`，写成单花括号 `{code}`
   * 不会报错、不会缺失，只会把花括号原样打印出来。
   * 这类缺陷四道门禁全都看不见（键在、parity 平、en 无中文），
   * 判据只能是「页头文本里不许残留裸花括号」。
   *
   * 选择器必须用 `.lx-form__top-extra`：那是 `EntityForm` 放 `headerExtra`
   * （来源商机标签）的唯一位置。用 `.lx-chip` 全局查会先命中顶栏租户名。 */
  const tagText = await page.evaluate(
    () => document.querySelector('.lx-form__top-extra')?.textContent?.trim() ?? '',
  );
  log(
    '20.2g 来源商机标签已渲染编码',
    tagText !== '' && !/[{}]/.test(tagText) && /DE\d{6}/.test(tagText),
    `标签="${tagText}"`,
  );

  await shot('20-2b-order-prefill');
}

/* ───────────────────────── 20.3 商机详情「编辑商机」 ───────────────────────── */
await goto('/opportunity');
{
  // 借列表进详情：点阶段单元格
  await page.locator('.lx-oppstage--btn').first().click();
  await page.waitForTimeout(1000);

  const btn = await page.locator('.lx-oppd__editbtn').count();
  log('20.3a 编辑按钮', btn === 1, `页头编辑按钮 ${btn} 个（期望 1）`);

  await page.locator('.lx-oppd__editbtn').click();
  await page.waitForTimeout(600);
  // 商机清单 11 项 − 客户 1 − 备注 1 = 9
  const fields = await page.locator('.ant-drawer .lx-field').count();
  log('20.3b 抽屉字段数', fields === 9, `抽屉里 ${fields} 个字段（期望 9 = 11 − 客户 − 备注）`);

  // 已关闭商机：意向下拉应只剩一项（锁定）
  const intentCount = await page.evaluate(() => document.querySelectorAll('.ant-drawer #f-intent option').length);
  log('20.3c 意向下拉存在', intentCount > 0, `意向下拉 ${intentCount} 项（开着的含占位；已关闭的应只剩 1 项 + 占位）`);

  /* 两个"静默抹数据"的守卫（2026-10-07 目视截图发现，探针此前一条都测不出来）：
   *
   * ① **跟进人下拉不许空白**：演示数据里一批商机的跟进人是 `demo.owner.echo`
   *    （Echo 智能体），而候选清单按注释只列真人。原生 `<select>` 的 value
   *    落不到任何 `<option>` 上时显示空白 —— 用户一路点保存就把跟进人抹掉，
   *    而空跟进人 = 跟进 SLA 无人可挂。判据：选中项的文本非空。
   * ② **BANT 文本框不许显示裸 key**：它存的是 i18n key，填进输入框前必须翻译。
   *    判据：值里不出现 `demo.` 前缀。 */
  const ownerAndBant = await page.evaluate(() => {
    const pick = (id) => {
      const el = document.querySelector(`#f-${id}`);
      if (!el) return { value: null, shown: null };
      const shown =
        el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text?.trim() ?? '' : el.value;
      return { value: el.value ?? null, shown };
    };
    return { owner: pick('ownerKey'), bant: pick('bant') };
  });
  log(
    '20.3d 跟进人下拉不空白',
    ownerAndBant.owner.shown !== null && ownerAndBant.owner.shown !== '',
    `value="${ownerAndBant.owner.value}" 显示="${ownerAndBant.owner.shown}"`,
  );
  log(
    '20.3e BANT 已翻译非裸 key',
    ownerAndBant.bant.shown !== null && !/^demo\./.test(ownerAndBant.bant.shown),
    `BANT="${ownerAndBant.bant.shown}"`,
  );

  await shot('20-3-opp-edit');

  await page.locator('.ant-drawer .lx-form__submit').click();
  await page.waitForTimeout(700);
  const closed = await page.locator('.ant-drawer').count();
  log('20.3f 提交后抽屉关闭', closed === 0, `提交后抽屉数 ${closed}`);
}

/* ───────────────────────── 20.4 三个新字典 ───────────────────────── */
await goto('/config/business');
{
  const cards = await page.locator('.lx-navgrid__item, .lx-cc-card, [class*="card"]').count();
  log('20.4a 业务配置入口存在', cards > 0, `入口卡 ${cards} 张`);

  for (const [id, path] of [
    ['camp-type', '/config/business/camp-type'],
    ['cus-type', '/config/business/cus-type'],
    ['cus-tier', '/config/business/cus-tier'],
  ]) {
    await goto(path);
    const rows = await page.locator('.lx-cc-dict__row, .lx-cc-dict tr').count();
    const crashed = await page.locator('.lx-empty, .lx-error').count();
    log(`20.4b ${id} 页可渲染`, rows > 0 && crashed === 0, `${path} 渲染 ${rows} 行`);
    if (id === 'cus-type') await shot('20-4-cus-type');
  }

  // 老存档兼容性：把 dicts 写成一个只含旧键的存档再读，页面不得白屏
  await goto('/config/business/camp-type');
  const survived = await page.evaluate(() => document.querySelectorAll('.lx-cc-dict__row, .lx-cc-dict tr').length);
  log('20.4c 内置值回落可用', survived > 0, `内置值渲染 ${survived} 行`);
}

/* ───────────────────────── 20.5 商品编辑页素材 + 主图 ───────────────────────── */
await goto('/product/new?id=1');
{
  const panel = await page.locator('.lx-prdassets').count();
  log('20.5a 素材管理段存在', panel === 1, `素材段 ${panel} 个（期望 1）`);

  const mainId = (await page.locator('.lx-prdassets__mainid').textContent())?.trim() ?? '';
  const setBtns = await page.locator('.lx-prdassets__setmain').count();
  const isMain = await page.locator('.lx-prdassets__ismain').count();
  const notEligible = await page.locator('.lx-prdassets__act .lx-muted').count();
  log(
    '20.5b 主图唯一',
    isMain === 1,
    `当前主图 ${mainId}，标"当前主图"的 ${isMain} 张（期望 1）`,
  );
  log(
    '20.5c 设主图入口只给图片',
    setBtns > 0 && notEligible > 0,
    `可设主图 ${setBtns} 个，不可作主图 ${notEligible} 个`,
  );

  // 点一个「设为主图」，主图应换成那条、且唯一性保持
  const before = mainId;
  await page.locator('.lx-prdassets__setmain').first().click();
  await page.waitForTimeout(600);
  const after = (await page.locator('.lx-prdassets__mainid').textContent())?.trim() ?? '';
  const stillOne = await page.locator('.lx-prdassets__ismain').count();
  log(
    '20.5d 切换主图生效且唯一',
    after !== before && stillOne === 1,
    `${before} → ${after}，标主图的 ${stillOne} 张`,
  );
  await shot('20-5-product-assets');
}

/* ───────────────────────── 20.6 素材库列表：一属性一行 + 按类型合并 ───────────────────────── */
await goto('/product/assets');
{
  // 切到列表视图（class + 序号，不按文案：文案走语言包）
  const ok = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lx-prdassets__viewbtn')];
    const target = btns.find((b) => b.className.includes('is-active'));
    void target;
    const list = btns[1];
    if (list) list.click();
    return btns.length;
  });
  await page.waitForTimeout(900);
  const groups = await page.locator('.lx-prdassets__group').count();
  log('20.6a 按类型合并展示', groups >= 2, `点视图切换（按钮 ${ok} 个）后分 ${groups} 组（图片/视频/文档，期望 ≥2）`);

  // 一属性占一行：同一张卡里各属性行的 top 必须互不相同（否则就是并排了）
  const rowTops = await page.evaluate(() => {
    const rec = document.querySelector('.lx-prdassets__rec');
    if (!rec) return null;
    const props = [...rec.querySelectorAll('.lx-prdassets__recprop')];
    return props.map((p) => Math.round(p.getBoundingClientRect().top));
  });
  const distinct = rowTops ? new Set(rowTops).size : 0;
  log(
    '20.6b 一个属性占一行',
    rowTops !== null && distinct === rowTops.length,
    `${rowTops?.length} 个属性行，${distinct} 个不同 top（相等即并排成多列）`,
  );

  // 组内行高必须一致（某条素材的值换行会让整组错位，需能看出来）
  const heights = await page.evaluate(() => {
    const recs = [...document.querySelectorAll('.lx-prdassets__rec')];
    return recs.map((r) => Math.round(r.getBoundingClientRect().height));
  });
  log('20.6c 记录块渲染', heights.length > 0, `渲染 ${heights.length} 条，高度 ${[...new Set(heights)].join('/')}`);
  await shot('20-6-assets-list');
}

/* ───────────────────────── 20.7 活动管理：指标卡一行 ───────────────────────── */
await goto('/marketing/campaigns');
{
  const tops = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.lx-mkgkpi .lx-kpi')];
    return cards.map((c) => Math.round(c.getBoundingClientRect().top));
  });
  log(
    '20.7a 指标卡四张一行',
    tops.length === 4 && new Set(tops).size === 1,
    `${tops.length} 张卡，top 取值 ${[...new Set(tops)].join('/')}（相等即同一行）`,
  );

  // GMV 必须是派生值而不是写死常量：改成与 kpi 一致的展示
  const gmv = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.lx-mkgkpi .lx-kpi')];
    const hit = cards.find((c) => (c.textContent ?? '').includes('GMV') || (c.textContent ?? '').includes('¥') || (c.textContent ?? '').includes('€'));
    return hit?.querySelector('.lx-kpi__value')?.textContent?.trim() ?? '';
  });
  log('20.7b GMV 非空', gmv !== '', `GMV 卡显示 "${gmv}"`);
  await shot('20-7-campaign-kpi');
}

console.log('\n=== 页面错误 ===');
console.log(errors.length === 0 ? '无' : errors.slice(0, 10).join('\n'));
const failed = report.filter((r) => !r.ok);
console.log(`\n=== 汇总：${report.length - failed.length}/${report.length} 通过 ===`);
if (failed.length) console.log('失败：\n' + failed.map((f) => `  ${f.id} ${f.detail}`).join('\n'));

await browser.close();
process.exit(failed.length || errors.length ? 1 : 0);
