/**
 * 第二十一轮验收探针（2026-10-07）—— 五项需求 + 一条判据型缺陷。
 *
 * 用法：MSYS_NO_PATHCONV=1 R21_BASE=http://localhost:5173 \
 *      R21_LOCALE=en-US R21_SHOT=<截图目录> node scripts/probe-r21.mjs
 *
 * 本轮探针特有的三条判据，都来自"上一轮探针漏了什么"：
 *
 *  ① **逐点读 computedStyle 判状态类有没有命中 CSS**（21.3 轨道点亮）。
 *     此前轨道 class 名写成 `lx-oppd__step done`（空格）而 CSS 是
 *     `.lx-oppd__step--done`，于是 8 个点全是同一个灰 —— 而元素在、宽高对、
 *     位置对，四道门禁与所有版式探针都判它"正常"。这类缺陷只能靠**颜色**判。
 *
 *  ② **下拉/输入框判"显示文本"而非"值"**（沿用上一轮教训）。
 *
 *  ③ **文案期望从语言包 JSON 同源取值**，不写死 —— 写死会产生假失败，
 *     假失败会把真问题淹没（本轮已踩过一次：`cus.type.first` 实际是
 *     "First-time buyer" 而不是我以为的 "First deal"）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const BASE = process.env.R21_BASE ?? 'http://localhost:5173';
const LOCALE = process.env.R21_LOCALE ?? 'zh-CN';
const SHOT = process.env.R21_SHOT ?? '';

const report = [];
const log = (id, ok, detail) => {
  report.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}  ${detail}`);
};

/** 语言包：期望文案一律从这里取，避免写死造成假失败。 */
const LOCALE_PACKAGE = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'apps/lingxi-web/src/locales', LOCALE, 'common.json'),
    'utf8',
  ),
);
const tr = (key) => LOCALE_PACKAGE[key] ?? `‹${key} 缺失›`;

async function resolvePlaywright() {
  const require_ = createRequire(path.join(process.cwd(), 'noop.js'));
  const pnpmDir = path.join(process.cwd(), 'node_modules/.pnpm');
  const entry = fs
    .readdirSync(pnpmDir)
    .filter((d) => d.startsWith('playwright@'))
    .map((d) => path.join(pnpmDir, d, 'node_modules/playwright/index.js'))
    .find((p) => fs.existsSync(p));
  if (!entry) throw new Error('playwright 不在 node_modules/.pnpm 下');
  return import(pathToFileURL(require_.resolve(entry)).href);
}

