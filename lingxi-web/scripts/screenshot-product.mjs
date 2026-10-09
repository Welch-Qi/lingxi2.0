/**
 * 商品中心重构截图脚本（2026-09-26）。
 *
 * 捕获「默认全部 / 待补全过滤 / 在售过滤 / 素材列表」四类状态，中英文 × 1280，
 * 外加 1680 默认态，用于评审页前后对照。
 *
 * 复用 probe-layout.mjs 的 chromium / playwright 解析逻辑（同一份依赖）。
 * 用法（dev server 已在 5173）：
 *   node scripts/screenshot-product.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = process.cwd();
const BASE = 'http://127.0.0.1:5173';
const OUT = 'artifacts/screenshots/product-revamp-2026-09-26';
fs.mkdirSync(OUT, { recursive: true });

function findChrome() {
  return ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
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

const LOCALES = ['zh-CN', 'en-US'];
const STATES = [
  { name: 'all', click: null },
  { name: 'incomplete', click: '.lx-grid--kpi-4 > button:nth-child(2)' },
  { name: 'onsale', click: '.lx-grid--kpi-4 > button:nth-child(3)' },
  { name: 'materials', click: '.lx-grid--kpi-4 > button:nth-child(4)' },
];

for (const locale of LOCALES) {
  for (const st of STATES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1 });
    await context.addInitScript((loc) => window.localStorage.setItem('lx.locale', loc), locale);
    const page = await context.newPage();
    await page.goto(`${BASE}/product`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lx-page__body', { timeout: 20000 });
    await page.waitForTimeout(500);
    if (st.click) {
      await page.click(st.click, { timeout: 8000 });
      await page.waitForTimeout(500);
    }
    const file = path.join(OUT, `product-${locale}-1280-${st.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`saved ${file}`);
    await context.close();
  }
}

// 1680 默认态
for (const locale of LOCALES) {
  const context = await browser.newContext({ viewport: { width: 1680, height: 1400 }, deviceScaleFactor: 1 });
  await context.addInitScript((loc) => window.localStorage.setItem('lx.locale', loc), locale);
  const page = await context.newPage();
  await page.goto(`${BASE}/product`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-page__body', { timeout: 20000 });
  await page.waitForTimeout(500);
  const file = path.join(OUT, `product-${locale}-1680-all.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`saved ${file}`);
  await context.close();
}

await browser.close();
console.log('done');
