/**
 * 跟进记录演示数据（`cus_follow_up`）—— §4.4「跟进记录」+ OP-CUS-02/09/10/11。
 *
 * 跟进记录是全站复用的事实表：商机中心的「意向等级重评」、客户中心的「健康度」、
 * 经营分析的「客户活跃度」都从这张表取数。因此它必须能被**按客户**穿透 ——
 * 客户 360 的那张四列表只是它的一个投影，不是另一份数据（见 profile.tsx）。
 *
 * 「沟通记录自动归档」（OP-CUS-11）在这里落成一个可见字段 `sourceKey`：
 * 邮件、WhatsApp、网站表单里产生的往来，由智能体归档成一条**待补充**的记录 ——
 * _contact 只记"发生了接触"，结果仍要人补一句。归档全自动、判读不全自动，
 * 这是"人机融合"而不是"无人值守"的区别（技术规约2.0 §3.6）。
 *
 * SLA：每条记录带"下一步跟进时间" `nextActionAt`，与锚点日比较出超期天数。
 * 超期不是靠人记 —— 跟进这件事的失败永远发生在"忘了"，而"忘了"在界面上
 * 表现为一条没人动的待办，没有任何提醒就等于默认允许遗忘。
 */

/** 日期锚点。与商机的 `OPP_TODAY` 同一天：两处的"今天"必须是同一天。 */
export const CUS_FOLLOW_TODAY = '2026-09-24';

/** 跟进方式。前四个是人主动发起的，第五个是系统自动归档的。 */
export type FollowChannel = 'call' | 'email' | 'whatsapp' | 'meeting' | 'auto';

/** 跟进结果：决定这条记录往哪个方向影响客户健康度。 */
export type FollowResult = 'positive' | 'neutral' | 'negative' | 'noAnswer';

/** 记录来源（OP-CUS-11 自动归档）。 */
export type FollowSource = 'manual' | 'email' | 'whatsapp' | 'webform';

export interface FollowRecord {
  id: string;
  customerId: string;
  channel: FollowChannel;
  /** 发生时间 `YYYY-MM-DD HH:mm` */
  at: string;
  ownerKey: string;
  /** 结果摘要的 i18n key（`cus.follow.result.*`） */
  resultKey: string;
  result: FollowResult;
  /** 下一步跟进时间 `YYYY-MM-DD`；无下一步为 null */
  nextActionAt: string | null;
  /** 下一步动作的 i18n key（`cus.follow.next.*`） */
  nextActionKey: string;
  /** 归档来源：自动归档的记录在列表里带来源标记 */
  source: FollowSource;
  /** 沟通时长（分钟） */
  minutes: number;
}

