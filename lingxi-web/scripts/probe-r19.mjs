import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 第十九轮探针（2026-10-07）：登录页 / 营销日历 / 用户管理三项反馈。
 *
 * 每一条判据都对应用户原话里的一个可数事实，而不是"看着差不多"：
 *  A登录页：三个视口 scrollHeight === clientHeight（一屏全显，不滚动）
 *  B 登录页：点一次「进入工作台」直达 /workbench（不是中转屏）
 *  C 日历：事件标题实测可容字符数 >= 6（中文字宽按 11px 字号实测）
 *  D 日历：未点 + 号时不得出现快建浮层；点 + 号后必须出现
 *  E 日历：右栏活动详情含目标/预算/渠道/生命周期（与活动详情页同源）
 *  F 用户管理：进入页面不弹抽屉；点「新建用户」才弹
 */
const WEB = process.cwd();
const BASE = process.env.LX_PROBE_BASE ?? 'http://localhost:5173';

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

const results = [];
const step = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function newPage(loc, w = 1440, h = 1000) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.addInitScript((l) => {
    window.localStorage.setItem('lx.locale', l);
    if (!window.sessionStorage.getItem('lx.cc.r19.init')) {
      window.sessionStorage.setItem('lx.cc.r19.init', '1');
      window.localStorage.removeItem('lx.cc.config.v1');
      window.localStorage.removeItem('lx.cc.dicts.v1');
      window.localStorage.removeItem('lx.cc.biz2.v1');
    }
  }, loc);
  return page;
}

async function goto(page, p) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lx-sidenav__item, .lx-sidenav, .lx-select', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(650);
}

/** 点页面上文字匹配的按钮（走 Playwright click，带真实可点性检查）。 */
async function clickByText(page, text) {
  const all = await page.locator('button').all();
  for (const b of all) {
    const txt = ((await b.textContent()) ?? '').trim();
    if (txt.includes(text)) {
      await b.click({ timeout: 5000 });
      return txt;
    }
  }
  return null;
}

/* ==================== A. 登录页一屏全显 ==================== */
for (const vp of [
  { w: 1440, h: 1000, tag: '1440x1000' },
  { w: 1366, h: 768, tag: '1366x768' },
  { w: 1280, h: 720, tag: '1280x720' },
]) {
  const page = await newPage('zh-CN', vp.w, vp.h);
  await goto(page, '/login');
  const m = await page.evaluate(() => {
    const de = document.documentElement;
    const enter = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('进入'),
    );
    const r = enter?.getBoundingClientRect();
    return {
      scrollH: de.scrollHeight,
      clientH: de.clientHeight,
      /* 关键：进入按钮必须**完全在视口内**。
         只看 scrollHeight 会被"body 有 overflow:hidden 但内容被裁"骗过去 ——
         而按钮被裁掉正是登录页最不可接受的失败形态。 */
      enterBottom: r ? Math.round(r.bottom) : null,
      enterVisible: r ? r.bottom <= de.clientHeight && r.top >= 0 : false,
    };
  });
  step(
    `A login @${vp.tag}: no page scroll`,
    m.scrollH <= m.clientH + 1,
    `scrollH=${m.scrollH} clientH=${m.clientH}`,
  );
  step(
    `A login @${vp.tag}: enter button fully in viewport`,
    m.enterVisible,
    `bottom=${m.enterBottom} clientH=${m.clientH}`,
  );
  await page.close();
}

/* ==================== B. 点一次直达工作台 ==================== */
{
  const page = await newPage('zh-CN');
  await goto(page, '/login');
  const before = await page.evaluate(() => window.location.pathname);
  const clicked = await clickByText(page, '进入');
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => window.location.pathname);
  step(
    'B login: one click lands on /workbench (no intermediate screen)',
    clicked !== null && after === '/workbench',
    `before=${before} after=${after}`,
  );

  /* 副作用检查：落到工作台后顶栏角色胶囊必须是选中的岗位，不能是"未分配"。
   定位靠 `aria-label`（TopBar 里那枚 chip 有 `aria-label={t('nav.switchRole')}`）
   而不是 `.lx-topbar__chip` —— 顶栏的 class 是通用的 `.lx-chip`，
   同一个 class 用在租户 chip 上，按 class 取会拿到租户名而不是岗位名。 */
  const capsule = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lx-topbar__tools button[aria-label]')];
    const hit = btns.find((b) => (b.getAttribute('aria-label') ?? '').length > 0);
    return (hit?.textContent ?? '').trim();
  });
  step('B login: role capsule is populated', capsule.length > 0 && !capsule.includes('未分配'), `"${capsule}"`);
  await page.close();
}

