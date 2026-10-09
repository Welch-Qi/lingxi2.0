/**
 * 客户中心演示数据（客户主体 + 商机的字段口径全部取自《CRM字段配置表》）。
 *
 * 口径来源（附件 CRM字段配置表.xlsx，方案B · 行业标准版）：
 *   · Sheet2 字段配置总表 —— 客户主体 8 字段 + 商机 14 字段；
 *     另有 2 个字段是 2026-09-24 按产品设计补的、附件里没有：
 *     商机创建/报备时间（`created_at`）与意向产品（`intended_product_id` → `prd_product`）；
 *   · Sheet5 客户价值分层 —— S 战略大客户 / A 重点客户 / B 常规客户 / 小微 C / 休眠 D；
 *   · Sheet2 customer_type —— 新潜在客户（从未成交）/ 存量老客户（有已验收成交记录）；
 *   · Sheet3 意向等级 —— A 高意向 / B 中意向 / C 低意向 / D 无效，**仅评估未关闭商机**；
 *   · Sheet4 生命周期阶段 —— 首触→跟进培育→方案报价→商务谈判→已签约→交付中→已验收，
 *     另有兜底状态「流失关闭」（状态类型：流转中 / 成交关闭 / 关闭状态）；
 *     **2026-09-25 按用户要求去掉附件里的「待建联」**（详见 `OppStage` 的说明）；
 *   · Sheet6 业务规则 —— 漏斗只统计未关闭商机；复购识别 = 客户类型是存量老客户 且 商机在流转中。
 *
 * **演示数据的一处刻意安排**：商机中心列表有「增换购标签」列（首购 / 增购 / 复购），
 * 判据＝"该客户有没有成交记录" × "这个意向产品他买过没有"。三取值必须**都取得到**，
 * 否则这一列等于只有两档、评审时看不到第三档长什么样（首版数据就是这样：复购 0 条）。
 * 故 Nordwind 的两条在途商机摆成：`o1-1` 与已验收的 `o1-3` **同产品**（→ 复购）、
 * `o1-2` 是**另一品类**（→ 增购）；`o1-3` 的名称与产品同步改成电池模组，
 * 让"复购"在业务上说得通（先前买过、这次补货）。**改这两条之前，
 * 先用 `artifacts/tmp/check-purchase-label.py` 确认三档仍有落点。**
 *
 * 两条容易踩的口径，已在类型上分开、**不复用同一组标签与配色**：
 *   ① 意向等级 A/B/C/D 是**商机**属性（仅未关闭商机）；
 *   ② 价值分层 S/A/B/C/D 是**客户本体**长期属性，不随商机关闭而变。
 *
 * 这里只放"不需翻译"的内容（专名、编码、日期、金额、枚举 key）：
 * 一切中文文案走 i18n（附录D 规则10，ESLint 硬拦），故国家/负责人/来源等一律存 key。
 *
 * 列表与统计的条数关系：数据集是**第 1 页切片**，聚合数（164 / 118 / 46 …）是服务端口径 ——
 * 与真实产品一致（翻页与筛选计数由后端出，不是把当前页数出来）。
 */

import type { LxTagVariant } from '@lingxi/ui';

/**
 * 客户类型（`customer_type`，必填，3 值）。
 *
 * 2026-09-25 由 2 值（新潜在客户 / 存量老客户）改为 3 值 —— 用户要求客户只按
 * **类型 + 价值**两个维度分类，类型要能区分"还没买过 / 买过一次 / 反复买"。
 *
 * 判定口径（**按客户级成交次数**，不按当前页的商机切片）：
 *   `prospect` 成交 0 次 → 新潜客户
 *   `first`    成交 1 次 → 首次成交客户
 *   `repeat`   成交≥2 次 → 复购客户
 *
 * ⚠️ 为什么必须强调"不按切片"：本数据集是**第 1 页切片**，Baltic Power OÜ / Vistula Energy /
 * Atelier Lumière 三家的成交记录落在切片之外（`cus_customer.last_deal_at` 有值、
 * 但名下一条已成交商机都没有）。若拿"切片里有没有已成交商机"去推，这三家会被判成
 * 「从未成交」，与列表上写着「存量老客户」直接打架 —— 上一轮判「首购」时踩过这个坑。
 * 因此这里的 `type` 是**客户级事实**（与 `lastDealAt` 同源），不是从 `opportunities` 数出来的。
 * 演示值的自洽约束：`type === 'prospect'` ⟺ `lastDealAt === null`（14 家全部满足）。
 */
export type CustomerType = 'prospect' | 'first' | 'repeat';

/**
 * 客户类型标签的配色（三档）。
 *
 * 为什么放在 data.ts 而不是各页面各写一份：同一档类型会同时出现在**客户列表**与
 * **客户360 页头**两个地方，两处各写一份映射就一定会漂（改了一处另一处还是旧色）。
 * 这里只有 `import type`，不带任何运行时 React 依赖，数据层仍然可以被随便引用。
 * 语义：新潜=蓝（还没开始）、首次成交=黄（走过一次）、复购=绿（已经在循环里）。
 */
export const TYPE_VARIANT: Record<CustomerType, LxTagVariant> = {
  prospect: 'video',
  first: 'review',
  repeat: 'done',
};

/** 客户价值分层（customer_value_tier，必填，5 档）—— 客户本体属性，季度复核 */
export type CustomerTier = 's' | 'a' | 'b' | 'c' | 'd';

/** 商机意向等级（opportunity_intent，必填，4 档）—— 仅评估未关闭商机 */
export type OppIntent = 'a' | 'b' | 'c' | 'd';

