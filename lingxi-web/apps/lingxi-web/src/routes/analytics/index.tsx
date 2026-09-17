import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FundOutlined,
  MessageOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { formatMoney } from '@lingxi/utils';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 经营分析首页（/analytics）—— 让决策有依据（产品规划说明书 §2.8）。
 *
 * 首页以"预警中心"为主体，而不是以看板为主体：
 * 看板回答"现在怎么样"（可随时下钻），预警回答"哪件事必须今天处理"。
 * 作为每日入口，后者才是驱动动作的信息。
 *
 * 问答式取数（"上季度德国市场投入产出比是多少"）由经营分析智能体承担，
 * 链路为：意图识别 → 槽位抽取 → 语义层映射参数化 SQL → 受限执行 → 结果解释；
 * LLM 不直接生成 SQL（技术规约2.0 §3.6 G9）。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/ana/alerts 与 /api/v1/ana/metrics。
 */

interface AlertRow extends ModuleHomeRow {
  id: string;
  typeKey: string;
  targetKey: string;
  conditionKey: string;
  level: 'high' | 'mid' | 'low';
  time: string;
}

const ROWS: readonly AlertRow[] = [
  { id: '1', typeKey: 'ana.alert.r1.type', targetKey: 'ana.alert.r1.target', conditionKey: 'ana.alert.r1.condition', level: 'high', time: '09:20' },
  { id: '2', typeKey: 'ana.alert.r2.type', targetKey: 'ana.alert.r2.target', conditionKey: 'ana.alert.r2.condition', level: 'high', time: '08:45' },
  { id: '3', typeKey: 'ana.alert.r3.type', targetKey: 'ana.alert.r3.target', conditionKey: 'ana.alert.r3.condition', level: 'mid', time: '08:10' },
  { id: '4', typeKey: 'ana.alert.r4.type', targetKey: 'ana.alert.r4.target', conditionKey: 'ana.alert.r4.condition', level: 'mid', time: '07:30' },
  { id: '5', typeKey: 'ana.alert.r5.type', targetKey: 'ana.alert.r5.target', conditionKey: 'ana.alert.r5.condition', level: 'low', time: '07:05' },
];

const LEVEL_TAG = {
  high: 'review',
  mid: 'graphic',
  low: 'lang',
} as const;

export default function AnalyticsHomePage() {
  const { t, i18n } = useTranslation();

  const columns = [
    {
      title: t('ana.col.type'),
      dataIndex: 'typeKey',
      key: 'type',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    { title: t('ana.col.target'), dataIndex: 'targetKey', key: 'target', render: (value: string) => t(value) },
    {
      title: t('ana.col.condition'),
      dataIndex: 'conditionKey',
      key: 'condition',
      render: (value: string) => <span className="lx-muted">{t(value)}</span>,
    },
    {
      title: t('ana.col.level'),
      dataIndex: 'level',
      key: 'level',
      render: (value: AlertRow['level']) => <LxTag variant={LEVEL_TAG[value]}>{t(`ana.level.${value}`)}</LxTag>,
    },
    {
      title: t('ana.col.time'),
      dataIndex: 'time',
      key: 'time',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
  ];

  return (
    <ModuleHome<AlertRow>
      titleKey="ana.page.home"
      subtitleKey="ana.page.homeSub"
      kpis={[
        { labelKey: 'ana.kpi.revenue', value: formatMoney(8_640_000_000, 'CNY', i18n.language), sub: t('ana.kpi.sub.ytd'), trend: 'up', delta: '12.6%', color: 'primary', spark: [42, 48, 55, 61, 68, 76, 82, 90] },
        { labelKey: 'ana.kpi.margin', value: '24.6%', sub: t('ana.kpi.sub.margin'), trend: 'up', delta: '0.8pt', color: 'secondary', spark: [6, 6, 7, 7, 7, 8, 8, 8] },
        { labelKey: 'ana.kpi.customerGrowth', value: '12.4%', sub: t('ana.kpi.sub.newCustomer'), trend: 'up', delta: '2.1pt', color: 'accent', spark: [3, 4, 4, 5, 5, 6, 6, 7] },
        { labelKey: 'ana.kpi.assetDepth', value: '68%', sub: t('ana.kpi.sub.depth'), trend: 'up', delta: '5pt', color: 'success', spark: [5, 5, 6, 6, 7, 7, 8, 8] },
      ]}
      insightsTitleKey="ana.insight.title"
      insightsSubKey="ana.insight.sub"
      insightsMoreKey="ana.insight.more"
      insights={[
        { typeKey: 'ana.insight.trend.type', textKey: 'ana.insight.trend.text', sourceKey: 'ana.insight.trend.source', accent: 'primary', tone: 'sage', icon: <RiseOutlined /> },
        { typeKey: 'ana.insight.churn.type', textKey: 'ana.insight.churn.text', sourceKey: 'ana.insight.churn.source', accent: 'accent', tone: 'sage', icon: <AlertOutlined /> },
        { typeKey: 'ana.insight.attribution.type', textKey: 'ana.insight.attribution.text', sourceKey: 'ana.insight.attribution.source', accent: 'success', tone: 'sage', icon: <FundOutlined /> },
      ]}
      quicks={[
        { titleKey: 'ana.quick.ask', descKey: 'ana.quick.askDesc', icon: <MessageOutlined />, tone: 'primary' },
        { titleKey: 'ana.quick.report', descKey: 'ana.quick.reportDesc', icon: <FileTextOutlined />, tone: 'accent' },
        { titleKey: 'ana.quick.subscribe', descKey: 'ana.quick.subscribeDesc', icon: <DashboardOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="ana.list.title"
      listSubKey="ana.list.sub"
      listMoreKey="ana.list.more"
      searchPlaceholderKey="ana.list.search"
      filterLabelKey="ana.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="ana.list.empty"
      emptyHintKey="ana.list.emptyHint"
      total={ROWS.length}
    />
  );
}
