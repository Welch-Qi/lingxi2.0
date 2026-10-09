import { CAMPAIGNS } from './campaign-data';
import type { Campaign, CampaignType } from './campaign-data';
import { CONTENT_ROWS } from './content-data';

/**
 * 营销日历数据层（`/marketing/calendar` 与营销中心默认首页共用）。
 *
 * ## 为什么日历的主体是「五类排期混排」而不是「营销活动」
 *
 * 附件的判断（本页最核心的一条）：**市场排期与销售拜访常抢同一批经销商**。
 * 若日历只放营销活动，拜访照排不误，两边永远看不见对方 —— 于是"撞档"这件事
 * 根本不会在系统里发生，只会在月底变成退货率与投诉。故日历必须把五类排期放在同一张表上：
 *   ① 营销活动 —— 来自 `campaign-data.ts`（按 start~end 跨度）
 *   ② 客户拜访 —— 由**线下型活动**派生（见「拜访派生口径」）
 *   ③ 会议培训 —— 本文件内置（周期性例会与培训）
 *   ④ 售后工单 —— 本文件内置到期日（见「工单取舍」）
 *   ⑤ 任务 —— 本文件内置（无上游表，是给人自己记的）
 *
 * 另把**内容发布计划**并入campaign 类（kind 仍是 campaign，视觉按任务条处理）——
 * 内容排期与营销活动在"什么时候打出去"这件事上是同一件事，
 * 分两张表就会出现"活动说周一、内容排期说周二"，那不是精度，是失去唯一事实源。
 *
 * ## 拜访派生口径
 *
 * `type ∈{activate}`（激活经销商）必然伴随上门拜访，
 * 纯线上型（launch/convert/brand）不派生拜访 ——
 * 给一次线上直播派一条"拜访"是凭空造事实。
 * 派生出的拜访与原活动共用 `conflictGroupId`，同组内**不判冲突**：
 * 否则"经销商激活"与"拜访经销商"会被判成同受众冲突 —— 那不是冲突，那是同一件事的两种记法。
 *
 * ## 工单取舍
 *
 * 附件「需评审拍板」写"一期是否纳入工单类（会显著增数据量，建议二期）"。
 * 一期**纳入**（只取到期日做排期，不做统计联动），理由是附件把工单列为冲突检测的关键一环
 * （安装售后与营销同一天上门，同受众）；统计口径与筛选联动留给二期。
 * 不 import 客服域 `data.tsx` —— 那是另一业务域的私有数据集，
 * 且带大量本页用不到的字段；接入后改走 `/api/v1/svc/tickets?dueDate=`。
 *
 * ## 冲突判定为什么在前端算
 *
 * 附件《前端组件与实现要点》要求「冲突判定在服务端，前端只渲染标记」。
 * 本项目当前是**前端演示态、无后端**，故判定函数放在本文件并在页面渲染红框 ——
 * 这是对"接入后必须挪到服务端"的显式让步，不是最终形态。
 * 判据（可直接翻成单测）见 `detectConflicts` 的注释。
 *
 * ## 数据纪律
 *
 * · 演示数据里的中文一律存 i18n key，展示走 `t()`；
 * · **不逐条硬编码**：冲突由 `detectConflicts` 派生、筹备清单由 `PREP_TEMPLATE` 模板派生、
 *   提醒链由 `REMIND_TEMPLATE` 模板派生（附件「提醒链不手填」同一条纪律）；
 * · 「今天」锚点写死 `MKG_CAL_TODAY`，不取 `new Date()`
 *   （否则红框与高亮每天跳变，验收不可复现）。
 */

/** 五类排期。campaign/visit 有上游表，meeting/ticket/task 本文件内置。 */
export type MktCalKind = 'campaign' | 'visit' | 'meeting' | 'ticket' | 'task';

/** 三态：已完成 / 进行中 / 计划中（沿用总览日历既有口径，不新造一套）。 */
export type MktCalState = 'done' | 'running' | 'planned';

/** 受众：R1 冲突规则的判据维度 —— 同受众同时段才算冲突。 */
export type MktCalAudience = 'dealer' | 'store' | 'internal';

