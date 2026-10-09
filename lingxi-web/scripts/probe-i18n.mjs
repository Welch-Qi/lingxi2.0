import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * i18n 裸 key 探针。
 *
 * 为什么需要：语言包键在磁盘上存在、dev server 也能提供到，但页面上仍可能显示
 * `xxx.yyy.zzz` 原文。截图能看出症状，却看不出「是键缺失还是资源没更新」——
 * 而这两者的处置完全相反（补键 vs 修资源加载）。本脚本把页面文本里的裸 key 抓出来，
 * 一眼区分：抓到 → 逐个去语言包里查；抓不到 → 资源加载路径有问题。
 *
 * 2026-10-06 就是靠它定位到 `createI18n` 的幂等门闩吞掉了热更新的资源
 * （见 `packages/lingxi-i18n/src/config.ts` 的 `lastFingerprint`）。
 *
 * playwright 不在根 package.json 里（只作为 @playwright/test 的传递依赖躺在
 * node_modules/.pnpm 下），故沿用 probe-layout.mjs 的 `resolvePlaywright()` 解析法；
 * 直接 `import 'playwright'` 会 ERR_MODULE_NOT_FOUND。
 *
 * 用法：MSYS_NO_PATHCONV=1 LAYOUT_BASE=http://localhost:5173 \
 *      LAYOUT_ROUTE=/opportunity/o1-1/follow node scripts/probe-i18n.mjs
 *
 * 判据：输出 `bare keys: 0` 即通过。非 0 时逐条核对 —— 真缺键补语言包；
 *       键在磁盘上却被抓出来 → 资源快照陈旧，改 i18n 初始化，不要去补键。
 */
const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://localhost:5173';
const ROUTE = process.env.LAYOUT_ROUTE ?? '/';
const LOCALE = process.env.LAYOUT_LOCALE ?? 'zh-CN';
const W = Number(process.env.LAYOUT_W ?? 1280);
const H = Number(process.env.LAYOUT_H ?? 1400);

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

// 语言偏好必须在 goto 之前设好，否则 detectLocale() 已经跑完
await page.addInitScript((locale) => {
  window.localStorage.setItem('lx.locale', locale);
}, LOCALE);

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const text = await page.evaluate(() => document.body.innerText);

/** 裸 key 形态：至少三段点分（域.模块.位置.含义），首段小写字母开头。 */
const BARE_KEY = /\b[a-z][a-z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*){2,}\b/g;
/** 排除 URL / 路由 / 扩展名 / 编码这类本就该原样出现的串。 */
const IGNORE = /^https?:|^\/[a-z]|\.(png|jpg|jpeg|svg|mp4|json|ts|tsx|css|html)$/i;

/**
 * 合法但形似 key 的串：**译文恰好等于 key 本身**。
 *
 * 典型是品牌名 —— `mkg.channel.tiktok` 的中英文值都是 `TikTok`，
 * 于是 `t()` 的正常输出被正则当成裸 key 抓出来（实测第一次跑就误报了它）。
 * 探针天天误报等于没探针，故必须用语言包反查剔除：键存在即放行，
 * 比较时一律小写（TikTok/tiktok 只差大小写）。
 */
const zh = JSON.parse(
  fs.readFileSync(path.join(WEB, 'apps', 'lingxi-web', 'src', 'locales', 'zh-CN', 'common.json'), 'utf8'),
);
const legit = new Set();
for (const [k, v] of Object.entries(zh)) {
  legit.add(k.toLowerCase());
  if (typeof v === 'string') legit.add(v.toLowerCase());
}

const raw = [...new Set(text.match(BARE_KEY) ?? [])].filter((k) => !IGNORE.test(k));
const hits = raw.filter((k) => !legit.has(k.toLowerCase())).sort();

// 输出走控制台日志（非界面文案），故用英文以过 no-restricted-syntax
console.log(`route=${ROUTE} locale=${LOCALE} viewport=${W}x${H}`);
console.log(`raw candidates: ${raw.length}, bare keys: ${hits.length}`);
for (const k of hits) console.log(`  ${k}`);
if (hits.length === 0) console.log('  (none)');

await browser.close();