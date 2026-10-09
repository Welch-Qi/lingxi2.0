/**
 * 内容排期演示数据（`mkg_schedule`）—— 《产品规划说明书V2.1》§2.8「内容分发与排期」。
 *
 * 排期与分发的分工（**不是同一个东西换皮肤**）：
 *   · `/marketing/distribute` 回答"**发出去了没有**" —— 结果是触达与点击的汇总；
 *   · `/marketing/calendar`   回答"**什么时候发出去**" —— 结果是时间与渠道的承诺。
 * 排期表一旦按下去要被人依赖（"这条 9 月 25 日发欧洲"），
 * 所以这一页的第一等材料是**时间**与**时区**，而不是标题。
 *
 * 时区的必要性：海外运营是跨时区排的，同一条内容给柏林与美国东岸的粉丝发，
 * 当地时间是两个时刻。用浏览器本地时间排期会把"当地早上 9 点"排成"北京时间晚上 9 点"，
 * 于是内容发在对方的下班时间。故每条排期都记 `time`（当地时刻）+ `tzKey`（IANA 时区），
 * 展示时两者一起出现，不单独显示其中一个。
 *
 * 日期锚点与全站演示数据一致（`OPP_TODAY` 的做法）：写死而不是 `new Date()`，
 * 否则演示数据会随时间"漂走"，导致上周的排期突然出现在本周日历里。
 */

import type { ChannelKey } from './data';

/** 排期状态。前三个是"人还没放手"的状态，后两个是"已经落地"的状态。 */
export type ScheduleStatus = 'review' | 'scheduled' | 'publishing' | 'published' | 'postponed';

export type ContentType = 'video' | 'graphic';

export interface ScheduleItem {
  id: string;
  /** 内容标题的 i18n key（内容本身归生产段，这里只引用） */
  titleKey: string;
  channelKey: ChannelKey;
  /** 目标市场当地日期，`YYYY-MM-DD` */
  date: string;
  /** 目标市场当地时刻，`HH:mm` */
  time: string;
  /** IANA 时区标识（语言中立，不入 i18n） */
  zone: string;
  status: ScheduleStatus;
  type: ContentType;
  /** 语言版本，key 后缀（与商品素材库同一套语种：zh-CN / en-US / ja-JP / ar-AE） */
  langs: readonly string[];
  /** 负责人 key 后缀（复用 `demo.owner.*`） */
  ownerKey: string;
}

/** 演示数据锚点日：与 `OPP_TODAY` 同一天，保证"今天"落在锚点那一周内。 */
export const MKG_SCHEDULE_TODAY = '2026-09-24';

/** 日历展示的那一周（周一为首日）。 */
export const CALENDAR_WEEK: readonly string[] = [
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
];

/** 时区的展示名 key 后缀 → IANA 标识。加时区时这里与语言包要一起改。 */
export const SCHEDULE_ZONES: readonly { key: string; zone: string }[] = [
  { key: 'berlin', zone: 'Europe/Berlin' },
  { key: 'newyork', zone: 'America/New_York' },
  { key: 'shanghai', zone: 'Asia/Shanghai' },
];