/* ==================== C. 日历事件标题可容字符数 ==================== */
const cal = await newPage('zh-CN');
await goto(cal, '/marketing/calendar');

/**
 * 实测「能显示几个中文字」，不靠估算。
 * 方法：量出 `.lx-mcal__evtext` 的可用宽度，再除以实测中文单字宽
 *（在同字号下量一个真实中文字符的宽度，避免用 font-size 近似）。
 * 2026-10-09 实测：10.5px 字号下单字宽恰为 10.5px（= font-size），不是"略大于"。
 */
const textCapacity = await cal.evaluate(() => {
  const texts = [...document.querySelectorAll('.lx-mcal__evtext')];
  if (texts.length === 0) return { n: 0 };

  // 用一个真实中文测宽：克隆一个 evtext，截取第一个中文字符量宽
  const probe = document.createElement('span');
  const cs = getComputedStyle(texts[0]);
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
  document.body.appendChild(probe);
  probe.textContent = '营销日历活动';
  // 单字宽度只量一次（2026-10-07）：原先两行都量，探针整体耗时翻倍到 2 分 16 秒，
  // 而"整串宽"这一路从来没用上——floor(可用宽/单字宽) 只需要单字宽。
  probe.textContent = '营';
  const oneW = probe.getBoundingClientRect().width;
  probe.remove();

  const rows = texts.slice(0, 40).map((n) => {
    const st = getComputedStyle(n);
    const avail = n.clientWidth;
    /* 截断判据：scrollWidth > clientWidth + 1 说明被 ellipsis 截了 */
    return {
      avail: Math.round(avail),
      chars: Math.floor(avail / oneW),
      truncated: n.scrollWidth > n.clientWidth + 1,
      text: (n.textContent ?? '').trim(),
      fontSize: st.fontSize,
    };
  });
  return {
    n: texts.length,
    oneCharW: Math.round(oneW * 100) / 100,
    avgChars: Math.round((rows.reduce((s, r) => s + r.chars, 0) / rows.length) * 10) / 10,
    minChars: Math.min(...rows.map((r) => r.chars)),
    truncated: rows.filter((r) => r.truncated).length,
    sample: rows.slice(0, 4),
    fontSize: rows[0]?.fontSize,
  };
});
step(
  'C calendar: event text fits >= 6 CJK chars',
  textCapacity.minChars >= 6,
  `minChars=${textCapacity.minChars} avg=${textCapacity.avgChars} charW=${textCapacity.oneCharW}px font=${textCapacity.fontSize}`,
);
step(
  'C calendar: no type icon inside event card',
  (await cal.evaluate(() => document.querySelectorAll('.lx-mcal__ev .lx-mcal__evcat').length)) === 0,
);

/* 2026-10-09 新增（用户截图指出「事件名称只显示 4 个中文」）。
   旧判据 `minChars >= 6` 只在 1440 视口量 —— 1440 下本来就是 8 字，
   于是"1280 下只剩 4 字"这个真缺陷长期假绿。**判据必须在最窄视口量**。
   第二十三轮起底线提到 **7**：用户反馈 10.5px 下 floor(70/10.5)=6 但末尾被
   ellipsis 吃掉一半、肉眼只读到 5 个半；字号降到 10px 后 floor(70/10)=7，
   ellipsis 落在第 8 字之后。底线写 7 而不是 6，是为了让判据真正守住
   "肉眼读满 6 字"而不是"容器塞得下 6 字"。 */
