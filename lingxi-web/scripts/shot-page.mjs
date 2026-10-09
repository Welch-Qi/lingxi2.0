import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 页面截图 + 栅格列数输出。
 *
 * 为什么需要：「一行几个属性」「有没有裸 key」这类问题，
 * 截图给人看、栅格列数给机器判 —— 两者一起出，才能把「看起来集中」
 * 变成可断言的事实（upload 页实测 `4 列 / 238.5px`）。
 * 产物进 `artifacts/screenshots/`，文件名带路由 + 语言 + 视口 + 日期，避免与旧图混淆。
 *
 * playwright 不在根 package.json 里，解析法沿用 probe-layout.mjs。
 *
 * 用法：MSYS_NO_PATHCONV=1 LAYOUT_BASE=http://localhost:5173 \
 *      LAYOUT_ROUTE=/marketing/upload SHOT_NAME=upload node scripts/shot-page.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://localhost:5173';
const ROUTE = process.env.LAYOUT_ROUTE ?? '/';
const LOCALE = process.env.LAYOUT_LOCALE ?? 'zh-CN';
const W = Number(process.env.LAYOUT_W ?? 1280);
const H = Number(process.env.LAYOUT_H ?? 1500);
const NAME = process.env.SHOT_NAME ?? 'page';
const OUT_DIR = process.env.SHOT_DIR ?? path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');

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
  return createRequire(path.join(pnpmDir, hit, 'node_modules', 'playwright', 'package.json')).resolve(
    'playwright',
  );
}

const pw = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });

await page.addInitScript((locale) => {
  window.localStorage.setItem('lx.locale', locale);
}, LOCALE);

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const file = path.join(OUT_DIR, `${NAME}_${LOCALE}_${W}x${H}_${stamp}.png`);
await page.screenshot({ path: file, fullPage: true });

// 顺带把该页的栅格列数打出来：判断「一行几个」不必靠看图
const cols = await page.evaluate(() => {
  const grid = document.querySelector('.lx-form--compact .lx-form__grid');
  if (!grid) return null;
  const tpl = getComputedStyle(grid).gridTemplateColumns;
  return { templateColumns: tpl, count: tpl.split(' ').filter(Boolean).length, width: grid.clientWidth };
});
console.log(`saved: ${file}`);
console.log(
  `grid: ${cols ? `${cols.count} cols / ${cols.width}px / ${cols.templateColumns}` : '(no compact grid found)'}`,
);

await browser.close();