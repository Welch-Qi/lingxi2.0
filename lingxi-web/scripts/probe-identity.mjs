import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 身份闭环探针（2026-10-07）。
 *
 * ## 为什么这类问题必须有探针
 *
 * 用户报的现象是「退出登录后还是这个人，切换角色还是这个用户」。
 * 这是一条**否定命题**：「身份应该被清掉」「换角色应该换人」——
 * 截图只能证明"现在显示的是某人"，证明不了"该换的时候真的换了"。
 *
 * 而且这两个 bug 有一个共同特征：**默认状态下看起来完全正常**。
 * 视角身份本来就是从localStorage 读的，不点任何东西它一直是"对"的；
 * 退出登录也照样能退出（只是回来还是那个人）。所以肉眼与四道门禁全都看不出破绽。
 *
 * ## 断言清单
 *
 *  1. 基线：默认视角是超管，12 个菜单；
 *  2. 切到 u.chen（受限）→ 菜单变少；
 *  3. **退出登录 → 视角身份必须复位**（核心断言，堵住持久化继承）；
 *  4. 重进 → 是超管不是 u.chen；
 *  5. **登录页切换角色 → 身份必须跟着变**（堵住两套身份系统脱钩）；
 *  6. 每步都断言侧边栏确实变了 —— 只断言"页面上有某某名字"是不够的。
 *
 * 用法：MSYS_NO_PATHCONV=1 node scripts/probe-identity.mjs
 */
const WEB = process.cwd();
const BASE = process.env.LX_SHOT_BASE ?? 'http://localhost:5173';

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

/** 哨兵：清理只在首屏做一次 —— addInitScript 对每次导航都跑，
 *  无条件 clear 会把「切视角 / 退出」写进去的值在下次 goto 时自己抹掉。 */
await page.addInitScript(() => {
  window.localStorage.setItem('lx.locale', 'zh-CN');
  if (!window.sessionStorage.getItem('lx.id.probe.init')) {
    window.sessionStorage.setItem('lx.id.probe.init', '1');
    window.localStorage.removeItem('lx.cc.config.v1');
    window.localStorage.removeItem('lx.cc.dicts.v1');
  }
});

const results = [];
const step = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function goto(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
}

const menuCount = () => page.evaluate(() => document.querySelectorAll('.lx-sidenav__item').length);
const menuLabels = () =>
  page.evaluate(() => [...document.querySelectorAll('.lx-sidenav__label')].map((n) => n.textContent?.trim()));

/** 当前视角身份：直接读 store，比从界面文字反推可靠（顶栏可能显示账号而非姓名）。 */
const viewingUser = () =>
  page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem('lx.cc.config.v1');
      return raw ? JSON.parse(raw).viewingUserId : null;
    } catch {
      return null;
    }
  });

const clickRowCell = (rowMatchText, idx) =>
  page.evaluate(
    ({ match, i }) => {
      const rows = [...document.querySelectorAll('tbody tr.ant-table-row')];
      const target = rows.find((tr) => tr.textContent?.includes(match));
      if (!target) return false;
      const btn = [...target.querySelectorAll('button.lx-cell-link')][i];
      if (!btn) return false;
      btn.click();
      return true;
    },
    { match: rowMatchText, i: idx },
  );

/* ---------- 1. 基线：默认视角= 超管 ---------- */
await goto('/workbench');
const adminMenus = await menuCount();
const adminView = await viewingUser();
step('baseline: viewing identity is admin', adminView === 'u.wu', `viewingUserId=${adminView}`);
step('baseline: menu count = 12', adminMenus === 12, `actual=${adminMenus}`);

/* ---------- 2. 切到受限用户 u.chen ---------- */
await goto('/config/users');
const switched = await clickRowCell('chen.yu', 1);
step('switched to u.chen', switched);
await page.waitForTimeout(900);
await goto('/workbench');
const limitedMenus = await menuCount();
const chenView = await viewingUser();
step('viewing identity switched to u.chen', chenView === 'u.chen', `viewingUserId=${chenView}`);
step('limited: menu count < admin', limitedMenus < adminMenus, `admin=${adminMenus} limited=${limitedMenus}`);

/* ---------- 3. 核心断言：退出登录必须复位视角 ---------- */
await goto('/workbench');
/* 退出按钮在**侧栏底部**（`.lx-sidenav__logout`，见 SideNav.tsx），
   不在顶栏 —— 原先按「顶栏最后一个 button」找会点错元素且静默失败。
   用 class 定位，不按文案（文案随语言变）。 */
const signedOut = await page.evaluate(() => {
  const btn = document.querySelector('.lx-sidenav__logout');
  if (!(btn instanceof HTMLElement)) return false;
  btn.click();
  return true;
});
step('clicked sign-out', signedOut);
// 预览分支走整页跳转，等新文档加载完
await page.waitForTimeout(2500);
const afterLogoutView = await page.evaluate(() => {
  try {
    const raw = window.localStorage.getItem('lx.cc.config.v1');
    return raw ? JSON.parse(raw).viewingUserId : null;
  } catch {
    return null;
  }
});
step(
  'SIGN OUT resets viewing identity (core)',
  afterLogoutView === 'u.wu',
  `after sign-out viewingUserId=${afterLogoutView}`,
);
step('sign-out lands on /login', page.url().includes('/login'), page.url().replace(BASE, ''));

/* ---------- 4. 重进：应回到超管，且菜单回满 ---------- */
await goto('/workbench');
const reenterView = await viewingUser();
const reenterMenus = await menuCount();
step('re-enter: identity back to admin', reenterView === 'u.wu', `viewingUserId=${reenterView}`);
step('re-enter: menus restored', reenterMenus === adminMenus, `baseline=${adminMenus} now=${reenterMenus}`);

/* ---------- 5. 核心断言二：登录页切换角色必须换身份 ---------- */
await goto('/login');
// 选第3 个岗位（渠道总监→周牧）。按 class 定位，不按文案（文案随语言变）。
const pickedRole = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.lx-select__role')];
  const hit = items[2] ?? items[0];
  if (!(hit instanceof HTMLElement)) return false;
  hit.click();
  return true;
});
step('picked a different role on /login', pickedRole);
await page.waitForTimeout(400);
const entered = await page.evaluate(() => {
  const btn = document.querySelector('.lx-select__btn');
  if (!(btn instanceof HTMLElement)) return false;
  btn.click();
  return true;
});
step('clicked enter', entered);
await page.waitForTimeout(2000);
const afterRoleView = await viewingUser();
step(
  'ROLE SWITCH changes viewing identity (core)',
  afterRoleView !== 'u.wu' && afterRoleView === 'u.zhou',
  `after role switch viewingUserId=${afterRoleView} (expect u.zhou)`,
);

await goto('/workbench');
const afterRoleMenus = await menuCount();
const afterRoleLabels = await menuLabels();
step(
  'role switch really changed menus',
  afterRoleMenus !== adminMenus && afterRoleMenus > 0,
  `admin=${adminMenus} afterRole=${afterRoleMenus} (${afterRoleLabels.join('|')})`,
);

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);