/**
 * 商机生命周期阶段（`opportunity_stage`，必填，7 阶段 + 1 兜底）。
 *
 * **2026-09-25 去掉「待建联」（`waiting`）** —— 用户要求商机阶段不要这一段。
 * 业务上的理由：附件把「待建联」定义为"还没接触上"，但商机一旦报备落库就必然
 * 已经指定了跟进人、也就意味着已经在接触了；再留一段"未接触"既与报备动作自相矛盾，
 * 也会在看板上多出一格（实测只有 1 条落在这里）。原在该阶段的商机**并入「首触」**——
 * 首触就是"第一次接触"，语义接得住，阶段序与金额合计都不受影响。
 *
 * 这个值从联合类型上抹掉之后，所有遗漏的消费点（`STAGE_KIND` / `STAGE_ORDER` /
 * 数据行 / 页面分支）都会被 `pnpm typecheck` 立刻报出来，不需人工全仓搜。
 */
export type OppStage =
  | 'first'
  | 'nurture'
  | 'proposal'
  | 'negotiate'
  | 'signed'
  | 'delivering'
  | 'accepted'
  | 'lost';

/** 阶段的状态类型（附件 Sheet4「状态类型」列） */
export type OppStageKind = 'open' | 'won' | 'lost';

export const STAGE_KIND: Record<OppStage, OppStageKind> = {
  first: 'open',
  nurture: 'open',
  proposal: 'open',
  negotiate: 'open',
  signed: 'won',
  delivering: 'won',
  accepted: 'won',
  lost: 'lost',
};

/**
 * 阶段推进次序（首触 → … → 已验收），「流失关闭」置于末位。
 *
 * 唯一用途是**商机中心的阶段看板按它排序**（`STAGE_BUCKETS` 由它 map 派生）。
 *
 * 2026-09-25：客户中心列表上方的分段筛选由「生命周期阶段」改为「客户类型 + 客户价值」，
 * 原先那段"把客户的若干条商机归并成这个客户走到哪一步"的 `customerStage()` 随之失去
 * 唯一消费方，已删除 —— 阶段是**商机**的属性，硬归并到客户身上本来就多一层解释成本。
 */
export const STAGE_ORDER: readonly OppStage[] = [
  'first',
  'nurture',
  'proposal',
  'negotiate',
  'signed',
  'delivering',
  'accepted',
  'lost',
];

/**
 * 跟进 SLA（附件 Sheet3：A 级 7 天内 ≥1 次跟进，B 级每 30 天回访 1 次；C / D 未定义）。
 *
 * 2026-09-23：「今日待跟进」模块按用户要求从客户中心首页撤下，本表暂无引用方。
 * 口径本身仍属附件规定，保留定义供跟进记录/提醒类视图复用，**不要当作废弃数据删掉**。
 */
export const INTENT_SLA_DAYS: Record<OppIntent, number> = { a: 7, b: 30, c: 0, d: 0 };

export interface Opportunity {
  id: string;
  /** 商机名称（专名，含年份与采购性质） */
  name: string;
  /**
   * 商机创建/报备时间 YYYY-MM-DD —— 销售与业务方对齐的同一时点。
   *
   * 与 `CustomerRecord.createdAt`（客户建档时间）是两个时点：先有客户档案，
   * 再有商机报备；同一客户的多条商机各有自己的报备时间，故不能从客户继承。
   */
  createdAt: string;
  /** 意向产品：`prd_product.id` 外键（单选） */
  intendedProductId: string;
  intent: OppIntent;
  stage: OppStage;
  /** 预计成交金额（最小单位整数：分）—— 规约 §4.10：金额禁止浮点 */
  amountMinor: number;
  /** 预计成交时间 YYYY-MM-DD */
  expectedClose: string;
  /** 下次跟进时间 YYYY-MM-DD；SLA 触发依据 */
  nextFollowUp: string;
  /** 最近跟进时间 YYYY-MM-DD */
  lastFollowUp: string;
  ownerKey: string;
  /** BANT 四要素确认情况（多行文本，附件字段 bant） */
  bantKey: string;
  /**
   * 竞品情况（多行文本，附件字段 competition）。
   *
   * ⚠️ 2026-09-25 起**本字段没有渲染点**：跟进记录由卡片网格改成四列表格
   * （跟进时间 / 跟进人 / 跟进小结 / 下次跟进时间，用户指定），原先挂在卡片上那行
   * 「竞品：…」随之撤下；商机中心的十列里也没有竞品位。
   * 字段与它的 4 条 i18n 词条**都保留**：`competition` 是《CRM字段配置表》里的商机字段，
   * 演示数据不该比文档模型少一列，且商机详情节一落地就要用它。
   * —— 与 `@lingxi/utils/datetime` 同属"有数据/工具没人接"，待一次全局裁决，不在这里就地删。
   */
  competitionKey: string;
  /**
   * 本次跟进的小结（一句话，说明"这条商机最后聊到哪"）。
   *
   * 与 `bantKey` 同一处置：存 i18n key、不存中文（附录D 规则10 硬拦硬编码中文）。
   * 一条商机一条 —— 演示数据把"跟进记录"建模成**商机上的最近一次跟进**，
   * 与卡片版口径一致（卡片版也是按 `lastFollowUp` 一条商机一张卡）。
   */
  followSummaryKey: string;
}