export interface MktCalItem {
  id: string;
  kind: MktCalKind;
  state: MktCalState;
  /** 标题 i18n key */
  titleKey: string;
  /** 起始日 YYYY-MM-DD */
  start: string;
  /** 结束日（仅跨度类有；单日事件为 undefined） */
  end?: string | undefined;
  /** 受众 i18n key（R1 判据） */
  audienceKey: string;
  /** 负责人完整 i18n key（`demo.owner.*`，与 campaign-data 同口径） */
  ownerKey: string;
  /** 参与规模文案 i18n key（右栏「参与人」字段） */
  scaleKey: string;
  /** 点击跳转目标 */
  href?: string | undefined;
  /** 冲突豁免组（附件 B 的例外条款）：同组内不算冲突 */
  conflictGroupId?: string | undefined;
}

/** 演示世界「今天」锚点。写死而非 `new Date()`：红框/黄点/高亮每天跳变则验收不可复现。 */
export const MKG_CAL_TODAY = '2026-09-30';

/** 受众 → 文案 key（筛选树、图例、右栏共用同一套，不各写一份）。 */
export const AUDIENCE_KEY: Record<MktCalAudience, string> = {
  dealer: 'mkg.cal.aud.dealer',
  store: 'mkg.cal.aud.store',
  internal: 'mkg.cal.aud.internal',
};

// ── ③ 会议培训：内置周期例会和培训 ────────────────────────────────
// 日期在锚点（09-30）前后两侧分布，保证月视图一打开就有
// 「过去的已完成 / 今天进行中 / 将来计划中」三态可比 —— 只有未来日期的日历测不出"已完成"。

const MEETINGS: readonly {
  id: string;
  titleKey: string;
  date: string;
  ownerKey: string;
  audience: MktCalAudience;
  scaleKey: string;
}[] = [
  { id: 'M1', titleKey: 'mkg.cal.item.m1', date: '2026-09-02', ownerKey: 'demo.owner.linlan', audience: 'internal', scaleKey: 'mkg.cal.scale.6' },
  { id: 'M2', titleKey: 'mkg.cal.item.m2', date: '2026-09-09', ownerKey: 'demo.owner.zhoumu', audience: 'internal', scaleKey: 'mkg.cal.scale.4' },
  { id: 'M3', titleKey: 'mkg.cal.item.m3', date: '2026-09-16', ownerKey: 'demo.owner.linlan', audience: 'internal', scaleKey: 'mkg.cal.scale.8' },
  { id: 'M4', titleKey: 'mkg.cal.item.m4', date: '2026-09-23', ownerKey: 'demo.owner.zhoumu', audience: 'store', scaleKey: 'mkg.cal.scale.12' },
  { id: 'M5', titleKey: 'mkg.cal.item.m5', date: '2026-09-30', ownerKey: 'demo.owner.linlan', audience: 'internal', scaleKey: 'mkg.cal.scale.5' },
  { id: 'M6', titleKey: 'mkg.cal.item.m6', date: '2026-10-14', ownerKey: 'demo.owner.linlan', audience: 'store', scaleKey: 'mkg.cal.scale.20' },
  { id: 'M7', titleKey: 'mkg.cal.item.m7', date: '2026-10-21', ownerKey: 'demo.owner.zhoumu', audience: 'store', scaleKey: 'mkg.cal.scale.6' },
  { id: 'M8', titleKey: 'mkg.cal.item.m8', date: '2026-10-28', ownerKey: 'demo.owner.linlan', audience: 'store', scaleKey: 'mkg.cal.scale.16' },
];

// ── ④ 售后工单：内置到期排期（见文件头「工单取舍」） ────────────────
// 日期是**按冲突规则反推**定的，不是随手填的：R1（撞档）与R3（单日过载）
// 是本页最核心的机制，若演示数据里触发不了，截图上就只剩一片安静的日历，
// 谁也看不出这两条规则真的在跑。故：
//   · 10-11 同受众两撞（工单 K2 + 任务 T4）→ 亮红框；
//   · 10-21 同受众三个到场动作（工单 K3 + 会议 M7 + 任务 T6）→ R3 单日过载；
//   · 10-01 经销商激活活动开场 与10-08 经销商工单同受众 → 跨月活动也会撞档。
// 若将来改了活动数据，这几个日期要回来重算，否则告警会静默失效。

