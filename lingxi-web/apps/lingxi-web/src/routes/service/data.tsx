import type { ReactNode } from 'react';
import {
  FacebookOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  ShopOutlined,
  VideoCameraOutlined,
  WechatOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import type { LxTagVariant } from '@lingxi/ui';

/**
 * 客服中心统一工作台的数据底座（2026-09-29 重构）。
 *
 * 原「四模块目录」拆在 channels / chat / records / tickets-detail 四个文件里各自内联，
 * 重构后全部收口到此处：类型与演示语料单一来源，组件只负责渲染与交互。
 * 接入后端后，这些常量改为来自 /api/v1/svc/* 的查询结果即可，组件无需改动。
 *
 * 四大能力的数据都在这里：
 *   - CHANNELS：多渠道接入（哪些渠道在线、各自未读/会话/坐席数）
 *   - SESSIONS：实时在线会话（含客户上下文 + 关联工单）
 *   - RECORDS：全渠道沟通记录（时间线）
 *   - TICKETS：服务工单（状态机）
 */

export type ChannelKey =
  | 'ecommerce'
  | 'wechat'
  | 'tiktok'
  | 'whatsapp'
  | 'instagram'
  | 'linkedin'
  | 'facebook';

export interface ChannelRow {
  key: ChannelKey;
  icon: ReactNode;
  online: boolean;
  unread: number;
  sessions: number;
  agents: number;
}

/** 多渠道接入：客户从各渠道涌进来，坐席在一个 inbox 里统一接待。 */
export const CHANNELS: readonly ChannelRow[] = [
  { key: 'ecommerce', icon: <ShopOutlined />, online: true, unread: 3, sessions: 42, agents: 2 },
  { key: 'wechat', icon: <WechatOutlined />, online: true, unread: 12, sessions: 88, agents: 3 },
  { key: 'tiktok', icon: <VideoCameraOutlined />, online: true, unread: 7, sessions: 65, agents: 2 },
  { key: 'whatsapp', icon: <WhatsAppOutlined />, online: true, unread: 5, sessions: 51, agents: 2 },
  { key: 'instagram', icon: <InstagramOutlined />, online: false, unread: 0, sessions: 0, agents: 0 },
  { key: 'linkedin', icon: <LinkedinOutlined />, online: true, unread: 1, sessions: 9, agents: 1 },
  { key: 'facebook', icon: <FacebookOutlined />, online: false, unread: 0, sessions: 0, agents: 0 },
];

export interface ChatMessage {
  id: string;
  direction: 'in' | 'out';
  /** 演示文案走 i18n key；坐席实时输入走 text。 */
  textKey?: string;
  text?: string;
  time: string;
}

export interface SessionTag {
  labelKey: string;
  variant: LxTagVariant;
}

export interface ChatSession {
  id: string;
  customer: string;
  channel: ChannelKey;
  waitingMins: number;
  unread: number;
  typing: boolean;
  /** 客户上下文（演示态静态；接入后来自客户档案）。 */
  contactKey: string;
  countryKey: string;
  tags: readonly SessionTag[];
  /** 关联工单（从会话一键建单后即写入；演示态预置 3 条）。 */
  ticketId?: string;
  messages: readonly ChatMessage[];
}

/** 实时在线会话：左侧队列 + 中间对话窗的数据源。 */
export const SESSIONS: readonly ChatSession[] = [
  {
    id: 's1',
    customer: 'Nordwind Energie GmbH',
    channel: 'whatsapp',
    waitingMins: 2,
    unread: 2,
    typing: true,
    contactKey: 'svc.demo.contact.nordwind',
    countryKey: 'svc.demo.country.de',
    tags: [
      { labelKey: 'svc.wb.tag.vip', variant: 'review' },
      { labelKey: 'svc.wb.tag.storage', variant: 'graphic' },
    ],
    ticketId: '1',
    messages: [
      { id: 'm1', direction: 'in', text: 'Hi, our storage system shows a battery alert, can you help?', time: '09:41' },
      { id: 'm2', direction: 'out', text: 'Sure, may I have your order number?', time: '09:42' },
      { id: 'm3', direction: 'in', text: 'ST-2026-0231, the capacity dropped to 80% in a month.', time: '09:43' },
    ],
  },
  {
    id: 's2',
    customer: 'BluePeak Storage LLC',
    channel: 'wechat',
    waitingMins: 9,
    unread: 1,
    typing: false,
    contactKey: 'svc.demo.contact.bluepeak',
    countryKey: 'svc.demo.country.us',
    tags: [{ labelKey: 'svc.wb.tag.highvalue', variant: 'graphic' }],
    ticketId: '2',
    messages: [
      { id: 'm1', direction: 'in', textKey: 'svc.demo.chat.wechat.m1', time: '09:38' },
      { id: 'm2', direction: 'out', textKey: 'svc.demo.chat.wechat.m2', time: '09:39' },
    ],
  },
  {
    id: 's3',
    customer: 'Saigon Solar Co., Ltd',
    channel: 'tiktok',
    waitingMins: 21,
    unread: 0,
    typing: false,
    contactKey: 'svc.demo.contact.saigon',
    countryKey: 'svc.demo.country.vn',
    tags: [{ labelKey: 'svc.wb.tag.new', variant: 'producing' }],
    ticketId: '3',
    messages: [
      { id: 'm1', direction: 'in', textKey: 'svc.demo.chat.tiktok.m1', time: '09:20' },
      { id: 'm2', direction: 'out', textKey: 'svc.demo.chat.tiktok.m2', time: '09:22' },
    ],
  },
];

export type CommDirection = 'in' | 'out';

export interface CommRecord {
  id: string;
  time: string;
  channel: ChannelKey;
  direction: CommDirection;
  customer: string;
  snippetKey: string;
}

/** 全渠道沟通记录：左栏「全部沟通记录」视图的时间线数据源。 */
export const RECORDS: readonly CommRecord[] = [
  { id: 'r1', time: '2026-09-24 09:43', channel: 'whatsapp', direction: 'in', customer: 'Nordwind Energie GmbH', snippetKey: 'svc.demo.rec.r1' },
  { id: 'r2', time: '2026-09-24 09:39', channel: 'wechat', direction: 'out', customer: 'BluePeak Storage LLC', snippetKey: 'svc.demo.rec.r2' },
  { id: 'r3', time: '2026-09-24 09:22', channel: 'tiktok', direction: 'out', customer: 'Saigon Solar Co., Ltd', snippetKey: 'svc.demo.rec.r3' },
  { id: 'r4', time: '2026-09-23 18:10', channel: 'ecommerce', direction: 'in', customer: 'Atacama Mining SpA', snippetKey: 'svc.demo.rec.r4' },
  { id: 'r5', time: '2026-09-23 16:02', channel: 'linkedin', direction: 'in', customer: 'Anatolia Power A.S.', snippetKey: 'svc.demo.rec.r5' },
  { id: 'r6', time: '2026-09-23 14:55', channel: 'facebook', direction: 'out', customer: 'SunHub Retail', snippetKey: 'svc.demo.rec.r6' },
  { id: 'r7', time: '2026-09-23 11:30', channel: 'instagram', direction: 'in', customer: 'Lagos SolarWorks', snippetKey: 'svc.demo.rec.r7' },
];

export type TicketStatus = 'open' | 'processing' | 'resolved' | 'closed';

/** 工单状态机：待受理 → 处理中 → 已解决 → 已闭环。 */
export const STATUS_FLOW: readonly TicketStatus[] = ['open', 'processing', 'resolved', 'closed'];

/** 演示态「当前时间」锚点：逾期判定相对此日期，保证演示数据可复现（不用 new Date()）。 */
export const TICKET_NOW = '2026-09-24 23:59';

export interface TicketInfo {
  id: string;
  ticketNo: string;
  customer: string;
  /** 业务类型（复用 svc.issue.*）。 */
  categoryKey: string;
  /** 工单标题。 */
  titleKey: string;
  /** 工单描述。 */
  descKey: string;
  channel: string;
  /** 负责人。 */
  ownerKey: string;
  /** 当前处理人（与负责人可能不同）。 */
  handlerKey: string;
  createdAt: string;
  /** 截止时间（逾期判定的基准）。 */
  dueAt: string;
  /** 下次跟进时间。 */
  nextFollowAt: string;
  status: TicketStatus;
}

/** 服务工单：客户工单视图的数据源（状态初始值，交互时本地流转）。 */
export const TICKETS: Record<string, TicketInfo> = {
  '1': { id: '1', ticketNo: 'ST-2026-0231', customer: 'Nordwind Energie GmbH', categoryKey: 'svc.issue.battery', titleKey: 'svc.tk.title.battery', descKey: 'svc.tk.desc.battery', channel: 'whatsapp', ownerKey: 'demo.owner.echo', handlerKey: 'demo.owner.linlan', createdAt: '2026-09-24 09:41', dueAt: '2026-09-25 18:00', nextFollowAt: '2026-09-25 10:00', status: 'processing' },
  '2': { id: '2', ticketNo: 'ST-2026-0229', customer: 'BluePeak Storage LLC', categoryKey: 'svc.issue.inverter', titleKey: 'svc.tk.title.inverter', descKey: 'svc.tk.desc.inverter', channel: 'wechat', ownerKey: 'demo.owner.linlan', handlerKey: 'demo.owner.linlan', createdAt: '2026-09-24 09:30', dueAt: '2026-09-26 18:00', nextFollowAt: '2026-09-26 14:00', status: 'processing' },
  '3': { id: '3', ticketNo: 'ST-2026-0227', customer: 'Saigon Solar Co., Ltd', categoryKey: 'svc.issue.logistics', titleKey: 'svc.tk.title.logistics', descKey: 'svc.tk.desc.logistics', channel: 'tiktok', ownerKey: 'demo.owner.zhoumu', handlerKey: 'demo.owner.zhoumu', createdAt: '2026-09-24 09:18', dueAt: '2026-09-23 18:00', nextFollowAt: '2026-09-25 09:00', status: 'open' },
  '4': { id: '4', ticketNo: 'ST-2026-0224', customer: 'Anatolia Power A.S.', categoryKey: 'svc.issue.docs', titleKey: 'svc.tk.title.docs', descKey: 'svc.tk.desc.docs', channel: 'linkedin', ownerKey: 'demo.owner.echo', handlerKey: 'demo.owner.echo', createdAt: '2026-09-23 18:10', dueAt: '2026-09-24 18:00', nextFollowAt: '2026-09-24 16:00', status: 'closed' },
  '5': { id: '5', ticketNo: 'ST-2026-0222', customer: 'Atacama Mining SpA', categoryKey: 'svc.issue.battery', titleKey: 'svc.tk.title.battery', descKey: 'svc.tk.desc.battery2', channel: 'ecommerce', ownerKey: 'demo.owner.linlan', handlerKey: 'demo.owner.zhoumu', createdAt: '2026-09-23 16:02', dueAt: '2026-09-25 18:00', nextFollowAt: '2026-09-26 11:00', status: 'closed' },
  '6': { id: '6', ticketNo: 'ST-2026-0219', customer: 'SunHub Retail', categoryKey: 'svc.issue.logistics', titleKey: 'svc.tk.title.logistics2', descKey: 'svc.tk.desc.logistics2', channel: 'facebook', ownerKey: 'demo.owner.zhoumu', handlerKey: 'demo.owner.zhoumu', createdAt: '2026-09-22 11:20', dueAt: '2026-09-23 18:00', nextFollowAt: '2026-09-23 15:00', status: 'closed' },
};

/** 坐席在线状态（顶部状态选择器）。 */
export type PresenceStatus = 'online' | 'away' | 'offline';

/** 历史会话：按日期归集的客户沟通（演示态）。 */
export interface HistoryMessage {
  id: string;
  direction: 'in' | 'out';
  textKey?: string;
  text?: string;
  time: string;
}
export interface HistoryCustomer {
  customer: string;
  channel: ChannelKey;
  messages: readonly HistoryMessage[];
}
export interface HistoryDay {
  date: string;
  customers: readonly HistoryCustomer[];
}

/** 历史会话演示数据：近三日，每客户一段沟通记录（点击客户展开）。 */
export const HISTORY: readonly HistoryDay[] = [
  {
    date: '2026-09-24',
    customers: [
      {
        customer: 'Nordwind Energie GmbH',
        channel: 'whatsapp',
        messages: [
          { id: 'h1', direction: 'in', textKey: 'svc.demo.rec.r1', time: '09:41' },
          { id: 'h2', direction: 'out', text: 'We will check the battery report and arrange technical support.', time: '09:42' },
          { id: 'h3', direction: 'in', text: 'The capacity dropped to 80% in a month.', time: '09:43' },
        ],
      },
      {
        customer: 'BluePeak Storage LLC',
        channel: 'wechat',
        messages: [
          { id: 'h1', direction: 'in', textKey: 'svc.demo.chat.wechat.m1', time: '09:38' },
          { id: 'h2', direction: 'out', textKey: 'svc.demo.chat.wechat.m2', time: '09:39' },
        ],
      },
      {
        customer: 'Saigon Solar Co., Ltd',
        channel: 'tiktok',
        messages: [
          { id: 'h1', direction: 'in', textKey: 'svc.demo.chat.tiktok.m1', time: '09:20' },
          { id: 'h2', direction: 'out', textKey: 'svc.demo.chat.tiktok.m2', time: '09:22' },
        ],
      },
    ],
  },
  {
    date: '2026-09-23',
    customers: [
      {
        customer: 'Atacama Mining SpA',
        channel: 'ecommerce',
        messages: [
          { id: 'h1', direction: 'in', textKey: 'svc.demo.rec.r4', time: '18:10' },
          { id: 'h2', direction: 'out', text: 'Sent the 10MWh proposal and lead time to your inbox.', time: '18:12' },
        ],
      },
      {
        customer: 'Anatolia Power A.S.',
        channel: 'linkedin',
        messages: [{ id: 'h1', direction: 'in', textKey: 'svc.demo.rec.r5', time: '16:02' }],
      },
    ],
  },
  {
    date: '2026-09-22',
    customers: [
      {
        customer: 'Lagos SolarWorks',
        channel: 'instagram',
        messages: [
          { id: 'h1', direction: 'in', textKey: 'svc.demo.rec.r7', time: '11:30' },
          { id: 'h2', direction: 'out', text: 'Great, please fill the distributor application form.', time: '11:35' },
        ],
      },
      {
        customer: 'SunHub Retail',
        channel: 'facebook',
        messages: [{ id: 'h1', direction: 'in', textKey: 'svc.demo.rec.r6', time: '14:55' }],
      },
    ],
  },
];
