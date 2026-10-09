import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 配置中心交付截图（2026-10-06）。
 *
 * 与 probe-cc-perm.mjs 的分工：那个探针只截「超管 + 受限」两张，
 * 用于证明权限链真的通；本脚本负责把**本轮交付面**逐页留痕 ——
 * 评审要看的正是「角色权限矩阵展开态长什么样」「三个字典页各长什么样」
 * 「403 页面文案是否说清缺哪个权限码」，这些探针不截。
 *
 * 为什么截图要带 locale 与尺寸后缀：字典页中英差异明显（英文文案长 1.5 倍），
 * 而权限矩阵在 1280 下会挤。文件名带维度才能在评审时对得上是哪一态。
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

/* 哨兵：清理只发生在首屏，否则 addInitScript 每次导航都跑会抹掉切视角的结果。 */
await page.addInitScript((loc) => {
  window.localStorage.setItem('lx.locale', loc);
  if (!window.sessionStorage.getItem('lx.cc.shot.init')) {
    window.sessionStorage.setItem('lx.cc.shot.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
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
  if (opts.clickSel || opts.clickRowCell !== undefined) {
    // 注意：不能用 `:has-text()` —— 那是 Playwright 的伪选择器，
    // 放进 page.evaluate 里就是原生 querySelector，会抛 "not a valid selector"。
    // 一律走位置定位（class / 行内序号），文案随语言包变，按文案找在英文态会静默落空。
    await page.evaluate(({ sel, idx }) => {
      if (sel) {
        const el = document.querySelector(sel);
        if (el instanceof HTMLElement) el.click();
        return;
      }
      const first = document.querySelector('tbody tr.ant-table-row');
      const btn = first && [...first.querySelectorAll('button.lx-cell-link')][idx ?? 0];
      if (btn) btn.click();
    }, { sel: opts.clickSel ?? null, idx: opts.clickRowCell ?? null });
    await page.waitForTimeout(opts.wait ?? 900);
  }
  const file = path.join(OUT_DIR, `${name}_${LOCALE}_${W}x${H}_${stamp}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
  saved.push(file);
  console.log('saved:', path.basename(file));
}

/* ---------- 超管态：逐页留痕 ---------- */
await shot('cc-users-list', '/config/users');
/* 抽屉类目标一律用「主按钮」定位：文案走语言包，按中文找在en-US 下必然落空，
   而落空是**静默**的——截图照样生成，只是截到的是没打开的页面。 */
await shot('cc-users-create-drawer', '/config/users', { clickSel: '.lx-section__head .lx-section__more' });
await shot('cc-roles-list', '/config/roles');
await shot('cc-role-perm-drawer', '/config/roles', {
  // 角色行内第一个 cell-link 就是「配置权限」，点开是 880px 的授权矩阵抽屉
  clickRowCell: 0,
  wait: 1400,
});
await shot('cc-dict-stage', '/config/business/stage-opp');
await shot('cc-dict-intent', '/config/business/intent');
await shot('cc-dict-category', '/config/business/category');
await shot('cc-index-viewing', '/config');
await shot('cc-business-entry', '/config/business');

/* ---------- 受限态：切到 u.chen 后截 403 与被过滤的客户列表 ---------- */
await goto('/config/users');
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('tbody tr.ant-table-row')];
  const target = rows.find((tr) => tr.textContent?.includes('chen.yu'));
  // 行内操作区：[配置权限, 以此身份查看, 删除]；删除是 --danger，排在最后。
  const btn = target && [...target.querySelectorAll('button.lx-cell-link')][1];
  if (btn) btn.click();
});
await page.waitForTimeout(1200);
await goto('/product');
const file403 = path.join(OUT_DIR, `cc-403-limited_${LOCALE}_${W}x${H}_${stamp}.png`);
await page.screenshot({ path: file403, fullPage: true });
saved.push(file403);
console.log('saved:', path.basename(file403));

await goto('/customer');
const fileScoped = path.join(OUT_DIR, `cc-customer-scope-limited_${LOCALE}_${W}x${H}_${stamp}.png`);
await page.screenshot({ path: fileScoped, fullPage: true });
saved.push(fileScoped);
console.log('saved:', path.basename(fileScoped));

await browser.close();
console.log(`\n${saved.length} shots -> ${OUT_DIR}`);