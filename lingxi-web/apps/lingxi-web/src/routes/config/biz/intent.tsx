import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 客户意向等级（/config/business/intent）。
 *
 * 2026-10-06 新增页。此前 A/B/C/D 四档硬编码在 `customer/data.ts`，
 * 却在 `opportunity` 域的 detail / follow / new 三个页面各有一份重复的
 * `INTENT_OPTIONS` / `INTENT_TAG` 局部定义 —— 改一次 SLA 要改四处。
 */
export default function IntentConfigPage() {
  return <DictConfigPage dictId="intent" />;
}