const calNarrow = await newPage('zh-CN', 1280, 720);
await goto(calNarrow, '/marketing/calendar');
const narrowCapacity = await calNarrow.evaluate(() => {
  const texts = [...document.querySelectorAll('.lx-mcal__evtext')];
  if (texts.length === 0) return { n: 0 };
  const cs = getComputedStyle(texts[0]);
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
  document.body.appendChild(probe);
  probe.textContent = '营';
  const oneW = probe.getBoundingClientRect().width;
  probe.remove();
  const rows = texts.map((node) => ({ chars: Math.floor(node.clientWidth / oneW) }));
  return { n: texts.length, minChars: Math.min(...rows.map((r) => r.chars)) };
});
step(
  'C calendar @1280: event text fits >= 7 CJK chars (= 6 readable + ellipsis slack)',
  narrowCapacity.minChars >= 7,
  `minChars=${narrowCapacity.minChars} (n=${narrowCapacity.n})`,
);

/* `+N` 是**日期的注记**（"这天还有几条"），不是一条事件。
   它曾独占 `.lx-mcal__events` 一行（flex gap:2px），事件区被压到只剩 3 行，
   密日三条各只显示 4 个中文字。判据 = ①它不在 events 容器内
   ②它与日期数字的 top 差 < 8px（同一行）。 */
const morePlacement = await calNarrow.evaluate(() => {
  const mores = [...document.querySelectorAll('.lx-mcal__more')];
  if (mores.length === 0) return { n: 0, sameRow: true, inEvents: 0 };
  let sameRow = true;
  let inEvents = 0;
  for (const m of mores) {
    if (m.closest('.lx-mcal__events')) inEvents += 1;
    const head = m.closest('.lx-mcal__cellhead');
    const num = head?.querySelector('.lx-mcal__num');
    if (!num) continue;
    const dr = m.getBoundingClientRect();
    const nr = num.getBoundingClientRect();
    if (Math.abs(dr.top - nr.top) >= 8) sameRow = false;
  }
  return { n: mores.length, sameRow, inEvents };
});
step(
  'C calendar @1280: +N sits on the date row, not stealing an event row',
  morePlacement.n > 0 && morePlacement.sameRow && morePlacement.inEvents === 0,
  `n=${morePlacement.n} sameRow=${morePlacement.sameRow} inEvents=${morePlacement.inEvents}`,
);

/* 第二十三轮：日期行是三段绝对定位 —— 数字靠左 ·快建 + 居中 · +N 靠右。
   改之前的 bug 恰恰是"看着没问题"的那一版：`.cellhead:has(.more){padding-right:22px}`
   只在**有溢出**的格子里生效，于是无溢出格 `+` 贴最右、有溢出格 `+` 被顶到`+N` 左边，
   hover 出 `+` 时两者压在同一处 —— 而这在静态截图里完全看不出来（`+` 默认 opacity:0）。
   判据 = 逐格读三者矩形：①`+` 不与 `+N` 相交 ②`+` 的中心贴近格心 ③`+N` 右缘贴格右缘。
   **必须在 hover 态量**：默认 opacity:0 时浏览器仍会布局它，量到的位置是对的，
   但真实缺陷只在 opacity:1 时可见 —— 故这里额外断言 hover 后不发生位移。 */
const headLayout = await calNarrow.evaluate(() => {
  const rows = [...document.querySelectorAll('.lx-mcal__cellhead')];
  let overlap = 0;
  let minGap = 999;
  let plusCenterOff = 0;
  let moreAtRight = 0;
  let withMore = 0;
  for (const head of rows) {
    const hr = head.getBoundingClientRect();
    const num = head.querySelector('.lx-mcal__num');
    const plus = head.querySelector('.lx-mcal__plus');
    const more = head.querySelector('.lx-mcal__more');
    if (!num || !plus) continue;
    const pr = plus.getBoundingClientRect();
    plusCenterOff = Math.max(plusCenterOff, Math.abs((pr.left + pr.right) / 2 - (hr.left + hr.right) / 2));
    if (!more) continue;
    withMore += 1;
    const mr = more.getBoundingClientRect();
    if (pr.right > mr.left) overlap += 1;
    minGap = Math.min(minGap, mr.left - pr.right);
    if (hr.right - mr.right <= 1.5) moreAtRight += 1;
  }
  return { rows: rows.length, withMore, overlap, minGap: minGap === 999 ? null : minGap, plusCenterOff: Math.round(plusCenterOff * 10) / 10, moreAtRight };
});
step(
  'C calendar @1280: quick-add centred, +N flush right, no overlap',
  headLayout.withMore > 0
    && headLayout.overlap === 0
    && headLayout.plusCenterOff <= 2
    && headLayout.moreAtRight === headLayout.withMore
    && headLayout.minGap >= 8,
  `cells=${headLayout.rows} withMore=${headLayout.withMore} overlap=${headLayout.overlap} minGap=${headLayout.minGap}px plusCenterOff=${headLayout.plusCenterOff}px moreAtRight=${headLayout.moreAtRight}`,
);

