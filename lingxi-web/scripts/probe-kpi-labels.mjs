/**
 * 指标名「装得下吗」探针：逐档视口宽度量 KPI 卡的指标名是否折行 / 截断 / 溢出。
 *
 * 为什么需要它（而不是截图）：
 *   折行、截断、溢出都是**边界现象**——宽一档就好、窄一档才坏。
 *   截图只能证明"这一张图没折行"；而这类缺陷偏偏只在中间宽度带里活着
 *   （实测：≥1500 余量够、≤1240 栅格降 4 列卡变宽，破损带是 1241–1440），
 *   恰好历次验收都拍在 1680 上，永远看不见。
 *
 * 判据（任一条不满足即 FAIL）：
 *   0) 卡数 ≥ 3 且每张卡的指标名非空 —— **选择器没命中时卡数为 0，
 *      后面所有断言都会"通过"**，所以这条必须排在最前面
 *   1) 指标名单行：行盒高度 ≈ 一个行高
 *   2) 指标名不被截断：scrollWidth <= clientWidth + 1
 *   3) 数值、时点胶囊都不越出卡片内容盒
 *
 * 用法：
 *   NODE_OPTIONS= node scripts/probe-kpi-labels.mjs
 *   PROBE_ROUTES=/workbench,/analytics PROBE_WIDTHS=1680,1366 node scripts/probe-kpi-labels.mjs
 *   PROBE_OLD=1 node scripts/probe-kpi-labels.mjs       # 复现"改前几何"，用于对照
 *   PROBE_CONTROLS=0 node scripts/probe-kpi-labels.mjs  # 关掉反向对照，只跑正向
 *
 * `PROBE_OLD=1` 会注入 `padding-right:44px + white-space:normal`，复现"时点胶囊占着
 * 标签行右端 + 允许折行"的旧几何——旧渲染已不存在，只能这样回放，用来回答
 * "这个折行到底是不是改前就有的"。44px = 胶囊宽 + gap 的实测值。
 *
 * 反向对照：探针会主动把版式弄坏三次，确认自己报得出来。**报不出来，正向的通过就不算数。**
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = path.resolve(import.meta.dirname, '..');
const BASE = process.env.PROBE_BASE ?? 'http://127.0.0.1:5173';
const ROUTES = (process.env.PROBE_ROUTES ?? '/workbench')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const WIDTHS = (process.env.PROBE_WIDTHS ?? '1680,1500,1441,1440,1366,1280,1241,1100,900')
  .split(',')
  .map(Number);
const SEL = process.env.PROBE_SEL ?? '.lx-kpi';
const CONTROLS = process.env.PROBE_CONTROLS !== '0';
const OLD = process.env.PROBE_OLD === '1';

/** 复现改前几何：时点胶囊占着标签行右端（44px）+ 指标名允许折行。 */
const OLD_GEOMETRY = '.lx-kpi__label{padding-right:44px}.lx-kpi__name{white-space:normal}';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error('no Chrome found; set CHROME_PATH');
  }
  return hit;
}

function resolvePlaywright() {
  const req = createRequire(path.join(WEB, 'package.json'));
  try {
    return req.resolve('playwright');
  } catch {
    // pnpm isolated 布局：仓库根只有 CLI shim，包体在 .pnpm/<pkg>@<ver>/node_modules/<pkg>/
  }
  const pnpmDir = path.join(WEB, 'node_modules', '.pnpm');
  const hit = fs
    .readdirSync(pnpmDir)
    .filter((name) => name.startsWith('playwright@'))
    .sort()
    .reverse()
    .find((name) => fs.existsSync(path.join(pnpmDir, name, 'node_modules', 'playwright', 'package.json')));
  if (!hit) {
    throw new Error('playwright not found; run pnpm install at the repo root');
  }
  const inner = createRequire(path.join(pnpmDir, hit, 'node_modules', 'playwright', 'package.json'));
  return inner.resolve('playwright');
}

/** 在页面里量一遍。抽出来是为了正向与反向对照走同一段逻辑。 */
const SNAPSHOT = (sel) => {
  const cards = [...document.querySelectorAll(sel)];
  const boxes = cards.map((card) => card.getBoundingClientRect());
  return {
    cards: cards.map((card, index) => {
      const name = card.querySelector('.lx-kpi__name');
      const value = card.querySelector('.lx-kpi__value');
      const badge = card.querySelector('.lx-kpi__badge');
      const style = getComputedStyle(name);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
      return {
        label: (name.textContent ?? '').trim(),
        lines: Math.round(name.getBoundingClientRect().height / lineHeight),
        truncated: name.scrollWidth > name.clientWidth + 1,
        nameRight: name.getBoundingClientRect().right,
        valueRight: value ? value.getBoundingClientRect().right : null,
        badgeRight: badge ? badge.getBoundingClientRect().right : null,
        inner: boxes[index].right - parseFloat(getComputedStyle(card).paddingRight),
      };
    }),
    headerH: Math.round(document.querySelector('.lx-page__header')?.getBoundingClientRect().height ?? -1),
    dockIcon: document.querySelector('.lx-dock__fabimg')?.getAttribute('src') ?? null,
  };
};