function findChrome() {
  const roots = [process.env.LOCALAPPDATA, 'C:/Program Files', 'C:/Program Files (x86)'].filter(Boolean);
  for (const r of roots) {
    for (const rel of ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']) {
      const p = path.join(r, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const pw = await resolvePlaywright();
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
await page.addInitScript((loc) => window.localStorage.setItem('lx.locale', loc), LOCALE);

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

/**
 * 导航并等**该页真正的主体元素**出现。
 *
 * 不用固定 `waitForTimeout`：Vite dev 首载路由要拉模块 + 编译 CSS，
 * 慢时 >2s（本轮实测 5180 冷启动后首屏要 2s 以上）。定时等待会读到
 * "还没渲染"的 DOM —— 表现是 count() 返回 0，而几秒后同一个选择器又能取到值。
 * 本轮首次跑就中了这个招：`.lx-p360__opplink` count 报 0、
 * 紧接着 `first().textContent()` 却读出了真值（Playwright locator 会 auto-wait，
 * 而 `count()` 不等）。那种自相矛盾的输出比直接报错更难查。
 *
 * `selector` 传该页的主体容器；等不到就抛错 —— 静默继续只会把"页面没渲染"
 * 报成"功能没实现"。
 */
async function goto(route, selector) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  if (selector) {
    await page.waitForSelector(selector, { timeout: 25000 });
  }
  await page.waitForTimeout(500);
}
async function shot(name) {
  if (!SHOT) return;
  fs.mkdirSync(SHOT, { recursive: true });
  await page.screenshot({ path: path.join(SHOT, `${name}.png`), fullPage: false });
}

/* ══════════════ 21.1 客户 360：商机编码点进详情 ══════════════ */
await goto('/customer/360/1', '.lx-p360__opplink');
{
  const links = await page.locator('.lx-p360__opplink').count();
  log('21.1a 商机编码是链接', links === 3, `商机表 ${links} 个可点编码（期望 3）`);

  const firstText = await page.locator('.lx-p360__opplink').first().textContent();
  log(
    '21.1b 编码显示全（无截断）',
    (firstText ?? '').trim().startsWith('DE'),
    `第一个编码="${(firstText ?? '').trim()}"`,
  );

  /* 点编码 → 等 URL 真的变了，而不是定时等 900ms。
     上一版用 `waitForTimeout(900)`，这次复跑偶发地仍停在 /customer/360/1
     （vite 首载该路由要 2s+，900ms 根本没到）。**等 URL 变化**才是判据：
     `waitForURL` 自带超时与明确失败信息，不会把"慢"误报成"没跳"。 */
  const link = page.locator('.lx-p360__opplink').first();
  const target = await link.evaluate((el) => el.getAttribute('data-opp-id') ?? '');
  await link.click();
  let landed = '';
  try {
    await page.waitForURL(/\/opportunity\/o\d/, { timeout: 15000 });
    landed = new URL(page.url()).pathname;
  } catch {
    landed = `（超时未跳转）${new URL(page.url()).pathname}`;
  }
  log(
    '21.1c 点编码真跳该行商机',
    landed === `/opportunity/${target}`,
    `落地 ${landed}，目标 /opportunity/${target}`,
  );

  /* 编码列不许被截（目视补的判据）：这一列是本轮新增的**导航入口**，
     打省略号意味着用户点之前无法确认自己点的是哪条商机。
     实测 `DE000001001` 需91px，编码列 10% @1280 只给87px → 差 4px 就截。
     这里必须读**渲染盒**而不是 textContent —— textContent 永远完整，
     所以既有 21.1b「编码显示全」在截断状态下照样 PASS。 */
  const clip = await page.evaluate(() => {
    const cell = document.querySelector('.lx-p360__opplink');
    if (!cell) return { ok: false, detail: '编码链接不存在' };
    const cs = getComputedStyle(cell);
    return {
      ok: cell.scrollWidth <= cell.clientWidth + 1,
      detail: `scrollW=${cell.scrollWidth} clientW=${cell.clientWidth}（textOverflow=${cs.textOverflow}）文本="${cell.textContent?.trim()}"`,
    };
  });
  log('21.1d 编码列完整不截断', clip.ok, clip.detail);
  await shot('21-1b-opp-from-360');
}

/* ══════════════ 21.2 编辑客户：多联系人 + 设主 ══════════════ */
await goto('/customer/360/1', '.lx-p360__contactrow');
{
  /* 展示位：客户 1 有 3 位联系人（EXTRA_CONTACTS 登记了 3 行），
     主联系人恒为 1 位且排最前。 */
  const shown = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.lx-p360__contactrow')];
    return {
      count: rows.length,
      primaryCount: rows.filter((r) => r.classList.contains('is-primary')).length,
      firstIsPrimary: rows[0]?.classList.contains('is-primary') ?? false,
      firstName: rows[0]?.querySelector('.lx-p360__contactname')?.textContent?.trim() ?? '',
      countLabel: document.querySelector('.lx-p360__block .lx-muted')?.textContent?.trim() ?? '',
      hasPhone: rows.filter((r) => r.querySelector('.lx-p360__channel')).length,
    };
  });
  log(
    '21.2a 联系人清单已展示',
    shown.count === 3,
    `联系人 ${shown.count} 位（期望 3），其中 ${shown.hasPhone} 位带联系方式`,
  );
  log(
    '21.2b 主联系人唯一且排最前',
    shown.primaryCount === 1 && shown.firstIsPrimary,
    `主联系人 ${shown.primaryCount} 位，首行是主=${shown.firstIsPrimary}，首位="${shown.firstName}"`,
  );
  log(
    '21.2c 头部显示联系人数',
    shown.countLabel.includes('3'),
    `计数文案="${shown.countLabel}"`,
  );

  /* 版式判据（第二十一轮目视补的，探针原先完全没抓）：
     英文态截图里三个联系人行**互相叠字**（Katrin Hoffmann 压着下一行邮箱）。
     元素在、宽高对、位置"看起来对"，所以所有既有判据都判它正常——
     根因是 `.lx-p360__contactrow` 曾是 `minmax(0,1fr) minmax(0,auto)` 两列，
     `auto` 列被 32 字符邮箱撑到 206px，而容器只有 299px，
     `1fr` 那侧被压到 44.8px → 姓名折 2 行、职务折 3 行，行高涨到 124px 溢出。

     判据用**相邻行的矩形不许相交**，而不是"某元素宽度够"——
     前者对任意内容长度都成立，后者换个邮箱就又假绿了。 */
  const overlap = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.lx-p360__contactrow')];
    const bad = [];
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i].getBoundingClientRect();
      for (let j = i + 1; j < rows.length; j += 1) {
        const s = rows[j].getBoundingClientRect();
        const overlapPx = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
        if (overlapPx > 1) bad.push(`${i}-${j} 重叠 ${overlapPx.toFixed(1)}px`);
      }
      /* 行内自身的滚动溢出（子元素比行高还高= 内容撑破容器）。 */
      const over = [...rows[i].querySelectorAll('*')].filter((el) => {
        const er = el.getBoundingClientRect();
        return er.bottom > r.bottom + 1 || er.right > r.right + 1;
      });
      if (over.length > 0) bad.push(`行${i} 有 ${over.length} 个子元素越界`);
    }
    return bad;
  });
  log('21.2h 联系人行不叠字不越界', overlap.length === 0, overlap.length === 0 ? '3 行互不相交、无子元素越界' : overlap.join('；'));

  /* 单列纵向堆叠的判据：姓名与职务**不同行**（top 不同）。
     曾是三者挤在同一 wrap 行，读作「Monika Weber [主] Procurement director」
     要再解析一次才分得清姓名与职务。 */
  const stacking = await page.evaluate(() => {
    const row = document.querySelector('.lx-p360__contactrow');
    const name = row?.querySelector('.lx-p360__contactname');
    const role = row?.querySelector('.lx-p360__contactrole');
    if (!row || !name || !role) return { ok: false, detail: '元素缺失' };
    const nr = name.getBoundingClientRect();
    const rr = role.getBoundingClientRect();
    return {
      ok: rr.top >= nr.bottom - 1,
      detail: `姓名 bottom=${nr.bottom.toFixed(0)}，职务 top=${rr.top.toFixed(0)}`,
    };
  });
  log('21.2i 姓名与职务不同行', stacking.ok, stacking.detail);
  await shot('21-1a-customer-contacts');

  /* 编辑抽屉：新增一位 → 设为主 → 保存 → 展示位跟着变 */
  await page.locator('.lx-p360__act').click();
  await page.waitForTimeout(700);
  const editorRows = await page.locator('.lx-cedit__row').count();
  log('21.2d 抽屉内有联系人编辑器', editorRows === 3, `抽屉里 ${editorRows} 行（期望 3）`);

  await page.locator('.lx-cedit__setprimary').first().click();
  await page.waitForTimeout(300);
  const afterSet = await page.evaluate(() => ({
    primaryBadge: document.querySelectorAll('.lx-cedit__primary').length,
    primaryRows: document.querySelectorAll('.lx-cedit__row.is-primary').length,
    setButtons: document.querySelectorAll('.lx-cedit__setprimary').length,
  }));
  log(
    '21.2e 设主后仍唯一',
    afterSet.primaryBadge === 1 && afterSet.primaryRows === 1 && afterSet.setButtons === 2,
    `主徽标 ${afterSet.primaryBadge} 个 / 主行 ${afterSet.primaryRows} 行 / 可设主按钮 ${afterSet.setButtons} 个（期望 1/1/2）`,
  );
  await shot('21-2-contacts-editor');

  /* 主联系人回写：改完之后 360 页头部字段表的"客户负责人"… 不，是
     客户列表与本页联系人区都要指向同一人。这里判页面内一致性：
     设主后保存，展示区的"主"标记应换到被设的那一行。 */
  await page.locator('.ant-drawer .lx-form__submit').click();
  await page.waitForTimeout(800);
  const afterSave = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.lx-p360__contactrow')];
    return {
      count: rows.length,
      firstName: rows[0]?.querySelector('.lx-p360__contactname')?.textContent?.trim() ?? '',
      primaryCount: rows.filter((r) => r.classList.contains('is-primary')).length,
    };
  });
  log(
    '21.2f 保存后主联系人换人',
    afterSave.primaryCount === 1 && afterSave.firstName !== shown.firstName,
    `保存后首位="${afterSave.firstName}"（原="${shown.firstName}"），主联系人 ${afterSave.primaryCount} 位`,
  );

  /* 取消要能丢弃改动：再开抽屉 → 新增一行 → 取消 → 行数回到 3 */
  await page.locator('.lx-p360__act').click();
  await page.waitForTimeout(700);
  await page.locator('.lx-section__action', { hasText: tr('cus.p360.contact.add') }).click();
  await page.waitForTimeout(300);
  const grown = await page.locator('.lx-cedit__row').count();
  await page.locator('.ant-drawer .lx-form__cancel').click();
  await page.waitForTimeout(600);
  await page.locator('.lx-p360__act').click();
  await page.waitForTimeout(700);
  const reverted = await page.locator('.lx-cedit__row').count();
  log(
    '21.2g 取消丢弃未保存的联系人',
    grown === 4 && reverted === 3,
    `新增后 ${grown} 行，取消再开回到 ${reverted} 行（期望 4 → 3）`,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

/* ══════════════ 21.3 生命周期轨道按阶段点亮 ══════════════ */
await goto('/opportunity/o1-1', '.lx-oppd__track > *');
{
  /* 选择器必须用 `.lx-oppd__track > *`，**不能**用 `.lx-oppd__step` ——
     这是本轮踩的一个真陷阱：`lx-oppd__step--done` 与 `lx-oppd__step` 是两个
     不同的 class token，`querySelectorAll('.lx-oppd__step')` **不匹配前者**。
     修 BEM 之前拼出的是 `lx-oppd__step done`（空格分隔的两个 token），
     8 个节点全部匹配；修完之后只有 4 个无修饰符的匹配 ——
     于是探针从"8 个点全灰"变成"4 个点全灰"，看着像**没修好**，
     实际是修饰符终于生效了。判据必须跟着实现一起改，
     否则"修对了"会被报成"没修好"，而这种假失败最容易把人带回错误的修法上。

     判据本体：逐点读背景色。当前段（商务谈判 = index 3）之前的三段应点亮，
     之后的不点亮。**不能只看 class 名** —— class 对了不代表 CSS 命中了。 */
  const dots = await page.evaluate(() =>
    [...document.querySelectorAll('.lx-oppd__track > *')].map((step, index) => ({
      index,
      /* 用 `classList.contains` 而不是 `className.replace(...)`：
         class 现在同时含基础类与修饰符两个 token（`lx-oppd__step lx-oppd__step--done`），
         字符串 replace 只替换第一处，第二个 token 原样留着，判据就废了。
         contains 判的是"这个修饰符在不在"，与拼法无关。 */
      done: step.classList.contains('lx-oppd__step--done'),
      active: step.classList.contains('lx-oppd__step--active'),
      lost: step.classList.contains('lx-oppd__step--lost'),
      dot: getComputedStyle(step.querySelector('.lx-oppd__dot')).backgroundColor,
      size: getComputedStyle(step.querySelector('.lx-oppd__dot')).width,
    })),
  );
  log('21.3-0 轨道 8 个节点', dots.length === 8, `实际 ${dots.length} 个（期望 8）`);

  const distinct = [...new Set(dots.map((d) => d.dot))];
  log(
    '21.3a 轨道点位有多种颜色',
    distinct.length >= 2,
    `${dots.length} 个点，背景色 ${distinct.length} 种：${distinct.join(' / ')}`,
  );

  const before = dots.filter((d) => d.index < 3);
  const active = dots[3];
  const after = dots.filter((d) => d.index > 3);
  /* 注意 b/c 两条都**不能**只看"彼此相等/不等"：当 8 个点全灰时，
     `before.every(d => d.dot === active.dot)` 与
     `after.every(d => d.dot !== active.dot)` 都会 vacuously 为真 ——
     这是本轮第一版探针的 bug（全灰时 b/c 照样 PASS，只有 a 报红）。
     所以 b/c 都追加一条"不能是同一个灰"的硬条件：
     判据必须能区分"真的按阶段点亮"与"压根没点亮"，而不是前者失败后者也失败。 */
  const FROST = 'rgb(243, 247, 251)';
  const isLit = (color) => color !== FROST;
  log(
    '21.3b 当前段之前已点亮',
    before.length === 3 && before.every((d) => isLit(d.dot)) && before.every((d) => d.dot === active.dot),
    `前 3 段颜色=${[...new Set(before.map((d) => d.dot))].join('/')}，当前段=${active.dot}`,
  );
  log(
    '21.3c 当前段之后未点亮',
    after.length === 4 && after.every((d) => d.dot === FROST) && isLit(active.dot),
    `后 4 段颜色=${[...new Set(after.map((d) => d.dot))].join('/')}，当前段=${active.dot}（已点亮=${isLit(active.dot)}）`,
  );
  log(
    '21.3d 当前段尺寸更大',
    Number.parseFloat(active.size) > Number.parseFloat(dots[4].size),
    `当前段 dot=${active.size} vs 后一段=${dots[4].size}`,
  );
  log(
    '21.3e 修饰符是 BEM 写法',
    dots.filter((d) => d.done).length === 3 &&
      dots.filter((d) => d.active).length === 1 &&
      dots.filter((d) => !d.done && !d.active && !d.lost).length === 4,
    `done=${dots.filter((d) => d.done).length}（期望 3），active=${dots.filter((d) => d.active).length}（期望 1），未点亮=${dots.filter((d) => !d.done && !d.active && !d.lost).length}（期望 4）`,
  );

  /* 基础类必须与修饰符**并存**（第二十一轮目视补的判据）。
     此前 class 是 `lx-oppd__step--done`（基础类名被修饰符顶掉），
     `.lx-oppd__step` 的 `display:flex / flex-direction:column` 全部落空 →
     dot / 序号 / 阶段名横向挤成一行且叠字。
     浏览器实测该元素**只匹配到 `* { box-sizing }`**，一条 step 规则都没命中。

     判据读「实际 className 里有没有基础类」而不是「有没有 done」——
     后者在两种坏情况下都成立，是vacuous truth。 */
  const baseCls = await page.evaluate(() =>
    [...document.querySelectorAll('.lx-oppd__track > *')].map((el) => ({
      hasBase: el.classList.contains('lx-oppd__step'),
      dir: getComputedStyle(el).flexDirection,
      w: +el.getBoundingClientRect().width.toFixed(0),
    })),
  );
  log(
    '21.3f 基础类未被修饰符顶掉',
    baseCls.every((s) => s.hasBase),
    `8 个节点中带基础类 ${baseCls.filter((s) => s.hasBase).length} 个`,
  );

  /* 版式判据：step 必须是 column 纵向排，且 dot 是正圆（宽高相等）。
     坏掉时 dir=row、dot 24px 高 × 4px 宽 —— 元素"在"、颜色"对"、
     尺寸"有值"，所以 21.3a~e 全绿也照样叠字。 */
  const layout = await page.evaluate(() => {
    const step = document.querySelector('.lx-oppd__track > *');
    if (!step) return { ok: false, detail: '节点不存在' };
    const dot = step.querySelector('.lx-oppd__dot');
    const kids = [...step.children];
    const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
    const dots = kids.map((k) => k.getBoundingClientRect());
    const overlap = dots.some((b, i) =>
      dots.some((s, j) => i < j && Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top) > 1),
    );
    const db = dot?.getBoundingClientRect();
    return {
      ok: getComputedStyle(step).flexDirection === 'column' && !!db && Math.abs(db.width - db.height) <= 1 && !overlap,
      detail: `flexDirection=${getComputedStyle(step).flexDirection}，dot=${db ? `${db.width.toFixed(0)}×${db.height.toFixed(0)}` : '缺失'}，子元素 top=${tops.join('/')}，重叠=${overlap}`,
    };
  });
  log('21.3g 轨道纵向排且圆点不变形', layout.ok, layout.detail);
  await shot('21-3-stage-track');
}

