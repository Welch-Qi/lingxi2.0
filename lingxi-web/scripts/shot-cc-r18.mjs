import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 第十八轮交付截图（2026-10-07）。
 *
 * 与shot-config-center.mjs 的分工：那个脚本截的是「权限链与字典页」，
 * 本脚本截本轮三处新增交付面：
 *   1. 用户列表（含四个硅基员工）与新建/编辑抽屉里的用户类型字段；
 *   2. 字典页的「编辑」抽屉（这是本轮新加的交互，此前没有）；
 *   3. 订单阶段管理 / 社媒账号管理两页（此前是占位壳CcComingSoon）。
 *
 * 定位一律走 class + 行内序号：**不能按中文文案找元素**——
 * 文案走语言包，en-US 下会静默落空，截图照样生成，只是截到没打开的抽屉。
 * 这一点在shot-config-center.mjs 踩过。
 *
 * 用法：
 *   MSYS_NO_PATHCONV=1 node scripts/shot-cc-r18.mjs            # zh-CN 1440
 *   LX_SHOT_LOCALE=en-US LX_SHOT_W=1366 node scripts/shot-cc-r18.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LX_SHOT_BASE ?? 'http://localhost:5173';
const OUT_DIR = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');
const W = Number(process.env.LX_SHOT_W ?? 1440);
const H = Number(process.env.LX_SHOT_H ?? 1000);
const LOCALE = process.env.LX_SHOT_LOCALE ?? 'zh-CN';

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
const page = await browser.newPage({ viewport: { width: W, height: H } });

/* 哨兵只在首屏清一次：addInitScript 每次导航都会跑，
   无条件 removeItem 会把切视角结果自己抹掉。 */
await page.addInitScript((loc) => {
  window.localStorage.setItem('lx.locale', loc);
  if (!window.sessionStorage.getItem('lx.cc.r18shot.init')) {
    window.sessionStorage.setItem('lx.cc.r18shot.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
    window.localStorage.removeItem('lx.cc.biz2.v1');
  }
}, LOCALE);

async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

const stamp = new Date().toISOString().slice(0, 10);
const saved = [];

async function shot(name, route, opts = {}) {
  await goto(route);
  /* 判据用 `!= null` 而不是真值：`rowLinks: 0`（点行内第一个按钮）是合法的，
     而 `if (opts.rowLinks)` 会把它当falsy —— 定位器整个被置空，
     截图照样生成，只是截到没打开抽屉的页面。踩过。 */
  const useRow = opts.rowLinks !== undefined && opts.rowLinks !== null;
  if (opts.clickSel || useRow) {
    await page.evaluate(({ sel, rowSel, idx }) => {
      if (sel) {
        const el = document.querySelector(sel);
        if (el instanceof HTMLElement) el.click();
        return;
      }
      /* rowSel 要能同时匹配两类布局：字典页是 `.lx-cc-dict__row`（手写行），
         新页是 `.lx-table--fit tbody tr.ant-table-row`（LxTable）。 */
      const row = document.querySelector(rowSel);
      const btn = row && [...row.querySelectorAll('button.lx-cell-link')][idx ?? 0];
      if (btn) btn.click();
    }, {
      sel: opts.clickSel ?? null,
      rowSel: useRow ? '.lx-cc-dict__row, .lx-table--fit tbody tr.ant-table-row' : null,
      idx: useRow ? opts.rowLinks : null,
    });
    await page.waitForTimeout(opts.wait ?? 900);
  }
  const file = path.join(OUT_DIR, `r18-${name}_${LOCALE}_${W}x${H}_${stamp}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
  saved.push(file);
  /* 声明要截抽屉就必须验抽屉真的开了。
     定位失败是**静默**的：截图照常生成，只是画框里是未打开的列表页，
     而那种图看起来"挺正常"，评审时没人会发现。
     连续踩了两次（`rowLinks: 0` 被当falsy），这里加断言把这类失败变成硬错误。 */
  if (opts.expectDrawer) {
    const n = await page.evaluate(() => document.querySelectorAll('.lx-cc-drawer').length);
    if (n !== 1) {
      throw new Error(`[${name}] expected a drawer to be open, found ${n}. Locator did not click.`);
    }
  }
  console.log('saved:', path.basename(file));
}

/* ---------- 6.1 用户类型 + 硅基员工 ---------- */
await shot('users-list', '/config/users');
/* 新建抽屉：主按钮在 section head 的 more 位（与既有 users 截图一致）。
   抽屉里能看见「用户类型」下拉 —— 这是本轮新增字段。 */
await shot('users-create-type', '/config/users', { clickSel: '.lx-section__head .lx-section__more', expectDrawer: true });
/* 编辑抽屉里类型是只读展示：点第一行的「编辑」（行内第一个 cell-link）。 */
await shot('users-edit-type-locked', '/config/users', { rowLinks: 0, expectDrawer: true });

/* ---------- 6.2 字典页编辑抽屉 ---------- */
await shot('dict-stage', '/config/business/stage-opp');
await shot('dict-stage-edit-drawer', '/config/business/stage-opp', { rowLinks: 0, expectDrawer: true });
/* 排序号加宽后的样子单独留一张：用户反馈的就是这一格 */
await shot('dict-order-width', '/config/business/intent');

/* ---------- 6.3 两个新页 ---------- */
await shot('stage-order-list', '/config/business/stage-order');
await shot('stage-order-edit', '/config/business/stage-order', { rowLinks: 0, expectDrawer: true });
await shot('social-list', '/config/business/social');
await shot('social-edit', '/config/business/social', { rowLinks: 0, expectDrawer: true });

await browser.close();
console.log(`\n${saved.length} shots -> ${OUT_DIR}`);