function judge(report, errors) {
  const bad = [];
  if (report.cards.length < 3) {
    bad.push(`只找到 ${report.cards.length} 张卡（选择器没命中时所有断言都会"通过"，必须先拦住）`);
  }
  if (report.cards.some((card) => card.label.length === 0)) {
    bad.push(`有卡片的指标名是空的，说明量到的不是标签本身`);
  }
  report.cards.forEach((card, index) => {
    const no = `卡${index + 1} ${card.label}`;
    if (card.lines !== 1) bad.push(`${no} 折成 ${card.lines} 行`);
    if (card.truncated) bad.push(`${no} 被截断`);
    if (card.nameRight > card.inner + 0.5) bad.push(`${no} 溢出卡片`);
    if (card.valueRight !== null && card.valueRight > card.inner + 0.5) bad.push(`${no} 数值溢出`);
    if (card.badgeRight !== null && card.badgeRight > card.inner + 0.5) bad.push(`${no} 时点胶囊溢出`);
  });
  if (errors.length > 0) bad.push(`运行时错误 ${errors.length} 条：${errors[0]}`);
  return bad;
}

const mod = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = mod.chromium ?? mod.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const failures = [];

async function open(route, width) {
  const context = await browser.newContext({ viewport: { width, height: 1200 } });
  await context.addInitScript(() => window.localStorage.setItem('lx.locale', 'zh-CN'));
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lx-kpi__name');
  return { context, page, errors };
}

async function measure(route, width, extraCss) {
  const { context, page, errors } = await open(route, width);
  if (extraCss) {
    await page.addStyleTag({ content: extraCss });
    await page.waitForTimeout(150);
  }
  const report = await page.evaluate(SNAPSHOT, SEL);
  await context.close();
  return { report, errors };
}

for (const route of ROUTES) {
  console.log(`\n=== ${route}${OLD ? ` · 改前几何复现` : ''} ===`);
  for (const width of WIDTHS) {
    const { report, errors } = await measure(route, width, OLD ? OLD_GEOMETRY : null);
    const bad = judge(report, errors);
    const tightest = report.cards.reduce(
      (acc, card) => {
        const slack = card.inner - card.nameRight;
        return slack < acc.slack ? { label: card.label, slack } : acc;
      },
      { label: '—', slack: Number.POSITIVE_INFINITY },
    );
    console.log(
      `${bad.length === 0 ? 'PASS' : 'FAIL'}  w=${width}  最紧「${tightest.label}」余 ${Math.round(tightest.slack)}px  页头高=${report.headerH}`,
    );
    for (const item of bad) {
      console.log(`      · ${item}`);
      failures.push(`${route} w=${width} ${item}`);
    }
  }
}

/* 反向对照：主动把版式弄坏，确认探针报得出来。
   不做这一步，上面所有 PASS 都可能是"量了个寂寞"（选择器错、盒子取错）。
   注意：脚本里的中文输出一律写进模板字符串——ESLint 的禁中文规则匹配的是 Literal 节点，
   模板字符串的 quasi 不在其内（既有脚本 check-running-app.mjs 也是这个写法）。 */
async function control(name, css) {
  const { report } = await measure(ROUTES[0], 1366, css);
  const hit = judge(report, []).length > 0;
  console.log(`${hit ? 'PASS' : 'FAIL'}  反向对照「${name}」：检出=${hit}（期望 true）`);
  if (!hit) failures.push(`反向对照 ${name} 未按预期检出`);
}

if (CONTROLS) {
  console.log(`\n=== 反向对照 ===`);
  await control(`压窄指标名 → 应检出截断或折行`, '.lx-kpi__name{max-width:24px}');
  await control(`允许折行 + 压窄 → 应检出折行`, '.lx-kpi__name{white-space:normal;max-width:24px}');
  await control(`复现改前几何 → 应检出折行`, OLD_GEOMETRY);
}

await browser.close();
console.log(failures.length === 0 ? `\n全部通过` : `\n失败 ${failures.length} 项`);
process.exit(failures.length === 0 ? 0 : 1);
