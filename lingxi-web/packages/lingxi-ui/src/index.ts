export { LxTable } from './LxTable';
export type { LxTableProps } from './LxTable';
export { LxPermission } from './LxPermission';
export { LxAgentSourceTag } from './LxAgentSourceTag';
export { LxTakeoverButton } from './LxTakeoverButton';
export { usePermission } from './usePermission';
export { PermissionContext } from './PermissionContext';

/* ===== 极光通感（Aurora Sense）业务组件 ===== */
export { LxKpi, LxTrendPill, Sparkline } from './LxKpi';
export type { LxKpiProps, LxKpiColor, LxTrend } from './LxKpi';
export { LxAgentCard } from './LxAgentCard';
export type { LxAgentCardProps, LxAgentGrade, LxAgentStat, LxAgentTone, LxProgressTone } from './LxAgentCard';
export { LxInsightCard } from './LxInsightCard';
export type { LxInsightAccent, LxInsightCardProps } from './LxInsightCard';
export { LxTag } from './LxTag';
export type { LxTagVariant } from './LxTag';
export { LxBanner } from './LxBanner';
export { LxStepper } from './LxStepper';
export { LxSectionHeader } from './LxSectionHeader';
export { LxQuickAction } from './LxQuickAction';
export type { LxQuickTone } from './LxQuickAction';
export { LxTableCard, LxSearchInput, LxFilterButton } from './LxTableCard';
export { LxEmpty } from './LxEmpty';
export { LxCoordBar } from './LxCoordBar';
export { LxChart } from './LxChart';
export type { LxChartProps, LxChartSeries } from './LxChart';
export { LxWorldMap } from './LxWorldMap';
export type { LxWorldMapProps, LxWorldMapDatum, LxWorldMapDetail } from './LxWorldMap';
export { LxThumb } from './LxThumb';
export type { LxThumbKind, LxThumbProps } from './LxThumb';

/* ===== 业务工作区组件（角色工作台化改造）=====
 * 背景：11 个一级菜单原先复用同一个「指标→智能体建议→快捷操作→表格」模板，
 * 导致各模块长得一样、不符合角色定位。以下组件用于按"典型用户的日常动线"重新组织页面：
 * 操作入口 → 今日工作队列 → 模块特有视图 → 主数据列表。
 * 智能体产出改为行内标记（agentLabel），不再单独占一个区块。
 */
export { LxActionBar } from './LxActionBar';
export type { LxActionBarProps, LxActionItem } from './LxActionBar';
export { LxWorkList } from './LxWorkList';
export type { LxWorkItem, LxWorkListProps } from './LxWorkList';
export { LxStageBoard } from './LxStageBoard';
export type { LxStage, LxStageBoardProps, LxStageTone } from './LxStageBoard';
export { LxAssetGrid } from './LxAssetGrid';
export type { LxAssetGridProps, LxAssetItem } from './LxAssetGrid';
export { LxAskBar } from './LxAskBar';
export type { LxAskBarProps } from './LxAskBar';
export { LxNavGrid } from './LxNavGrid';
export type { LxNavItem, LxNavTone } from './LxNavGrid';

/* ===== 复用灵犀 1.0 版式所需组件（工作台 / 市场情报 / 经营分析）=====
 * 背景：这三个一级菜单的 1.0 实现（超级工作台、产品开发、经营分析）已被验证好用，
 * 2.0 按"结构照搬、数据换 2.0 口径"的方式复用。以下组件是 1.0 版式里
 * 2.0 组件库尚缺的展示件；能复用的（LxKpi / LxAgentCard / LxInsightCard）一律复用。
 */
export { LxWorkflowSteps } from './LxWorkflowSteps';
export type { LxWorkflowStep, LxWorkflowStepsProps } from './LxWorkflowSteps';
export { LxChipGroup } from './LxChipGroup';
export type { LxChipOption, LxChipGroupProps } from './LxChipGroup';
export { LxFunnel } from './LxFunnel';
export type { LxFunnelStep, LxFunnelProps } from './LxFunnel';
export { LxRankList } from './LxRankList';
export type { LxRankItem, LxRankListProps } from './LxRankList';