export interface CustomerRecord {
  id: string;
  /** 客户名称（专名，唯一标识客户主体） */
  name: string;
  /** 客户编码 */
  code: string;
  type: CustomerType;
  tier: CustomerTier;
  /** 国家/地区 key */
  countryKey: string;
  /** 城市 key */
  cityKey: string;
  contactKey: string;
  contactRoleKey: string;
  /** 所属行业 key */
  industryKey: string;
  /** 客户规模（人数） */
  scale: number;
  /** 客户负责人 key */
  ownerKey: string;
  /**
   * 归属部门 key（数据权限范围的判据之一）。
   *
   * 2026-10-06 新增。此前客户记录**没有部门字段**，于是「数据权限范围」
   * 在客户这个最核心的域上根本无法落地 —— 配置中心配了 SELF / DEPT / CUSTOM
   * 三档，客户列表却一行都不会变，用户会直接判定这个功能是假的。
   *
   * 它由 `OWNER_DEPT` 从负责人派生（见 CUSTOMERS 的 map），
   * 而不是逐条硬编码：部门是负责人的属性，写两遍必然漂。
   */
  deptKey: string;
  /**
   * 负责人 user id（数据权限 SELF 档的判据）。
   *
   * 与 `ownerKey` 的分工：ownerKey 是给人看的 i18n key（可能是「待分配」「智能体」），
   * ownerId 是给判据用的稳定标识。SELF 档要比的是 id 而不是展示名 ——
   * 展示名会改，id 不会。
   */
  ownerId: string;
  /** 客户来源 key */
  sourceKey: string;
  /** 建档时间 YYYY-MM-DD */
  createdAt: string;
  /** 最近成交时间；新潜在客户（从未成交）为 null */
  lastDealAt: string | null;
  opportunities: readonly Opportunity[];
}

/**
 * 复购/增购商机的识别（附件 Sheet6 规则 4）：
 * 客户**成交过**（即类型不是新潜客户）**且**商机处于流转中 → 该商机即复购/增购商机，
 * 不另打意向标签。
 *
 * 2026-09-25：判据由 `type === 'existing'` 改为 `type !== 'prospect'` —— 类型从 2 值
 * 变 3 值后，"存量老客户"这一档被拆成「首次成交」与「复购」，而**首购后再买就是复购/增购**，
 * 两个新档都得算。规则本身没变，变的只是它在类型上的落点。
 */
export function isRepeatDeal(customer: CustomerRecord, opportunity: Opportunity): boolean {
  return customer.type !== 'prospect' && STAGE_KIND[opportunity.stage] === 'open';
}

/** 未关闭商机（附件 Sheet6 规则 3：漏斗只统计未关闭商机）。 */
export function isOpenStage(stage: OppStage): boolean {
  return STAGE_KIND[stage] === 'open';
}

/**
 * 服务端口径的聚合数（与真实产品一致：计数由后端出，不是把当前页数出来）。
 *
 * 2026-09-23：列表上方改为「生命周期阶段」分段筛选（刻意不带计数，见 index.tsx 的说明），
 * 跟进队列也一并撤下 —— 原先的 byType / byTier / newThisMonth / dueToday / repeatOpps
 * 已无引用方，留在这里就是没人维护的死数据，故一并去掉；total 仍供分页总数使用。
 */
export const AGGREGATE = {
  total: 164,
} as const;

/**
 * 种子数据省略 `code`（派生）、`deptKey` 与 `ownerId`（同样由负责人派生）——
 * 三个字段都是算出来的，写进种子就等于多一份需要同步的真值。
 */
