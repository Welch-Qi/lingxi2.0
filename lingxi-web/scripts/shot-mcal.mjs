import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 营销日历「冲突态」截图（`shot-page.mjs` 的补充，不是替代）。
 *
 * 为什么单独一个脚本：`shot-page.mjs` 只截首屏，而本页最核心的三条机制
 * —— 红框（R1 撞档）、黄点（R4 筹备逾期）、右栏冲突建议的三个出口——
 * 默认视角（当月=9 月）只能看到其中一部分：9 月无冲突，红框一条都不亮。
 * 所以这个脚本翻到下一月并点开第一条冲突排期，把整套机制一次截全。
 *
 * 顺带打印 `conflict cards: N`：**告警类改动必须看这个数**。
 * 判据不是"N > 0"（那可能是一张也可能是全部），而是**量级**——
 * 第一版判据曾让 112 张卡里 110 张挂红框（红框常亮等于没开），
 * 收得过狠又会变成 0（机制不可见）。合理区间是个位数到十几个。
 *
 * 用法：MSYS_NO_PATHCONV=1 SHOT_NAME=mkt-calendar-conflict \
 *      SHOT_LOCALE=zh-CN SHOT_W=1440 SHOT_H=1000 node scripts/shot-mcal.mjs
 *
 * playwright 解析法沿用 probe-layout.mjs（只作为 @playwright/test 的传递依赖
 * 躺在 node_modules/.pnpm 下，直接 `import 'playwright'` 会 ERR_MODULE_NOT_FOUND）。
 */
const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://localhost:5173';
const LOCALE = process.env.SHOT_LOCALE ?? process.env.LAYOUT_LOCALE ?? 'zh-CN';
const W = Number(process.env.SHOT_W ?? process.env.LAYOUT_W ?? 1440);
const H = Number(process.env.SHOT_H ?? process.env.LAYOUT_H ?? 1000);
const NAME = process.env.SHOT_NAME ?? 'mkt-calendar';
const OUT = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');

function findChrome() {
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));
}
function resolvePlaywright() {
  const d = path.join(WEB, 'node_modules', '.pnpm');
  const hit = fs
    .readdirSync(d)
    .filter((n) => n.startsWith('playwright@'))
    .sort()
    .reverse()
    .find((n) => fs.existsSync(path.join(d, n, 'node_modules', 'playwright')));
  return createRequire(path.join(d, hit, 'node_modules', 'playwright', 'package.json')).resolve('playwright');
}
const pw = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.addInitScript((l) => window.localStorage.setItem('lx.locale', l), LOCALE);
await page.goto(`${BASE}/marketing/calendar`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.click('.lx-mcal__navbtn >> nth=1');
await page.waitForTimeout(600);
const count = await page.locator('.lx-mcal__ev.is-conflict').count();
const alerts = await page.locator('.lx-mcal__alertchip').allInnerTexts();
if (count > 0) {
  await page.locator('.lx-mcal__ev.is-conflict').first().click();
  await page.waitForTimeout(400);
}
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, `${NAME}.png`);
await page.screenshot({ path: file });
console.log('conflict cards:', count);
console.log('alerts:', JSON.stringify(alerts));
console.log('saved:', file);
await browser.close();