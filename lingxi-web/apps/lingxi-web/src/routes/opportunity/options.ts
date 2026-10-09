import { useMemo } from 'react';
import type { LxTagVariant } from '@lingxi/ui';
import type { OppIntent, OppStage } from '@/routes/customer/data';
import { useDictStore } from '@/routes/config/dict-data';

/**
 * 商机域的阶段 / 意向选项 —— **唯一派生点**（2026-10-06 收敛）。
 *
 * ## 收敛前的问题
 *
 * 同一组取值在四个文件里各写了一份字面量：
 *   `opportunity/new.tsx`     STAGE_OPTIONS（只 4 段）+ INTENT_OPTIONS（4 项 FormFieldOption）
 *   `opportunity/index.tsx`   INTENT_ORDER（4 档裸数组）
 *   `opportunity/detail.tsx`  INTENT_TAG（配色）+ INTENT_OPTIONS（有序列）
 *   `opportunity/follow.tsx`  INTENT_TAG（配色，逐字重复）+ INTENT_OPTIONS（value/labelKey 形状）
 *
 * 而真值在 `customer/data.ts` 的 `STAGE_ORDER` / `INTENT_SLA_DAYS` 里。
 * 五处定义各改一次必然走散 —— 最先出问题的是「商务谈判」这段：
 * new 页漏了它（新建商机选不到谈判），而看板又有它。
 *
 * ## 收敛后的口径
 *
 * 选项**从字典派生**，而字典的默认值又**从 `customer/data.ts` 派生**：
 *   module.config(permCode) ─┐
 *   customer/data.ts ────────┼→ dict-data → 本文件 → 四个页面
 *   category-data.ts ────────┘
 * 一条链，任一真值改动全站同步；而在配置中心改字典的顺序/启用状态，这四个页面立刻跟着变。
 *
 * 颜色**不**进字典：配色是设计令牌（`LxTagVariant` 六档），不是租户可配项 ——
 * 放进字典就意味着任何人都能把"高意向"改成灰色，而那属于设计规范不是业务配置。
 */

/** 意向等级配色（四档）。集中在此，因detail 与 follow 此前逐字重复了这份映射。 */
export const INTENT_TAG: Record<OppIntent, LxTagVariant> = {
  a: 'review',
  b: 'graphic',
  c: 'lang',
  d: 'producing',
};

export interface SelectOption<T extends string = string> {
  value: T;
  labelKey: string;
}

/** 意向等级选项（有序、只含启用项）。 */
export function useIntentOptions(): readonly SelectOption<OppIntent>[] {
  const dicts = useDictStore((s) => s.dicts);
  return useMemo(
    () =>
      [...dicts.intent]
        .filter((v) => v.enabled)
        .sort((a, b) => a.order - b.order)
        .map((v) => ({ value: v.value as OppIntent, labelKey: v.labelKey })),
    [dicts.intent],
  );
}

/** 意向等级顺序（裸值，供筛选分段与图表轴用）。 */
export function useIntentOrder(): readonly OppIntent[] {
  return useIntentOptions().map((o) => o.value);
}

/**
 * 商机阶段选项。
 *
 * `openOnly=true` 用于「新建商机」—— 新建时不该同时宣告它已流失或已验收，
 * 那是推进的结果而不是入口的属性。
 *
 * ## 阶段性质读哪一份（`kind` 的口径，勿改回 `STAGE_KIND`）
 *
 * 这里读的是**字典里的 `kind`**，而不是 `customer/data.ts` 的 `STAGE_KIND`。
 * 两者当前取值相同，但性质不同：
 *
 * - `STAGE_KIND` 是**统计口径的编译期常量**。赢率（`opportunity/data.ts`）、
 *   漏斗、看板聚合都直接 import 它，那些是**纯函数**，在模块作用域求值，
 *   拿不到 zustand store。
 * - 字典 `kind` 是**展示与筛选口径**。改它只影响「哪些阶段出现在下拉里」，
 *   不影响赢率。
 *
 * 所以字典页里 `kind` 是**只读展示**而非可编辑项（见 `dict-page.tsx` 的 `readOnly` 列）。
 * 若把它开放成可配，用户改完会发现下拉变了而赢率没变 —— 那是"配了没生效"的
 * 典型陷阱，比不给这个配置项更糟。要改阶段性质必须改 `STAGE_KIND`（走发版），
 * 这是刻意的：赢率口径变更属于业务规则变更，不该由配置页随手改掉。
 */
export function useStageOptions(openOnly = false): readonly SelectOption<OppStage>[] {
  const dicts = useDictStore((s) => s.dicts);
  return useMemo(
    () =>
      [...dicts['stage-opp']]
        .filter((v) => v.enabled)
        .filter((v) => (openOnly ? v.kind === 'open' : true))
        .sort((a, b) => a.order - b.order)
        .map((v) => ({ value: v.value as OppStage, labelKey: v.labelKey })),
    [dicts, openOnly],
  );
}

/** 阶段顺序（裸值，供看板与漏斗排序用）。 */
export function useStageOrder(): readonly OppStage[] {
  return useStageOptions().map((o) => o.value);
}