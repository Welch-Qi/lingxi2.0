/**
 * 「沟通记录」抽屉的演示语料 —— 移植自灵犀 1.0 销售转化页的**客户接待**段
 * （1.0 源码 `src/lib/mocks/sales.ts` 的 `receptionLeads`）。
 *
 * 为什么原样搬而不是重写：1.0 已经把"Echo AI 实时接待潜客"这段对话打磨成一套可直接读的
 * 业务样例（批量询价 → 阶梯报价 → 质保追问 → 合同与预付款），
 * 2.0 复刻它就是为了对齐 1.0 的这段体验。自造语料会丢掉 1.0 已经定下来的口径。
 *
 * 两条移植纪律：
 *  1. **文案全部走 i18n key**（`rec.lead.*`），组件里不出现中文字面量 ——
 *     这是 2.0 的硬规则，1.0 没有 i18n，照搬它的写法会第一时间被 lint 拦下。
 *  2. **只有"话"翻译，时刻不翻译**。`10:38` 这类时刻是数据不是文案，
 *     译了反而会在英文态出现 `10:38 AM` 之外的第三种写法，破坏与列表页的一致性；
 *     日期语义（"昨天"）因此挂在 `rec.lead.*.waiting` 这句里，而不是塞进时刻。
 *
 * 与商机的关系：按钮挂在商机列表标题旁，是**这一屏的沟通记录总览**，
 * 不是"某一行商机的沟通记录" —— 1.0 的接待列表本身就是一条条未建档的潜客，
 * 尚未收敛到具体商机。故这里不按商机 id 过滤，也不在每一行重复放按钮。
 */

export interface ReceptionMessage {
  /** customer = 潜客来向，agent = Echo AI 回复 */
  from: 'customer' | 'agent';
  /** 时刻：数据，不入 i18n */
  time: string;
  textKey: string;
}

export interface ReceptionLead {
  id: string;
  /** 潜客名是专名，中英各自保留原文（不译） */
  name: string;
  avatarText: string;
  marketKey: string;
  sourceKey: string;
  intent: 'high' | 'medium' | 'low';
  productKey: string;
  summaryKey: string;
  waitingKey: string;
  unread: number;
  conversation: readonly ReceptionMessage[];
}

export const RECEPTION_LEADS: readonly ReceptionLead[] = [
  {
    id: 'RC-2201',
    name: 'Felix Bauer',
    avatarText: 'FB',
    marketKey: 'rec.market.de',
    sourceKey: 'rec.source.web',
    intent: 'high',
    productKey: 'rec.lead.RC-2201.product',
    summaryKey: 'rec.lead.RC-2201.summary',
    waitingKey: 'rec.lead.RC-2201.waiting',
    unread: 3,
    conversation: [
      { from: 'customer', time: '10:38', textKey: 'rec.lead.RC-2201.m1' },
      { from: 'agent', time: '10:38', textKey: 'rec.lead.RC-2201.m2' },
      { from: 'customer', time: '10:40', textKey: 'rec.lead.RC-2201.m3' },
      { from: 'agent', time: '10:41', textKey: 'rec.lead.RC-2201.m4' },
      { from: 'customer', time: '10:42', textKey: 'rec.lead.RC-2201.m5' },
    ],
  },
  {
    id: 'RC-2202',
    name: 'Sophie Martin',
    avatarText: 'SM',
    marketKey: 'rec.market.fr',
    sourceKey: 'rec.source.tiktok',
    intent: 'high',
    productKey: 'rec.lead.RC-2202.product',
    summaryKey: 'rec.lead.RC-2202.summary',
    waitingKey: 'rec.lead.RC-2202.waiting',
    unread: 1,
    conversation: [
      { from: 'customer', time: '09:52', textKey: 'rec.lead.RC-2202.m1' },
      { from: 'agent', time: '09:53', textKey: 'rec.lead.RC-2202.m2' },
      { from: 'customer', time: '09:55', textKey: 'rec.lead.RC-2202.m3' },
      { from: 'agent', time: '09:56', textKey: 'rec.lead.RC-2202.m4' },
    ],
  },
  {
    id: 'RC-2203',
    name: 'Jakub Nowak',
    avatarText: 'JN',
    marketKey: 'rec.market.pl',
    sourceKey: 'rec.source.whatsapp',
    intent: 'high',
    productKey: 'rec.lead.RC-2203.product',
    summaryKey: 'rec.lead.RC-2203.summary',
    waitingKey: 'rec.lead.RC-2203.waiting',
    unread: 0,
    conversation: [
      { from: 'customer', time: '09:20', textKey: 'rec.lead.RC-2203.m1' },
      { from: 'agent', time: '09:21', textKey: 'rec.lead.RC-2203.m2' },
      { from: 'customer', time: '09:24', textKey: 'rec.lead.RC-2203.m3' },
    ],
  },
  {
    id: 'RC-2204',
    name: 'Emma Wilson',
    avatarText: 'EW',
    marketKey: 'rec.market.uk',
    sourceKey: 'rec.source.instagram',
    intent: 'medium',
    productKey: 'rec.lead.RC-2204.product',
    summaryKey: 'rec.lead.RC-2204.summary',
    waitingKey: 'rec.lead.RC-2204.waiting',
    unread: 0,
    conversation: [
      { from: 'customer', time: '08:36', textKey: 'rec.lead.RC-2204.m1' },
      { from: 'agent', time: '08:37', textKey: 'rec.lead.RC-2204.m2' },
    ],
  },
  {
    id: 'RC-2205',
    name: 'Diego Ruiz',
    avatarText: 'DR',
    marketKey: 'rec.market.es',
    sourceKey: 'rec.source.facebook',
    intent: 'medium',
    productKey: 'rec.lead.RC-2205.product',
    summaryKey: 'rec.lead.RC-2205.summary',
    waitingKey: 'rec.lead.RC-2205.waiting',
    unread: 0,
    conversation: [
      { from: 'customer', time: '17:20', textKey: 'rec.lead.RC-2205.m1' },
      { from: 'agent', time: '17:21', textKey: 'rec.lead.RC-2205.m2' },
    ],
  },
];

/*
 * 2026-09-28 删除 `RECEPTION_STAGES`（1.0 工作流条的四段）。
 * 面板顶部那条「Echo AI 接待工作流」被整体去掉：它把"智能体在做什么"当成第一屏主角，
 * 而用户打开沟通记录是来看**人跟客户说了什么**的。
 * 四段里的后三段（档案 / 跟进 / 成交）本就各有归属分区，留在一条只读条上
 * 只会让人以为它们在这里能点。随之废弃的语言包键：`rec.workflow`、
 * `rec.workflowDesc`、`rec.stage.*`（已一并从两个语言包删除）。
 */
