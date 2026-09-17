import { useTranslation } from 'react-i18next';
import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FileImageOutlined,
  TagsOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag, LxThumb } from '@lingxi/ui';

/**
 * 商品中心首页（/product）—— 商品与素材的单一事实源（产品规划说明书 §2.3）。
 *
 * 为什么"数据完整度"是一等指标：内容创意、社媒运营、订单建单都消费商品主数据，
 * 商品字段缺失不是商品模块自己的问题，会直接放大成内容质量与交付准确性问题；
 * 因此完整度必须被显性度量并给出补全入口（AI 自动补全 HS 编码与属性缺失项）。
 *
 * 缩略图：沿用高保真原型的素材列视觉（有图用图、无图降级为图标色块），
 * 图片资产随原型一并移植到 public/images，图片本身不入 i18n。
 *
 * 静态骨架：占位演示数据（品名为真实语种专有名词，不翻译），接入后走 /api/v1/prd/products。
 */

interface ProductRow extends ModuleHomeRow {
  id: string;
  name: string;
  sku: string;
  categoryKey: string;
  hsCode: string;
  assets: number;
  completeness: number;
  /** 主图；缺省时列表降级为图标占位（不应出现空白列） */
  image?: string | undefined;
}

const ROWS: readonly ProductRow[] = [
  { id: '1', name: 'Portable Power Station 1000W', sku: 'PS-1000-EU', categoryKey: 'demo.category.energy', hsCode: '8507600090', assets: 42, completeness: 96, image: '/images/product-power.png' },
  { id: '2', name: 'LiFePO4 Battery Module 5kWh', sku: 'BM-5K-48V', categoryKey: 'demo.category.battery', hsCode: '8507600090', assets: 28, completeness: 88 },
  { id: '3', name: 'Foldable Solar Panel 200W', sku: 'SP-200-FD', categoryKey: 'demo.category.solar', hsCode: '8541430000', assets: 35, completeness: 82, image: '/images/product-solar.png' },
  { id: '4', name: 'Hybrid Inverter 8kW', sku: 'IV-8K-HY', categoryKey: 'demo.category.inverter', hsCode: '-', assets: 12, completeness: 64 },
  { id: '5', name: 'EV Charger Wallbox 11kW', sku: 'EV-11K-WB', categoryKey: 'demo.category.charging', hsCode: '8504403090', assets: 19, completeness: 71 },
];

export default function ProductHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('prd.col.thumb'),
      dataIndex: 'image',
      key: 'thumb',
      width: 64,
      render: (_value: string | undefined, row: ProductRow) => (
        <LxThumb src={row.image} alt={row.name} kind="graphic" icon={<FileImageOutlined />} />
      ),
    },
    {
      title: t('prd.col.product'),
      dataIndex: 'name',
      key: 'name',
      render: (_value: string, row: ProductRow) => (
        <span>
          <div className="lx-cell-title">{row.name}</div>
          <div className="lx-cell-code">{row.sku}</div>
        </span>
      ),
    },
    { title: t('prd.col.category'), dataIndex: 'categoryKey', key: 'category', render: (value: string) => t(value) },
    {
      title: t('prd.col.hsCode'),
      dataIndex: 'hsCode',
      key: 'hsCode',
      render: (value: string) =>
        value === '-' ? (
          <LxTag variant="review">{t('prd.hs.missing')}</LxTag>
        ) : (
          <span className="lx-num">{value}</span>
        ),
    },
    {
      title: t('prd.col.assets'),
      dataIndex: 'assets',
      key: 'assets',
      render: (value: number) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('prd.col.completeness'),
      dataIndex: 'completeness',
      key: 'completeness',
      render: (value: number) => (
        <LxTag variant={value >= 85 ? 'done' : value >= 70 ? 'graphic' : 'review'}>
          <span className="lx-num">{value}%</span>
        </LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('prd.action.complete')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<ProductRow>
      titleKey="prd.page.home"
      subtitleKey="prd.page.homeSub"
      kpis={[
        { labelKey: 'prd.kpi.sku', value: '486', sub: t('prd.kpi.sub.active'), trend: 'up', delta: '12', color: 'primary', spark: [2, 3, 4, 4, 5, 6, 6, 8] },
        { labelKey: 'prd.kpi.assets', value: '2,340', sub: t('prd.kpi.sub.multilang'), trend: 'up', delta: '8.6%', color: 'secondary', spark: [12, 15, 18, 22, 26, 30, 36, 42] },
        { labelKey: 'prd.kpi.completeness', value: '88%', sub: t('prd.kpi.sub.target'), trend: 'up', delta: '3.1pt', color: 'accent', spark: [6, 7, 7, 8, 8, 9, 9, 10] },
        { labelKey: 'prd.kpi.localeCoverage', value: '76%', sub: t('prd.kpi.sub.locale'), trend: 'fl', delta: '0pt', color: 'success', spark: [5, 5, 6, 6, 6, 7, 7, 7] },
      ]}
      insightsTitleKey="prd.insight.title"
      insightsSubKey="prd.insight.sub"
      insightsMoreKey="prd.insight.more"
      insights={[
        { typeKey: 'prd.insight.hs.type', textKey: 'prd.insight.hs.text', sourceKey: 'prd.insight.hs.source', accent: 'accent', tone: 'muse', icon: <TagsOutlined /> },
        { typeKey: 'prd.insight.asset.type', textKey: 'prd.insight.asset.text', sourceKey: 'prd.insight.asset.source', accent: 'primary', tone: 'muse', icon: <FileTextOutlined /> },
        { typeKey: 'prd.insight.locale.type', textKey: 'prd.insight.locale.text', sourceKey: 'prd.insight.locale.source', accent: 'success', tone: 'muse', icon: <TranslationOutlined /> },
      ]}
      quicks={[
        { titleKey: 'prd.quick.create', descKey: 'prd.quick.createDesc', icon: <AppstoreAddOutlined />, tone: 'primary' },
        { titleKey: 'prd.quick.upload', descKey: 'prd.quick.uploadDesc', icon: <CloudUploadOutlined />, tone: 'accent' },
        { titleKey: 'prd.quick.fill', descKey: 'prd.quick.fillDesc', icon: <ExperimentOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="prd.list.title"
      listSubKey="prd.list.sub"
      listMoreKey="prd.list.more"
      searchPlaceholderKey="prd.list.search"
      filterLabelKey="prd.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="prd.list.empty"
      emptyHintKey="prd.list.emptyHint"
      total={486}
    />
  );
}
