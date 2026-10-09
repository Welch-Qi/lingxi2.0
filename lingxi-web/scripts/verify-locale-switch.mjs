/**
 * 语言切换入口的交互验证（真实点击，不是"置位后截图"）。
 *
 * 为什么需要它：语言偏好一旦被写进 localStorage，就会被 detectLocale 永久优先；
 * 如果界面上没有可辨识的切换入口，用户就再也回不到母语——而且这个故障
 * **四道门禁一道都拦不住**：把 `lng` 硬编码成 `en-US` 语法完全合法，按钮"存在"也是事实。
 * 曾经的真实事故：入口是个无文字、无 tooltip 的 SwapOutlined 图标，
 * 与旁边的铃铛/头像无法区分，用户误点后只能认定"系统变成英文且改不回去"。
 *
 * 验的是两条边界：
 *   ① 默认语言：浏览器语言为英文时，首次进入**仍应是中文**（detectLocale 不探测浏览器语言）；
 *   ② 切换闭环：点语言按钮 → 切到英文 → 刷新后偏好保持 → 再点一次能切回中文。
 *
 * 场景里为什么要显式设 locale: 'en-US'：本机浏览器多为中文，不设的话
 * "默认不受浏览器语言影响"这条断言就成了空转——它必须在一个**会触发旧行为**的
 * 环境下才有意义。
 *
 * 用法：
 *   NODE_OPTIONS= node scripts/verify-locale-switch.mjs
 *   E2E_PORT=5181 node scripts/verify-locale-switch.mjs      # 换端口（默认 5180）
 *   端口被占用时脚本会直接报错退出（strictPort），不会静默串到别的服务上。
 *
 * 为什么不用 Playwright 自带浏览器：ms-playwright 缓存通常为空，下载要 100MB+。
 * 这里直接复用本机已装的 Chrome/Edge（executablePath），与 screenshot-routes.mjs 同源。
 *
 * 为什么断言文案从语言包读、不在脚本里写死：ESLint 的 no-restricted-syntax 禁止
 * 中文字符串字面量（附录D 规则10），脚本里出现 '中文' 会直接 lint 失败；
 * 而且从语言包读还能让断言跟着文案走——改了 nav.lang.name 不需要同步改脚本。
 *
 * 选择器契约：顶栏语言按钮的类名是 .lx-chip--lang。改 TopBar 时若把它改名，
 * 本脚本会以"按钮不可见"失败——这是有意为之，入口的稳定标识本身就该受约束。
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(import.meta.dirname, '..');
const APP = path.join(WEB, 'apps', 'lingxi-web');
const PORT = Number(process.env.E2E_PORT ?? 5180);
const LOCALES = path.join(APP, 'src', 'locales');

/** 期望文案从语言包取，避免在脚本里硬编码中文（也避免与语言包脱钩） */
function labelOf(locale, key) {
  const data = JSON.parse(fs.readFileSync(path.join(LOCALES, locale, 'common.json'), 'utf8'));
  const value = data[key];
  if (typeof value !== 'string') {
    throw new Error(`missing ${key} in locale ${locale}`);
  }
  return value;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.');
  }
  return hit;
}

/**
 * 解析 playwright 包入口。
 *
 * 不能直接 require.resolve('playwright')：本仓 pnpm 用 isolated 布局，
 * playwright 只存在于 node_modules/.pnpm/playwright@x.y.z/node_modules/ 下，
 * 仓库根 node_modules 里只有 .bin 的 CLI shim（shim 不是可 require 的包）。
 * 故先探常规位置，再按 .pnpm 目录名探测——不硬编码版本号。
 */