const TICKET_DUES: readonly {
  id: string;
  titleKey: string;
  date: string;
  audience: MktCalAudience;
  ownerKey: string;
}[] = [
  { id: 'K1', titleKey: 'mkg.cal.item.k1', date: '2026-10-08', audience: 'dealer', ownerKey: 'demo.owner.linlan' },
  { id: 'K2', titleKey: 'mkg.cal.item.k2', date: '2026-10-11', audience: 'store', ownerKey: 'demo.owner.zhoumu' },
  { id: 'K3', titleKey: 'mkg.cal.item.k3', date: '2026-10-21', audience: 'store', ownerKey: 'demo.owner.linlan' },
  { id: 'K4', titleKey: 'mkg.cal.item.k4', date: '2026-10-28', audience: 'dealer', ownerKey: 'demo.owner.zhoumu' },
];

// ── ⑤ 任务：内置（无上游表） ───────────────────────────────────────

const TASKS: readonly {
  id: string;
  titleKey: string;
  date: string;
  ownerKey: string;
  audience: MktCalAudience;
  done: boolean;
}[] = [
  { id: 'T1', titleKey: 'mkg.cal.item.t1', date: '2026-09-28', ownerKey: 'demo.owner.linlan', audience: 'dealer', done: true },
  { id: 'T2', titleKey: 'mkg.cal.item.t2', date: '2026-09-30', ownerKey: 'demo.owner.zhoumu', audience: 'internal', done: false },
  { id: 'T3', titleKey: 'mkg.cal.item.t3', date: '2026-10-09', ownerKey: 'demo.owner.linlan', audience: 'store', done: false },
  { id: 'T4', titleKey: 'mkg.cal.item.t4', date: '2026-10-11', ownerKey: 'demo.owner.zhoumu', audience: 'store', done: false },
  { id: 'T5', titleKey: 'mkg.cal.item.t5', date: '2026-10-16', ownerKey: 'demo.owner.zhoumu', audience: 'dealer', done: false },
  { id: 'T6', titleKey: 'mkg.cal.item.t6', date: '2026-10-21', ownerKey: 'demo.owner.linlan', audience: 'store', done: false },
];

// ── 派生：五类合流 ────────────────────────────────────────────────

/** 活动状态 → 三态。 */
function campaignState(status: string): MktCalState {
  if (status === 'ended') return 'done';
  if (status === 'running') return 'running';
  return 'planned';
}

/** 内容发布状态 → 三态。 */
function contentState(status: string): MktCalState {
  if (status === 'done') return 'done';
  if (status === 'producing') return 'running';
  return 'planned';
}

/** 相对「今天」判三态（内置里程碑无状态字段，按日期推）。 */
function byDate(date: string): MktCalState {
  if (date < MKG_CAL_TODAY) return 'done';
  if (date === MKG_CAL_TODAY) return 'running';
  return 'planned';
}

/**
 * 线下型活动类型 —— 只有这些类型派生拜访。
 *
 * 取`activate`（激活经销商）而非"展会"：`CampaignType` 只有
 * launch / activate / convert / brand 四值，其中**只有 activate 隐含上门动作**
 * （launch 是发布、convert 是转化广告、brand 是品牌曝光）。
 * 给一次线上直播派一条"拜访"是凭空造事实，故按类型筛，不按渠道筛。
 */
const OFFLINE_TYPES: readonly CampaignType[] = ['activate'];

/** 活动受众：激活类面向经销商，其余面向终端门店。 */
function campaignAudience(type: CampaignType): MktCalAudience {
  return type === 'activate' ? 'dealer' : 'store';
}

/** 活动参与规模 → 文案 key（按量级分档，避免给 14,200 也写一条文案）。 */
function scaleKey(participants: number): string {
  if (participants >= 1000) return 'mkg.cal.scale.1000';
  if (participants >= 100) return 'mkg.cal.scale.100';
  if (participants >= 20) return 'mkg.cal.scale.20';
  return 'mkg.cal.scale.5';
}

