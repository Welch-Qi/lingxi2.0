import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 登录页/工作区选择页截图（2026-10-07 第十九轮）。
 *
 * 三个视口 × 中英：验证「一页全显不滚动」在笔记本与矮屏上都成立，
 * 且高度压缩后角色名/描述仍可读（不靠藏内容换一屏）。
 */
const WEB = process.cwd();
const BASE = process.env.LX_SHOT_BASE ?? 'http://localhost:5173';
const OUT_DIR = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');
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
const stamp = new Date().toISOString().slice(0, 10);
const saved = [];

const VIEWPORTS = [
  { w: 1440, h: 1000, tag: '1440x1000' },
  { w: 1366, h: 768, tag: '1366x768' },
  { w: 1280, h: 720, tag: '1280x720' },
];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.addInitScript((loc) => window.localStorage.setItem('lx.locale', loc), LOCALE);

  for (const [name, route] of [
    ['login', '/login'],
    ['wselect', '/workspace-select'],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lx-select', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
    const file = path.join(OUT_DIR, `r19-${name}_${LOCALE}_${vp.tag}_${stamp}.png`);
    await page.screenshot({ path: file, fullPage: false });
    saved.push(file);
    console.log('saved:', path.basename(file));
  }
  await page.close();
}

await browser.close();
console.log(`\n${saved.length} shots -> ${OUT_DIR}`);