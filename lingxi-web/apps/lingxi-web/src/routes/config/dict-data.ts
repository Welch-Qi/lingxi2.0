import { create } from 'zustand';
import type { CustomerTier, CustomerType, OppIntent, OppStage } from '@/routes/customer/data';
import { INTENT_SLA_DAYS, STAGE_KIND, STAGE_ORDER } from '@/routes/customer/data';
import type { CampaignType } from '@/routes/marketing/campaign-data';
import { CATEGORY_TREE } from '@/routes/product/category-data';

/**
 * 业务字典配置中心（2026-10-06）。
 *
 * ## 为什么需要它
 *
 * 三类业务维度的取值此前是**散落在各页面的硬编码字面量**：
 *   · 商机阶段 8 值定义在 `customer/data.ts`，被 9 个文件消费，
 *     而 `opportunity/new.tsx` 又硬编码了一份 4 项子集、`opportunity/index.tsx` 又有一份局部映射；
 *   · 意向等级 4 值同样在 6 处被消费，`detail.tsx` / `follow.tsx` / `new.tsx` 各有一份
 *     `INTENT_OPTIONS` / `INTENT_TAG`；
 *   · 商品类目 9 节点硬编码在 `product/category-data.ts`，无任何 CRUD。
 *
 * 后果很具体：想给阶段加一段、改意向等级的 SLA，必须逐文件改，且漏一处就出不一致。
 * 而「业务配置」页面（`/config/business`）上的三个入口此前全是占位壳 ——
 * 配了等于没配。
 *
 * ## 收敛后的单一真值
 *
 * 内置字典**从既有常量派生**（`STAGE_ORDER` / `INTENT_SLA_DAYS` / `CATEGORY_TREE`），
 * 而不是重新抄一份。这样：
 *   - 新增阶段只需改 `customer/data.ts` 的 `OppStage` 联合类型，
 *     typecheck 会把所有消费点报出来（这是仓里既有的强约定，本文件沿用）；
 *   - 字典页的默认值与业务代码的默认值**永远一致**，不会出现"配置里是 9 段、代码里是 8 段"。
 *
 * 用户在字典页的改动**只影响配置态**（`enabled` / `order` / `label` / `sla`），
 * 不改联合类型 —— 因为「删掉已签约段」这种改动会让历史数据无法解读，
 * 正确做法是**停用**而非删除（见 DICT_VALUE 的注释）。
 */

/* ============================ 字典值形状 ============================ */

export interface DictValue {
  /** 取值标识（英文），与既有业务数据的字段值完全一致，**创建后不可改** */
  value: string;
  /** 展示名 i18n key */
  labelKey: string;
  /** 排序（小在前）。存数字而不是数组下标：增删中间项时不必重排全部 */
  order: number;
  enabled: boolean;
  /** 状态类型（仅商机阶段）：流转中 / 成交关闭 / 流失关闭 */
  kind?: 'open' | 'won' | 'lost';
  /** 跟进 SLA 天数（仅意向等级）：0 = 未定义 */
  slaDays?: number;
}

export type DictId = 'stage-opp' | 'intent' | 'category' | 'camp-type' | 'cus-type' | 'cus-tier';

export interface DictDef {
  id: DictId;
  /** 字典名 i18n key */
  titleKey: string;
  /** 说明 i18n key */
  descKey: string;
  /** 取值来源：商机阶段带阶段性质，意向等级带 SLA */
  shape: 'flat' | 'stage' | 'intent';
}

/**
 * 六个字典的元信息。路径与 `/config/business` 的入口一致。
 *
 * 2026-10-07 新增后三个（活动类型 / 客户类型 / 客户价值分层）。它们与前三个的
 * 差别只在于**取值域来自哪里**，配置项完全一样（顺序 / 启用 / 新增 / 删除），
 * 故复用同一套 `DictValue` 与同一个 `dict-page`，不新开一套 CRUD。
 *
 * 三个新字典的取值域都是**既有联合类型**（`CampaignType` / `CustomerType` /
 * `CustomerTier`），故 `shape='flat'`：既没有阶段性质也没有 SLA 那两个只读列。
 */
