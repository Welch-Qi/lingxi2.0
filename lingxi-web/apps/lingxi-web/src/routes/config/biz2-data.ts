import { create } from 'zustand';
import { OTD_STAGES } from '@/routes/order/data';
import { MKG_CHANNEL_KEYS, type ChannelKey } from '@/routes/marketing/data';

/**
 * 订单阶段 + 社媒账号 字典（2026-10-07）。
 *
 * ## 与 `dict-data.ts` 的分工
 *
 * `dict-data.ts` 管的是**纯枚举字典**（阶段名 / 等级 / 类目）：只有 key、
 * 展示名、顺序、启用 —— 业务代码消费的是 `value` 本身。
 *
 * 本文件管的是**带业务属性的配置**：订单阶段带 SLA 天数与是否终态，
 * 社媒账号带授权到期日与健康度。它们的"取值"不是纯字符串，
 * 而是被多处引用的业务对象（订单行的 `stageKey`、排期的 `platformKey`）。
 * 把它们塞进 `DictValue` 会让那个类型背上它不该背的东西。
 *
 * ## 真值来源：都是派生，不重抄
 *
 * 订单阶段取自 `order/data.ts` 的 `OTD_STAGES`（七节点），
 * 社媒渠道取自 `marketing/data.ts` 的 `MKG_CHANNEL_KEYS`（五平台）。
 * 这两处都是既有业务代码的**唯一事实源** —— 手抄一份就会出现
 * "配置中心说八个阶段、订单看板说七个"。
 */

/* ============================ 订单阶段 ============================ */

export interface OrderStageValue {
  /** 阶段 key（英文），与订单行 `stageKey` 完全一致 —— 改它等于让历史订单无法解读 */
  value: string;
  /** 展示名 i18n key */
  labelKey: string;
  order: number;
  enabled: boolean;
  /** 是否终态（签收/ 流失）。终态订单不再进入流转看板 */
  terminal: boolean;
  /** 阶段 SLA 天数；0 = 未定义 */
  slaDays: number;
}

export function builtinOrderStages(): readonly OrderStageValue[] {
  return OTD_STAGES.map((s, index) => ({
    value: s.key,
    labelKey: `ord.stage.${s.key}.label`,
    order: (index + 1) * 10,
    enabled: true,
    // 最后一节点（签收）是终态 —— 这是 OTD 的定义，不是配置项。
    terminal: index === OTD_STAGES.length - 1,
    // SLA 按 OTD 的常规时长给：生产与物流段差异最大，给同一个数没有意义。
    // 数值仅用于演示排序，接入后由履约系统下发。
    slaDays: [3, 5, 12, 10, 4, 6, 0][index] ?? 0,
  }));
}

/* ============================ 社媒账号 ============================ */

export interface SocialAccountValue {
  /** 平台 key，与 `ChannelKey` 同域 —— 分发渠道就是社媒账号本身 */
  value: ChannelKey;
  labelKey: string;
  order: number;
  enabled: boolean;
  /**
   * 授权到期日`YYYY-MM-DD`；空串 = 未登记。
   * 不用 `.invalid` 域名那套（那是用户表），这里是日期不是账号。
   */
  authExpireAt: string;
  /** 健康度 0–100；不是自增的炫技指标，对应降权/限流/不被推荐三件真事 */
  health: number;
}

/** 演示用的授权到期日锚点，与营销日历的 `MKG_ACCOUNT_TODAY` 同一天（2026-09-24）。 */
const ACCOUNT_TODAY = '2026-09-24';

export function builtinSocialAccounts(): readonly SocialAccountValue[] {
  return MKG_CHANNEL_KEYS.map((key, index) => ({
    value: key,
    labelKey: `mkg.channel.${key}`,
    order: (index + 1) * 10,
    enabled: true,
    /* 到期日刻意覆盖「已过期 /30天内到期 / 有效」三档：
       只有一个档位时，那张预警标签等于没出现过。
       固定日期而非 new Date() —— 与仓内日期锚点约定一致。 */
    authExpireAt: ['2026-09-10', '2026-10-12', '2027-03-01', '2026-09-28', '2027-06-30'][index] ?? '',
    health: [88, 72, 94, 61, 85][index] ?? 80,
  }));
}

/* ============================ store ============================ */

const LS_KEY = 'lx.cc.biz2.v1';

interface Biz2State {
  orderStages: readonly OrderStageValue[];
  socialAccounts: readonly SocialAccountValue[];
  updateOrderStage: (value: string, patch: Partial<Omit<OrderStageValue, 'value'>>) => void;
  updateSocialAccount: (value: string, patch: Partial<Omit<SocialAccountValue, 'value'>>) => void;
  resetBiz2: () => void;
}

function loadPersisted(): Pick<Biz2State, 'orderStages' | 'socialAccounts'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pick<Biz2State, 'orderStages' | 'socialAccounts'>>;
    if (!Array.isArray(parsed.orderStages) || !Array.isArray(parsed.socialAccounts)) return null;
    return { orderStages: parsed.orderStages, socialAccounts: parsed.socialAccounts };
  } catch {
    return null;
  }
}

function persist(s: Pick<Biz2State, 'orderStages' | 'socialAccounts'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ orderStages: s.orderStages, socialAccounts: s.socialAccounts }));
  } catch {
    // 隐私模式下会抛；配置态丢了不该阻断页面
  }
}

const seedStages = () => builtinOrderStages();
const seedAccounts = () => builtinSocialAccounts();
const loaded = loadPersisted();

export const useBiz2Store = create<Biz2State>((set) => ({
  orderStages: loaded?.orderStages ?? seedStages(),
  socialAccounts: loaded?.socialAccounts ?? seedAccounts(),

  updateOrderStage: (value, patch) =>
    set((s) => {
      const next = { ...s, orderStages: s.orderStages.map((x) => (x.value === value ? { ...x, ...patch } : x)) };
      persist(next);
      return next;
    }),

  updateSocialAccount: (value, patch) =>
    set((s) => {
      const next = { ...s, socialAccounts: s.socialAccounts.map((x) => (x.value === value ? { ...x, ...patch } : x)) };
      persist(next);
      return next;
    }),

  resetBiz2: () =>
    set(() => {
      const next = { orderStages: seedStages(), socialAccounts: seedAccounts() };
      persist(next);
      return next;
    }),
}));

/* ============================ 派生查询 ============================ */

/** 授权到期距今天多少天（负数= 已过期）。 */
export function daysToExpire(authExpireAt: string, today = ACCOUNT_TODAY): number | null {
  if (!authExpireAt) return null;
  const t = Date.parse(`${today}T00:00:00Z`);
  const e = Date.parse(`${authExpireAt}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(e)) return null;
  return Math.round((e - t) / 86_400_000);
}

/** 到期档位：已过期 / 30 天内 / 有效。阈值取 30 天，与营销侧的预警口径一致。 */
export function expireBucket(days: number | null): 'expired' | 'soon' | 'ok' {
  if (days === null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}