/* ══════════════ 21.4 商机详情：页头动作组 + 编辑抽屉展示客户 ══════════════ */
await goto('/opportunity/o1-1', '.lx-oppd__acts');
{
  const acts = await page.evaluate(() => {
    const box = document.querySelector('.lx-oppd__acts');
    if (!box) return { n: 0, texts: [] };
    const btns = [...box.querySelectorAll('button')];
    return {
      n: btns.length,
      texts: btns.map((b) => b.textContent?.trim() ?? ''),
      tops: btns.map((b) => Math.round(b.getBoundingClientRect().top)),
      // 正文里不该再有第二个「跟进」/「关闭」入口
      strayFollow: [...document.querySelectorAll('.lx-oppd__body button')].filter((b) =>
        /跟进|Follow up/i.test(b.textContent ?? ''),
      ).length,
      strayClose: [...document.querySelectorAll('.lx-oppd__body button')].filter((b) =>
        /关闭|^Close$/i.test(b.textContent?.trim() ?? ''),
      ).length,
    };
  });
  log(
    '21.4a 页头三个动作同组',
    acts.n === 3,
    `页头动作组 ${acts.n} 个：${acts.texts.join(' / ')}`,
  );
  log(
    '21.4b 三个动作同一行',
    new Set(acts.tops).size === 1,
    `top 取值 ${[...new Set(acts.tops)].join('/')}（相等即同一行）`,
  );
  log(
    '21.4c 正文无重复入口',
    acts.strayFollow === 0 && acts.strayClose === 0,
    `正文里残留 跟进=${acts.strayFollow} 关闭=${acts.strayClose}（期望 0/0）`,
  );
  await shot('21-4-opp-actions');

  /* 编辑抽屉要展示客户信息（只读） */
  await page.locator('.lx-oppd__editbtn').click();
  await page.waitForTimeout(700);
  const ro = await page.evaluate(() => {
    const el = document.querySelector('.lx-form__readonly');
    const label = el?.closest('.lx-field')?.querySelector('.lx-field__label')?.textContent?.trim() ?? '';
    const field = el?.closest('.lx-field')?.querySelector('input, select, textarea');
    return {
      exists: el !== null,
      text: el?.textContent?.trim() ?? '',
      label,
      isControl: field !== null,
      isRequired: el?.closest('.lx-field')?.querySelector('.lx-field__required') !== null,
    };
  });
  log(
    '21.4d 编辑抽屉展示客户（只读）',
    ro.exists && ro.text !== '' && !ro.isControl,
    `只读格="${ro.text}" 标签="${ro.label}" 是控件=${ro.isControl}（期望 false）`,
  );
  log(
    '21.4e 客户字段不参与必填',
    !ro.isRequired,
    `带红星=${ro.isRequired}（期望 false，否则空值会拦提交）`,
  );

  const fieldCount = await page.locator('.ant-drawer .lx-field').count();
  log(
    '21.4f 抽屉字段数（10 = 9 + 客户只读）',
    fieldCount === 10,
    `抽屉里 ${fieldCount} 个字段（期望 10）`,
  );
  await shot('21-4b-opp-edit-readonly');
}

