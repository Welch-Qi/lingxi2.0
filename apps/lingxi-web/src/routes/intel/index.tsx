import { useTranslation } from 'react-i18next';
import {
  AimOutlined,
  CompassOutlined,
  DatabaseOutlined,
  ExportOutlined,
  FireOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 市场情报首页（/intel）—— 看清市场再动手（产品规划说明书 §2.7）。
 *
 * 三类外部数据（全球B端客户大数据 / 互联网社媒大数据 / 企业私域）
 * 在此汇聚成"可决策的市场判断"：搜索指数看需求、热词看风向、产品机会看是否值得进。
 *
 * 一期数据策略：以免费源为主 + 小范围商业数据验证价值，
 * 因此界面必须显性标注数据源与覆盖范围，避免用户把样本数据当全量结论。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/intel/trends。
 */

interface TrendRow extends ModuleHomeRow {
  id: string;
  keyword: string;
  marketKey: string;
  volume: string;
  wow: string;
  wowUp: boolean;
  score: number;
}

const ROWS: readonly TrendRow[] = [
  { id: '1', keyword: 'portable power station', marketKey: 'demo.market.de', volume: '246,000', wow: '38%', wowUp: true, score: 92 },
  { id: '2', keyword: 'solar generator kit', marketKey: 'demo.market.us', volume: '184,000', wow: '21%', wowUp: true, score: 86 },
  { id: '3', keyword: 'home battery backup', marketKey: 'demo.market.uk', volume: '112,000', wow: '14%', wowUp: true, score: 78 },
  { id: '4', keyword: 'rv power inverter', marketKey: 'demo.market.vn', volume: '52,000', wow: '6%', wowUp: true, score: 64 },
  { id: '5', keyword: 'lead acid battery', marketKey: 'demo.market.br', volume: '88,000', wow: '-4%', wowUp: false, score: 41 },
];

export default function IntelHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('intel.col.keyword'),
      dataIndex: 'keyword',
      key: 'keyword',
      render: (value: string) => <span className="lx-cell-title">{value}</span>,
    },
    {
      title: t('intel.col.market'),
      dataIndex: 'marketKey',
      key: 'market',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    {
      title: t('intel.col.volume'),
      dataIndex: 'volume',
      key: 'volume',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('intel.col.wow'),
      dataIndex: 'wow',
      key: 'wow',
      render: (_value: string, row: TrendRow) => (
        <span className={`lx-trend lx-trend--${row.wowUp ? 'up' : 'dn'}`}>
          <span className="lx-num">{row.wow}</span>
        </span>
      ),
    },
    {
      title: t('intel.col.score'),
      dataIndex: 'score',
      key: 'score',
      render: (value: number) => (
        <LxTag variant={value >= 85 ? 'done' : value >= 65 ? 'graphic' : 'producing'}>
          <span className="lx-num">{value}</span>
        </LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('intel.action.report')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<TrendRow>
      titleKey="intel.page.home"
      subtitleKey="intel.page.homeSub"
      kpis={[
        { labelKey: 'intel.kpi.keywords', value: '128', sub: t('intel.kpi.sub.monitored'), trend: 'up', delta: '16', color: 'primary', spark: [8, 10, 12, 14, 15, 18, 20, 22] },
        { labelKey: 'intel.kpi.rising', value: '36', sub: t('intel.kpi.sub.wow'), trend: 'up', delta: '9', color: 'secondary', spark: [2, 3, 4, 4, 6, 7, 8, 9] },
        { labelKey: 'intel.kpi.opportunities', value: '12', sub: t('intel.kpi.sub.scanned'), trend: 'up', delta: '3', color: 'accent', spark: [1, 2, 2, 3, 3, 4, 4, 5] },
        { labelKey: 'intel.kpi.sources', value: '3', sub: t('intel.kpi.sub.coverage'), trend: 'fl', delta: '0', color: 'success', spark: [3, 3, 3, 3, 3, 3, 3, 3] },
      ]}
      insightsTitleKey="intel.insight.title"
      insightsSubKey="intel.insight.sub"
      insightsMoreKey="intel.insight.more"
      insights={[
        { typeKey: 'intel.insight.spike.type', textKey: 'intel.insight.spike.text', sourceKey: 'intel.insight.spike.source', accent: 'accent', tone: 'atlas', icon: <FireOutlined /> },
        { typeKey: 'intel.insight.opportunity.type', textKey: 'intel.insight.opportunity.text', sourceKey: 'intel.insight.opportunity.source', accent: 'success', tone: 'atlas', icon: <CompassOutlined /> },
        { typeKey: 'intel.insight.source.type', textKey: 'intel.insight.source.text', sourceKey: 'intel.insight.source.source', accent: 'primary', tone: 'atlas', icon: <DatabaseOutlined /> },
      ]}
      quicks={[
        { titleKey: 'intel.quick.watch', descKey: 'intel.quick.watchDesc', icon: <AimOutlined />, tone: 'primary' },
        { titleKey: 'intel.quick.scan', descKey: 'intel.quick.scanDesc', icon: <LineChartOutlined />, tone: 'accent' },
        { titleKey: 'intel.quick.export', descKey: 'intel.quick.exportDesc', icon: <ExportOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="intel.list.title"
      listSubKey="intel.list.sub"
      listMoreKey="intel.list.more"
      searchPlaceholderKey="intel.list.search"
      filterLabelKey="intel.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="intel.list.empty"
      emptyHintKey="intel.list.emptyHint"
      total={128}
    />
  );
}