const CUSTOMERS_SEED: Omit<CustomerRecord, 'code' | 'deptKey' | 'ownerId'>[] = [
  {
    id: '1',
    name: 'Nordwind Energie GmbH',
    type: 'repeat',
    tier: 's',
    countryKey: 'demo.market.de',
    cityKey: 'demo.city.hamburg',
    contactKey: 'demo.contact.weber',
    contactRoleKey: 'demo.title.procurement',
    industryKey: 'demo.industry.storage',
    scale: 860,
    ownerKey: 'demo.owner.echo',
    sourceKey: 'demo.source.expo',
    createdAt: '2025-03-12',
    lastDealAt: '2026-09-18',
    opportunities: [
      {
        id: 'o1-1',
        name: 'Nordwind · 2026 H2 battery module restock',
        createdAt: '2026-03-18',
        intendedProductId: '2',
        intent: 'a',
        stage: 'negotiate',
        amountMinor: 156000000,
        expectedClose: '2026-10-15',
        nextFollowUp: '2026-09-26',
        lastFollowUp: '2026-09-20',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.incumbent',
        followSummaryKey: 'demo.follow.o1-1',
      },
      {
        id: 'o1-2',
        name: 'Nordwind · balcony PV bundle upsell',
        createdAt: '2026-06-02',
        intendedProductId: '3',
        intent: 'b',
        stage: 'proposal',
        amountMinor: 42000000,
        expectedClose: '2026-11-30',
        nextFollowUp: '2026-10-12',
        lastFollowUp: '2026-09-12',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.b1',
        competitionKey: 'demo.comp.none',
        followSummaryKey: 'demo.follow.o1-2',
      },
      {
        id: 'o1-3',
        name: 'Nordwind · 2025 H2 battery module pilot',
        createdAt: '2025-11-14',
        intendedProductId: '2',
        intent: 'a',
        stage: 'accepted',
        amountMinor: 238000000,
        expectedClose: '2026-06-30',
        nextFollowUp: '2026-07-05',
        lastFollowUp: '2026-07-02',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.none',
        followSummaryKey: 'demo.follow.o1-3',
      },
    ],
  },
  {
    id: '2',
    name: 'Saigon Solar Co., Ltd',
    type: 'prospect',
    tier: 'a',
    countryKey: 'demo.market.vn',
    cityKey: 'demo.city.hochiminh',
    contactKey: 'demo.contact.tran',
    contactRoleKey: 'demo.title.techlead',
    industryKey: 'demo.industry.solar',
    scale: 240,
    ownerKey: 'demo.owner.linlan',
    sourceKey: 'demo.source.social',
    createdAt: '2026-08-04',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o2-1',
        name: 'Saigon Solar · 2026 rooftop inverter pilot',
        createdAt: '2026-08-05',
        intendedProductId: '4',
        intent: 'a',
        stage: 'proposal',
        amountMinor: 42800000,
        expectedClose: '2026-10-28',
        nextFollowUp: '2026-09-24',
        lastFollowUp: '2026-09-18',
        ownerKey: 'demo.owner.linlan',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.price',
        followSummaryKey: 'demo.follow.o2-1',
      },
    ],
  },
  {
    id: '3',
    name: 'BluePeak Storage LLC',
    type: 'repeat',
    tier: 'a',
    countryKey: 'demo.market.us',
    cityKey: 'demo.city.sanfrancisco',
    contactKey: 'demo.contact.reyes',
    contactRoleKey: 'demo.title.opsvp',
    industryKey: 'demo.industry.storage',
    scale: 430,
    ownerKey: 'demo.owner.echo',
    sourceKey: 'demo.source.email',
    createdAt: '2024-11-20',
    lastDealAt: '2026-08-30',
    opportunities: [
      {
        id: 'o3-1',
        name: 'BluePeak · 2026 Q4 charging pile expansion',
        createdAt: '2026-05-27',
        intendedProductId: '5',
        intent: 'b',
        stage: 'nurture',
        amountMinor: 99500000,
        expectedClose: '2026-12-20',
        nextFollowUp: '2026-10-06',
        lastFollowUp: '2026-09-21',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.b2',
        competitionKey: 'demo.comp.price',
        followSummaryKey: 'demo.follow.o3-1',
      },
      {
        id: 'o3-2',
        name: 'BluePeak · 2026 battery module resupply',
        createdAt: '2026-02-11',
        intendedProductId: '2',
        intent: 'a',
        stage: 'signed',
        amountMinor: 112000000,
        expectedClose: '2026-08-30',
        nextFollowUp: '2026-09-30',
        lastFollowUp: '2026-09-16',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.price',
        followSummaryKey: 'demo.follow.o3-2',
      },
    ],
  },
  {
    id: '4',
    name: 'Anatolia Power A.Ş.',
    type: 'prospect',
    tier: 'b',
    countryKey: 'demo.market.tr',
    cityKey: 'demo.city.ankara',
    contactKey: 'demo.contact.yilmaz',
    contactRoleKey: 'demo.title.pm',
    industryKey: 'demo.industry.inverter',
    scale: 150,
    ownerKey: 'demo.owner.zhoumu',
    sourceKey: 'demo.source.expo',
    createdAt: '2026-07-15',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o4-1',
        name: 'Anatolia · 2026 inverter OEM trial order',
        createdAt: '2026-07-16',
        intendedProductId: '4',
        intent: 'b',
        stage: 'first',
        amountMinor: 26000000,
        expectedClose: '2026-12-15',
        nextFollowUp: '2026-10-08',
        lastFollowUp: '2026-09-15',
        ownerKey: 'demo.owner.zhoumu',
        bantKey: 'demo.bant.b2',
        competitionKey: 'demo.comp.local',
        followSummaryKey: 'demo.follow.o4-1',
      },
    ],
  },
  {
    id: '5',
    name: 'Atacama Mining SpA',
    type: 'prospect',
    tier: 'c',
    countryKey: 'demo.market.cl',
    cityKey: 'demo.city.copiapo',
    contactKey: 'demo.contact.rojas',
    contactRoleKey: 'demo.title.buyer',
    industryKey: 'demo.industry.mining',
    scale: 90,
    ownerKey: 'demo.owner.unassigned',
    sourceKey: 'demo.source.customs',
    createdAt: '2026-09-02',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o5-1',
        name: 'Atacama · site power cabinet inquiry',
        createdAt: '2026-09-02',
        intendedProductId: '1',
        intent: 'c',
        // 2026-09-25：「待建联」这一段被去掉，原本落在这一段的唯一一条并进「首触」。
        stage: 'first',
        amountMinor: 7600000,
        expectedClose: '2027-01-30',
        nextFollowUp: '2026-10-02',
        lastFollowUp: '2026-09-02',
        ownerKey: 'demo.owner.unassigned',
        bantKey: 'demo.bant.c2',
        competitionKey: 'demo.comp.price',
        followSummaryKey: 'demo.follow.o5-1',
      },
    ],
  },
  {
    id: '6',
    name: 'Baltic Power OÜ',
    type: 'first',
    tier: 'b',
    countryKey: 'demo.market.ee',
    cityKey: 'demo.city.tallinn',
    contactKey: 'demo.contact.tamm',
    contactRoleKey: 'demo.title.supply',
    industryKey: 'demo.industry.storage',
    scale: 120,
    ownerKey: 'demo.owner.linlan',
    sourceKey: 'demo.source.expo',
    createdAt: '2025-06-08',
    lastDealAt: '2026-06-21',
    opportunities: [
      {
        id: 'o6-1',
        name: 'Baltic Power · 2026 winter storage restock',
        createdAt: '2026-04-08',
        intendedProductId: '2',
        intent: 'b',
        stage: 'nurture',
        amountMinor: 34000000,
        expectedClose: '2026-11-15',
        nextFollowUp: '2026-10-10',
        lastFollowUp: '2026-09-10',
        ownerKey: 'demo.owner.linlan',
        bantKey: 'demo.bant.b1',
        competitionKey: 'demo.comp.none',
        followSummaryKey: 'demo.follow.o6-1',
      },
    ],
  },
  {
    id: '7',
    name: 'Helios Enerji Ltd',
    type: 'prospect',
    tier: 'b',
    countryKey: 'demo.market.tr',
    cityKey: 'demo.city.istanbul',
    contactKey: 'demo.contact.kaya',
    contactRoleKey: 'demo.title.biz',
    industryKey: 'demo.industry.solar',
    scale: 60,
    ownerKey: 'demo.owner.zhoumu',
    sourceKey: 'demo.source.social',
    createdAt: '2026-09-01',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o7-1',
        name: 'Helios · distributor kit first order',
        createdAt: '2026-09-01',
        intendedProductId: '3',
        intent: 'b',
        stage: 'first',
        amountMinor: 12800000,
        expectedClose: '2026-12-05',
        nextFollowUp: '2026-10-01',
        lastFollowUp: '2026-09-14',
        ownerKey: 'demo.owner.zhoumu',
        bantKey: 'demo.bant.b2',
        competitionKey: 'demo.comp.local',
        followSummaryKey: 'demo.follow.o7-1',
      },
    ],
  },
  {
    id: '8',
    name: 'Aurora Borealis AS',
    type: 'repeat',
    tier: 's',
    countryKey: 'demo.market.no',
    cityKey: 'demo.city.oslo',
    contactKey: 'demo.contact.solberg',
    contactRoleKey: 'demo.title.cpo',
    industryKey: 'demo.industry.storage',
    scale: 1240,
    ownerKey: 'demo.owner.echo',
    sourceKey: 'demo.source.expo',
    createdAt: '2024-04-02',
    lastDealAt: '2026-09-05',
    opportunities: [
      {
        id: 'o8-1',
        name: 'Aurora · 2027 frame supply framework',
        createdAt: '2026-01-20',
        intendedProductId: '2',
        intent: 'a',
        stage: 'negotiate',
        amountMinor: 326000000,
        expectedClose: '2026-11-08',
        nextFollowUp: '2026-09-29',
        lastFollowUp: '2026-09-20',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a2',
        competitionKey: 'demo.comp.incumbent',
        followSummaryKey: 'demo.follow.o8-1',
      },
      {
        id: 'o8-2',
        name: 'Aurora · portable storage retail bundle',
        createdAt: '2026-01-06',
        intendedProductId: '1',
        intent: 'a',
        stage: 'accepted',
        amountMinor: 184000000,
        expectedClose: '2026-09-05',
        nextFollowUp: '2026-09-25',
        lastFollowUp: '2026-09-13',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.incumbent',
        followSummaryKey: 'demo.follow.o8-2',
      },
    ],
  },
  {
    id: '9',
    name: 'Kalahari Solar (Pty) Ltd',
    type: 'prospect',
    tier: 'c',
    countryKey: 'demo.market.za',
    cityKey: 'demo.city.johannesburg',
    contactKey: 'demo.contact.nkosi',
    contactRoleKey: 'demo.title.engineer',
    industryKey: 'demo.industry.charging',
    scale: 40,
    ownerKey: 'demo.owner.linlan',
    sourceKey: 'demo.source.email',
    createdAt: '2026-08-19',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o9-1',
        name: 'Kalahari · charging pile distributor query',
        createdAt: '2026-08-20',
        intendedProductId: '5',
        intent: 'c',
        stage: 'nurture',
        amountMinor: 5400000,
        expectedClose: '2027-02-10',
        nextFollowUp: '2026-10-20',
        lastFollowUp: '2026-09-08',
        ownerKey: 'demo.owner.linlan',
        bantKey: 'demo.bant.c1',
        competitionKey: 'demo.comp.local',
        followSummaryKey: 'demo.follow.o9-1',
      },
    ],
  },
  {
    id: '10',
    name: 'Manila Grid Solutions Inc.',
    type: 'prospect',
    tier: 'b',
    countryKey: 'demo.market.ph',
    cityKey: 'demo.city.manila',
    contactKey: 'demo.contact.santos',
    contactRoleKey: 'demo.title.ops',
    industryKey: 'demo.industry.solar',
    scale: 210,
    ownerKey: 'demo.owner.zhoumu',
    sourceKey: 'demo.source.customs',
    createdAt: '2026-07-28',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o10-1',
        name: 'Manila Grid · island microgrid package',
        createdAt: '2026-07-29',
        intendedProductId: '3',
        intent: 'b',
        stage: 'proposal',
        amountMinor: 61500000,
        expectedClose: '2026-11-20',
        nextFollowUp: '2026-10-05',
        lastFollowUp: '2026-09-11',
        ownerKey: 'demo.owner.zhoumu',
        bantKey: 'demo.bant.b1',
        competitionKey: 'demo.comp.price',
        followSummaryKey: 'demo.follow.o10-1',
      },
    ],
  },
  {
    id: '11',
    name: 'Vistula Energy Sp. z o.o.',
    type: 'first',
    tier: 'd',
    countryKey: 'demo.market.pl',
    cityKey: 'demo.city.warsaw',
    contactKey: 'demo.contact.nowak',
    contactRoleKey: 'demo.title.buyer',
    industryKey: 'demo.industry.inverter',
    scale: 75,
    ownerKey: 'demo.owner.linlan',
    sourceKey: 'demo.source.expo',
    createdAt: '2024-09-30',
    lastDealAt: '2025-11-14',
    opportunities: [
      {
        id: 'o11-1',
        name: 'Vistula · 2025 spare parts top-up',
        createdAt: '2024-12-03',
        intendedProductId: '4',
        intent: 'd',
        stage: 'lost',
        amountMinor: 9600000,
        expectedClose: '2025-11-14',
        nextFollowUp: '2026-10-15',
        lastFollowUp: '2026-06-20',
        ownerKey: 'demo.owner.linlan',
        bantKey: 'demo.bant.d1',
        competitionKey: 'demo.comp.incumbent',
        followSummaryKey: 'demo.follow.o11-1',
      },
    ],
  },
  {
    id: '12',
    name: 'Atelier Lumière SAS',
    type: 'first',
    tier: 'c',
    countryKey: 'demo.market.fr',
    cityKey: 'demo.city.lyon',
    contactKey: 'demo.contact.laurent',
    contactRoleKey: 'demo.title.founder',
    industryKey: 'demo.industry.charging',
    scale: 28,
    ownerKey: 'demo.owner.zhoumu',
    sourceKey: 'demo.source.email',
    createdAt: '2025-09-11',
    lastDealAt: '2026-02-27',
    opportunities: [
      {
        id: 'o12-1',
        name: 'Atelier Lumière · boutique wallbox restock',
        createdAt: '2026-08-26',
        intendedProductId: '5',
        intent: 'c',
        stage: 'first',
        amountMinor: 8800000,
        expectedClose: '2027-01-15',
        nextFollowUp: '2026-09-30',
        lastFollowUp: '2026-09-13',
        ownerKey: 'demo.owner.zhoumu',
        bantKey: 'demo.bant.c1',
        competitionKey: 'demo.comp.none',
        followSummaryKey: 'demo.follow.o12-1',
      },
    ],
  },
  {
    id: '13',
    name: 'Solaris Andina S.A.C.',
    type: 'prospect',
    tier: 'c',
    countryKey: 'demo.market.pe',
    cityKey: 'demo.city.lima',
    contactKey: 'demo.contact.quiroz',
    contactRoleKey: 'demo.title.pm',
    industryKey: 'demo.industry.solar',
    scale: 55,
    ownerKey: 'demo.owner.zhoumu',
    sourceKey: 'demo.source.customs',
    createdAt: '2026-06-10',
    lastDealAt: null,
    opportunities: [
      {
        id: 'o13-1',
        name: 'Solaris Andina · community solar pilot',
        createdAt: '2026-06-12',
        intendedProductId: '3',
        intent: 'b',
        stage: 'nurture',
        amountMinor: 17200000,
        expectedClose: '2026-12-30',
        nextFollowUp: '2026-10-18',
        lastFollowUp: '2026-09-06',
        ownerKey: 'demo.owner.zhoumu',
        bantKey: 'demo.bant.b2',
        competitionKey: 'demo.comp.local',
        followSummaryKey: 'demo.follow.o13-1',
      },
    ],
  },
  {
    id: '14',
    name: 'Rheinland Speicher AG',
    type: 'repeat',
    tier: 'a',
    countryKey: 'demo.market.de',
    cityKey: 'demo.city.cologne',
    contactKey: 'demo.contact.brandt',
    contactRoleKey: 'demo.title.procurement',
    industryKey: 'demo.industry.storage',
    scale: 520,
    ownerKey: 'demo.owner.echo',
    sourceKey: 'demo.source.website',
    createdAt: '2023-11-08',
    lastDealAt: '2026-07-22',
    opportunities: [
      {
        id: 'o14-1',
        name: 'Rheinland · 2026 H2 frame renewal',
        createdAt: '2026-02-27',
        intendedProductId: '2',
        intent: 'a',
        stage: 'delivering',
        amountMinor: 132000000,
        expectedClose: '2026-07-22',
        nextFollowUp: '2026-10-10',
        lastFollowUp: '2026-09-19',
        ownerKey: 'demo.owner.echo',
        bantKey: 'demo.bant.a1',
        competitionKey: 'demo.comp.incumbent',
        followSummaryKey: 'demo.follow.o14-1',
      },
    ],
  },
];