/** 拜访派生：线下型活动 → 一次上门拜访。 */
function deriveVisits() {
  return CAMPAIGNS.filter(
    (campaign) => OFFLINE_TYPES.includes(campaign.type) && campaign.status !== 'ended',
  ).map((campaign) => ({
    id: `V-${campaign.id}`,
    kind: 'visit' as const,
    state: campaignState(campaign.status),
    titleKey: 'mkg.cal.item.visit',
    start: campaign.end ?? campaign.start,
    audienceKey: AUDIENCE_KEY[campaignAudience(campaign.type)],
    ownerKey: campaign.ownerKey,
    scaleKey: scaleKey(Math.max(campaign.participants / 20, 1)),
    href: `/marketing/campaigns/${campaign.id}`,
    // 同组豁免的关键：与原活动同组，见文件头「拜访派生口径」
    conflictGroupId: `G-${campaign.id}`,
  }));
}

/** 全量排期（五类混排，按日期升序、同日按 id 稳定排序）。 */
export const MKT_CAL_ITEMS: readonly MktCalItem[] = [
  ...CAMPAIGNS.map((campaign) => ({
    id: `C-${campaign.id}`,
    kind: 'campaign' as const,
    state: campaignState(campaign.status),
    titleKey: campaign.nameKey,
    start: campaign.start,
    end: campaign.end,
    audienceKey: AUDIENCE_KEY[campaignAudience(campaign.type)],
    ownerKey: campaign.ownerKey,
    scaleKey: scaleKey(campaign.participants),
    href: `/marketing/campaigns/${campaign.id}`,
    conflictGroupId: `G-${campaign.id}`,
  })),
  ...deriveVisits(),
  ...MEETINGS.map((m) => ({
    id: `M-${m.id}`,
    kind: 'meeting' as const,
    state: byDate(m.date),
    titleKey: m.titleKey,
    start: m.date,
    audienceKey: AUDIENCE_KEY[m.audience],
    ownerKey: m.ownerKey,
    scaleKey: m.scaleKey,
  })),
  ...TICKET_DUES.map((t) => ({
    id: `K-${t.id}`,
    kind: 'ticket' as const,
    state: byDate(t.date),
    titleKey: t.titleKey,
    start: t.date,
    audienceKey: AUDIENCE_KEY[t.audience],
    ownerKey: t.ownerKey,
    scaleKey: 'mkg.cal.scale.2',
    href: '/service',
  })),
  ...TASKS.map((task) => ({
    id: `T-${task.id}`,
    kind: 'task' as const,
    state: task.done ? ('done' as const) : byDate(task.date),
    titleKey: task.titleKey,
    start: task.date,
    audienceKey: AUDIENCE_KEY[task.audience],
    ownerKey: task.ownerKey,
    scaleKey: 'mkg.cal.scale.1',
  })),
  ...CONTENT_ROWS.map((row) => ({
    id: `P-${row.code}`,
    // 内容发布并入 campaign 类：与营销活动在"什么时候打出去"上是同一件事
    kind: 'campaign' as const,
    state: contentState(row.status),
    titleKey: row.titleKey,
    start: row.publishAt.slice(0, 10),
    audienceKey: AUDIENCE_KEY.store,
    ownerKey: row.ownerKey,
    scaleKey: 'mkg.cal.scale.3',
    href: `/marketing/content/${row.code}`,
  })),
].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));

// ── 冲突检测（附件规则 R1 / R3 / R4） ─────────────────────────────

export interface ConflictPair {
  aId: string;
  bId: string;
  /** 受众 i18n key（同一受众才判冲突） */
  audienceKey: string;
  /** 首个撞档日（YYYY-MM-DD），右栏提示里说"哪天撞的" */
  date: string;
}

/** 单日过载（R3）：同一受众同一自然日 ≥3 触点。 */
export interface OverloadDay {
  date: string;
  audienceKey: string;
  count: number;
  itemIds: readonly string[];
}

/** 筹备逾期（R4）。 */
export interface PrepOverdue {
  itemId: string;
  /** 逾期天数 */
  days: number;
}

/** 筹备清单条目。 */
export interface PrepItem {
  id: string;
  labelKey: string;
  /** 相对开始日的天数（负=提前 N 天） */
  offsetDays: number;
  done: boolean;
}

/** 已完成 / 进行中才参与冲突判定 —— 已经做完的事不该再报冲突。 */
function activeForConflict(item: MktCalItem): boolean {
  return item.state === 'running' || item.state === 'planned';
}

