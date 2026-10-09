/**
 * 线索中心演示数据（`cus_lead` 字段口径取自《CRM字段配置表》选型1 · 弱化潜客）。
 *
 * 附件给线索的只有 4 个字段：lead_source 线索来源 / lead_contact 线索联系人 /
 * lead_time 线索时间 / lead_status 线索状态（待联系 · 已转化 · 无效，3 态）。
 * 这里额外带两样**不是线索本体字段**的东西：
 *   · `score` 线索评分 —— 对应功能清单 3.2「线索评分与分级」，分级由评分派生、不落库；
 *   · `convertedCustomerId` 转化回链 —— 对应 OP-LEAD-01，是线索与客户之间唯一的连接字段。
 *
 * 弱化潜客：线索核验合格后**直接建立客户主体**，不存在「潜客」这一层对象；
 * 「新潜客户 / 首次成交客户 / 复购客户」是**客户**类型的 3 档（`cus.type.*`，
 * 按客户级成交次数分），不是线索状态 —— 线索只有 待联系 / 已转化 / 无效 3 态。
 *
 * 文案一律走 i18n（规约 §4.10 / 附录D 规则10，ESLint 硬拦），故来源、联系人、
 * 负责人等一律存 key；这里只放专名、编码、日期、数字。
 */

/** 线索状态（`lead_status`，3 态） */
export type LeadStatus = 'pending' | 'converted' | 'invalid';

/** 线索分级（由评分派生，**不单独存储**，避免评分与分级两处漂移） */
export type LeadGrade = 'a' | 'b' | 'c' | 'd';

export interface LeadRecord {
  id: string;
  /** 线索名称（企业名）—— 未建档前只有名称，没有客户编码 */
  name: string;
  /** 线索编码 */
  code: string;
  /** `lead_source` 线索来源 key */
  sourceKey: string;
  /** `lead_contact` 线索联系人 key */
  contactKey: string;
  contactRoleKey: string;
  countryKey: string;
  cityKey: string;
  /** `lead_time` 线索时间 YYYY-MM-DD */
  registeredAt: string;
  /** `lead_status` 线索状态 */
  status: LeadStatus;
  /** 线索评分 0–100 */
  score: number;
  /**
   * 意向产品：`prd_product.id` 外键（单选）—— 2026-09-25 按用户要求进列表。
   *
   * 与商机上的同名字段（`Opportunity.intendedProductId`）是**同一个商品主数据**的外键，
   * 不是各自一份：线索阶段只是"他想要什么"的初判，转化成商机时直接继承，不改主键。
   * 故两边都用 `findProduct(id)` 换名称，商品改名时三处（商机中心 / 客户360 / 线索池）一起跟。
   */
  intendedProductId: string;
  ownerKey: string;
  /** 转化回链：核验合格后建成的客户主体 ID；未转化 / 无效为 null */
  convertedCustomerId: string | null;
  /** 最近一次触达 YYYY-MM-DD */
  lastTouchAt: string;
}

/** 状态取值序（分段筛选按它排序） */
export const STATUS_ORDER: readonly LeadStatus[] = ['pending', 'converted', 'invalid'];

/**
 * 「未分配负责人」在数据里的表示。
 *
 * 附件把"是否已分配"交给**负责人字段**表达（不占状态位），所以列表必须能判断出
 * "这条线索还没有人接" —— 操作列的「认领」只在这个条件下出现（用户裁决 2026-09-25）。
 * 用词条常量而不是就地写字符串：客户域也用同一个词条（`demo.owner.unassigned` = 待分配），
 * 两域口径一致，改词条只改一处。
 */
export const UNASSIGNED_OWNER_KEY = 'demo.owner.unassigned';

/**
 * 评分 → 分级（附件未规定阈值，此为本产品口径，写在一处供列表与看板共用）：
 * ≥80 A / ≥60 B / ≥40 C / 其余 D。
 */
export function leadGrade(score: number): LeadGrade {
  if (score >= 80) return 'a';
  if (score >= 60) return 'b';
  if (score >= 40) return 'c';
  return 'd';
}

export const GRADE_ORDER: readonly LeadGrade[] = ['a', 'b', 'c', 'd'];

/** 服务端口径的总数（与真实产品一致：计数由后端出，不是把当前页数出来）。 */
export const LEAD_AGGREGATE = {
  total: 86,
} as const;