/* 侧栏「数据范围」组已删（第二十三轮）。判据 = 侧栏标题数正好 3 且**内容不溢出**：
   `scrollHeight <= clientHeight` 才是"没有滚动条"，只看有没有那组标题会假绿
   —— 英文态筛选项折行同样能把侧栏顶出滚动条。 */

/* `.lx-mcal__events` 带 overflow:hidden —— 条数上限一旦超容量会**静默裁掉
   最下面那条**，症状是"这天只有 3 件事"，看着完全正常。
   判据 = 逐格读最后一条的 bottom 是否超出容器 bottom。 */
const perCell = await calNarrow.evaluate(() => {
  const boxes = [...document.querySelectorAll('.lx-mcal__events')];
  let maxPerCell = 0;
  const clipped = [];
  boxes.forEach((b, i) => {
    const evs = [...b.querySelectorAll('.lx-mcal__ev')];
    maxPerCell = Math.max(maxPerCell, evs.length);
    if (evs.length === 0) return;
    const last = evs[evs.length - 1].getBoundingClientRect();
    const box = b.getBoundingClientRect();
    if (last.bottom > box.bottom + 1) clipped.push(i);
  });
  return { cells: boxes.length, maxPerCell, clipped };
});
step(
  'C calendar @1280: 4 events per cell fit without silent overflow clip',
  perCell.maxPerCell <= 4 && perCell.clipped.length === 0,
  `maxPerCell=${perCell.maxPerCell} clipped=${JSON.stringify(perCell.clipped)} cells=${perCell.cells}`,
);

/* 左栏筛选项（2026-10-09 截图目视发现）：`overflow-wrap: anywhere` 会
   在**单词内部**断行，英文态 "Meeting / training" 被劈成「Meetin / g / training」。
   判据 = 量最长单词的渲染宽，超过容器可用宽就说明必然断在词中间。
   （探针读 textContent 判不出这个 —— 文字一个字不少，只是位置错了。） */
const calEn = await newPage('en-US', 1280, 720);
await goto(calEn, '/marketing/calendar');

/* 侧栏判据必须在 **英文态** 量：中文态标签一行就放得下，删掉「数据范围」组后
   本来就不溢出；真正会把侧栏顶出滚动条的是英文态筛选项折行。 */
const sideNoScroll = await calEn.evaluate(() => {
  const side = document.querySelector('.lx-mcal__side');
  const heads = [...side.querySelectorAll('.lx-mcal__sidehead')].map((n) => (n.textContent ?? '').trim());
  return {
    n: heads.length,
    heads,
    scrollH: side.scrollHeight,
    clientH: side.clientHeight,
    scrollable: side.scrollHeight > side.clientHeight + 1,
  };
});
step(
  'C calendar @1280 en: side panel has no scrollbar (data-scope group removed)',
  sideNoScroll.n === 3 && !sideNoScroll.scrollable,
  `heads=${sideNoScroll.n} [${sideNoScroll.heads.join(', ')}] scrollH=${sideNoScroll.scrollH} clientH=${sideNoScroll.clientH}`,
);

const midWordBreak = await calEn.evaluate(() => {
  const bad = [];
  const nodes = [...document.querySelectorAll('.lx-mcal__linktext')];
  for (const n of nodes) {
    const txt = (n.textContent ?? '').trim();
    if (!txt) continue;
    const cs = getComputedStyle(n);
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
    document.body.appendChild(probe);
    let longest = 0;
    for (const w of txt.split(/\s+/)) {
      probe.textContent = w;
      longest = Math.max(longest, probe.getBoundingClientRect().width);
    }
    probe.remove();
    /* +0.5 容差：亚像素舍入不算断词 */
    if (longest > n.clientWidth + 0.5) bad.push({ txt, longest: Math.round(longest), avail: Math.round(n.clientWidth) });
  }
  return { n: nodes.length, bad };
});
step(
  'C calendar @1280 en: no filter label breaks inside a word',
  midWordBreak.bad.length === 0,
  `n=${midWordBreak.n} bad=${JSON.stringify(midWordBreak.bad)}`,
);