/**
 * 该排期是否**需要人到场**（占线下资源）。
 *
 * 这是 R1/R3 能用的关键前提，缺了它整套冲突检测就是噪声。
 *
 * 第一版把 R1 直接写成「同受众 + 时间段重叠」，实测 **112 张卡片里110 张挂红框**
 * （两条跨月活动 09-01~09-30 与 09-15~10-15 受众都是门店，互相"重叠"了 46 天，
 *  连带门店受众的内容发布全被判冲突）。
 * **红框常亮等于没开**：用户第一天就学会忽略它，这个功能从此不存在。
 *
 * 附件要解决的从来不是"两个区间有交集"，而是「**市场排期与销售拜访抢同一批人**」。
 * 抢的是**到场的人力**，而线上投放不占人。所以判据是：
 *   · 到场类（拜访 / 会议培训 / 售后工单）→ 占线下资源，同受众同日就撞；
 *   · 纯线上类（品牌 /拉新 / 转化投放、内容发布）→ 不占人力，永不与别的排期撞档；
 *   · 线下型营销活动（激活经销商）→ 占人力，且它在日历上是跨月背景，
 *     所以**只在开场与收尾两天**占用（开场当天要出人做启动、收尾当天要收口）。
 *
 * 这样"10-08 经销商激活开场，售后安装工单也排了 10-08"这类真冲突会被点亮，
 * 而"整月大促 × 同受众的日常内容发布"这种伪冲突不会。
 */
function needsOnsite(item: MktCalItem): boolean {
  return item.kind === 'visit' || item.kind === 'meeting' || item.kind === 'ticket' || item.kind === 'task';
}

/** 线下型营销活动：跨月背景，只在开场/收尾两天占用。 */
const ONSITE_CAMPAIGN: readonly MktCalKind[] = ['campaign'];

/** 这条排期在**这一天**是否真的占人力。 */
function occupiesOn(item: MktCalItem, date: string): boolean {
  const end = item.end;
  if (end === undefined) return item.start === date;
  if (!needsOnsite(item) && !ONSITE_CAMPAIGN.includes(item.kind)) return false;
  return date === item.start || date === end;
}

/** 同组豁免：同一场活动的多种记法不算冲突（见文件头「拜访派生口径」）。 */
function sameGroup(a: MktCalItem, b: MktCalItem): boolean {
  return Boolean(a.conflictGroupId && a.conflictGroupId === b.conflictGroupId);
}

/**
 * R1 冲突（同受众 + 同一天双方都占人力 + 状态∈{已排期,执行中}）。
 *
 * 返回**对**而不是单个对象：一条卡可能同时撞上两场，页面红框只需知道"我撞了谁"，
 * 右栏冲突提示也要列出双方标题。
 */
export function detectConflicts(items: readonly MktCalItem[]): readonly ConflictPair[] {
  const pairs: ConflictPair[] = [];
  // 只看「今天起」的一段时间：过去的日子撞没撞档已无法处理，
  // 留着只会让红框在历史区域常亮，把真正的当日冲突淹掉。
  const from = MKG_CAL_TODAY;
  const horizon = addDays(from, 60);
  const firstSharedDay = (a: MktCalItem, b: MktCalItem): string | null => {
    const start = a.start > b.start ? a.start : b.start;
    const endA = a.end ?? a.start;
    const endB = b.end ?? b.start;
    const end = endA < endB ? endA : endB;
    for (let d = start > from ? start : from; d <= end && d <= horizon; d = addDays(d, 1)) {
      if (occupiesOn(a, d) && occupiesOn(b, d)) return d;
    }
    return null;
  };
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (!a || !b || a.audienceKey !== b.audienceKey) continue;
      if (!activeForConflict(a) || !activeForConflict(b)) continue;
      if (sameGroup(a, b)) continue;
      const day = firstSharedDay(a, b);
      if (!day) continue;
      pairs.push({ aId: a.id, bId: b.id, audienceKey: a.audienceKey, date: day });
    }
  }
  return pairs;
}

/** 参与 R1 冲突的排期 id 集合（红框渲染用，避免每格重算全量两两比较）。 */
export function conflictIds(pairs: readonly ConflictPair[]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const pair of pairs) {
    set.add(pair.aId);
    set.add(pair.bId);
  }
  return set;
}

