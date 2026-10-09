/**
 * 营销总览日历事件源（营销中心总览页 /marketing）。
 *
 * 把三件独立的事并在一张日历上说话：
 *   · 活动（campaign）        —— 来自 `campaign-data.ts`，按 start~end 跨度展示
 *   · 内容发布计划（content）  —— 来自 `content-data.ts`，按 publishAt 单日展示
 *   · 关键事件（event）       —— 本文件内置的若干营销里程碑（演示数据）
 *
 * 三态口径（与用户需求一致，已完成 / 进行中 / 计划中）：
 *   · 活动：ended→done，running→running，draft|review→planned
 *   · 内容：done→done，producing→running，review→planned
 *   · 事件：按日期相对「今天」判定（过去=done，今天=running，未来=planned）
 *
 * 「今天」沿用演示世界锚点（日历锚点见 `MKT_CALENDAR_TODAY`，当前对齐到 2026-09-30；不用 new Date()），
 * 不用 new Date()，否则每次刷新日历高亮都跳）。
 *
 * 静态骨架：占位演示数据，接入后活动走 /api/v1/mkg/campaigns、内容走 /api/v1/mkg/contents。
 */

import { CAMPAIGNS } from './campaign-data';
import { CONTENT_ROWS } from './content-data';

export type MktCalCat = 'campaign' | 'content' | 'event';
export type MktCalState = 'done' | 'running' | 'planned';

export interface MktCalEvent {
  id: string;
  cat: MktCalCat;
  state: MktCalState;
  /** 标题 i18n key（活动=nameKey，内容=titleKey，事件=内置 key） */
  titleKey: string;
  /** 起始日（YYYY-MM-DD） */
  start: string;
  /** 结束日（仅活动跨度有；内容/事件为单日，无 end） */
  end?: string;
  /** 点击事件的跳转目标（活动→详情，内容→审核页） */
  href?: string;
}

/** 演示世界「今天」锚点（与用户核对当前日期 2026-09-30 对齐；不用 new Date()，避免每次刷新高亮跳变）。 */
export const MKT_CALENDAR_TODAY = '2026-09-30';

/** 关键事件（演示里程碑），真实接入后从营销日历接口取。 */
const KEY_EVENTS: readonly { id: string; titleKey: string; date: string }[] = [
  { id: 'ifa', titleKey: 'mkg.ov.event.ifa', date: '2026-09-05' },
  { id: 'midautumn', titleKey: 'mkg.ov.event.midautumn', date: '2026-09-24' },
  { id: 'storeLaunch', titleKey: 'mkg.ov.event.storeLaunch', date: '2026-10-08' },
  { id: 'double11', titleKey: 'mkg.ov.event.double11', date: '2026-11-01' },
  { id: 'blackfriday', titleKey: 'mkg.ov.event.blackfriday', date: '2026-11-20' },
  { id: 'q4Review', titleKey: 'mkg.ov.event.q4Review', date: '2026-12-15' },
];

function campaignState(status: string): MktCalState {
  if (status === 'ended') return 'done';
  if (status === 'running') return 'running';
  return 'planned';
}

function contentState(status: string): MktCalState {
  if (status === 'done') return 'done';
  if (status === 'producing') return 'running';
  return 'planned';
}

function eventState(date: string): MktCalState {
  if (date < MKT_CALENDAR_TODAY) return 'done';
  if (date === MKT_CALENDAR_TODAY) return 'running';
  return 'planned';
}

export const MKT_CALENDAR_EVENTS: readonly MktCalEvent[] = [
  ...CAMPAIGNS.map((campaign) => ({
    id: `C-${campaign.id}`,
    cat: 'campaign' as const,
    state: campaignState(campaign.status),
    titleKey: campaign.nameKey,
    start: campaign.start,
    end: campaign.end,
    href: `/marketing/campaigns/${campaign.id}`,
  })),
  ...CONTENT_ROWS.map((row) => ({
    id: `P-${row.code}`,
    cat: 'content' as const,
    state: contentState(row.status),
    titleKey: row.titleKey,
    start: row.publishAt.slice(0, 10),
    href: `/marketing/content/${row.code}`,
  })),
  ...KEY_EVENTS.map((item) => ({
    id: `E-${item.id}`,
    cat: 'event' as const,
    state: eventState(item.date),
    titleKey: item.titleKey,
    start: item.date,
  })),
];