/**
 * 从国家 key（demo.market.{iso2}）取两位国家码（大写），用作客户编码前缀。
 */
export function countryIso2(countryKey: string): string {
  const tail = countryKey.split('.').pop() ?? '';
  return tail.toUpperCase();
}

/**
 * 负责人 key → 归属部门 / user id（数据权限范围的判据来源）。
 *
 * 为什么集中在此表而不是逐条写进 SEED：
 * 部门与 user id 都是**负责人的属性**，写进每条客户记录就等于复制了 14 遍 ——
 * 换一次负责人要改 14 处，漏一处就会出现"两个人的客户互相可见"的错数据。
 *
 * 「待分配」归审计部：无归属的行不该对任何业务部门可见，
 * 放在那里由配置中心显式授权才可见，符合"没人负责的数据默认不可见"的常识。
 */
const OWNER_DEPT: Readonly<Record<string, { deptKey: string; userId: string }>> = {
  'demo.owner.linlan': { deptKey: 'demo.dept.sales', userId: 'u.lin' },
  'demo.owner.zhoumu': { deptKey: 'demo.dept.channel', userId: 'u.zhou' },
  'demo.owner.echo': { deptKey: 'demo.dept.audit', userId: '' },
  'demo.owner.unassigned': { deptKey: 'demo.dept.audit', userId: '' },
};

