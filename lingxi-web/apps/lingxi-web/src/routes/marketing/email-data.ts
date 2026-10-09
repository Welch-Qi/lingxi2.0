/**
 * 邮件营销（EDM）演示数据（`mkg_email_campaign`）—— §2.8「邮件与 WhatsApp 触达」的邮件部分。
 *
 * 这一页盯的是"这封信有没有真的到、到了有没有人看"。
 * 打开率人人都在做，但**决定一封信成败的是送达** —— §2.8 把"送达保障"写在
 * EDM 能力的第一位，退信率因此是本页的主指标，而不是列表里的小数。
 * 一封进垃圾箱的信，打开率再高也是编出来的：收件人根本没机会点。
 *
 * A/B 测试只比**主题行**，不比正文（§2.8 原文如此）。原因很实际：
 * 收件箱里能让一个人点开的就是那个标题，正文他未必看得到；
 * 而"给另一半人发另一版正文"在 B2B 外贸场景里会被读成骚扰。
 *
 * 因此 funnel 数据是**按变体分开记的**（`variants[0]` 是 A、`variants[1]` 是 B），
 * 不是"整封邮件一个打开数、再假装分成两半"。早先把它写成一份聚合数，
 * 结果 A/B 对照的差值恒等于 0 —— 页面上会显示"两者持平"，
 * 而持平是一个**看起来无害、实际是假的结论**：它就是读不出结论。
 *
 * 主题行在表里也展示：这是唯一能让人在列表里直接判断"这封该不该发"的字段。
 * 只放数字不放文案，等于把判断交给算法，而算法不背 KPI。
 *
 * 金额走最小单位整数 + ISO4217（与 `/order`、`/opportunity` 同一口径），
 * 展示层统一 `formatMoney`，数据里不放格式化好的字符串。
 */

export type MailStatus = 'sending' | 'sent' | 'draft' | 'paused';

/** 受众分组。key 走 i18n，展示名在 `mkg.mail.audience.*`。 */
export type MailAudience = 'all' | 'never' | 'dormant' | 'highIntent';

export interface MailVariant {
  /** 主题行 key（`mkg.mail.subject.*`）。 */
  subjectKey: string;
  delivered: number;
  opened: number;
  clicked: number;
  /** 退信数（硬退 + 软退） */
  bounced: number;
}

export interface MailCampaign {
  id: string;
  nameKey: string;
  /** `[A, B]` —— 两个主题行，各记一套漏斗。 */
  variants: readonly [MailVariant, MailVariant];
  audience: MailAudience;
  /** 受众人数（两份变体各自发给了多少个收件人） */
  audienceSize: number;
  /** 本期归因成交额（最小单位整数）。归因是触点级的，不是订单级的。 */
  amountMinor: number;
  currency: string;
  status: MailStatus;
  /** 发送日期 `YYYY-MM-DD`；草稿为空 */
  sentAt: string | null;
}

/** 与排期日历、社媒账号同一锚点：演示数据不依赖系统当前时间。 */
export const MKG_MAIL_TODAY = '2026-09-24';

/**
 * AI 写信的场景预设（§2.8「AI 写信」）。key 走 i18n。
 * 同 `FOLLOW_TEMPLATES`：类型上是非空元组而不是数组，首个预设即默认值，
 * 下标不带 `| undefined`。
 */
export const MAIL_PRESETS: readonly [{ key: string; nextKey: string }, ...{ key: string; nextKey: string }[]] = [
  { key: 'newProduct', nextKey: 'newProduct' },
  { key: 'quoteExpire', nextKey: 'quoteExpire' },
  { key: 'caseShare', nextKey: 'caseShare' },
  { key: 'certUpdate', nextKey: 'certUpdate' },
  { key: 'survey', nextKey: 'survey' },
];

