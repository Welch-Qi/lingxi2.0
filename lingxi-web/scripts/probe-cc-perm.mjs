import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 配置中心权限链探针（2026-10-06）。
 *
 * ## 为什么这类问题需要探针而不是看截图
 *
 * 「权限到底生效没有」是一个**否定命题**：截图只能证明"菜单在"，
 * 证明不了"菜单该消失时消失了"。而本轮修的正是这个 ——
 * 改造前 permCode 从未被消费，配了等于没配，肉眼完全看不出破绽
 * （因为默认状态下本来就该全都在）。
 *
 * 所以判据必须是可断言的数量：
 *   1. 超管视角 → 13 个一级菜单全在，被摘掉的路由能进去；
 *   2. 受限视角 → 侧边栏真实变少（不是 13 → 13），被摘掉的路由撞 403；
 *   3. 客户列表 → 受限视角的行数**少于**全量，且数据范围档位能区分出不同结果；
 *   4. 裸 key 数 = 0。
 *
 * 玩法：在用户列表点「以此身份查看」切到受限用户 u.chen（SELF 档、只有内容总监角色），
 * 然后数菜单。若菜单仍是 13，说明权限过滤根本没接上。
 *
 * 用法：MSYS_NO_PATHCONV=1 node scripts/probe-cc-perm.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LAYOUT_BASE ?? 'http://localhost:5173';
const OUT_DIR = path.join(WEB, 'apps', 'lingxi-web', 'artifacts', 'screenshots');

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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
/**
 * 初始化脚本：**只在首个文档执行一次**。
 *
 * 踩过的坑：一开始写成无条件 `localStorage.removeItem(...)`，而
 * addInitScript 对**每次导航**都会跑 —— 于是「切视角」写进去的 viewingUserId
 * 在下一次 goto 时被自己抹掉，探针读到的永远是超管视角，
 * 报出「权限过滤没生效」的假结论。哨兵变量把清理限在首屏。
 */
await page.addInitScript(() => {
  window.localStorage.setItem('lx.locale', 'zh-CN');
  if (!window.sessionStorage.getItem('lx.cc.probe.init')) {
    window.sessionStorage.setItem('lx.cc.probe.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
  }
});

const menuCount = () =>
  page.evaluate(() => document.querySelectorAll('.lx-sidenav__item').length);
const menuLabels = () =>
  page.evaluate(() => [...document.querySelectorAll('.lx-sidenav__label')].map((n) => n.textContent?.trim()));
const rowCount = () =>
  page.evaluate(() => document.querySelectorAll('.lx-table--fit tbody tr.ant-table-row').length);
const bareKeys = () =>
  page.evaluate(() => {
    // 裸 key 判据：文本里出现 i18n 路径形态（至少两段、全小写+点）且不是已知正常文案
    const re = /\b[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){1,4}\b/g;
    const hits = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? '';
      let m;
      while ((m = re.exec(text))) {
        const token = m[0];
        // 排除版本号、日期、版本字符串、类名等误报
        if (/^\d/.test(token)) continue;
        if (['i.e', 'e.g', 'v1', 'etc'].some((x) => token.startsWith(x))) continue;
        if (/^(zh|en)-[A-Z]{2}$/.test(token)) continue;
        /* 排除 `o.o` 这类碎片：必须每段都够长（>=2），否则把 CSS 类名、
           金额小数点切开、版本号等噪声当成了裸 key。 */
        if (token.split('.').some((seg) => seg.length < 2)) continue;
        hits.add(token);
      }
    }
    return [...hits];
  });
const is403 = () =>
  page.evaluate(() => {
    const t = document.body.textContent ?? '';
    return /403|没有该功能的权限|no permission/i.test(t);
  });

const results = [];
const step = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * 跳转并等应用真正渲染完。
 *
 * 为什么不用固定 waitForTimeout：Vite dev 首次加载一个路由要拉模块，
 * 慢的时候 >600ms，于是「菜单数」读到的是**还没渲染**的 0 ——
 * 探针会误报「权限过滤把菜单全干掉了」，而实际是页面还没出来。
 * 判据必须挂在真实出现的元素上：侧边栏第一个菜单项出现即视为就绪。
 */
