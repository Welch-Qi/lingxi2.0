/**
 * 多态截图：把同一个路由在 中文亮色 / 英文亮色 / 中文暗色 三种状态下各截一张，
 * 并可指定一次点击，再截一张展开态。
 *
 * 为什么需要它（而不是 `--screenshot` 那套）：
 *   1. 语言与主题的切换在仓内**没有入口**（暗色主题无切换 UI，语言入口是运行时行为），
 *      用浏览器命令行参数够不到，只能靠脚本注入后再截。
 *   2. 展开态必须**真实点击**才能产生。命令行截图工具点不了。
 *   3. 用 addInitScript 注入而不是改源码：改源码（如临时写死 `lng`）会有还原风险——
 *      残留不会被任何门禁拦住（`lng: 'en-US'` 语法完全合法），必须靠 finally 兜底。
 *      注入方式零改动、零还原，是更省心的路径。
 *
 * 复用**已在运行**的 dev server（默认 http://127.0.0.1:5173），
 * 因此截的就是演示地址上那份正在跑的应用，不是另起一份。
 *
 * 用法：
 *   NODE_OPTIONS= node scripts/screenshot-states.mjs /workbench
 *   NODE_OPTIONS= node scripts/screenshot-states.mjs /workbench --click .lx-dock__fab --suffix points
 *   SHOT_OUT=artifacts/screenshots/wb-v4 SHOT_HEIGHT=1700 node scripts/screenshot-states.mjs /workbench
 *   SHOT_STATES=zh,dark node scripts/screenshot-states.mjs /workbench   # 只跑其中若干态
 *   SHOT_BASE_URL=http://127.0.0.1:5174 node scripts/screenshot-states.mjs /workbench
 *
 * 注意：本脚本只做截图与"页面有没有渲出来"的把关，不替代人工看版式 ——
 * 版式缺陷（黏连、截断、对比度）在英文态与暗色态才现形，必须逐张看。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = path.resolve(import.meta.dirname, '..');
const OUT = path.resolve(WEB, process.env.SHOT_OUT ?? path.join('artifacts', 'screenshots', 'states'));
const BASE = process.env.SHOT_BASE_URL ?? 'http://127.0.0.1:5173';
const WIDTH = Number(process.env.SHOT_WIDTH ?? 1680);
const HEIGHT = Number(process.env.SHOT_HEIGHT ?? 1500);

/** 三种状态。locale 与 theme 都通过 addInitScript 注入，页面脚本执行前即生效。 */
const ALL_STATES = [
  { id: 'zh', locale: 'zh-CN', theme: 'light' },
  { id: 'en', locale: 'en-US', theme: 'light' },
  { id: 'dark', locale: 'zh-CN', theme: 'dark' },
];

/**
 * 只跑其中若干态：`SHOT_STATES=zh,dark`。
 *
 * 为什么需要：改版若只针对中文（比如指标名要适配中文长度），跑英文态等于白跑，
 * 而"看着不像英文的问题"又容易诱惑人去改英文文案，偏离本轮范围。
 * 不过**默认仍然三态全跑**：英文态是版式缺陷的照妖镜，跳过它属于例外而非常态。
 */
const WANTED = (process.env.SHOT_STATES ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const STATES = WANTED.length === 0 ? ALL_STATES : ALL_STATES.filter((state) => WANTED.includes(state.id));
if (STATES.length === 0) {
  throw new Error(`SHOT_STATES=${process.env.SHOT_STATES} 没有匹配到任何状态，可选：${ALL_STATES.map((s) => s.id).join(',')}`);
}

function findChrome() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error('no Chrome/Edge found; set CHROME_PATH');
  }
  return hit;
}

/**
 * 解析 playwright 入口。
 *
 * 本仓 pnpm 用 isolated 布局：playwright 只装在 node_modules/.pnpm/playwright@x/ 下，
 * 仓库根的 node_modules 里只有 CLI shim，`require.resolve('playwright')` 会 MODULE_NOT_FOUND。
 * 按候选顺序探测，两种布局都能覆盖。
 *
 * 另：playwright 是 CJS，动态 import 后命名导出可能挂在 default 上，故两处都取。
 */
function resolvePlaywright() {
  const req = createRequire(path.join(WEB, 'package.json'));
  try {
    return req.resolve('playwright');
  } catch {
    // fall through: isolated layout
  }
  const pnpmDir = path.join(WEB, 'node_modules', '.pnpm');
  // 注意：pnpm 不在 `.pnpm/<pkg>@<ver>/` 下放 package.json，真实包体在
  // `.pnpm/<pkg>@<ver>/node_modules/<pkg>/` —— 探测条件必须落在包体上，
  // 否则 `.pnpm` 里明明装着 playwright，这段代码仍会报"没装"。
  const hit = fs
    .readdirSync(pnpmDir)
    .filter((name) => /^playwright@/.test(name))
    .sort()
    .reverse()
    .find((name) =>
      fs.existsSync(path.join(pnpmDir, name, 'node_modules', 'playwright', 'package.json')),
    );
  if (!hit) {
    throw new Error('playwright not found; run pnpm install at the repo root');
  }
  return path.join(pnpmDir, hit, 'node_modules', 'playwright', 'index.mjs');
}