export const FOLLOW_RECORDS: readonly FollowRecord[] = [
  {
    id: 'FU-1001',
    customerId: '1',
    channel: 'meeting',
    at: '2026-09-24 10:30',
    ownerKey: 'demo.owner.echo',
    resultKey: 'quote',
    result: 'positive',
    nextActionAt: '2026-09-26',
    nextActionKey: 'quote',
    source: 'manual',
    minutes: 60,
  },
  {
    id: 'FU-1002',
    customerId: '2',
    channel: 'call',
    at: '2026-09-23 16:10',
    ownerKey: 'demo.owner.linlan',
    resultKey: 'sample',
    result: 'neutral',
    nextActionAt: '2026-09-29',
    nextActionKey: 'sample',
    source: 'manual',
    minutes: 25,
  },
  {
    id: 'FU-1003',
    customerId: '3',
    channel: 'auto',
    at: '2026-09-23 09:05',
    ownerKey: 'demo.owner.zhoumu',
    resultKey: 'pending',
    result: 'neutral',
    nextActionAt: '2026-09-24',
    nextActionKey: 'quote',
    source: 'email',
    minutes: 0,
  },
  {
    id: 'FU-1004',
    customerId: '4',
    channel: 'whatsapp',
    at: '2026-09-22 20:40',
    ownerKey: 'demo.owner.echo',
    resultKey: 'delay',
    result: 'negative',
    nextActionAt: '2026-09-25',
    nextActionKey: 'delay',
    source: 'whatsapp',
    minutes: 15,
  },
  {
    id: 'FU-1005',
    customerId: '5',
    channel: 'email',
    at: '2026-09-22 08:20',
    ownerKey: 'demo.owner.linlan',
    resultKey: 'spec',
    result: 'positive',
    nextActionAt: null,
    nextActionKey: 'none',
    source: 'email',
    minutes: 0,
  },
  {
    id: 'FU-1006',
    customerId: '1',
    channel: 'call',
    at: '2026-09-20 14:00',
    ownerKey: 'demo.owner.echo',
    resultKey: 'visit',
    result: 'positive',
    nextActionAt: '2026-09-24',
    nextActionKey: 'quote',
    source: 'manual',
    minutes: 35,
  },
  {
    id: 'FU-1007',
    customerId: '2',
    channel: 'auto',
    at: '2026-09-19 11:48',
    ownerKey: 'demo.owner.zhoumu',
    resultKey: 'pending',
    result: 'neutral',
    nextActionAt: '2026-09-23',
    nextActionKey: 'sample',
    source: 'webform',
    minutes: 0,
  },
  {
    id: 'FU-1008',
    customerId: '3',
    channel: 'meeting',
    at: '2026-09-18 15:30',
    ownerKey: 'demo.owner.zhoumu',
    resultKey: 'demo',
    result: 'positive',
    nextActionAt: '2026-09-25',
    nextActionKey: 'demo',
    source: 'manual',
    minutes: 90,
  },
  {
    id: 'FU-1009',
    customerId: '4',
    channel: 'call',
    at: '2026-09-15 09:15',
    ownerKey: 'demo.owner.echo',
    resultKey: 'noReply',
    result: 'noAnswer',
    nextActionAt: '2026-09-22',
    nextActionKey: 'delay',
    source: 'manual',
    minutes: 10,
  },
  {
    id: 'FU-1010',
    customerId: '5',
    channel: 'whatsapp',
    at: '2026-09-14 17:05',
    ownerKey: 'demo.owner.linlan',
    resultKey: 'cert',
    result: 'neutral',
    nextActionAt: '2026-09-28',
    nextActionKey: 'cert',
    source: 'whatsapp',
    minutes: 20,
  },
];

/**
 * 客户名直接取 `data.ts` 的 `CustomerRecord.name`（专名，不进 i18n）。
 * 这里只导出取法，不缓存整张表 —— 客户主数据在 `data.ts`，本文件只做引用。
 */
export function customerNames(customers: readonly { id: string; name: string }[]): Map<string, string> {
  return new Map(customers.map((customer) => [customer.id, customer.name]));
}

/** 下一步跟进日距锚点日的天数；负 = 已超期。 */
export function daysUntil(date: string, today = CUS_FOLLOW_TODAY): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** 超期待跟进（按超期天数倒序）。 */
export function overdueRecords(
  records: readonly FollowRecord[],
): readonly FollowRecord[] {
  return records
    .filter((record) => record.nextActionAt !== null && daysUntil(record.nextActionAt) < 0)
    .sort((a, b) => (a.nextActionAt ?? '').localeCompare(b.nextActionAt ?? ''));
}

/** 今日待跟进。 */
export function dueToday(
  records: readonly FollowRecord[],
): readonly FollowRecord[] {
  return records.filter(
    (record) => record.nextActionAt !== null && daysUntil(record.nextActionAt) === 0,
  );
}

/** 跟进模板：新记录的高频起点（OP-CUS-10）。key 走 i18n。 */
/* 类型上是「非空元组」而不是数组：页面要把首个模板当默认值预选中，
 * 数组下标会带 `| undefined`，首屏就出现一个没有高亮的模板条。 */
export const FOLLOW_TEMPLATES: readonly [{ key: string; nextKey: string }, ...{ key: string; nextKey: string }[]] = [
  { key: 'quote', nextKey: 'quote' },
  { key: 'sample', nextKey: 'sample' },
  { key: 'demo', nextKey: 'demo' },
  { key: 'cert', nextKey: 'cert' },
  { key: 'visit', nextKey: 'visit' },
  { key: 'delay', nextKey: 'delay' },
];