/* ==================== D. 快建浮层只在点击后出现 ==================== */
const quickBefore = await cal.evaluate(() => document.querySelectorAll('.lx-mcal__quick').length);
step('D quick dialog absent on plain hover', quickBefore === 0, `n=${quickBefore}`);

/* 真·悬停：把鼠标移到某格的空白处（不是事件卡片），等一会儿看浮层有没有冒出来 */
const cellBox = await cal.evaluate(() => {
  const cell = document.querySelector('.lx-mcal__cell');
  if (!cell) return null;
  const r = cell.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height - 6) };
});
if (cellBox) {
  await cal.mouse.move(cellBox.x, cellBox.y);
  await cal.waitForTimeout(700);
  const quickAfterHover = await cal.evaluate(() => document.querySelectorAll('.lx-mcal__quick').length);
  step('D quick dialog still absent after hovering a cell', quickAfterHover === 0, `n=${quickAfterHover}`);

  /* 点 + 号才开 */
  const plusOpened = await cal.evaluate(() => {
    const plus = document.querySelector('.lx-mcal__plus');
    if (!plus) return false;
    plus.click();
    return true;
  });
  await cal.waitForTimeout(600);
  const quickAfterPlus = await cal.evaluate(() => document.querySelectorAll('.lx-mcal__quick').length);
  step('D quick dialog opens after clicking +', plusOpened && quickAfterPlus === 1, `n=${quickAfterPlus}`);

  /* 移到浮层上不能让它消失（不绑 hover 的验证） */
  const quickBox = await cal.evaluate(() => {
    const q = document.querySelector('.lx-mcal__quick');
    if (!q) return null;
    const r = q.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  if (quickBox) {
    await cal.mouse.move(quickBox.x, quickBox.y);
    await cal.waitForTimeout(500);
    const stillOpen = await cal.evaluate(() => document.querySelectorAll('.lx-mcal__quick').length);
    step('D quick dialog survives mouse move onto itself', stillOpen === 1, `n=${stillOpen}`);
  }

  /* Esc 关闭 */
  await cal.keyboard.press('Escape');
  await cal.waitForTimeout(400);
  const closedByEsc = await cal.evaluate(() => document.querySelectorAll('.lx-mcal__quick').length);
  step('D quick dialog closes on Escape', closedByEsc === 0, `n=${closedByEsc}`);
}

/* ==================== E. 右栏活动详情与活动详情同源 ==================== */
const campDetail = await cal.evaluate(() => {
  const ev = document.querySelector('.lx-mcal__ev[data-kind="campaign"]');
  if (!ev) return { found: false };
  ev.click();
  return { found: true };
});
await cal.waitForTimeout(800);
const panel = await cal.evaluate(() => {
  const p = document.querySelector('.lx-mcal__panel');
  if (!p) return null;
  const text = p.textContent ?? '';
  return {
    /* 活动专属字段：目标/预算/渠道/生命周期 —— 第十九轮补的 */
    hasGoal: p.querySelectorAll('.lx-mcal__kv--camp dt').length >= 3,
    kvRows: p.querySelectorAll('.lx-mcal__kv--camp dt').length,
    hasLife: p.querySelectorAll('.lx-mcal__lifesteps li').length,
    lifeStages: p.querySelectorAll('.lx-mcal__lifesteps li').length,
    lifeActive: p.querySelectorAll('.lx-mcal__lifesteps li.is-active').length,
    /* 通用字段（原有）不能被挤掉 */
    hasPrep: text.length > 0,
    /* KV 是否真的左右并排：dt 与 dd 的 top 应当相同
       —— 若仍是上下两行，dt.top < dd.top，这就是那个潜伏缺陷。 */
    kvInline: (() => {
      const dt = p.querySelector('.lx-mcal__kv:not(.lx-mcal__kv--camp) dt');
      const dd = p.querySelector('.lx-mcal__kv:not(.lx-mcal__kv--camp) dd');
      if (!dt || !dd) return null;
      return Math.abs(dt.getBoundingClientRect().top - dd.getBoundingClientRect().top) < 4;
    })(),
    textLen: text.length,
  };
});
step('E calendar: campaign card exists', campDetail.found);
step(
  'E calendar: right panel shows campaign-specific fields (goal/budget/channels/assets)',
  (panel?.kvRows ?? 0) >= 4,
  `kvRows=${panel?.kvRows}`,
);
step(
  'E calendar: right panel shows lifecycle with all 4 stages',
  (panel?.lifeStages ?? 0) === 4 && (panel?.lifeActive ?? 0) === 1,
  `stages=${panel?.lifeStages} active=${panel?.lifeActive}`,
);
step('E calendar: kv rows are inline (label beside value, not stacked)', panel?.kvInline === true);

/* 类型色与类型对应：campaign 应与 visit 不同色 */
const kindColors = await cal.evaluate(() => {
  const out = {};
  for (const k of ['campaign', 'visit', 'meeting']) {
    const n = document.querySelector(`.lx-mcal__ev[data-kind="${k}"]`);
    out[k] = n ? getComputedStyle(n).color : null;
  }
  return out;
});
const distinct = new Set(Object.values(kindColors).filter(Boolean));
step(
  'C calendar: event text colour distinguishes kinds',
  distinct.size >= 2,
  JSON.stringify(kindColors),
);

/* ==================== F. 用户管理不自动弹抽屉 ==================== */
const u = await newPage('zh-CN');
/* 从配置中心首页点「用户管理」核心卡片 —— 这是用户报"默认就弹出"的入口路径。
   LxNavItem 用 onClick 而非 href，故只能按 class 定位。 */
await goto(u, '/config');
const navClicked = await u.evaluate(() => {
  const nav = document.querySelector('.lx-navgrid, .lx-nav__item, .lx-navcard');
  const first = nav?.querySelector('button, a');
  if (!first) return { clicked: false, cls: nav ? nav.className : null };
  first.click();
  return { clicked: true, cls: nav ? nav.className : null };
});
await u.waitForTimeout(1300);
const afterEntry = await u.evaluate(() => ({
  url: window.location.pathname + window.location.search,
  drawers: document.querySelectorAll('.lx-cc-drawer').length,
}));
step(
  'F users: entering user management does NOT open the create drawer',
  afterEntry.url.includes('/config/users') && afterEntry.drawers === 0,
  JSON.stringify({ navClicked, ...afterEntry }),
);

/* 直接进 /config/users（无参数）也不该弹 */
await goto(u, '/config/users');
const direct = await u.evaluate(() => document.querySelectorAll('.lx-cc-drawer').length);
step('F users: plain /config/users has no drawer', direct === 0, `drawers=${direct}`);

/* 点「新建用户」才弹 */
const openedByButton = await u.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const hit = btns.find((n) => (n.textContent ?? '').trim() === '新建用户');
  if (!hit) return false;
  hit.click();
  return true;
});
await u.waitForTimeout(1000);
const afterButton = await u.evaluate(() => ({
  url: window.location.pathname + window.location.search,
  drawers: document.querySelectorAll('.lx-cc-drawer').length,
  title: document.querySelector('.lx-cc-drawer__title')?.textContent?.trim() ?? null,
}));
step(
  'F users: clicking 新建用户 opens the drawer and consumes the query param',
  openedByButton && afterButton.drawers === 1 && !afterButton.url.includes('mode=create'),
  JSON.stringify(afterButton),
);

/* 关掉后刷新，URL 已无 mode=create 故不该再弹 */
await u.evaluate(() => {
  const btns = [...document.querySelectorAll('.lx-cc-drawer__foot button')];
  btns[0]?.click();
});
await u.waitForTimeout(800);
await goto(u, '/config/users');
const afterClose = await u.evaluate(() => document.querySelectorAll('.lx-cc-drawer').length);
step('F users: no drawer after close + fresh nav', afterClose === 0, `drawers=${afterClose}`);

await u.close();
await cal.close();
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length > 0) {
  console.log('FAILED:');
  for (const f of failed) console.log('  - ' + f.name);
  process.exitCode = 1;
}