import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 客户类型（/config/business/cus-type）。
 *
 * 2026-10-07 第二十轮新增。此前三档（`prospect` / `first` / `repeat`）是
 * `customer/data.ts` 的 `CustomerType`，被客户列表、客户360 页头、筛选面板消费。
 *
 * **取值域刻意只读**（只开放顺序 / 启用 / 新增 / 删除，见 `dict-data.ts` 的说明）：
 * 这一档不是纯标签，它被两条业务规则当作判据 ——
 *   · `isRepeatDeal()`：`type !== 'prospect'` 才算复购/增购商机；
 *   · 演示数据自洽约束：`type === 'prospect'` ⟺ `lastDealAt === null`。
 * 两条都是模块作用域的纯函数、拿不到 store，让取值可增删会出现
 * "列表里多了一档，而复购判定还按老的三档算" —— 与锁掉 `kind`/`slaDays` 同理。
 */
export default function CusTypeConfigPage() {
  return <DictConfigPage dictId="cus-type" />;
}