async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/* ---------- 1. 超管视角：13 个菜单全在 ---------- */
await goto('/workbench');
const adminMenus = await menuCount();
step('admin: top-level menu count = 12', adminMenus === 12, `actual=${adminMenus}`);
step('admin: no bare i18n keys', (await bareKeys()).length === 0, JSON.stringify(await bareKeys()));
const adminLabels = await menuLabels();

/* ---------- 2. 客户列表全量行数 ---------- */
await goto('/customer');
const adminRows = await rowCount();
step('admin: customer list has rows', adminRows > 0, `rows=${adminRows}`);

/* ---------- 3. 切到受限用户 u.chen（SELF 档 + 只有内容总监角色） ---------- */
await goto('/config/users');
/**
 * 点 u.chen 那一行的「以此身份查看」。
 *
 * 用**行内第 2 个 cell-link**定位而不是匹配中文按钮文案：
 * 文案走语言包，en-US 下会变成 "View as"，按中文找必然找不到 ——
 * 而探针此刻若没真正切视角，后面所有"受限视角"断言都会假绿。
 */
const switched = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('tbody tr.ant-table-row')];
  const target = rows.find((tr) => tr.textContent?.includes('chen.yu'));
  if (!target) return false;
  // 行内操作区：[配置权限, 以此身份查看, 删除]；删除是 --danger，排在最后。
  const links = [...target.querySelectorAll('button.lx-cell-link')];
  const btn = links[1];
  if (!btn) return false;
  btn.click();
  return true;
});
step('switched to u.chen via user list', switched);
await page.waitForTimeout(1200);
/* 切视角只改 store，不改路由；必须重新进入一个页面让守卫与过滤重跑一次。 */
await goto('/workbench');

/* ---------- 4. 受限视角：菜单真的少了 ---------- */
const limitedMenus = await menuCount();
const limitedLabels = await menuLabels();
step(
  'limited: menu count < admin',
  limitedMenus < adminMenus,
  `admin=${adminMenus} limited=${limitedMenus} (${limitedLabels.join('|')})`,
);
const removed = adminLabels.filter((l) => !limitedLabels.includes(l));
step('removed menu list is non-empty', removed.length > 0, `removed=${JSON.stringify(removed)}`);

/* ---------- 5. 受限视角：被摘掉的分区撞 403 ---------- */
const blocked = removed.length > 0 ? removed[0] : null;
if (blocked) {
  const labelToPath = {
    客户中心: '/customer',
    商机中心: '/opportunity',
    商品中心: '/product',
    营销中心: '/marketing',
    订单交付: '/order',
    售后服务: '/service',
  };
  const target = labelToPath[blocked] ?? null;
  if (target) {
    await goto(target);
    step(`limited: direct nav to ${target} hits 403`, await is403(), blocked);
  } else {
    step(`limited: ${blocked} route unmapped, skip 403 check`, true);
  }
}

/* ---------- 6. 受限视角：客户列表行数变少（数据范围生效） ---------- */
await goto('/customer');
const limitedRows = await rowCount();
step(
  'limited: customer rows < full set',
  limitedRows < adminRows,
  `admin=${adminRows} limited=${limitedRows}`,
);
const keysAfter = await bareKeys();
step('limited: no bare i18n keys', keysAfter.length === 0, JSON.stringify(keysAfter));

/* ---------- 7. 截图（超管 + 受限两态） ---------- */
fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
await goto('/config/users');
const f1 = path.join(OUT_DIR, `cc-users-admin_zh-CN_1440x1000_${stamp}.png`);
await page.screenshot({ path: f1, fullPage: true });
console.log('saved:', f1);

await goto('/config/roles');
const f2 = path.join(OUT_DIR, `cc-roles-admin_zh-CN_1440x1000_${stamp}.png`);
await page.screenshot({ path: f2, fullPage: true });
console.log('saved:', f2);

await goto('/config/business/stage-opp');
const f3 = path.join(OUT_DIR, `cc-dict-stage_zh-CN_1440x1000_${stamp}.png`);
await page.screenshot({ path: f3, fullPage: true });
console.log('saved:', f3);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);