/**
 * 数据集 = 第 1 页切片。
 *
 * `convertedCustomerId` 指向 customer/data.ts 里**客户类型为「新潜在客户」**的那几家
 * （2 / 4 / 5 / 9）—— 线索转化后第一次建档的客户正是新客户，这条对应关系是刻意的：
 * 存量老客户不可能由线索转化而来。
 */
const LEADS_SEED: Omit<LeadRecord, 'code'>[] = [
  {
    id: '1',
    name: 'Nordkraft Vest AS',
    sourceKey: 'demo.source.expo',
    contactKey: 'demo.contact.solberg',
    contactRoleKey: 'demo.title.opsvp',
    countryKey: 'demo.market.no',
    cityKey: 'demo.city.oslo',
    registeredAt: '2026-09-22',
    status: 'pending',
    score: 88,
    intendedProductId: '2',
    ownerKey: 'demo.owner.linlan',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-23',
  },
  {
    id: '2',
    name: 'Mekong Renewables JSC',
    sourceKey: 'demo.source.website',
    contactKey: 'demo.contact.tran',
    contactRoleKey: 'demo.title.techlead',
    countryKey: 'demo.market.vn',
    cityKey: 'demo.city.hochiminh',
    registeredAt: '2026-09-18',
    status: 'converted',
    score: 91,
    intendedProductId: '3',
    ownerKey: 'demo.owner.echo',
    convertedCustomerId: '2',
    lastTouchAt: '2026-09-20',
  },
  {
    id: '3',
    name: 'Bosporus Enerji A.Ş.',
    sourceKey: 'demo.source.email',
    contactKey: 'demo.contact.yilmaz',
    contactRoleKey: 'demo.title.pm',
    countryKey: 'demo.market.tr',
    cityKey: 'demo.city.ankara',
    registeredAt: '2026-09-16',
    status: 'converted',
    score: 76,
    intendedProductId: '4',
    ownerKey: 'demo.owner.zhoumu',
    convertedCustomerId: '4',
    lastTouchAt: '2026-09-19',
  },
  {
    id: '4',
    name: 'Kalahari Sun Trading (Pty) Ltd',
    sourceKey: 'demo.source.customs',
    contactKey: 'demo.contact.nkosi',
    contactRoleKey: 'demo.title.engineer',
    countryKey: 'demo.market.za',
    cityKey: 'demo.city.johannesburg',
    registeredAt: '2026-09-14',
    status: 'converted',
    score: 71,
    intendedProductId: '5',
    ownerKey: 'demo.owner.linlan',
    convertedCustomerId: '9',
    lastTouchAt: '2026-09-18',
  },
  {
    id: '5',
    name: 'Visayas Grid Corp.',
    sourceKey: 'demo.source.social',
    contactKey: 'demo.contact.santos',
    contactRoleKey: 'demo.title.ops',
    countryKey: 'demo.market.ph',
    cityKey: 'demo.city.manila',
    registeredAt: '2026-09-11',
    status: 'converted',
    score: 68,
    intendedProductId: '3',
    ownerKey: 'demo.owner.echo',
    convertedCustomerId: '10',
    lastTouchAt: '2026-09-15',
  },
  {
    id: '6',
    name: 'Atacama Lithium SpA',
    sourceKey: 'demo.source.expo',
    contactKey: 'demo.contact.rojas',
    contactRoleKey: 'demo.title.buyer',
    countryKey: 'demo.market.cl',
    cityKey: 'demo.city.copiapo',
    registeredAt: '2026-09-09',
    status: 'pending',
    score: 64,
    intendedProductId: '1',
    ownerKey: 'demo.owner.zhoumu',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-12',
  },
  {
    id: '7',
    name: 'Warta Energy S.A.',
    sourceKey: 'demo.source.website',
    contactKey: 'demo.contact.nowak',
    contactRoleKey: 'demo.title.buyer',
    countryKey: 'demo.market.pl',
    cityKey: 'demo.city.warsaw',
    registeredAt: '2026-09-05',
    status: 'pending',
    score: 57,
    intendedProductId: '4',
    ownerKey: 'demo.owner.linlan',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-08',
  },
  {
    id: '8',
    name: 'Rheintal Speicher GmbH',
    sourceKey: 'demo.source.expo',
    contactKey: 'demo.contact.brandt',
    contactRoleKey: 'demo.title.procurement',
    countryKey: 'demo.market.de',
    cityKey: 'demo.city.cologne',
    registeredAt: '2026-09-02',
    status: 'pending',
    score: 82,
    intendedProductId: '2',
    ownerKey: 'demo.owner.linlan',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-21',
  },
  {
    id: '9',
    name: 'Loire Solaire SAS',
    sourceKey: 'demo.source.email',
    contactKey: 'demo.contact.laurent',
    contactRoleKey: 'demo.title.founder',
    countryKey: 'demo.market.fr',
    cityKey: 'demo.city.lyon',
    registeredAt: '2026-08-28',
    status: 'pending',
    score: 45,
    intendedProductId: '3',
    ownerKey: 'demo.owner.echo',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-02',
  },
  {
    id: '10',
    name: 'Baltic Offshore OÜ',
    sourceKey: 'demo.source.social',
    contactKey: 'demo.contact.tamm',
    contactRoleKey: 'demo.title.supply',
    countryKey: 'demo.market.ee',
    cityKey: 'demo.city.tallinn',
    registeredAt: '2026-08-22',
    status: 'pending',
    score: 39,
    intendedProductId: '2',
    ownerKey: 'demo.owner.unassigned',
    convertedCustomerId: null,
    lastTouchAt: '2026-08-26',
  },
  {
    id: '11',
    name: 'Ostrava Battery s.r.o.',
    sourceKey: 'demo.source.customs',
    contactKey: 'demo.contact.nowak',
    contactRoleKey: 'demo.title.ops',
    countryKey: 'demo.market.pl',
    cityKey: 'demo.city.warsaw',
    registeredAt: '2026-08-18',
    status: 'pending',
    score: 33,
    intendedProductId: '2',
    ownerKey: 'demo.owner.unassigned',
    convertedCustomerId: null,
    lastTouchAt: '2026-08-18',
  },
  {
    id: '12',
    name: 'Ankara Depolama Ltd',
    sourceKey: 'demo.source.email',
    contactKey: 'demo.contact.kaya',
    contactRoleKey: 'demo.title.biz',
    countryKey: 'demo.market.tr',
    cityKey: 'demo.city.istanbul',
    registeredAt: '2026-08-13',
    status: 'invalid',
    score: 18,
    intendedProductId: '5',
    ownerKey: 'demo.owner.zhoumu',
    convertedCustomerId: null,
    lastTouchAt: '2026-08-15',
  },
  {
    id: '13',
    name: 'Pampas Power S.A.',
    sourceKey: 'demo.source.website',
    contactKey: 'demo.contact.quiroz',
    contactRoleKey: 'demo.title.pm',
    countryKey: 'demo.market.pe',
    cityKey: 'demo.city.lima',
    registeredAt: '2026-08-06',
    status: 'invalid',
    score: 12,
    intendedProductId: '3',
    ownerKey: 'demo.owner.echo',
    convertedCustomerId: null,
    lastTouchAt: '2026-08-09',
  },
  {
    id: '14',
    name: 'Alpine Netz AG',
    sourceKey: 'demo.source.expo',
    contactKey: 'demo.contact.brandt',
    contactRoleKey: 'demo.title.cpo',
    countryKey: 'demo.market.de',
    cityKey: 'demo.city.cologne',
    registeredAt: '2026-07-30',
    status: 'pending',
    score: 74,
    intendedProductId: '5',
    ownerKey: 'demo.owner.linlan',
    convertedCustomerId: null,
    lastTouchAt: '2026-09-11',
  },
];


/**
 * 线索来源 → 两位简称（线索编码前缀）。
 */
export const LEAD_SOURCE_2: Record<string, string> = {
  'demo.source.expo': 'EX',
  'demo.source.website': 'WE',
  'demo.source.email': 'EM',
  'demo.source.customs': 'CU',
  'demo.source.social': 'SO',
};

/**
 * 线索编码 = 来源两位简称 + 8 位注册日期（去横线）+ 4 位序号（取 id 补零）。
 * 演示口径，集中生成（与《CRM字段配置表》线索编码规则一致）。
 */
export const LEADS: readonly LeadRecord[] = LEADS_SEED.map((l) => ({
  ...l,
  code: `${LEAD_SOURCE_2[l.sourceKey]}${l.registeredAt.replace(/-/g, '')}${l.id.padStart(4, '0')}`,
}));
