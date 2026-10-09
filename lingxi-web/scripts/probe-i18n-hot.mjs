import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * i18n 热更新回归脚本（验证 `createI18n` 的资源指纹机制）。
 *
 * 复现用户遇到的场景：**页面已经打开**，此时往语言包里加/改一个键，
 * 期望页面在不刷新的情况下自动出现新文案。
 * 旧实现（`initialized`纯布尔门闩）在这个场景下必然失败 ——
 * 语言包 JSON 与 config.ts 是两个模块图，JSON 变了 config 模块未必被替换，
 * 二次 `createI18n` 被静默吞掉，页面上只剩裸 key。
 *
 * 做法：直接读页面里的 i18n 单例（`window` 上未必挂，故通过渲染出的 DOM 文本核对：
 * 用一个**已存在**的键改值，比新加键更容易判定—— 新加键没被任何组件引用，
 * 文本里根本不会出现，测不到）。
 *
 * ⚠️ 脚本会**修改** `locales/zh-CN/common.json`，`finally` 里务必还原。
 *
 * 用法：MSYS_NO_PATHCONV=1 LAYOUT_BASE=http://localhost:5173 \
 *      LAYOUT_ROUTE=/opportunity/o1-1/follow node scripts/probe-i18n-hot.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://localhost:5173';
const ROUTE = process.env.LAYOUT_ROUTE ?? '/opportunity/o1-1/follow';
const LOCALE = process.env.LAYOUT_LOCALE ?? 'zh-CN';
const W = Number(process.env.LAYOUT_W ?? 1280);
const H = Number(process.env.LAYOUT_H ?? 1400);

/**
 * 被测键：默认是跟进页的段标题（"记一次跟进"）。
 *
 * `LAYOUT_KEY` 可覆盖 —— 换页面测时必须换键，否则「页面没渲染这个键」会被
 * 误判成「热更新失效」（本脚本只认「改前看到原值、改后看到新值」，
 * 一个当前页根本不渲染的键，三条断言必然全false，结论却是错的）。
 *
 * ORIG 从语言包**读出来**而不是硬编码 —— 它要断言的正是"页面渲染的值等于语言包的值"，
 * 写成字面量就变成了自己断言自己，键被改动时探针会跟着一起错，测不出东西。
 * NEXT 则是本次注入的标记值，必须与语言包里任何值都不同（否则页面变化无法与原值区分）。
 * 两者都在 runtime 由语言包拼出，故此文件无中文 Literal，可过 no-restricted-syntax。
 */
const KEY = process.env.LAYOUT_KEY ?? 'opp.follow.sec.record';
const ZH_FILE = path.join(WEB, 'apps', 'lingxi-web', 'src', 'locales', 'zh-CN', 'common.json');
const ORIG = JSON.parse(fs.readFileSync(ZH_FILE, 'utf8'))[KEY];
const NEXT = `[hot-reload-probe]${Date.now()}`;

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

/** 改语言包里某个键的值（整体重写，保持 2 空格缩进 + 末尾 LF）。 */
function setValue(file, key, value) {
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!(key in obj)) throw new Error(`key not found: ${key}`);
  obj[key] = value;
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

const zhFile = ZH_FILE;
const backup = fs.readFileSync(zhFile, 'utf8');

const pw = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.addInitScript((locale) => {
  window.localStorage.setItem('lx.locale', locale);
}, LOCALE);

let exitCode = 0;
try {
  // ① 页面打开，显示旧文案
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => document.body.innerText);

  // ② 只改磁盘上的语言包，不碰页面
  setValue(zhFile, KEY, NEXT);
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => document.body.innerText);

  const sawOld = before.includes(ORIG);
  const sawNew = after.includes(NEXT);
  const keptOld = after.includes(ORIG);

  console.log(`route=${ROUTE} locale=${LOCALE} key=${KEY}`);
  console.log(`[1] before edit renders original : ${sawOld}`);
  console.log(`[2] after edit renders new text : ${sawNew}`);
  console.log(`[3] old text still on page: ${keptOld}`);

  if (sawOld && sawNew && !keptOld) {
    console.log('RESULT: PASS - hot update reaches the open page, no manual refresh needed');
  } else {
    console.log('RESULT: FAIL - hot update did NOT reach the open page');
    exitCode = 1;
  }
} finally {
  fs.writeFileSync(zhFile, backup, 'utf8');
  await browser.close();
}

process.exit(exitCode);