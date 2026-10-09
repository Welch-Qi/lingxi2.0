import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 第十九轮交付截图（2026-10-07）：登录页 / 营销日历 / 用户管理三项反馈。
 *
 * 日历要两张关键态：
 *  - 默认态（月历格，验证事件 7 字容量 + 无图标 + 文字色分类型）
 *  - 选中活动后的右栏（验证活动专属字段与生命周期已补齐）
 * 日历必截中英 —— 英文文案长 1.5 倍，是"7 个中文字"的真正压力测试。
 */
const WEB = process.cwd();
const BASE = process.env.LX_SHOT_BASE ?? 'http://localhost:5173';
const OUT_DIR = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');
const LOCALE = process.env.LX_SHOT_LOCALE ?? 'zh-CN';
const W = Number(process.env.LX_SHOT_W ?? 1440);
const H = Number(process.env.LX_SHOT_H ?? 1000);

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
const page = await browser.newPage({ viewport: { width: W, height: H } });

await page.addInitScript((loc) => {
  window.localStorage.setItem('lx.locale', loc);
  if (!window.sessionStorage.getItem('lx.cc.r19shot.init')) {
    window.sessionStorage.setItem('lx.cc.r19shot.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
    window.localStorage.removeItem('lx.cc.biz2.v1');
  }
}, LOCALE);

async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav, .lx-select', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const stamp = new Date().toISOString().slice(0, 10);
const saved = [];

async function shot(name, route, opts = {}) {
  await goto(route);
  if (opts.clickCampaign) {
    await page.evaluate(() => {
      const ev = document.querySelector('.lx-mcal__ev[data-kind="campaign"]');
      if (ev) ev.click();
    });
    await page.waitForTimeout(800);
  }
  if (opts.clickPlus) {
    await page.evaluate(() => {
      const plus = document.querySelector('.lx-mcal__plus');
      if (plus) plus.click();
    });
    await page.waitForTimeout(600);
  }
  if (opts.clickNewUser) {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const hit = btns.find((n) => (n.textContent ?? '').trim().length > 0 && n.className.includes('section__more'));
      if (hit) hit.click();
      else {
        const alt = btns.find((n) => (n.textContent ?? '').includes('新建'));
        if (alt) alt.click();
      }
    });
    await page.waitForTimeout(800);
  }
  const file = path.join(OUT_DIR, `r19-${name}_${LOCALE}_${W}x${H}_${stamp}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  saved.push(file);
  console.log('saved:', path.basename(file));
}

await shot('calendar-month', '/marketing/calendar');
await shot('calendar-campaign-panel', '/marketing/calendar', { clickCampaign: true });
await shot('calendar-quick', '/marketing/calendar', { clickPlus: true });
await shot('users-list', '/config/users');
await shot('users-create', '/config/users', { clickNewUser: true });

await browser.close();
console.log(`\n${saved.length} shots -> ${OUT_DIR}`);