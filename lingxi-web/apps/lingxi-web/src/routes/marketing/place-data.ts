/**
 * 营销中心 · 投放明细数据（`mkg_placement`）—— 投放管理列表与投放计划编辑页的同一份事实源。
 *
 * 2026-10-06 从 `place.tsx` 搬出：投放计划编辑页（`place-new.tsx`）要按 `id`
 * 取这条计划的基础信息来回填表单，若数据仍留在页面组件里，编辑页就得 import
 * 一个 React 页面组件 —— 既拉进整棵组件树，又形成"页面 import 页面"的循环依赖。
 * 与 `campaign-data.ts` / `content-data.ts` 同一条理由：**只有数据与类型，不含 React 依赖**。
 *
 * 每行既有**投放效果**（曝光/花费/线索/CPL —— 钱换回来多少），
 * 也有**计划基础信息**（计划名/周期/备注 —— 这条计划本身是怎么配的）。
 * 两者必须同表：编辑按钮在效果行上，改的却是基础信息，拆成两份就得靠行号对齐，
 * 那是最容易漂的一种对齐。
 */

/** 明细行的唯一键必须是 `id`：LxTable 的 rowKey 只认 `id`（见 LxTable.tsx），
 *  写成 `key` 会让每行都落到 `''` 上，控制台刷一串「two children with the same key」。 */
export interface DetailRow {
  id: string;
  campaignKey: string;
  channelKey: string;
  reach: number;
  cost: string;
  leads: number;
  cpl: string;
  /** 投放计划名 i18n key（演示数据的中文也是文案 → 存 key，展示走 `t()`） */
  planNameKey: string;
  /** 投放周期两端（YYYY-MM-DD），编辑页回填 RangePicker 用 */
  periodStart: string;
  periodEnd: string;
  /** 备注 i18n key（可空；一期演示数据多数为空） */
  remarkKey?: string | undefined;
}

export const PLACE_DETAILS: readonly DetailRow[] = [
  { id: 'd1', campaignKey: 'mkg.place.cp1', channelKey: 'mkg.channel.tiktok', reach: 128400, cost: '€6,240', leads: 86, cpl: '€72.6', planNameKey: 'mkg.place.plan.tiktok', periodStart: '2026-09-01', periodEnd: '2026-09-30' },
  { id: 'd2', campaignKey: 'mkg.place.cp1', channelKey: 'mkg.channel.instagram', reach: 62300, cost: '€3,180', leads: 41, cpl: '€77.6', planNameKey: 'mkg.place.plan.instagram', periodStart: '2026-09-01', periodEnd: '2026-09-30' },
  { id: 'd3', campaignKey: 'mkg.place.cp1', channelKey: 'mkg.channel.youtube', reach: 41800, cost: '€2,060', leads: 24, cpl: '€85.8', planNameKey: 'mkg.place.plan.youtube', periodStart: '2026-09-05', periodEnd: '2026-09-30' },
  { id: 'd4', campaignKey: 'mkg.place.cp2', channelKey: 'mkg.channel.linkedin', reach: 45600, cost: '€5,120', leads: 38, cpl: '€134.7', planNameKey: 'mkg.place.plan.linkedin', periodStart: '2026-09-15', periodEnd: '2026-10-15' },
  { id: 'd5', campaignKey: 'mkg.place.cp2', channelKey: 'mkg.channel.email', reach: 12400, cost: '€880', leads: 12, cpl: '€73.3', planNameKey: 'mkg.place.plan.email', periodStart: '2026-09-15', periodEnd: '2026-10-15' },
  { id: 'd6', campaignKey: 'mkg.place.cp3', channelKey: 'mkg.channel.facebook', reach: 33500, cost: '€3,420', leads: 33, cpl: '€103.6', planNameKey: 'mkg.place.plan.facebook', periodStart: '2026-09-20', periodEnd: '2026-10-20' },
];

export function findPlaceDetail(id: string): DetailRow | undefined {
  return PLACE_DETAILS.find((row) => row.id === id);
}
