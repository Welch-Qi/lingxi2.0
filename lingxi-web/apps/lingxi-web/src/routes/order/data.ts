import type { LxStageTone } from '@lingxi/ui';

/**
 * 订单交付数据底座（2026-09-29 抽出）。
 *
 * 原订单首页把 ROWS / OTD_STAGES 内联在 index.tsx，二级页（跟踪 / 催办 / 看节点）
 * 也需要读取同一份订单，故收口到此处：类型与演示语料单一来源，组件只渲染。
 * 接入后端后，这些常量改为来自 /api/v1/ord/orders 的查询结果即可。
 *
 * 演示数据约定（见《技术规约2.0》）：日期写死锚点，不用 new Date()；金额最小单位整数。
 */

export type OrderStatus = 'ontrack' | 'risk' | 'delayed';

export interface OrderRow {
  id: string;
  orderNo: string;
  customer: string;
  amountMinor: number;
  currency: string;
  /** 节点列展示用的 i18n key（OTD 节点名）。 */
  nodeKey: string;
  /** 与 OTD_STAGES.key 对应的阶段键，用于节点卡筛选下方列表。 */
  stageKey: string;
  eta: string;
  status: OrderStatus;
  /** 是否待回款（账期未结）—— 待回款区「查看全部」据此筛选。 */
  pendingPayment?: boolean | undefined;
}

/** OTD 七节点：订单确认 → 排产 → 生产完工 → 出运 → 报关 → 到港 → 签收。 */
export const OTD_STAGES: readonly { key: string; count: number; value: string; tone?: LxStageTone }[] = [
  { key: 'confirm', count: 96, value: '¥12.8M' },
  { key: 'plan', count: 78, value: '¥10.4M', tone: 'secondary' },
  { key: 'produce', count: 61, value: '¥8.2M', tone: 'primary' },
  { key: 'ship', count: 43, value: '¥5.9M', tone: 'primary' },
  { key: 'customs', count: 31, value: '¥4.1M', tone: 'accent' },
  { key: 'arrive', count: 22, value: '¥2.9M', tone: 'accent' },
  { key: 'received', count: 17, value: '¥2.3M', tone: 'success' },
];

/**
 * 演示订单（首屏切片）。
 * stageKey 与 OTD_STAGES 对齐：风险/回款队列引用的订单号（SO-2026-04xx）与
 * 首页风险/待回款清单一一对应，便于「查看全部」筛出同一批单。
 * 为让每个 OTD 阶段卡都筛得出数据，补了 confirm / plan 两张单。
 */
export const ORDER_ROWS: readonly OrderRow[] = [
  { id: '1', orderNo: 'SO-2026-0418', customer: 'Nordwind Energie GmbH', amountMinor: 15_600_000, currency: 'EUR', nodeKey: 'demo.otd.production', stageKey: 'produce', eta: '2026-10-08', status: 'ontrack', pendingPayment: true },
  { id: '2', orderNo: 'SO-2026-0417', customer: 'Saigon Solar Co., Ltd', amountMinor: 4_280_000, currency: 'USD', nodeKey: 'demo.otd.shipping', stageKey: 'ship', eta: '2026-09-24', status: 'risk' },
  { id: '3', orderNo: 'SO-2026-0415', customer: 'BluePeak Storage LLC', amountMinor: 9_950_000, currency: 'USD', nodeKey: 'demo.otd.customs', stageKey: 'customs', eta: '2026-09-30', status: 'delayed' },
  { id: '4', orderNo: 'SO-2026-0412', customer: 'Anatolia Power A.S.', amountMinor: 7_120_000, currency: 'EUR', nodeKey: 'demo.otd.arrival', stageKey: 'arrive', eta: '2026-09-20', status: 'ontrack' },
  { id: '5', orderNo: 'SO-2026-0409', customer: 'Atacama Mining SpA', amountMinor: 3_640_000, currency: 'USD', nodeKey: 'demo.otd.received', stageKey: 'received', eta: '2026-09-12', status: 'ontrack', pendingPayment: true },
  { id: '6', orderNo: 'SO-2026-0405', customer: 'Helios Wind SA', amountMinor: 5_300_000, currency: 'EUR', nodeKey: 'ord.stage.plan.label', stageKey: 'plan', eta: '2026-10-15', status: 'ontrack' },
  { id: '7', orderNo: 'SO-2026-0402', customer: 'Meridian Solar Inc', amountMinor: 6_750_000, currency: 'USD', nodeKey: 'ord.stage.confirm.label', stageKey: 'confirm', eta: '2026-10-20', status: 'ontrack', pendingPayment: true },
];

/** 按 id 取单（二级页用）。 */
export function findOrder(id: string | undefined): OrderRow | undefined {
  return ORDER_ROWS.find((o) => o.id === id);
}
