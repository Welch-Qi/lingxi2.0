import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 客户中心首页（/customer）—— 客户资产的家（产品规划说明书 §2.2）。
 *
 * 为什么首屏是"线索池 + 待跟进"而不是客户列表：
 * 这一页服务的是客户销售服务总监的日常——他每天先处理"新进来的线索"和
 * "今天该跟的人"，已成交客户是资产而不是待办。
 *
 * 数据链路：线索属企业内部私域数据（L1 数据底座的第三类数据源），
 * 经「企业实体中心」按域名/名称规范化与外部数据挂接，
 * 一条记录同时具备采购能力与在谈商机（产品规划说明书 §3.2）。
 *
 * 静态骨架：占位演示数据（公司名为真实语种专有名词，故不翻译），
 * 接入后走 /api/v1/cus/leads。
 */

interface LeadRow extends ModuleHomeRow {
  id: string;
  name: string;
  code: string;
  sourceKey: string;
  score: number;
  ownerKey: string;
  status: 'new' | 'following' | 'qualified';
}

const ROWS: readonly LeadRow[] = [
  { id: '1', name: 'Nordwind Energie GmbH', code: 'LD-2026-0187', sourceKey: 'demo.source.customs', score: 92, ownerKey: 'demo.owner.echo', status: 'qualified' },
  { id: '2', name: 'Saigon Solar Co., Ltd', code: 'LD-2026-0186', sourceKey: 'demo.source.social', score: 78, ownerKey: 'demo.owner.linlan', status: 'following' },
  { id: '3', name: 'BluePeak Storage LLC', code: 'LD-2026-0185', sourceKey: 'demo.source.email', score: 71, ownerKey: 'demo.owner.echo', status: 'following' },
  { id: '4', name: 'Anatolia Power A.S.', code: 'LD-2026-0184', sourceKey: 'demo.source.expo', score: 64, ownerKey: 'demo.owner.zhoumu', status: 'new' },
  { id: '5', name: 'Atacama Mining SpA', code: 'LD-2026-0183', sourceKey: 'demo.source.customs', score: 58, ownerKey: 'demo.owner.unassigned', status: 'new' },
];

const STATUS_TAG = {
  new: 'producing',
  following: 'graphic',
  qualified: 'done',
} as const;

export default function CustomerHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('cus.col.name'),
      dataIndex: 'name',
      key: 'name',
      render: (_value: string, row: LeadRow) => (
        <span>
          <div className="lx-cell-title">{row.name}</div>
          <div className="lx-cell-code">{row.code}</div>
        </span>
      ),
    },
    {
      title: t('cus.col.source'),
      dataIndex: 'sourceKey',
      key: 'source',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    {
      title: t('cus.col.score'),
      dataIndex: 'score',
      key: 'score',
      render: (value: number) => <span className="lx-num">{value}</span>,
    },
    { title: t('cus.col.owner'), dataIndex: 'ownerKey', key: 'owner', render: (value: string) => t(value) },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: LeadRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`cus.status.${value}`)}</LxTag>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: (_value: unknown, row: LeadRow) => (
        <button type="button" className="lx-cell-link lx-focusable">
          {row.ownerKey === 'demo.owner.unassigned' ? t('cus.action.assign') : t('cus.action.follow')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<LeadRow>
      titleKey="cus.page.home"
      subtitleKey="cus.page.homeSub"
      kpis={[
        { labelKey: 'cus.kpi.total', value: '1,286', sub: t('cus.kpi.sub.profiled'), trend: 'up', delta: '4.2%', color: 'primary', spark: [42, 48, 52, 58, 61, 68, 74, 81] },
        { labelKey: 'cus.kpi.newLead', value: '164', sub: t('cus.kpi.sub.week'), trend: 'up', delta: '18.4%', color: 'secondary', spark: [12, 16, 14, 22, 26, 24, 32, 36] },
        { labelKey: 'cus.kpi.highIntent', value: '34', sub: t('cus.kpi.sub.intent'), trend: 'up', delta: '5', color: 'accent', spark: [4, 6, 5, 9, 8, 11, 10, 14] },
        { labelKey: 'cus.kpi.todayFollow', value: '12', sub: t('cus.kpi.sub.overdue'), trend: 'fl', delta: '0', color: 'success', spark: [3, 4, 4, 3, 4, 4, 3, 3] },
      ]}
      insightsTitleKey="cus.insight.title"
      insightsSubKey="cus.insight.sub"
      insightsMoreKey="cus.insight.more"
      insights={[
        { typeKey: 'cus.insight.dup.type', textKey: 'cus.insight.dup.text', sourceKey: 'cus.insight.dup.source', accent: 'accent', tone: 'echo', icon: <SearchOutlined /> },
        { typeKey: 'cus.insight.follow.type', textKey: 'cus.insight.follow.text', sourceKey: 'cus.insight.follow.source', accent: 'success', tone: 'echo', icon: <ClockCircleOutlined /> },
        { typeKey: 'cus.insight.pool.type', textKey: 'cus.insight.pool.text', sourceKey: 'cus.insight.pool.source', accent: 'primary', tone: 'sage', icon: <AlertOutlined /> },
      ]}
      quicks={[
        { titleKey: 'cus.quick.create', descKey: 'cus.quick.createDesc', icon: <UserAddOutlined />, tone: 'primary' },
        { titleKey: 'cus.quick.import', descKey: 'cus.quick.importDesc', icon: <ImportOutlined />, tone: 'accent' },
        { titleKey: 'cus.quick.export', descKey: 'cus.quick.exportDesc', icon: <ExportOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="cus.list.title"
      listSubKey="cus.list.sub"
      listMoreKey="cus.list.more"
      searchPlaceholderKey="cus.list.search"
      filterLabelKey="cus.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="cus.list.empty"
      emptyHintKey="cus.list.emptyHint"
      total={164}
    />
  );
}