export const DICT_DEFS: readonly DictDef[] = [
  { id: 'stage-opp', titleKey: 'cc.dict.stageOpp', descKey: 'cc.dict.stageOppDesc', shape: 'stage' },
  { id: 'intent', titleKey: 'cc.dict.intent', descKey: 'cc.dict.intentDesc', shape: 'intent' },
  { id: 'category', titleKey: 'cc.dict.category', descKey: 'cc.dict.categoryDesc', shape: 'flat' },
  { id: 'camp-type', titleKey: 'cc.dict.campType', descKey: 'cc.dict.campTypeDesc', shape: 'flat' },
  { id: 'cus-type', titleKey: 'cc.dict.cusType', descKey: 'cc.dict.cusTypeDesc', shape: 'flat' },
  { id: 'cus-tier', titleKey: 'cc.dict.cusTier', descKey: 'cc.dict.cusTierDesc', shape: 'flat' },
];

/* ============================ 内置字典（从既有常量派生） ============================ */

export function builtinStageOpp(): readonly DictValue[] {
  return STAGE_ORDER.map((stage, index) => ({
    value: stage,
    labelKey: `cus.oppstage.${stage}`,
    order: (index + 1) * 10,
    enabled: true,
    kind: STAGE_KIND[stage],
  }));
}

export function builtinIntent(): readonly DictValue[] {
  const intents: readonly OppIntent[] = ['a', 'b', 'c', 'd'];
  return intents.map((intent, index) => ({
    value: intent,
    labelKey: `cus.intent.${intent}`,
    order: (index + 1) * 10,
    enabled: true,
    slaDays: INTENT_SLA_DAYS[intent],
  }));
}

/**
 * 商品类目的内置取值直接取 `CATEGORY_TREE`（9 节点 4+5），不另抄一份 key 清单。
 *
 * 为什么存的是 `nameKey`（`prd.cat.energy`）而不是 `energy`：既有类目数据按
 * nameKey 索引，语言包里已经有这些键；另造一套 `energy` 短 id 会让
 * 「类目改名」这条配置项无处落地 —— 配置改的是展示名，键不该跟着变。
 */
export function builtinCategory(): readonly DictValue[] {
  return CATEGORY_TREE.map((node, index) => ({
    value: node.nameKey,
    labelKey: node.nameKey,
    order: (index + 1) * 10,
    enabled: true,
  }));
}

/* ============================ 新增三字典（2026-10-07 第二十轮） ============================ */

/**
 * 活动类型：拉新 / 促活 / 转化 / 品牌曝光。
 *
 * 取值域直接来自 `campaign-data.ts` 的 `CampaignType` 联合类型 —— 不另抄一份
 * `['launch','activate','convert','brand']`。理由与前三个字典同源：
 * 抄一份就会在"活动管理新增一档类型"时漏改一处，配置中心说四档、代码里三档。
 *
 * 展示名走既有 `mkg.campaign.type.*`（活动列表那一列就在用它），不在语言包另开一套。
 */
export function builtinCampType(): readonly DictValue[] {
  const types: readonly CampaignType[] = ['launch', 'activate', 'convert', 'brand'];
  return types.map((type, index) => ({
    value: type,
    labelKey: `mkg.campaign.type.${type}`,
    order: (index + 1) * 10,
    enabled: true,
  }));
}

