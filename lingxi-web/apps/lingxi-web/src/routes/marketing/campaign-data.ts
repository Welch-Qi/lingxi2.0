/**
 * 营销中心 · 活动管理数据（`mkg_campaign`）—— 活动列表与详情的同一份事实源。
 *
 * 与 `content-data.ts` 同一条理由：列表"点进某一条"与详情"按编号取一条"不能各存一份，
 * 否则加字段会漂移。这里只放数据与类型，不含 React 依赖。
 *
 * 状态机（SCRM 02.4.1）：草稿(draft) → 待审核(review) → 进行中(running) → 已结束(ended)，
 * 驳回(review)可附原因修改后重新提交。本页用 LxStageBoard 展示四段分布。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/mkg/campaigns。
 */

/** 活动类型：拉新 / 促活 / 转化 / 品牌曝光（数据字典）。 */
export type CampaignType = 'launch' | 'activate' | 'convert' | 'brand';

/** 活动状态：草稿 / 待审核 / 进行中 / 已结束。 */
export type CampaignStatus = 'draft' | 'review' | 'running' | 'ended';

export interface Campaign {
  id: string;
  /** 活动名称 i18n key */
  nameKey: string;
  type: CampaignType;
  /** 活动目标 i18n key（参与人数 / 转化 / GMV 等） */
  goalKey: string;
  /** 预算（已格式化的金额字符串，演示数据） */
  budget: string;
  status: CampaignStatus;
  ownerKey: string;
  start: string;
  end: string;
  /** 投放渠道（复用 mkg.channel.* 枚举） */
  channels: readonly string[];
  /** 参与人数（演示数据） */
  participants: number;
  /** 本月 GMV（演示数据，金额字符串） */
  gmv: string;
  /** 关联素材数 */
  materials: number;
  /** 参与商品数 */
  products: number;
}

export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'CM-2026Q3-01',
    nameKey: 'mkg.campaign.r1',
    type: 'launch',
    goalKey: 'mkg.campaign.goal.launch',
    budget: '€80,000',
    status: 'running',
    ownerKey: 'demo.owner.zhoumu',
    start: '2026-09-01',
    end: '2026-09-30',
    channels: ['mkg.channel.tiktok', 'mkg.channel.instagram', 'mkg.channel.youtube'],
    participants: 14200,
    gmv: '€312,000',
    materials: 18,
    products: 6,
  },
  {
    id: 'CM-2026Q3-02',
    nameKey: 'mkg.campaign.r2',
    type: 'convert',
    goalKey: 'mkg.campaign.goal.convert',
    budget: '€52,000',
    status: 'review',
    ownerKey: 'demo.owner.linlan',
    start: '2026-09-15',
    end: '2026-10-15',
    channels: ['mkg.channel.linkedin', 'mkg.channel.email'],
    participants: 0,
    gmv: '—',
    materials: 9,
    products: 4,
  },
  {
    id: 'CM-2026Q3-03',
    nameKey: 'mkg.campaign.r3',
    type: 'brand',
    goalKey: 'mkg.campaign.goal.brand',
    budget: '€120,000',
    status: 'running',
    ownerKey: 'demo.owner.zhoumu',
    start: '2026-08-20',
    end: '2026-11-20',
    channels: ['mkg.channel.facebook', 'mkg.channel.instagram', 'mkg.channel.youtube', 'mkg.channel.linkedin'],
    participants: 38600,
    gmv: '€198,000',
    materials: 27,
    products: 0,
  },
  {
    id: 'CM-2026Q3-04',
    nameKey: 'mkg.campaign.r4',
    type: 'activate',
    goalKey: 'mkg.campaign.goal.activate',
    budget: '€36,000',
    status: 'draft',
    ownerKey: 'demo.owner.linlan',
    start: '2026-10-01',
    end: '2026-10-31',
    channels: ['mkg.channel.tiktok', 'mkg.channel.email'],
    participants: 0,
    gmv: '—',
    materials: 3,
    products: 2,
  },
  {
    id: 'CM-2026Q2-12',
    nameKey: 'mkg.campaign.r5',
    type: 'launch',
    goalKey: 'mkg.campaign.goal.launch',
    budget: '€64,000',
    status: 'ended',
    ownerKey: 'demo.owner.zhoumu',
    start: '2026-06-01',
    end: '2026-06-30',
    channels: ['mkg.channel.tiktok', 'mkg.channel.instagram'],
    participants: 9800,
    gmv: '€246,000',
    materials: 14,
    products: 5,
  },
  {
    id: 'CM-2026Q2-09',
    nameKey: 'mkg.campaign.r6',
    type: 'convert',
    goalKey: 'mkg.campaign.goal.convert',
    budget: '€40,000',
    status: 'ended',
    ownerKey: 'demo.owner.linlan',
    start: '2026-05-10',
    end: '2026-06-10',
    channels: ['mkg.channel.linkedin', 'mkg.channel.facebook'],
    participants: 6100,
    gmv: '€154,000',
    materials: 11,
    products: 3,
  },
];

