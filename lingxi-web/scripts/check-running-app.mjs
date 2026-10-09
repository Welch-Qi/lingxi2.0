/**
 * 巡检**已在运行**的 dev server：确认不是白屏、控制台干净。
 *
 * 与 verify-locale-switch.mjs 的分工：
 *   - verify-locale-switch：自起 Vite（strictPort），验"语言切换逻辑对不对"；
 *   - 本脚本：不自起 server，只连既有地址，验"用户此刻打开的那个地址正不正常"。
 *
 * 为什么需要它：`HTTP 200` 只说明服务器活着，不说明页面渲染成功。
 * 真实踩过的两类事故都在这条缝里：
 *   ① JS 运行时异常 → 返回 200 但白屏（#root 为空）；
 *   ② favicon 之类资源 404 → 页面看着正常，但控制台留一条红字，演示时很难看。
 * 所以判据必须是「可见文字量 + 卡片数 + 运行时错误数 + 非 2xx 响应数」，
 * 不是 HTTP 状态码。
 *
 * 用法：
 *   NODE_OPTIONS= node scripts/check-running-app.mjs
 *   PROBE_URL=http://127.0.0.1:5174 node scripts/check-running-app.mjs
 *
 * 退出码：有运行时错误、或存在**非 /api/** 的坏响应 → 1。
 * （后端 8080 未起时 /api/** 必然失败，属预期，不计为失败。）
 *
 * 浏览器复用本机 Chrome/Edge（executablePath），不下载 Playwright 自带浏览器。
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(import.meta.dirname, '..');
const BASE = process.env.PROBE_URL ?? 'http://127.0.0.1:5173';
const ROUTES = (process.env.PROBE_ROUTES ?? '/workbench,/intel,/analytics').split(',');
const SHOT = process.env.PROBE_SHOT ?? '';

/** pnpm isolated 布局：playwright 只在 .pnpm 下，根 node_modules 只有 CLI shim */
function resolvePlaywright() {
  const direct = path.join(WEB, 'node_modules', 'playwright', 'index.js');
  if (fs.existsSync(direct)) {
    return direct;
  }
  const pnpm = path.join(WEB, 'node_modules', '.pnpm');
  const dirs = fs.existsSync(pnpm) ? fs.readdirSync(pnpm).filter((n) => n.startsWith('playwright@')) : [];
  for (const dir of dirs) {
    const hit = path.join(pnpm, dir, 'node_modules', 'playwright', 'index.js');
    if (fs.existsSync(hit)) {
      return hit;
    }
  }
  throw new Error(`playwright not found under ${path.join(WEB, 'node_modules')}`);
}

function findChrome() {
  const hit = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ]
    .filter(Boolean)
    .find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.');
  }
  return hit;
}

// playwright 是 CJS：动态 import 的命名导出取决于 cjs-module-lexer 的识别，
// 实测拿不到 chromium，必须用 createRequire 直接 require 绝对入口。
const require_ = createRequire(import.meta.url);
const pw = require_(resolvePlaywright());
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) {
  throw new Error('playwright exposes no chromium export');
}

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();

const errors = [];
const badResponses = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') {
    errors.push(`console.error: ${m.text().slice(0, 200)}`);
  }
});
page.on('response', (r) => {
  if (r.status() >= 400) {
    badResponses.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  }
});

const rows = [];
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const root = document.getElementById('root');
    const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      lang: document.documentElement.lang,
      rootChildren: root ? root.children.length : -1,
      textLen: text.length,
      cards: document.querySelectorAll('.lx-card, .lx-kpi, .lx-panel').length,
      head: text.slice(0, 48),
    };
  });
  rows.push({ route, ...info });
  console.log(`\n${route}`);
  console.log(`   html lang=${info.lang}  #root 子节点=${info.rootChildren}  卡片=${info.cards}  可见文字=${info.textLen} 字`);
  console.log(`   ${info.head}`);
}

if (SHOT) {
  await page.screenshot({ path: SHOT, fullPage: false });
  console.log(`\n截图 → ${SHOT}`);
}

await browser.close();

const unique = [...new Set(badResponses)];
console.log(`\n运行时错误 ${errors.length} 条`);
for (const e of errors.slice(0, 10)) {
  console.log('   ' + e);
}
console.log(`非 2xx/3xx 响应 ${unique.length} 条`);
for (const b of unique.slice(0, 15)) {
  console.log('   ' + b);
}

// 白屏判据：可见文字过少说明渲染没成功（200 也可能白屏）
const blank = rows.filter((r) => r.rootChildren <= 0 || r.textLen < 50);
for (const b of blank) {
  console.log(`   空白/渲染不足: ${b.route} (${b.textLen} 字)`);
}

const apiOnly = unique.every((b) => b.includes('/api/'));
const ok = errors.length === 0 && blank.length === 0 && apiOnly;
console.log(ok ? '\napp check OK' : '\napp check FAILED');
process.exit(ok ? 0 : 1);
