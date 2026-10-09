/**
 * 网站访客识别演示数据（`mkg_visitor`）—— §2.8「访客识别与流量转化」。
 *
 * 这一页盯的是"来的都是谁"。三类数据源里只有网站访客这一路是**外部流量进来的活人**：
 * 海关数据有价值但它是死的，社媒数据有名而无针对性，访客则是唯一会自己找上门的。
 *
 * 关键产品判断：**识别本身不产生价值，识别出来没人跟才是真的白识别。**
 * 所以本页的主动作是「一键触达」，而不是"看看今天来了谁"。
 * 匹配不到内部对象时新建的是**线索**而不是客户 —— 客户是成交事实的载体
 * （§2.5 弱化潜客：客户类型由成交次数决定），凭一次页面浏览就建客户，
 * 等于用一个浏览量伪造了一个成交主体，下游所有"客户分层"都会跟着错。
 *
 * "可识别率"的量级是 30%–40% 而不是 100%：官网每天来的大多是找参数的、比价的、
 * 同行调研的，库里没有就是没有。把 100% 设成目标，会逼出一堆瞎猜的公司映射。
 *
 * 为什么用「浏览页数 ≥ 2」当待触达的门槛而不是"最近访问时间"：
 * 只看时间的话，回访三次深度浏览一行、和随手点开首页就走的一行是同等的；
 * 深度浏览才是"他在认真看"的信号。停留时长同理，只能辅助、不能单独当判据
 * （后台挂着不动的人停留时长会很长，但他什么都没点）。
 *
 * 时间用 `lastAt` 一个字段而不是"首访/末访"两个：首访只对召回有意义，
 * 而召回需要的是"上次来是什么时候"，两个字段在演示数据里只会互相矛盾。
 */

export type VisitorMatch = 'unknown' | 'lead' | 'customer';

export type VisitorSource = 'organic' | 'paid' | 'referral' | 'social' | 'email';

export interface VisitorSession {
  id: string;
  /** 公司展示名 key 后缀（`mkg.vis.company.*`） */
  companyKey: string;
  /** 官网域名：语言中立标识，不翻译 */
  domain: string;
  /** 国家 / 地区 key 后缀（`mkg.vis.region.*`） */
  regionKey: string;
  /** 最近一次到访 `YYYY-MM-DD HH:mm` */
  lastAt: string;
  /** 本次会话浏览页数 */
  pageViews: number;
  /** 停留分钟数 */
  stayMinutes: number;
  /** 浏览过的关键页 key 后缀（`mkg.vis.page.*`） */
  interestKeys: readonly string[];
  source: VisitorSource;
  /** 匹配到的内部对象；`unknown` 表示库里没有这个公司 */
  match: VisitorMatch;
  matchedId: string | null;
  /** 是否留资（填了表单） */
  formFilled: boolean;
  /** 是否已有跟进动作（本页 state 会改它） */
  reached: boolean;
}

/** 与排期日历、社媒账号同一锚点：演示数据不依赖系统当前时间。 */
export const MKG_VISITOR_TODAY = '2026-09-24';

