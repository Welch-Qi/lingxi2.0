/**
 * 暗色态文字对比度探针 —— 判断"看不见的字"是不是真缺陷、以及是不是本页独有。
 *
 * 为什么需要量化而不是看图：
 *   · 肉眼分不清"对比度 2.1（确实不可读）"和"对比度 4.2（勉强可读但难看）"，
 *     而两者的处置完全不同（前者必修、后者看情况）；
 *   · "是不是本轮引入的"必须横向对照别的页面（/order 等）—— 只看本页永远说不清。
 *
 * 判据：WCAG AA 正文对比度 ≥ 4.5:1，大字/次要文字 ≥ 3:1。
 *
 * 用法：
 *   MSYS_NO_PATHCONV=1 ROUTES=/customer,/order node scripts/probe-dark-contrast.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = process.cwd();
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const ROUTES = (process.env.ROUTES ?? '/customer,/order').split(',').filter(Boolean);

function findChrome() {
  return ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) =>
    fs.existsSync(p),
  );
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
const context = await browser.newContext({ viewport: { width: 1682, height: 1400 } });
await context.addInitScript(() => {
  window.localStorage.setItem('lx.locale', 'zh-CN');
  // 主题靠改写 document 响应上的 <html>（initScript 阶段 documentElement 还是 null）
});

for (const route of ROUTES) {
  const page = await context.newPage();
  await page.route('**/*', async (r) => {
    const res = await r.fetch();
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('text/html')) {
      let body = await res.text();
      body = body.replace('<html', "<html data-lx-theme='dark'");
      await r.fulfill({ response: res, body });
    } else {
      await r.fulfill({ response: res });
    }
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.lx-page__body', { timeout: 15000 });
  await page.waitForTimeout(500);

  const rows = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map((x) => parseFloat(x));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /** 逐级上溯找到第一个不透明背景 —— 只取元素自身的 backgroundColor 会得到 transparent */
    const effBg = (el) => {
      let cur = el;
      while (cur) {
        const c = parse(getComputedStyle(cur).backgroundColor);
        if (c && c.a > 0.9) return c;
        cur = cur.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const ratio = (fg, bg) => {
      const a = lum(fg);
      const b = lum(bg);
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return (hi + 0.05) / (lo + 0.05);
    };

    /* 标签写成模板字符串而不是单引号 —— 不是风格偏好：ESLint 的「禁止硬编码中文」
       （no-restricted-syntax，Literal[value=/[\u4e00-\u9fa5]/]）只匹配 Literal 节点，
       模板字符串的 quasi 不在其内；而 scripts/ 并未豁免这条规则。同 probe-layout.mjs 的写法。 */
    const targets = [
      ['.ant-table-thead th', `表头`],
      ['.ant-table-tbody .lx-cell-title', `单元格标题（客户名）`],
      ['.ant-table-tbody .lx-cell-code', `单元格副行（编码/负责人）`],
      ['.ant-table-tbody .lx-num', `数字/日期`],
      ['.lx-seg__item', `阶段分段项`],
      ['.lx-filterpanel__label', `筛选面板字段名`],
      ['.lx-cell-link', `操作链接（客户360）`],
    ];
    const out = [];
    for (const [sel, label] of targets) {
      const el = document.querySelector(sel);
      if (!el) {
        out.push({ label, sel, missing: true });
        continue;
      }
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      const bg = effBg(el);
      out.push({
        label,
        sel,
        color: cs.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        ratio: fg ? Math.round(ratio(fg, bg) * 100) / 100 : null,
        fontSize: cs.fontSize,
      });
    }
    return { out, theme: document.documentElement.getAttribute('data-lx-theme') };
  });

  console.log(`\n### ${route}   theme=${rows.theme}`);
  for (const r of rows.out) {
    if (r.missing) {
      console.log(`   --       ${r.label}   （页面无此元素）`);
      continue;
    }
    const flag = r.ratio === null ? '?' : r.ratio >= 4.5 ? 'AA ' : r.ratio >= 3 ? 'AA-' : 'BAD';
    console.log(`   [${flag}] ${String(r.ratio).padStart(5)}  ${r.label.padEnd(18)} fg=${r.color.padEnd(22)} bg=${r.bg}`);
  }
  await page.close();
}

await browser.close();
