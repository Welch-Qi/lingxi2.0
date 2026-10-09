import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 身份修复的留痕截图（2026-10-07）。
 *
 * 与 probe-identity.mjs 的分工：那个探针只给可断言的数量，
 * 但「登录页默认勾中哪个岗位」这件事**必须看一眼**——
 * 它是 `roleKeyForUser` 的输出，文字对了不代表它是从视角身份派生的。
 *
 * 三张：切到 u.chen 后进登录页（应勾"内容总监"而非 CEO）→ 点进入 → 工作台顶栏。
 */
const WEB = process.cwd();
const BASE = process.env.LX_SHOT_BASE ?? 'http://localhost:5173';
const OUT_DIR = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');

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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(() => {
  window.localStorage.setItem('lx.locale', 'zh-CN');
  if (!window.sessionStorage.getItem('lx.idshot.init')) {
    window.sessionStorage.setItem('lx.idshot.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
  }
});

const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT_DIR, { recursive: true });
const saved = [];
async function shot(name) {
  const f = path.join(OUT_DIR, `${name}_zh-CN_1440x1000_${stamp}.png`);
  await page.screenshot({ path: f, fullPage: true });
  saved.push(f);
  console.log('saved:', path.basename(f));
}
async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav, .lx-select__card', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}

/* 先切视角到 u.chen（内容总监），再进登录页看默认勾选。 */
await goto('/config/users');
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('tbody tr.ant-table-row')];
  const target = rows.find((tr) => tr.textContent?.includes('chen.yu'));
  const btn = target && [...target.querySelectorAll('button.lx-cell-link')][1];
  if (btn) btn.click();
});
await page.waitForTimeout(1000);

await goto('/login');
await shot('identity-login-defaults-to-viewing-role');

/* 选另一个岗位并进入。**必须走完整三段链路** `/login → /workspace-select → /workbench`：
   早先这里用 goto('/workbench') 硬跳，绕过了 workspace-select 的进入按钮，
   于是截出的是「胶囊未同步」的假象 —— 截图脚本走捷径 = 自己骗自己。 */
await page.evaluate(() => {
  const items = [...document.querySelectorAll('.lx-select__role')];
  const hit = items[2] ?? items[0];
  if (hit instanceof HTMLElement) hit.click();
});
await page.waitForTimeout(400);
await shot('identity-login-other-role-selected');

await page.evaluate(() => {
  const btn = document.querySelector('.lx-select__btn');
  if (btn instanceof HTMLElement) btn.click();
});
await page.waitForTimeout(1500);
await shot('identity-workspace-select');

/* 第二段：点 workspace-select 的进入工作台（class 与登录页同名.btn）。 */
await page.evaluate(() => {
  const btn = document.querySelector('.lx-select__btn');
  if (btn instanceof HTMLElement) btn.click();
});
await page.waitForTimeout(1800);
await goto('/workbench');
await shot('identity-topbar-after-role-switch');

await browser.close();
console.log(`\n${saved.length} shots`);