function resolvePlaywright() {
  const base = path.join(WEB, 'node_modules');
  const direct = path.join(base, 'playwright', 'index.js');
  if (fs.existsSync(direct)) {
    return direct;
  }
  const pnpm = path.join(base, '.pnpm');
  const dirs = fs.existsSync(pnpm)
    ? fs.readdirSync(pnpm).filter((n) => n.startsWith('playwright@'))
    : [];
  for (const dir of dirs) {
    const hit = path.join(pnpm, dir, 'node_modules', 'playwright', 'index.js');
    if (fs.existsSync(hit)) {
      return hit;
    }
  }
  throw new Error(`playwright not found. Tried ${direct} and ${pnpm}/playwright@*`);
}

function resolveViteEntry() {
  const candidates = [
    path.join(APP, 'node_modules', 'vite', 'dist', 'node', 'index.js'),
    path.join(WEB, 'node_modules', 'vite', 'dist', 'node', 'index.js'),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error(`vite entry not found. Tried:\n${candidates.join('\n')}`);
  }
  return hit;
}

const pw = await import(pathToFileURL(resolvePlaywright()).href);
// playwright 是 CJS，命名导出取决于 cjs-module-lexer 的识别，两条路都兜一下
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) {
  throw new Error('playwright exposes no chromium export');
}
const { createServer } = await import(pathToFileURL(resolveViteEntry()).href);

const expected = {
  en: labelOf('en-US', 'nav.lang.name'),
  zh: labelOf('zh-CN', 'nav.lang.name'),
};

const server = await createServer({
  root: APP,
  configFile: path.join(APP, 'vite.config.ts'),
  server: { port: PORT, host: '127.0.0.1', strictPort: true },
  logLevel: 'warn',
});
await server.listen();
console.log(`dev server on http://127.0.0.1:${PORT}`);

/** 读页面当前的语言状态。buttonVisible 判的是"用户看得见"，不只是"DOM 里有"。 */
const readState = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('.lx-chip--lang');
    const box = el?.getBoundingClientRect();
    const style = el ? getComputedStyle(el) : null;
    return {
      htmlLang: document.documentElement.lang,
      stored: localStorage.getItem('lx.locale'),
      buttonText: el?.textContent?.trim() ?? null,
      buttonVisible:
        !!el && !!box && box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
    };
  });

const checks = [];
function check(name, actual, want) {
  const ok = actual === want;
  checks.push(ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
}

let browser;
try {
  browser = await chromium.launch({ executablePath: findChrome(), headless: true });

  // locale: 'en-US' 模拟"浏览器语言是英文"——旧实现会因此直接进入英文界面
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1344, height: 420 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/workbench`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('\n[1] English browser, first visit (must default to Chinese)');
  const first = await readState(page);
  check('button visible', first.buttonVisible, true);
  check('html lang', first.htmlLang, 'zh-CN');
  check('button label', first.buttonText, expected.zh);
  check('no stored preference yet', first.stored, null);

  await page.click('.lx-chip--lang');
  await page.waitForTimeout(800);

  console.log('\n[2] after clicking the language button');
  const after = await readState(page);
  check('html lang', after.htmlLang, 'en-US');
  check('button label', after.buttonText, expected.en);
  check('persisted preference', after.stored, 'en-US');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('\n[3] after reload (stored preference must beat the default)');
  const reloaded = await readState(page);
  check('html lang', reloaded.htmlLang, 'en-US');
  check('button label', reloaded.buttonText, expected.en);

  await page.click('.lx-chip--lang');
  await page.waitForTimeout(800);

  console.log('\n[4] click again (must switch back to Chinese)');
  const back = await readState(page);
  check('html lang', back.htmlLang, 'zh-CN');
  check('button label', back.buttonText, expected.zh);
  check('persisted preference', back.stored, 'zh-CN');

  await context.close();
} finally {
  if (browser) {
    await browser.close();
  }
  await server.close();
}

const passed = checks.filter(Boolean).length;
const ok = passed === checks.length;
console.log(ok ? `\nlocale switch OK (${passed}/${checks.length})` : `\nlocale switch FAILED (${passed}/${checks.length})`);
process.exit(ok ? 0 : 1);
