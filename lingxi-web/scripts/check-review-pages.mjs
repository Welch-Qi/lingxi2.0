/**
 * 评审页硬验证 —— 用真实浏览器打开 artifacts/screenshots/*review*.html，
 * 等 JS 跑完（动态 src 是模板字符串拼的，静态扫不出来）、滚动触发 lazy 加载，
 * 再统计所有 <img> 里 naturalWidth === 0 的（= 破图）。
 *
 * 为什么需要：评审页是交付物，但它的破图不会让任何构建门禁失败 ——
 * HTML 语法合法、路径拼错也照样打开，只是用户看到一片空白。
 *
 * 用法：
 *   node scripts/check-review-pages.mjs              # 扫全部 *review*.html
 *   node scripts/check-review-pages.mjs path/a.html  # 只验指定文件
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const WEB = process.cwd();
const SHOT_DIR = path.join(WEB, 'artifacts', 'screenshots');

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

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.resolve(p))
  : fs
      .readdirSync(SHOT_DIR)
      .filter((n) => n.includes('review') && n.endsWith('.html'))
      .map((n) => path.join(SHOT_DIR, n));

const pw = await import(pathToFileURL(resolvePlaywright()).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

let totalBroken = 0;
for (const file of targets.sort()) {
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 30000 });
  // 滚到底触发 lazy 加载，再等图解码
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const all = [...document.querySelectorAll('img')].filter((i) => i.getAttribute('src'));
    const broken = all
      .filter((i) => !i.naturalWidth)
      .map((i) => ({ src: i.getAttribute('src'), alt: i.alt || '' }));
    const dyn = /src="\$\{/.test(document.documentElement.innerHTML) ? 'yes' : 'no';
    return { total: all.length, broken, dyn, imgs: all.map((i) => i.getAttribute('src')) };
  });

  const name = path.basename(file);
  const tag = info.broken.length ? 'BAD ' : 'ok  ';
  console.log(`[${tag}] ${name}  <img> ${info.total} 张 / 破图 ${info.broken.length} 张 / 页面含动态 src=${info.dyn} / 运行时错误 ${errs.length}`);
  for (const b of info.broken) console.log(`        MISS ${b.src}   alt=${b.alt}`);
  if (errs.length) console.log(`        ERR  ${errs.slice(0, 2).join(' | ').slice(0, 200)}`);
  totalBroken += info.broken.length;
  await page.close();
}

await browser.close();
console.log(`\n评审页破图合计: ${totalBroken}`);
process.exit(totalBroken ? 1 : 0);