/**
 * 客户编码 = 两位国家码 + 6 位客户序号（取 id 补零）。
 * 演示口径，集中生成，避免散落在每条记录里漂移（与《CRM字段配置表》客户编码规则一致）。
 */
export const CUSTOMERS: readonly CustomerRecord[] = CUSTOMERS_SEED.map((c) => ({
  ...c,
  code: `${countryIso2(c.countryKey)}${c.id.padStart(6, '0')}`,
  // 未登记的负责人兜底到审计部：判据里 fail-open（对所有人可见）是事故，
  // 故缺归属一律落到最受限的部门，由配置中心显式授权。
  deptKey: (OWNER_DEPT[c.ownerKey] ?? { deptKey: 'demo.dept.audit' }).deptKey,
  ownerId: OWNER_DEPT[c.ownerKey]?.userId ?? '',
}));

/** 联系人联系方式（列表页不展示，客户档案页展示）。 */
export const CONTACT_CHANNELS: Record<string, { phone: string; email: string }> = {
  '1': { phone: '+49 30 4401 2288', email: 'm.weber@nordwind-energie.de' },
  '2': { phone: '+84 28 3822 9014', email: 'minh.tran@saigonsolar.vn' },
  '3': { phone: '+1 415 555 0142', email: 'd.reyes@bluepeakstorage.com' },
  '4': { phone: '+90 312 468 5520', email: 'e.yilmaz@anatoliapower.com.tr' },
  '5': { phone: '+56 2 2940 1180', email: 'c.rojas@atacamamining.cl' },
  '6': { phone: '+372 6 611 220', email: 'kadri.tamm@balticpower.ee' },
  '7': { phone: '+90 212 355 7714', email: 's.kaya@heliosenerji.com' },
  '8': { phone: '+47 22 88 41 90', email: 'i.solberg@auroraborealis.no' },
  '9': { phone: '+27 11 883 4470', email: 't.nkosi@kalaharisolar.co.za' },
  '10': { phone: '+63 2 8804 2216', email: 'm.santos@manilagrid.ph' },
  '11': { phone: '+48 22 512 6678', email: 'p.nowak@vistulaenergy.pl' },
  '12': { phone: '+33 1 44 08 91 30', email: 'c.laurent@atelierlumiere.fr' },
  '13': { phone: '+51 1 615 2280', email: 'r.quiroz@solarisandina.pe' },
  '14': { phone: '+49 221 4709 332', email: 's.brandt@rheinland-speicher.de' },
};