/** 状态流转顺序（生命周期时间线用）。 */
export const CAMPAIGN_STAGES: readonly CampaignStatus[] = ['draft', 'review', 'running', 'ended'];

export function findCampaign(id: string): Campaign | undefined {
  return CAMPAIGNS.find((campaign) => campaign.id === id);
}

/**
 * 演示世界「今天」锚点（2026-10-07 第二十轮）。
 *
 * 与 `mkg-calendar-data.ts` 的 `MKG_CAL_TODAY` 同一条纪律：写死而非 `new Date()`，
 * 否则"本月 GMV"这个指标每天变，截图与断言都不可复现。
 * 取 09-30 是因为活动数据里 CM-2026Q3-01 结束于 09-30 —— 锚点落在数据区间内，
 * 「进行中」那档才有非空结果（若锚点落在 12 月，Q3 三场活动全是"已结束"，
 * 指标卡上四张里有两张恒为 0，那不是"稳定的演示数据"而是"看不出功能在算"）。
 */
export const CAMPAIGN_TODAY = '2026-09-30';

/** `€312,000` → `312000`（分）。`gmv` 存的是格式化字符串，求和必须先还原成数。 */
function parseEuro(text: string): number {
  // 只处理演示数据里出现的形态：`€1,234` / `—`
  if (text === '—' || text.trim() === '') return 0;
  return Number(text.replace(/[^\d.]/g, '')) || 0;
}

/**
 * 活动列表页那四张指标卡的**唯一派生点**（2026-10-07 第二十轮）。
 *
 * 此前那张 GMV 卡是写死的 `€510K`，其余三张来自 `counts` —— 四张卡里有一张
 * 与数据无关，改数据它不动，属"看起来是指标、其实是常量"。
 *
 * 口径（四张卡必须互不重叠且都来自同一批行）：
 *   · **进行中** `counts.running`：状态机里 `status === 'running'` 的场次；
 *   · **待审核** `counts.review`：待办量，销售每天第一件要看的事；
 *   · **本月 GMV**：起始日落在基准日所在自然月、且已产出 GMV 的活动的 GMV 之和
 *     （不含 `—`，即未开始产出）；
 *   · **参与人数**：进行中活动的参与人数之和（已结束的不算"当前参与"）。
 *
 * 锚点写死 `CAMPAIGN_TODAY`，不取 `new Date()`（见上方说明）。
 */
export interface CampaignKpi {
  running: number;
  review: number;
  /** 本月 GMV（欧，分） */
  monthGmvMinor: number;
  /** 进行中活动的参与人数之和 */
  participants: number;
  /**
   * 四档状态各自的活动数（生命周期看板用）。
   * 也放在这里而不让看板自己数：看板 4 档 + 指标卡 2 张都读 CAMPAIGNS，
   * 两处各数一次就会漂（改数据只改一处 → 看板说 2 场、卡片说 1 场）。
   * running / review 必然等于 byStatus 对应项，这里保留独立字段只为调用方少写一次下标。
   */
  byStatus: Record<CampaignStatus, number>;
}

export function campaignKpi(today: string = CAMPAIGN_TODAY): CampaignKpi {
  const month = today.slice(0, 7); // 'YYYY-MM'
  const running = CAMPAIGNS.filter((c) => c.status === 'running');

  const byStatus: Record<CampaignStatus, number> = {
    draft: 0,
    review: 0,
    running: 0,
    ended: 0,
  };
  for (const campaign of CAMPAIGNS) {
    byStatus[campaign.status] += 1;
  }

  return {
    running: byStatus.running,
    review: byStatus.review,
    byStatus,
    monthGmvMinor: CAMPAIGNS.filter((c) => c.start.slice(0, 7) === month).reduce(
      (sum, c) => sum + parseEuro(c.gmv),
      0,
    ),
    participants: running.reduce((sum, c) => sum + c.participants, 0),
  };
}

/** 推进到下一阶段（详情页"推进阶段"用）。已结束则不变。 */
export function nextStatus(status: CampaignStatus): CampaignStatus {
  const index = CAMPAIGN_STAGES.indexOf(status);
  return index >= 0 && index < CAMPAIGN_STAGES.length - 1
    ? (CAMPAIGN_STAGES[index + 1] as CampaignStatus)
    : status;
}
