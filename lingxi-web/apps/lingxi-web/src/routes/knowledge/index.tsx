import { useTranslation } from 'react-i18next';
import {
  BookOutlined,
  BulbOutlined,
  CommentOutlined,
  FileAddOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 知识中心首页（/knowledge）—— 组织知识资产（产品规划说明书 §2.10）。
 *
 * 四类资产各有明确消费者：
 *  模板 / 话术 → 人工通道（业务员直接引用）
 *  QA 库      → 营销客服智能体（标准答疑）
 *  提示词库   → 智能体通道（版本化 + A/B，代码只引用编码，禁止内联）
 *
 * 提示词入库是硬要求（技术规约2.0 §3.6 G7）：代码内联提示词会导致
 * 改一句话要发一次版，且无法做 A/B 与回归评测。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/kc/assets。
 */

interface AssetRow extends ModuleHomeRow {
  id: string;
  nameKey: string;
  code: string;
  type: 'template' | 'phrase' | 'qa' | 'prompt';
  sceneKey: string;
  lang: string;
  version: string;
}

const ROWS: readonly AssetRow[] = [
  { id: '1', nameKey: 'kc.asset.r1', code: 'KC-TPL-0042', type: 'template', sceneKey: 'demo.scene.outreach', lang: 'EN', version: 'v3' },
  { id: '2', nameKey: 'kc.asset.r2', code: 'KC-PHR-0186', type: 'phrase', sceneKey: 'demo.scene.followup', lang: 'DE', version: 'v2' },
  { id: '3', nameKey: 'kc.asset.r3', code: 'KC-QA-0231', type: 'qa', sceneKey: 'demo.scene.afterSales', lang: 'EN', version: 'v5' },
  { id: '4', nameKey: 'kc.asset.r4', code: 'KC-PRM-0034', type: 'prompt', sceneKey: 'demo.scene.contentGen', lang: '-', version: 'v2' },
  { id: '5', nameKey: 'kc.asset.r5', code: 'KC-TPL-0038', type: 'template', sceneKey: 'demo.scene.quotation', lang: 'ES', version: 'v1' },
];

const TYPE_TAG = {
  template: 'graphic',
  phrase: 'lang',
  qa: 'done',
  prompt: 'video',
} as const;

const TYPE_ICON = {
  template: <FileTextOutlined />,
  phrase: <CommentOutlined />,
  qa: <QuestionCircleOutlined />,
  prompt: <RobotOutlined />,
} as const;

export default function KnowledgeHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('kc.col.asset'),
      dataIndex: 'nameKey',
      key: 'asset',
      render: (_value: string, row: AssetRow) => (
        <span className="lx-cell-media">
          <span className={`lx-thumb lx-thumb--${row.type === 'prompt' ? 'video' : row.type === 'template' ? 'graphic' : 'stored'}`}>
            {TYPE_ICON[row.type]}
          </span>
          <span>
            <div className="lx-cell-title">{t(row.nameKey)}</div>
            <div className="lx-cell-code">{row.code}</div>
          </span>
        </span>
      ),
    },
    {
      title: t('kc.col.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: AssetRow['type']) => <LxTag variant={TYPE_TAG[value]}>{t(`kc.type.${value}`)}</LxTag>,
    },
    { title: t('kc.col.scene'), dataIndex: 'sceneKey', key: 'scene', render: (value: string) => t(value) },
    {
      title: t('kc.col.lang'),
      dataIndex: 'lang',
      key: 'lang',
      render: (value: string) => <LxTag variant="lang">{value}</LxTag>,
    },
    {
      title: t('kc.col.version'),
      dataIndex: 'version',
      key: 'version',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('kc.action.edit')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<AssetRow>
      titleKey="kc.page.home"
      subtitleKey="kc.page.homeSub"
      kpis={[
        { labelKey: 'kc.kpi.templates', value: '86', sub: t('kc.kpi.sub.scenes'), trend: 'up', delta: '6', color: 'primary', spark: [4, 5, 6, 6, 7, 8, 8, 9] },
        { labelKey: 'kc.kpi.phrases', value: '420', sub: t('kc.kpi.sub.multilang'), trend: 'up', delta: '32', color: 'secondary', spark: [20, 24, 28, 32, 36, 40, 44, 48] },
        { labelKey: 'kc.kpi.qa', value: '158', sub: t('kc.kpi.sub.coverage'), trend: 'up', delta: '12', color: 'accent', spark: [8, 10, 12, 14, 16, 18, 20, 22] },
        { labelKey: 'kc.kpi.promptVersions', value: '34', sub: t('kc.kpi.sub.ab'), trend: 'up', delta: '4', color: 'success', spark: [2, 3, 3, 4, 4, 5, 5, 6] },
      ]}
      insightsTitleKey="kc.insight.title"
      insightsSubKey="kc.insight.sub"
      insightsMoreKey="kc.insight.more"
      insights={[
        { typeKey: 'kc.insight.ab.type', textKey: 'kc.insight.ab.text', sourceKey: 'kc.insight.ab.source', accent: 'primary', tone: 'muse', icon: <BulbOutlined /> },
        { typeKey: 'kc.insight.gap.type', textKey: 'kc.insight.gap.text', sourceKey: 'kc.insight.gap.source', accent: 'accent', tone: 'muse', icon: <QuestionCircleOutlined /> },
        { typeKey: 'kc.insight.extract.type', textKey: 'kc.insight.extract.text', sourceKey: 'kc.insight.extract.source', accent: 'success', tone: 'sage', icon: <BookOutlined /> },
      ]}
      quicks={[
        { titleKey: 'kc.quick.template', descKey: 'kc.quick.templateDesc', icon: <FileAddOutlined />, tone: 'primary' },
        { titleKey: 'kc.quick.phrase', descKey: 'kc.quick.phraseDesc', icon: <CommentOutlined />, tone: 'accent' },
        { titleKey: 'kc.quick.prompt', descKey: 'kc.quick.promptDesc', icon: <RobotOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="kc.list.title"
      listSubKey="kc.list.sub"
      listMoreKey="kc.list.more"
      searchPlaceholderKey="kc.list.search"
      filterLabelKey="kc.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="kc.list.empty"
      emptyHintKey="kc.list.emptyHint"
      total={698}
    />
  );
}