/**
 * 一位联系人。
 *
 * 2026-10-07 新增。此前客户只有 `contactKey` / `contactRoleKey` 两个单值字段，
 * 于是"这个客户有几个对接人"在数据模型里根本无处安放 —— 一家客户有采购、有技术、
 * 有财务是常态，而模型只能说出一个名字。用户要"可添加多个联系人并设一个主联系人"，
 * 只能靠**给单值字段旁边再挂一张联系人表**来解决。
 *
 * 为什么不把 `contactKey` 改成数组：那会牵动客户列表 / 360 页 / 商机 / 跟进
 * 四个页面的读法（它们都读单值），改成一个数组后每个读点都要决定"取第几个"，
 * 而"主联系人"这个概念在改动前**不存在** —— 无从判定该取谁。
 * 现在的做法是：`contactKey` / `contactRoleKey` 继续表示**主联系人**
 * （页面照旧零改动），`CONTACTS` 补上其余联系人；主联系人由本表的 `primary` 标记。
 * 两处必须一致，`syncPrimaryContact` 是那个唯一的对齐点。
 *
 * `name` / `role` 是 i18n key 或**直接文本**：演示种子给 key（与既有
 * `contactKey` 同构），用户新增的给文本。两者都能显示 —— 本仓没配
 * `parseMissingKeyHandler`，i18next 查不到时原样返回入参（与 BANT 同一约定）。
 */
export interface ContactRecord {
  /** 行内唯一标识；与姓名无关，改名后仍是同一行 */
  id: string;
  /** 姓名：i18n key（演示种子）或人名文本（用户新增） */
  name: string;
  /** 职务：同上 */
  role: string;
  phone: string;
  email: string;
  /** 是否主联系人（**至多一个**） */
  primary: boolean;
}

/**
 * 客户 id → 联系人清单（2026-10-07）。
 *
 * 只给前 8 家客户多联系人，其余 6 家与 150 家未列的客户走
 * `contactsOf()` 的兜底：**由既有的 `contactKey` / `contactRoleKey` /
 * `CONTACT_CHANNELS` 现场合成一个人**。合成逻辑与种子清单走同一个函数
 * （`contactsOf`），故未列的客户不会出现"联系人区空白"。
 *
 * 第一条一律 `primary: true` —— 它就是记录里的主联系人，
 * 与 `CustomerRecord.contactKey` 是同一个人（见 `syncPrimaryContact`），
 * 所以这8 位的 `name` 直接复用 `demo.contact.*` 既有键，不另起一套。
 *
 * `name` / `role` 一律存key（不再写文本）：同页同一个人，页头一份、
 * 清单一份、编辑抽屉一份，**两套存法必然漂** —— 改名字漏一处就出现
 * "列表里叫 Jonas Brandt、抽屉里叫 j.brandt"。
 */