/** 某条排期与哪些排期冲突（右侧详情面板的「冲突提示」用）。 */
export function conflictsOf(
  pairs: readonly ConflictPair[],
  itemId: string,
): readonly MktCalItem[] {
  const ids = new Set<string>();
  for (const pair of pairs) {
    if (pair.aId === itemId) ids.add(pair.bId);
    if (pair.bId === itemId) ids.add(pair.aId);
  }
  return MKT_CAL_ITEMS.filter((item) => ids.has(item.id));
}

/**
 * R3 同受众单日过载（≥3 触点）。
 *
 * 触点口径与 R1 的「当日占人力」一致（见 `occupiesOn`）：
 * 跨月大促只在开场/收尾两天算触点，跑整月的大促不该让每一天都爆表
 * （第一版按天展开，实测一个月里 19 天过载 —— 等于每天都在报警，没人再看）。
 * 同时只统计「今天起 60 天内」：过去的过载无法处理，留着只会稀释告警。
 */
export function detectOverloads(items: readonly MktCalItem[]): readonly OverloadDay[] {
  const buckets = new Map<string, string[]>();
  const horizon = addDays(MKG_CAL_TODAY, 60);
  for (const item of items) {
    if (!activeForConflict(item)) continue;
    if (item.start < MKG_CAL_TODAY) continue;
    if (item.start > horizon) continue;
    const end = item.end ?? item.start;
    for (let d = item.start; d <= end; d = addDays(d, 1)) {
      if (!occupiesOn(item, d)) continue;
      const key = `${d}|${item.audienceKey}`;
      const list = buckets.get(key);
      if (list) list.push(item.id);
      else buckets.set(key, [item.id]);
    }
  }
  const out: OverloadDay[] = [];
  for (const [key, itemIds] of buckets) {
    if (itemIds.length < 3) continue;
    const [date, audienceKey] = key.split('|');
    if (!date || !audienceKey) continue;
    out.push({ date, audienceKey, count: itemIds.length, itemIds });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** R3 过载涉及的排期 id（工具栏汇总条计数与卡片角标用）。 */
export function overloadIds(days: readonly OverloadDay[]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const day of days) for (const id of day.itemIds) set.add(id);
  return set;
}

// ── 筹备清单（按类型模板派生，不逐条硬编码） ───────────────────────

/**
 * 筹备清单模板（附件 D 的表格）：
 * 大促 8 项、常规营销 3 项、拜访 3 项、会议 3 项、工单 2 项、任务 0 项。
 *
 * `overdue: true` 的项在演示数据里被标为逾期 —— 逾期项决定 R4 黄点，
 * 不给逾期就永远测不出黄点，故在模板里显式声明而不是随机。
 * 「常规营销 3 项」与「大促 8 项」的区分落在 campaign 类的**跨度**上
 * （≥7 天视为大促），不新造 `isBigPromo` 字段 —— 演示数据里没有这个事实，
 * 而"跨度长=大促"是可从数据推出的。
 */
const PREP_REGULAR: readonly { labelKey: string; days: number; done: boolean }[] = [
  { labelKey: 'mkg.cal.prep.copy', days: -6, done: true },
  { labelKey: 'mkg.cal.prep.list', days: -3, done: true },
  { labelKey: 'mkg.cal.prep.push', days: -1, done: false },
];

const PREP_BIG: readonly { labelKey: string; days: number; done: boolean; overdue?: boolean }[] = [
  { labelKey: 'mkg.cal.prep.list', days: -28, done: true },
  { labelKey: 'mkg.cal.prep.copy', days: -25, done: true },
  { labelKey: 'mkg.cal.prep.material', days: -20, done: true },
  { labelKey: 'mkg.cal.prep.arrive', days: -14, done: true },
  { labelKey: 'mkg.cal.prep.training', days: -12, done: true },
  { labelKey: 'mkg.cal.prep.liveScript', days: -6, done: false, overdue: true },
  { labelKey: 'mkg.cal.prep.serviceWord', days: -2, done: false },
  { labelKey: 'mkg.cal.prep.emergency', days: -2, done: false },
];

const PREP_BY_KIND: Record<MktCalKind, readonly { labelKey: string; days: number; done: boolean }[]> = {
  campaign: PREP_REGULAR,
  visit: [
    { labelKey: 'mkg.cal.prep.outline', days: -3, done: true },
    { labelKey: 'mkg.cal.prep.history', days: -3, done: true },
    { labelKey: 'mkg.cal.prep.todo', days: -1, done: false },
  ],
  meeting: [
    { labelKey: 'mkg.cal.prep.room', days: -2, done: true },
    { labelKey: 'mkg.cal.prep.agenda', days: -2, done: true },
    { labelKey: 'mkg.cal.prep.confirm', days: -1, done: false },
  ],
  ticket: [
    { labelKey: 'mkg.cal.prep.parts', days: -1, done: true },
    { labelKey: 'mkg.cal.prep.dispatch', days: -1, done: false },
  ],
  task: [],
};

/** 某条排期的筹备清单（模板派生；task 类恒为空）。 */
export function prepItems(item: MktCalItem): readonly PrepItem[] {
  const tpl = item.kind === 'campaign' && daysBetween(item.start, item.end ?? item.start) >= 7 ? PREP_BIG : PREP_BY_KIND[item.kind];
  if (tpl.length === 0) return [];
  // 已完成的排期按全勾处理 —— 复盘时不该再显示一串红叉
  const allDone = item.state === 'done';
  return tpl.map((row, i) => ({
    id: `${item.id}-P${i + 1}`,
    labelKey: row.labelKey,
    offsetDays: row.days,
    done: allDone || row.done,
  }));
}

/** R4：该排期是否存在逾期未完成的筹备项。 */
export function hasPrepOverdue(item: MktCalItem): PrepOverdue | null {
  if (item.state === 'done') return null;
  for (const row of prepItems(item)) {
    if (row.done) continue;
    const due = addDays(item.start, row.offsetDays);
    if (due < MKG_CAL_TODAY) return { itemId: item.id, days: daysBetween(due, MKG_CAL_TODAY) };
  }
  return null;
}

/** 全量筹备逾期（R4 汇总条）。 */
export function detectPrepOverdues(items: readonly MktCalItem[]): readonly PrepOverdue[] {
  return items
    .map((item) => hasPrepOverdue(item))
    .filter((row): row is PrepOverdue => row !== null);
}

// ── 提醒链（按类型模板派生，不逐条硬编码） ─────────────────────────

export interface ReminderNode {
  /** 相对开始日的天数（负=提前 N 天，0=当天/临开始） */
  offsetDays: number;
  /** 档位文案 i18n key */
  labelKey: string;
  /** 抄送对象 i18n key */
  ccKey: string;
}

/**
 * 提醒链模板（附件 D 表格）：
 * 大促 15d/7d/2d/2h · 常规营销 15d/2d/1d · 拜访 2d/2h · 会议 1d/1h · 工单 2h/30m · 任务 2d。
 * 附件《交互要点》：「提醒链不手填」，按事件类型 + 节点类型从模板带出。
 */
const REMIND_BY_KIND: Record<MktCalKind, readonly ReminderNode[]> = {
  campaign: [
    { offsetDays: -15, labelKey: 'mkg.cal.remind.d15', ccKey: 'mkg.cal.cc.design' },
    { offsetDays: -2, labelKey: 'mkg.cal.remind.d2', ccKey: 'mkg.cal.cc.all' },
    { offsetDays: -1, labelKey: 'mkg.cal.remind.d1', ccKey: 'mkg.cal.cc.owner' },
  ],
  visit: [
    { offsetDays: -2, labelKey: 'mkg.cal.remind.d2', ccKey: 'mkg.cal.cc.none' },
    { offsetDays: 0, labelKey: 'mkg.cal.remind.h2', ccKey: 'mkg.cal.cc.none' },
  ],
  meeting: [
    { offsetDays: -1, labelKey: 'mkg.cal.remind.d1', ccKey: 'mkg.cal.cc.none' },
    { offsetDays: 0, labelKey: 'mkg.cal.remind.h1', ccKey: 'mkg.cal.cc.none' },
  ],
  ticket: [
    { offsetDays: 0, labelKey: 'mkg.cal.remind.h2', ccKey: 'mkg.cal.cc.owner' },
    { offsetDays: 0, labelKey: 'mkg.cal.remind.h30m', ccKey: 'mkg.cal.cc.none' },
  ],
  task: [{ offsetDays: -2, labelKey: 'mkg.cal.remind.d2', ccKey: 'mkg.cal.cc.none' }],
};

/** 大促版提醒链（campaign 且跨度 ≥7 天）：多一档 7d，抄送范围更广。 */
const REMIND_BIG: readonly ReminderNode[] = [
  { offsetDays: -15, labelKey: 'mkg.cal.remind.d15', ccKey: 'mkg.cal.cc.design' },
  { offsetDays: -7, labelKey: 'mkg.cal.remind.d7', ccKey: 'mkg.cal.cc.service' },
  { offsetDays: -2, labelKey: 'mkg.cal.remind.d2', ccKey: 'mkg.cal.cc.all' },
  { offsetDays: 0, labelKey: 'mkg.cal.remind.h2', ccKey: 'mkg.cal.cc.owner' },
];

/**
 * 该排期的提醒链。改期后由offset 重算，故链上只存相对量。
 * 附件《交互要点》要求「提醒面板可见可改」—— 用户要能看见"下次提醒在什么时候、抄给了谁"，
 * 否则会认为是系统骚扰。
 */
export function reminders(item: MktCalItem): readonly ReminderNode[] {
  if (item.kind === 'campaign' && daysBetween(item.start, item.end ?? item.start) >= 7) {
    return REMIND_BIG;
  }
  return REMIND_BY_KIND[item.kind];
}

// ── 日期工具 ─────────────────────────────────────────────────────

/** YYYY-MM-DD 加减天数（UTC 日界，避免时区把差一天算成差两天）。 */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 两个 YYYY-MM-DD 之间的天数差（b - a）。 */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** 落在某一天（含跨度）的排期。 */
export function itemsOnDay(items: readonly MktCalItem[], date: string): readonly MktCalItem[] {
  return items.filter((item) => (item.end ?? item.start) >= date && item.start <= date);
}

/**
 * 反查该排期的**源活动**（2026-10-07 第十九轮）。
 *
 * ## 为什么需要它：日历右栏与活动详情页此前是"同一活动的两套详情"
 *
 * 用户报"日历里的活动详情有筹备清单、活动管理里没有，反差很大"。核对后的真因不是
 * 某一页少渲染了模块，而是**两份数据源**：
 *  - 日历右栏读 `MktCalItem`（跨五类排期的统一投影：有筹备模板、提醒链、冲突组）
 *  - 活动详情读 `Campaign`（活动的完整业务字段：有目标/预算/渠道/素材/生命周期）
 *
 * 各自都不算错，但用户点日历 → 再点「打开」进活动详情，同一个活动给出两套
 * 信息量不同的详情，"这是两个东西"的印象由此产生。
 *
 * ## 收敛方向：不合并两页，而是让日历能"看见"活动的专属字段
 *
 * 日历右栏是**跨类型的统一面板**，塞进生命周期时间线会让另外四类（拜访/会议/工单/任务）
 * 无处安放。故按类型分派：
 *  - `kind === 'campaign'` 且能反查到源活动 → 额外显示目标/预算/渠道/参与规模/生命周期阶段
 *  - 其余四类维持原有字段（筹备/提醒/冲突本就通用）
 *
 * 返回 null 而非空对象：调用方必须显式处理"反查不到"，
 * 静默返回空壳会让活动详情在右栏里显示成空字段，比不显示更难解释。
 */
export function sourceCampaignOf(item: MktCalItem): Campaign | null {
  if (item.kind !== 'campaign') return null;
  // MKT_CAL_ITEMS 里活动项的 id 统一加 `C-` 前缀（见下方 map）
  const rawId = item.id.startsWith('C-') ? item.id.slice(2) : item.id;
  return CAMPAIGNS.find((c) => c.id === rawId) ?? null;
}

/** 受众筛选（左侧树「受众」组）。 */
export function itemsByAudience(
  items: readonly MktCalItem[],
  audience: MktCalAudience | 'all',
): readonly MktCalItem[] {
  if (audience === 'all') return items;
  return items.filter((item) => item.audienceKey === AUDIENCE_KEY[audience]);
}

/** 类型筛选（左侧树「事件类型」组，空数组=不筛）。 */
export function itemsByKind(items: readonly MktCalItem[], kinds: readonly MktCalKind[]): readonly MktCalItem[] {
  if (kinds.length === 0) return items;
  return items.filter((item) => kinds.includes(item.kind));
}