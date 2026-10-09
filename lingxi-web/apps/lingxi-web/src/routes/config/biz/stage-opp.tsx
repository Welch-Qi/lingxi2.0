import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 商机阶段管理（/config/business/stage-opp）。
 *
 * 2026-10-06 起不再是占位壳：阶段的可配置项（取值 / 顺序 / 启用 / 状态性质）
 * 统一走 `dict-page`，与意向等级、商品类目共用一套 CRUD。
 */
export default function StageOppPage() {
  return <DictConfigPage dictId="stage-opp" />;
}