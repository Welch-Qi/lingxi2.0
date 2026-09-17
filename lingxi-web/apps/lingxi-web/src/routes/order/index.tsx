import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  ExportOutlined,
  FileAddOutlined,
  MoneyCollectOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { formatMoney } from '@lingxi/utils';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 订单交付首页（/order）—— 从签约到签收（产品规划说明书 §2.4）。
 *
 * 金额处理：一律走 formatMoney（最小单位整数 + 币种），
 * 禁止在组件里做浮点运算或手工拼币种符号（技术规约2.0 §3.3 D5 / §4.10）。
 *
 * OTD 节点：系统提供默认节点模板（订单确认 / 排产 / 生产完工 / 出运 / 报关 / 到港 / 签收），
 * 企业可增删改并设标准工期与预警提前量，以适配贸易型与生产型企业的差异。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/ord/orders。
 */

interface OrderRow extends ModuleHomeRow {
  id: string;
  orderNo: string;
  customer: string;
  amountMinor: number;
  currency: string;
  nodeKey: string;
  eta: string;
  status: 'ontrack' | 'risk' | 'delayed';
}

const ROWS: readonly OrderRow[] = [
  { id: '1', orderNo: 'SO-2026-0418', customer: 'Nordwind Energie GmbH', amountMinor: 15_600_000, currency: 'EUR', nodeKey: 'demo.otd.production', eta: '2026-10-08', status: 'ontrack' },
  { id: '2', orderNo: 'SO-2026-0417', customer: 'Saigon Solar Co., Ltd', amountMinor: 4_280_000, currency: 'USD', nodeKey: 'demo.otd.shipping', eta: '2026-09-24', status: 'risk' },
  { id: '3', orderNo: 'SO-2026-0415', customer: 'BluePeak Storage LLC', amountMinor: 9_950_000, currency: 'USD', nodeKey: 'demo.otd.customs', eta: '2026-09-30', status: 'delayed' },
  { id: '4', orderNo: 'SO-2026-0412', customer: 'Anatolia Power A.S.', amountMinor: 7_120_000, currency: 'EUR', nodeKey: 'demo.otd.arrival', eta: '2026-09-20', status: 'ontrack' },
  { id: '5', orderNo: 'SO-2026-0409', customer: 'Atacama Mining SpA', amountMinor: 3_640_000, currency: 'USD', nodeKey: 'demo.otd.received', eta: '2026-09-12', status: 'ontrack' },
];

const STATUS_TAG = {
  ontrack: 'done',
  risk: 'review',
  delayed: 'video',
} as const;

export default function OrderHomePage() {
  const { t, i18n } = useTranslation();

  const columns = [
    {
      title: t('ord.col.order'),
      dataIndex: 'orderNo',
      key: 'order',
      render: (_value: string, row: OrderRow) => (
        <span>
          <div className="lx-cell-title">{row.customer}</div>
          <div className="lx-cell-code">{row.orderNo}</div>
        </span>
      ),
    },
    {
      title: t('ord.col.amount'),
      dataIndex: 'amountMinor',
      key: 'amount',
      render: (_value: number, row: OrderRow) => (
        <span className="lx-num">{formatMoney(row.amountMinor, row.currency, i18n.language)}</span>
      ),
    },
    {
      title: t('ord.col.node'),
      dataIndex: 'nodeKey',
      key: 'node',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    {
      title: t('ord.col.eta'),
      dataIndex: 'eta',
      key: 'eta',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: OrderRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`ord.status.${value}`)}</LxTag>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('ord.action.track')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<OrderRow>
      titleKey="ord.page.home"
      subtitleKey="ord.page.homeSub"
      kpis={[
        { labelKey: 'ord.kpi.monthOrders', value: '96', sub: t('ord.kpi.sub.month'), trend: 'up', delta: '9.1%', color: 'primary', spark: [6, 8, 9, 11, 10, 13, 14, 16] },
        { labelKey: 'ord.kpi.gmv', value: formatMoney(1_284_000_000, 'CNY', i18n.language), sub: t('ord.kpi.sub.gmv'), trend: 'up', delta: '12.6%', color: 'secondary', spark: [20, 24, 26, 32, 30, 38, 42, 48] },
        { labelKey: 'ord.kpi.otd', value: '94.2%', sub: t('ord.kpi.sub.otd'), trend: 'up', delta: '1.8pt', color: 'accent', spark: [7, 8, 8, 9, 9, 9, 10, 10] },
        { labelKey: 'ord.kpi.risk', value: '3', sub: t('ord.kpi.sub.risk'), trend: 'dn', delta: '2', color: 'success', spark: [5, 4, 5, 4, 3, 4, 3, 3] },
      ]}
      insightsTitleKey="ord.insight.title"
      insightsSubKey="ord.insight.sub"
      insightsMoreKey="ord.insight.more"
      insights={[
        { typeKey: 'ord.insight.otd.type', textKey: 'ord.insight.otd.text', sourceKey: 'ord.insight.otd.source', accent: 'accent', tone: 'sage', icon: <AlertOutlined /> },
        { typeKey: 'ord.insight.payment.type', textKey: 'ord.insight.payment.text', sourceKey: 'ord.insight.payment.source', accent: 'primary', tone: 'sage', icon: <MoneyCollectOutlined /> },
        { typeKey: 'ord.insight.parse.type', textKey: 'ord.insight.parse.text', sourceKey: 'ord.insight.parse.source', accent: 'success', tone: 'sage', icon: <FileAddOutlined /> },
      ]}
      quicks={[
        { titleKey: 'ord.quick.create', descKey: 'ord.quick.createDesc', icon: <RocketOutlined />, tone: 'primary' },
        { titleKey: 'ord.quick.payment', descKey: 'ord.quick.paymentDesc', icon: <MoneyCollectOutlined />, tone: 'accent' },
        { titleKey: 'ord.quick.statement', descKey: 'ord.quick.statementDesc', icon: <ExportOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="ord.list.title"
      listSubKey="ord.list.sub"
      listMoreKey="ord.list.more"
      searchPlaceholderKey="ord.list.search"
      filterLabelKey="ord.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="ord.list.empty"
      emptyHintKey="ord.list.emptyHint"
      total={96}
    />
  );
}