/**
 * 客户类型：新潜 / 首次成交 / 复购（`customer/data.ts` 的 `CustomerType`）。
 *
 * **刻意不给「顺序」以外的任何配置**：这个取值域被两条业务规则消费——
 * `isRepeatDeal()`（`type !== 'prospect'` 才算复购商机）与演示数据的自洽约束
 * （`type === 'prospect'` ⟺ `lastDealAt === null`）。两者都是**模块作用域的纯函数**，
 * 拿不到 store：让「类型」可新增/停用，用户会看到列表里多了一档而复购判定
 * 仍按老的三档算 —— 与第十六轮锁掉 `kind` / `slaDays` 是同一条理由，
 * 故这三个新字典一律只开放**顺序 / 启用 / 新增 / 删除**，取值本身不动。
 */
export function builtinCusType(): readonly DictValue[] {
  const types: readonly CustomerType[] = ['prospect', 'first', 'repeat'];
  return types.map((type, index) => ({
    value: type,
    labelKey: `cus.type.${type}`,
    order: (index + 1) * 10,
    enabled: true,
  }));
}

/** 客户价值分层：S / A / B / C / D 五档（`customer/data.ts` 的 `CustomerTier`）。 */
export function builtinCusTier(): readonly DictValue[] {
  const tiers: readonly CustomerTier[] = ['s', 'a', 'b', 'c', 'd'];
  return tiers.map((tier, index) => ({
    value: tier,
    labelKey: `cus.tier.${tier}`,
    order: (index + 1) * 10,
    enabled: true,
  }));
}

/** 默认全量字典（六个）。 */
export function builtinDicts(): Record<DictId, readonly DictValue[]> {
  return {
    'stage-opp': builtinStageOpp(),
    intent: builtinIntent(),
    category: builtinCategory(),
    'camp-type': builtinCampType(),
    'cus-type': builtinCusType(),
    'cus-tier': builtinCusTier(),
  };
}

/* ============================ store ============================ */

const LS_KEY = 'lx.cc.dicts.v1';

interface DictState {
  dicts: Record<DictId, readonly DictValue[]>;
  setValueOrder: (dictId: DictId, value: string, order: number) => void;
  /** 抽屉式编辑：一次落盘顺序 / 启用 / 阶段性质，避免行内改到一半又被撤销 */
  updateValue: (dictId: DictId, value: string, patch: Partial<DictValue>) => void;
  toggleValue: (dictId: DictId, value: string) => void;
  addValue: (dictId: DictId, value: DictValue) => void;
  removeValue: (dictId: DictId, value: string) => void;
  resetDict: (dictId: DictId) => void;
  resetAll: () => void;
}

function loadPersisted(): Record<DictId, readonly DictValue[]> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<DictId, readonly DictValue[]>;
    // 六个字典都必须在，否则视为存档不兼容（只补键不猜值）
    //
    // 2026-10-07 第二十轮：`camp-type` / `cus-type` / `cus-tier` 是后加的，
    // 老存档里没有这三个键。若只校验前三个，老存档会被判为"兼容"并读回来，
    // 于是 `dicts['cus-tier']` 是 `undefined` → 字典页读 `values.filter()`
    // 直接抛 `Cannot read properties of undefined`，整页白屏。
    // 这就是"只校验已存在的键"与"校验全部键"的区别：新增键必须一并纳入校验，
    // 让老存档整体作废、回落到内置值（配置态丢失可接受，白屏不可接受）。
    if (
      !Array.isArray(parsed['stage-opp']) ||
      !Array.isArray(parsed.intent) ||
      !Array.isArray(parsed.category) ||
      !Array.isArray(parsed['camp-type']) ||
      !Array.isArray(parsed['cus-type']) ||
      !Array.isArray(parsed['cus-tier'])
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: Record<DictId, readonly DictValue[]>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式下会抛；配置态丢失不该阻断页面
  }
}

function mapValue(
  dicts: Record<DictId, readonly DictValue[]>,
  dictId: DictId,
  value: string,
  patch: Partial<DictValue>,
): Record<DictId, readonly DictValue[]> {
  const next = { ...dicts, [dictId]: dicts[dictId].map((v) => (v.value === value ? { ...v, ...patch } : v)) };
  persist(next);
  return next;
}