export const VISITOR_SESSIONS: readonly VisitorSession[] = [
  {
    id: 'VS-4101',
    companyKey: 'northbridge',
    domain: 'northbridge-energy.de',
    regionKey: 'de',
    lastAt: '2026-09-24 09:12',
    pageViews: 5,
    stayMinutes: 11,
    interestKeys: ['p2000', 'cert', 'contact'],
    source: 'organic',
    match: 'customer',
    matchedId: 'CUS-1007',
    formFilled: true,
    reached: true,
  },
  {
    id: 'VS-4102',
    companyKey: 'zaneli',
    domain: 'zaneli.pl',
    regionKey: 'pl',
    lastAt: '2026-09-24 08:40',
    pageViews: 4,
    stayMinutes: 8,
    interestKeys: ['inverter', 'case'],
    source: 'paid',
    match: 'unknown',
    matchedId: null,
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4103',
    companyKey: 'atlasrock',
    domain: 'atlasrock.com.au',
    regionKey: 'au',
    lastAt: '2026-09-23 21:05',
    pageViews: 3,
    stayMinutes: 6,
    interestKeys: ['inverter', 'pricing'],
    source: 'referral',
    match: 'unknown',
    matchedId: null,
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4104',
    companyKey: 'greenline',
    domain: 'greenline.nl',
    regionKey: 'nl',
    lastAt: '2026-09-23 16:31',
    pageViews: 7,
    stayMinutes: 18,
    interestKeys: ['p2000', 'inverter', 'case', 'cert'],
    source: 'email',
    match: 'lead',
    matchedId: 'LD-3021',
    formFilled: true,
    reached: false,
  },
  {
    id: 'VS-4105',
    companyKey: 'meridiana',
    domain: 'meridiana.sa',
    regionKey: 'sa',
    lastAt: '2026-09-23 11:18',
    pageViews: 2,
    stayMinutes: 3,
    interestKeys: ['p2000'],
    source: 'social',
    match: 'unknown',
    matchedId: null,
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4106',
    companyKey: 'voltix',
    domain: 'voltix.pt',
    regionKey: 'pt',
    lastAt: '2026-09-22 14:47',
    pageViews: 4,
    stayMinutes: 9,
    interestKeys: ['inverter', 'contact'],
    source: 'organic',
    match: 'unknown',
    matchedId: null,
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4107',
    companyKey: 'harvestpower',
    domain: 'harvestpower.com.br',
    regionKey: 'br',
    lastAt: '2026-09-22 10:02',
    pageViews: 6,
    stayMinutes: 14,
    interestKeys: ['inverter', 'case', 'pricing'],
    source: 'paid',
    match: 'customer',
    matchedId: 'CUS-1012',
    formFilled: true,
    reached: true,
  },
  {
    id: 'VS-4108',
    companyKey: 'kestrelhome',
    domain: 'kestrelhome.co.uk',
    regionKey: 'uk',
    lastAt: '2026-09-21 19:26',
    pageViews: 3,
    stayMinutes: 5,
    interestKeys: ['p2000', 'case'],
    source: 'organic',
    match: 'unknown',
    matchedId: null,
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4109',
    companyKey: 'orbitalia',
    domain: 'orbitalia.mx',
    regionKey: 'mx',
    lastAt: '2026-09-21 13:09',
    pageViews: 2,
    stayMinutes: 4,
    interestKeys: ['cert'],
    source: 'referral',
    match: 'lead',
    matchedId: 'LD-3018',
    formFilled: false,
    reached: false,
  },
  {
    id: 'VS-4110',
    companyKey: 'fairmontgrid',
    domain: 'fairmontgrid.ie',
    regionKey: 'ie',
    lastAt: '2026-09-20 15:53',
    pageViews: 5,
    stayMinutes: 12,
    interestKeys: ['p2000', 'inverter', 'contact'],
    source: 'email',
    match: 'customer',
    matchedId: 'CUS-1003',
    formFilled: true,
    reached: true,
  },
];

/** 待触达：浏览 ≥ 2 页、且还没有人跟进的。按浏览页数降序 —— 深度优先。 */
export function pendingReach(sessions: readonly VisitorSession[]): readonly VisitorSession[] {
  return sessions
    .filter((session) => !session.reached && session.pageViews >= 2)
    .slice()
    .sort((a, b) => b.pageViews - a.pageViews || a.lastAt.localeCompare(b.lastAt));
}

/** 可识别率：匹配到内部对象（客户或线索）的会话占比。 */
export function knownRatio(sessions: readonly VisitorSession[]): number {
  if (sessions.length === 0) {
    return 0;
  }
  const known = sessions.filter((session) => session.match !== 'unknown').length;
  return Math.round((known / sessions.length) * 100);
}