const args = process.argv.slice(2);
const route = args.find((a) => a.startsWith('/')) ?? '/workbench';
const clickIndex = args.indexOf('--click');
const clickSelector = clickIndex >= 0 ? args[clickIndex + 1] : undefined;
const suffixIndex = args.indexOf('--suffix');
const clickSuffix = suffixIndex >= 0 ? args[suffixIndex + 1] : 'click';
const clickName = clickSelector ? clickSelector.replace(/[^\w-]/g, '') : '';

const chrome = findChrome();
const pwEntry = resolvePlaywright();
// Windows 下的绝对路径（D:\...）不能直接交给动态 import，须转成 file:// URL
const pw = await import(pathToFileURL(pwEntry).href);
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) {
  throw new Error('chromium export missing from playwright build');
}

fs.mkdirSync(OUT, { recursive: true });
const stem = route.replace(/^\//, '').replace(/\//g, '-') || 'root';

const browser = await chromium.launch({ executablePath: chrome });
let failed = 0;

async function capture(fileName, state, { doClick }) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  // 语言走 localStorage：应用的 detectLocale() 读它，第一帧即生效。
  await context.addInitScript((locale) => {
    window.localStorage.setItem('lx.locale', locale);
  }, state.locale);

  const page = await context.newPage();

  // 主题只能靠 html 上的 data-lx-theme 属性。
  // 不要试图在 addInitScript 里 setAttribute —— 实测那时 document.documentElement
  // 仍是 null（报 "Cannot read properties of null (reading 'setAttribute')"），
  // 就算侥幸设上也晚于首帧。改为在 document 响应里把属性直接写进 <html>：
  // 首帧就是目标主题，ECharts 取到的是暗色令牌，不会截出"亮底暗卡"的中间态。
  if (state.theme !== 'light') {
    // 只拦这一个文档请求。用 '**/*' 通配会把 Vite 的 HMR WebSocket 一并带进代理路径，
    // 触发 Chrome 的本地网络访问检查（ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS），
    // 于是每次暗色截图都会凭空多出几条 console 错误。
    await page.route(`${BASE}${route}`, async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/<html/i, `<html data-lx-theme="${state.theme}"`);
      await route.fulfill({ response, body });
    });
  }
  const errors = [];
  page.on('console', (msg) => {
    // HMR 的 WebSocket 在无头环境里连不上，属 dev server 的噪声，与页面质量无关
    if (msg.type() === 'error' && !msg.text().includes('WebSocket')) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  let ok = false;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.lx-page__body', { timeout: 15000 });
    if (doClick && clickSelector) {
      await page.waitForSelector(clickSelector, { timeout: 8000 });
      await page.click(clickSelector);
      await page.waitForTimeout(700);
    } else {
      // 等图表与渐变底落定，否则会截到半张图
      await page.waitForTimeout(1400);
    }

    const probe = await page.evaluate(() => {
      const root = document.querySelector('#root');
      const text = (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
      return {
        lang: document.documentElement.lang,
        theme: document.documentElement.getAttribute('data-lx-theme') ?? 'light',
        chars: text.length,
        cards: document.querySelectorAll('.lx-glass').length,
      };
    });

    await page.screenshot({ path: path.join(OUT, `${fileName}.png`), fullPage: true });
    ok = probe.chars > 200 && errors.length === 0;
    console.log(
      `${ok ? 'OK  ' : 'CHECK'} ${fileName.padEnd(26)} lang=${probe.lang} theme=${probe.theme} cards=${probe.cards} chars=${probe.chars} errors=${errors.length}`,
    );
    if (errors.length > 0) {
      console.log(`      ${errors.slice(0, 2).join(' | ')}`);
    }
  } catch (error) {
    console.log(`FAIL ${fileName.padEnd(26)} ${String(error).split('\n')[0]}`);
  } finally {
    await context.close();
  }
  if (!ok) {
    failed += 1;
  }
}

try {
  for (const state of STATES) {
    await capture(`${stem}-${state.id}`, state, { doClick: false });
  }
  if (clickSelector) {
    // 点击态同样按三态各截一张：面板里的文案在英文态更长，
    // 溢出 / 黏连这类缺陷只在英文态现形，只截中文等于没验。
    for (const state of STATES) {
      await capture(`${stem}-${clickSuffix}-${clickName}-${state.id}`, state, { doClick: true });
    }
  }
} finally {
  await browser.close();
}

console.log(failed === 0 ? `\nall captures ok  (out: ${path.relative(WEB, OUT)})` : `\n${failed} capture(s) need review`);
process.exit(failed === 0 ? 0 : 1);