export const MAIL_CAMPAIGNS: readonly MailCampaign[] = [
  {
    id: 'EDM-2201',
    nameKey: 'p2000Launch',
    variants: [
      { subjectKey: 'p2000A', delivered: 1_612, opened: 402, clicked: 71, bounced: 18 },
      { subjectKey: 'p2000B', delivered: 1_496, opened: 482, clicked: 55, bounced: 24 },
    ],
    audience: 'highIntent',
    audienceSize: 3_240,
    amountMinor: 186_400_00,
    currency: 'USD',
    status: 'sent',
    sentAt: '2026-09-18',
  },
  {
    id: 'EDM-2202',
    nameKey: 'q3Quote',
    variants: [
      { subjectKey: 'q3QuoteA', delivered: 902, opened: 198, clicked: 58, bounced: 11 },
      { subjectKey: 'q3QuoteB', delivered: 840, opened: 193, clicked: 39, bounced: 17 },
    ],
    audience: 'never',
    audienceSize: 1_860,
    amountMinor: 92_500_00,
    currency: 'USD',
    status: 'sent',
    sentAt: '2026-09-16',
  },
  {
    id: 'EDM-2203',
    nameKey: 'caseGermany',
    variants: [
      { subjectKey: 'caseGermanyA', delivered: 1_988, opened: 356, clicked: 47, bounced: 14 },
      { subjectKey: 'caseGermanyB', delivered: 1_978, opened: 355, clicked: 37, bounced: 17 },
    ],
    audience: 'dormant',
    audienceSize: 4_120,
    amountMinor: 47_800_00,
    currency: 'USD',
    status: 'sent',
    sentAt: '2026-09-12',
  },
  {
    id: 'EDM-2204',
    nameKey: 'certUpdate',
    variants: [
      { subjectKey: 'certUpdateA', delivered: 4_120, opened: 512, clicked: 29, bounced: 48 },
      { subjectKey: 'certUpdateB', delivered: 4_095, opened: 514, clicked: 29, bounced: 48 },
    ],
    audience: 'all',
    audienceSize: 8_640,
    amountMinor: 23_100_00,
    currency: 'USD',
    status: 'sending',
    sentAt: MKG_MAIL_TODAY,
  },
  {
    id: 'EDM-2205',
    nameKey: 'surveyQ4',
    variants: [
      { subjectKey: 'surveyA', delivered: 0, opened: 0, clicked: 0, bounced: 0 },
      { subjectKey: 'surveyB', delivered: 0, opened: 0, clicked: 0, bounced: 0 },
    ],
    audience: 'all',
    audienceSize: 8_640,
    amountMinor: 0,
    currency: 'USD',
    status: 'draft',
    sentAt: null,
  },
  {
    id: 'EDM-2206',
    nameKey: 'winterPrep',
    variants: [
      { subjectKey: 'winterPrepA', delivered: 1_504, opened: 241, clicked: 24, bounced: 39 },
      { subjectKey: 'winterPrepB', delivered: 1_476, opened: 212, clicked: 17, bounced: 35 },
    ],
    audience: 'highIntent',
    audienceSize: 3_240,
    amountMinor: 0,
    currency: 'USD',
    status: 'paused',
    sentAt: '2026-08-29',
  },
];

/** 合并两个变体得到整封邮件的漏斗。变体只是同一封信的两个标题，不是两封。 */
export function sumVariants(variants: readonly [MailVariant, MailVariant]): MailVariant {
  return {
    subjectKey: variants[0].subjectKey,
    delivered: variants[0].delivered + variants[1].delivered,
    opened: variants[0].opened + variants[1].opened,
    clicked: variants[0].clicked + variants[1].clicked,
    bounced: variants[0].bounced + variants[1].bounced,
  };
}

/** 打开率 %：分母是**送达**而不是受众 —— 没送到的那部分不该算进效果里。 */
export function openRate(variant: MailVariant): number {
  return variant.delivered === 0 ? 0 : (variant.opened / variant.delivered) * 100;
}

/** 点击率 %：分母同样是送达。 */
export function clickRate(variant: MailVariant): number {
  return variant.delivered === 0 ? 0 : (variant.clicked / variant.delivered) * 100;
}

/** 退信率 %：超过 3% 就要查域名信誉与列表清洗，不是"改标题"能解决的。 */
export function bounceRate(variant: MailVariant): number {
  return variant.delivered === 0 ? 0 : (variant.bounced / variant.delivered) * 100;
}

/** 一位小数就够：EDM 打开率在小数点后第二位上没有决策价值。 */
export function rateText(value: number): string {
  return `${value.toFixed(1)}%`;
}
