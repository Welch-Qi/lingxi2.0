import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 客户价值分层（/config/business/cus-tier）。
 *
 * 2026-10-07 第二十轮新增。此前五档（`s` / `a` / `b` / `c` / `d`）是
 * `customer/data.ts` 的 `CustomerTier`，客户列表与客户360 各有一个徽标组件
 * （`lx-custier`）在渲染它。
 *
 * **顺序在这里是有业务含义的**：分层从S 到 D 是价值递减，配置页把顺序调乱
 * 会让"排在最前的那一档"不再等于"最高价值那档"。故本字典**开放顺序调整**
 * （那是配置中心该给的），但页面顶部与字典说明里都写明这条语义 ——
 * 与第十六轮锁掉 `kind` 的区别是：分层顺序只影响展示分组，没有任何
 * 纯函数拿它算胜率/漏斗。
 */
export default function CusTierConfigPage() {
  return <DictConfigPage dictId="cus-tier" />;
}