export const SCHEDULE_ITEMS: readonly ScheduleItem[] = [
  // 已落地：本周已排期的部分
  { id: 'CT-8821', titleKey: 'mkg.item.v1.title', channelKey: 'tiktok', date: '2026-09-21', time: '11:30', zone: 'Europe/Berlin', status: 'published', type: 'video', langs: ['zh-CN', 'en-US'], ownerKey: 'echo' },
  { id: 'CT-8817', titleKey: 'mkg.asset.r1.title', channelKey: 'instagram', date: '2026-09-21', time: '18:00', zone: 'Asia/Shanghai', status: 'published', type: 'graphic', langs: ['en-US'], ownerKey: 'linlan' },
  { id: 'CT-8816', titleKey: 'mkg.asset.r2.title', channelKey: 'youtube', date: '2026-09-22', time: '09:00', zone: 'America/New_York', status: 'published', type: 'video', langs: ['en-US', 'ja-JP'], ownerKey: 'zhoumu' },
  { id: 'CT-8815', titleKey: 'mkg.content.r2', channelKey: 'linkedin', date: '2026-09-22', time: '08:30', zone: 'Europe/Berlin', status: 'published', type: 'video', langs: ['en-US'], ownerKey: 'echo' },
  { id: 'CT-8814', titleKey: 'mkg.content.r1', channelKey: 'facebook', date: '2026-09-23', time: '14:00', zone: 'America/New_York', status: 'publishing', type: 'graphic', langs: ['en-US', 'ar-AE'], ownerKey: 'linlan' },
  // 待发
  { id: 'CT-8824', titleKey: 'mkg.item.v1.title', channelKey: 'tiktok', date: '2026-09-23', time: '20:00', zone: 'Asia/Shanghai', status: 'scheduled', type: 'video', langs: ['zh-CN', 'en-US'], ownerKey: 'zhoumu' },
  { id: 'CT-8826', titleKey: 'mkg.asset.r2.title', channelKey: 'youtube', date: '2026-09-24', time: '21:00', zone: 'America/New_York', status: 'scheduled', type: 'video', langs: ['en-US'], ownerKey: 'echo' },
  { id: 'CT-8828', titleKey: 'mkg.asset.r1.title', channelKey: 'instagram', date: '2026-09-25', time: '16:00', zone: 'Asia/Shanghai', status: 'scheduled', type: 'graphic', langs: ['en-US', 'ja-JP'], ownerKey: 'linlan' },
  { id: 'CT-8831', titleKey: 'mkg.content.r2', channelKey: 'youtube', date: '2026-09-27', time: '10:00', zone: 'Asia/Shanghai', status: 'scheduled', type: 'video', langs: ['en-US'], ownerKey: 'zhoumu' },
  // 待审核：对外内容必须人审（技术规约2.0 §3.6 G4，自主度 ≤A1），故这批是日历上的高亮态
  { id: 'CT-8825', titleKey: 'mkg.item.v1.title', channelKey: 'instagram', date: '2026-09-24', time: '10:00', zone: 'Asia/Shanghai', status: 'review', type: 'graphic', langs: ['zh-CN', 'en-US'], ownerKey: 'echo' },
  { id: 'CT-8827', titleKey: 'mkg.content.r1', channelKey: 'linkedin', date: '2026-09-25', time: '09:00', zone: 'Europe/Berlin', status: 'review', type: 'graphic', langs: ['en-US'], ownerKey: 'linlan' },
  { id: 'CT-8829', titleKey: 'mkg.asset.r1.title', channelKey: 'facebook', date: '2026-09-26', time: '12:00', zone: 'America/New_York', status: 'review', type: 'graphic', langs: ['en-US', 'ar-AE'], ownerKey: 'zhoumu' },
  { id: 'CT-8832', titleKey: 'mkg.asset.r2.title', channelKey: 'linkedin', date: '2026-09-27', time: '15:00', zone: 'Europe/Berlin', status: 'review', type: 'video', langs: ['en-US'], ownerKey: 'echo' },
  // 改期过：说明"排期会动"，是日历上唯一需要解释的颜色
  { id: 'CT-8830', titleKey: 'mkg.content.r2', channelKey: 'instagram', date: '2026-09-26', time: '19:00', zone: 'Europe/Berlin', status: 'postponed', type: 'video', langs: ['en-US', 'ja-JP'], ownerKey: 'linlan' },
];

/** 某天（下标 0–6）的排期。 */
export function schedulesOfDay(day: string): readonly ScheduleItem[] {
  return SCHEDULE_ITEMS.filter((item) => item.date === day);
}

/** 某渠道某天的排期（泳道格子里的一张卡）。 */
export function schedulesOf(channelKey: ChannelKey, day: string): readonly ScheduleItem[] {
  return SCHEDULE_ITEMS.filter((item) => item.channelKey === channelKey && item.date === day);
}

/** 待审核队列（日历右栏那个高频动作列表）。 */
export function pendingReview(): readonly ScheduleItem[] {
  return SCHEDULE_ITEMS.filter((item) => item.status === 'review');
}

/** `HH:mm` 排序（同一天内按当地时刻排，不是按数组顺序）。 */
export function byTime(a: ScheduleItem, b: ScheduleItem): number {
  return a.time.localeCompare(b.time);
}