const EXTRA_CONTACTS: Readonly<Record<string, readonly Omit<ContactRecord, 'primary'>[]>> = {
  '1': [
    { id: 'c1-1', name: 'demo.contact.weber', role: 'demo.title.procurement', phone: '+49 30 4401 2288', email: 'm.weber@nordwind-energie.de' },
    { id: 'c1-2', name: 'demo.contact.jonasbrandt', role: 'demo.title.techlead', phone: '+49 30 4401 2291', email: 'j.brandt@nordwind-energie.de' },
    { id: 'c1-3', name: 'demo.contact.hoffmann', role: 'demo.title.finance', phone: '+49 30 4401 2270', email: 'k.hoffmann@nordwind-energie.de' },
  ],
  '2': [
    { id: 'c2-1', name: 'demo.contact.tran', role: 'demo.title.founder', phone: '+84 28 3822 9014', email: 'minh.tran@saigonsolar.vn' },
    { id: 'c2-2', name: 'demo.contact.lethuha', role: 'demo.title.buyer', phone: '+84 28 3822 9019', email: 'ha.le@saigonsolar.vn' },
  ],
  '3': [
    { id: 'c3-1', name: 'demo.contact.reyes', role: 'demo.title.opsvp', phone: '+1 415 555 0142', email: 'd.reyes@bluepeakstorage.com' },
    { id: 'c3-2', name: 'demo.contact.chen', role: 'demo.title.financedirector', phone: '+1 415 555 0148', email: 'a.chen@bluepeakstorage.com' },
  ],
  '4': [
    { id: 'c4-1', name: 'demo.contact.yilmaz', role: 'demo.title.pm', phone: '+90 312 468 5520', email: 'e.yilmaz@anatoliapower.com.tr' },
    { id: 'c4-2', name: 'demo.contact.kaya', role: 'demo.title.biz', phone: '+90 312 468 5528', email: 's.kaya@anatoliapower.com.tr' },
    { id: 'c4-3', name: 'demo.contact.demir', role: 'demo.title.engineer', phone: '+90 312 468 5533', email: 'm.demir@anatoliapower.com.tr' },
  ],
  '5': [
    { id: 'c5-1', name: 'demo.contact.rojas', role: 'demo.title.buyer', phone: '+56 2 2940 1180', email: 'c.rojas@atacamamining.cl' },
    { id: 'c5-2', name: 'demo.contact.fuentes', role: 'demo.title.maint', phone: '+56 2 2940 1187', email: 'd.fuentes@atacamamining.cl' },
  ],
  '6': [
    { id: 'c6-1', name: 'demo.contact.tamm', role: 'demo.title.supply', phone: '+372 6 611 220', email: 'kadri.tamm@balticpower.ee' },
    { id: 'c6-2', name: 'demo.contact.lepik', role: 'demo.title.engineer', phone: '+372 6 611 226', email: 'm.lepik@balticpower.ee' },
  ],
  '7': [
    { id: 'c7-1', name: 'demo.contact.kaya', role: 'demo.title.biz', phone: '+90 212 355 7714', email: 's.kaya@heliosenerji.com' },
    { id: 'c7-2', name: 'demo.contact.demirci', role: 'demo.title.ops', phone: '+90 212 355 7719', email: 'b.demirci@heliosenerji.com' },
  ],
  '8': [
    { id: 'c8-1', name: 'demo.contact.solberg', role: 'demo.title.cpo', phone: '+47 22 88 41 90', email: 'i.solberg@auroraborealis.no' },
    { id: 'c8-2', name: 'demo.contact.hansen', role: 'demo.title.techlead', phone: '+47 22 88 41 95', email: 'e.hansen@auroraborealis.no' },
  ],
};

/**
 * 某客户的联系人清单（种子清单与现场兜底的唯一入口）。
 *
 * 兜底分支为什么不能返回空数组：150 几家客户里只有 8 家写了多联系人，
 * 剩下的若返回空，`profile.tsx` 的联系人区就会整块消失 ——
 * 而这些客户**是有联系人的**（`contactKey` 就在记录里）。
 * "没登记"与"确实没有"在数据里长得一样，在页面上却是两回事。
 *
 * 合成的兜底联系人 id 固定为 `c<客户id>-0`（与种子清单的 `c1-1` 不同段），
 * 这样用户新增的行不会与它撞 id。
 */
export function contactsOf(customer: CustomerRecord): readonly ContactRecord[] {
  const seeded = EXTRA_CONTACTS[customer.id];
  if (seeded && seeded.length > 0) {
    return seeded.map((contact, index) => ({ ...contact, primary: index === 0 }));
  }
  const channels = CONTACT_CHANNELS[customer.id];
  return [
    {
      id: `c${customer.id}-0`,
      name: customer.contactKey,
      role: customer.contactRoleKey,
      phone: channels?.phone ?? '',
      email: channels?.email ?? '',
      primary: true,
    },
  ];
}

/**
 * 把联系人清单里的主联系人**回写成客户记录的两个单值字段**（唯一对齐点）。
 *
 * 为什么必须回写：`CustomerRecord.contactKey` / `contactRoleKey` 是页面各处
 * 读的单值字段（客户列表、360 页联系人区头部），它们与清单里 `primary: true`
 * 的那一位**指向同一个人**。用户在编辑抽屉里把主联系人从 A 换成 B，
 * 若不回写，360 页头部还会显示 A、联系人区里 B 挂着"主"标签 —— 同一页两种说法。
 *
 * 没有主联系人时（用户把唯一的联系人删光）返回**空对象**而不是清空这两个字段：
 * 它们是必填展示位，清空会让客户列表那一格空掉，
 * 而"没有主联系人"这件事本身应由**提示**表达，不该靠数据缺失表达。
 *
 * 因此**不收 CustomerRecord 形参** —— 调用方要回写的是那两个字段本身，
 * 传整条记录进来只会让人以为这里还要判原值（实际不需要：primary 一定找得到
 * 或一定找不到，二分法没有中间态）。
 */
export function syncPrimaryContact(
  contacts: readonly ContactRecord[],
): Partial<CustomerRecord> {
  const primary = contacts.find((contact) => contact.primary);
  if (!primary) {
    return {};
  }
  return { contactKey: primary.name, contactRoleKey: primary.role };
}