/* ══════════════ 21.5 已签约 / 流失商机：只留「编辑」 ══════════════ */
await goto('/opportunity/o1-3', '.lx-oppd__acts');
{
  /* o1-3 = 客户 1 的第 3 条商机，阶段「已验收」（STAGE_KIND = 'won'）。
     它测的是**口径统一**：此前详情页判 `STAGE_KIND !== 'lost'` 就算"还开着"，
     于是这条商机在列表里是破折号（无事可做）、进详情页却还能跟进、还能关闭。
     同一份数据两个页面两个说法。本轮统一成 `=== 'open'`，与列表页的
     `isOpenStage` 同一判据。 */
  const acts = await page.evaluate(() => {
    const box = document.querySelector('.lx-oppd__acts');
    const btns = box ? [...box.querySelectorAll('button')] : [];
    const intentSel = document.querySelector('.lx-oppd__edit');
    return {
      n: btns.length,
      texts: btns.map((b) => b.textContent?.trim() ?? ''),
      intentDisabled: intentSel instanceof HTMLSelectElement ? intentSel.disabled : null,
      overdue: document.querySelectorAll('.lx-oppd__fact--warn, .lx-oppd__alert--danger').length,
    };
  });
  log(
    '21.5a 已签约只留编辑',
    acts.n === 1,
    `页头 ${acts.n} 个动作：${acts.texts.join(' / ')}（期望 1）`,
  );
  log(
    '21.5b 意向等级已锁',
    acts.intentDisabled === true,
    `意向下拉 disabled=${acts.intentDisabled}（期望 true）`,
  );
  log(
    '21.5c 不再催逾期跟进',
    acts.overdue === 0,
    `逾期告警 ${acts.overdue} 处（期望 0）`,
  );
}

console.log('\n=== 页面错误 ===');
console.log(pageErrors.length === 0 ? '无' : pageErrors.join('\n'));
const failed = report.filter((r) => !r.ok);
console.log(`\n=== 汇总：${report.length - failed.length}/${report.length} 通过 ===`);
if (failed.length > 0) {
  console.log('失败：');
  for (const f of failed) console.log(`  ${f.id}  ${f.detail}`);
}
await browser.close();
process.exit(failed.length === 0 && pageErrors.length === 0 ? 0 : 1);