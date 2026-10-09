import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 活动类型（/config/business/camp-type）。
 *
 * 2026-10-07 第二十轮新增。此前四档（`launch` / `activate` / `convert` / `brand`）
 * 是 `marketing/campaign-data.ts` 的 `CampaignType` 联合类型，活动列表的「类型」列
 * 与新建活动页的类型下拉各写一份映射 —— 想加一档"渠道分销"要改三处，
 * 且没有任何地方能回答"现在启用了几档"。
 *
 * 与商机阶段字典同页型（`shape='flat'`：只开放顺序 / 启用 / 新增 / 删除），
 * 不带阶段性质与 SLA 那两个只读列 —— 那两个字段本字典没有。
 */
export default function CampTypeConfigPage() {
  return <DictConfigPage dictId="camp-type" />;
}