export const useDictStore = create<DictState>((set) => ({
  dicts: loadPersisted() ?? builtinDicts(),

  /**
   * 注意**没有** setValueLabel：改展示名这条路在本仓是走不通的。
   *
   * 字典值的展示名是 i18n key，而 i18n 门禁禁止 en 包里出现中文 ——
   * 用户在页面上输入的中文名没法直接进语言包。真正的做法是接入后由后端下发
   * 多语言字典，前端只存 value。故本页只开放**顺序 / 启用 / 新增 / 停用**四项，
   * 不提供一个改了就存不住的"名称"输入框（那是最典型的"配了没生效"陷阱）。
   */

  setValueOrder: (dictId, value, order) => set((s) => ({ dicts: mapValue(s.dicts, dictId, value, { order }) })),

  updateValue: (dictId, value, patch) =>
    set((s) => ({ dicts: mapValue(s.dicts, dictId, value, patch) })),

  toggleValue: (dictId, value) =>
    set((s) => ({
      dicts: mapValue(s.dicts, dictId, value, {
        enabled: (s.dicts[dictId].find((v) => v.value === value)?.enabled ?? true) === false,
      }),
    })),

  addValue: (dictId, value) =>
    set((s) => {
      const next = { ...s.dicts, [dictId]: [...s.dicts[dictId], value] };
      persist(next);
      return { dicts: next };
    }),

  removeValue: (dictId, value) =>
    set((s) => {
      const next = { ...s.dicts, [dictId]: s.dicts[dictId].filter((v) => v.value !== value) };
      persist(next);
      return { dicts: next };
    }),

  resetDict: (dictId) =>
    set((s) => {
      const next = { ...s.dicts, [dictId]: builtinDicts()[dictId] };
      persist(next);
      return { dicts: next };
    }),

  resetAll: () => set(() => {
    const next = builtinDicts();
    persist(next);
    return { dicts: next };
  }),
}));

/* ============================ 派生查询 ============================ */

/**
 * 取字典的有序启用值。
 *
 * 排序与过滤集中在这里：所有页面（下拉、看板、漏斗）都走这一个函数，
 * 于是「在配置中心把某段拖到第一位」会**立刻**反映到全站的阶段顺序上，
 * 而不需要各页面各自实现一遍 sort。
 */
export function dictValues(dictId: DictId, dicts: Record<DictId, readonly DictValue[]>): readonly DictValue[] {
  return [...dicts[dictId]].filter((v) => v.enabled).sort((a, b) => a.order - b.order || a.value.localeCompare(b.value));
}

/** 字典里的自定义展示名（用户在配置中心输入的名字）。 */
export function customLabel(value: string): string {
  return `cc.dict.custom.${value}`;
}

/** 该取值是否被内置字典占用（占用则不可删，只能停用）。 */
export function isBuiltinValue(dictId: DictId, value: string): boolean {
  return builtinDicts()[dictId].some((v) => v.value === value);
}

/** 演示数据里有多少条正在用这个取值（用于提示"停用而非删除"）。 */
export function usageCount(dictId: DictId, value: string): number {
  if (dictId === 'stage-opp') return STAGE_USAGE[value] ?? 0;
  if (dictId === 'intent') return INTENT_USAGE[value] ?? 0;
  return 0;
}

/* 演示数据的取值分布（与 customer/data.ts 的 SEED 同源统计一次，硬编码在此以免循环依赖）。 */
const STAGE_USAGE: Record<string, number> = {
  first: 9,
  nurture: 11,
  proposal: 8,
  negotiate: 7,
  signed: 4,
  delivering: 3,
  accepted: 5,
  lost: 6,
};

const INTENT_USAGE: Record<string, number> = { a: 21, b: 19, c: 12, d: 7 };

/** 便捷类型导出，供页面消费。 */
export type { OppIntent, OppStage };