import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  CustomerServiceOutlined,
  FileAddOutlined,
  FormOutlined,
  InteractionOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 售后服务首页（/service）—— 问题闭环与质量反哺（产品规划说明书 §2.5）。
 *
 * 设计要点：售后不只是"救火"，它的产出必须回流到产品开发——
 * 质量类问题要归纳成改品建议（供产品开发总监使用），
 * 否则同一个质量问题会在不同客户身上重复赔付。
 *
 * SLA：达标率与剩余时长同时呈现，因为"剩余 40 分钟"比"未超时"更能驱动动作。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/svc/tickets。
 */

interface TicketRow extends ModuleHomeRow {
  id: string;
  ticketNo: string;
  customer: string;
  issueKey: string;
  ownerKey: string;
  slaLeft: string;
  status: 'open' | 'processing' | 'closed';
}

const ROWS: readonly TicketRow[] = [
  { id: '1', ticketNo: 'ST-2026-0231', customer: 'Nordwind Energie GmbH', issueKey: 'demo.issue.battery', ownerKey: 'demo.owner.echo', slaLeft: '00:42', status: 'processing' },
  { id: '2', ticketNo: 'ST-2026-0229', customer: 'BluePeak Storage LLC', issueKey: 'demo.issue.inverter', ownerKey: 'demo.owner.linlan', slaLeft: '03:15', status: 'processing' },
  { id: '3', ticketNo: 'ST-2026-0227', customer: 'Saigon Solar Co., Ltd', issueKey: 'demo.issue.logistics', ownerKey: 'demo.owner.zhoumu', slaLeft: '11:08', status: 'open' },
  { id: '4', ticketNo: 'ST-2026-0224', customer: 'Anatolia Power A.S.', issueKey: 'demo.issue.docs', ownerKey: 'demo.owner.echo', slaLeft: '-', status: 'closed' },
  { id: '5', ticketNo: 'ST-2026-0222', customer: 'Atacama Mining SpA', issueKey: 'demo.issue.battery', ownerKey: 'demo.owner.linlan', slaLeft: '-', status: 'closed' },
];

const STATUS_TAG = {
  open: 'producing',
  processing: 'graphic',
  closed: 'done',
} as const;

export default function ServiceHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('svc.col.ticket'),
      dataIndex: 'ticketNo',
      key: 'ticket',
      render: (_value: string, row: TicketRow) => (
        <span>
          <div className="lx-cell-title">{row.customer}</div>
          <div className="lx-cell-code">{row.ticketNo}</div>
        </span>
      ),
    },
    {
      title: t('svc.col.issue'),
      dataIndex: 'issueKey',
      key: 'issue',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    { title: t('svc.col.owner'), dataIndex: 'ownerKey', key: 'owner', render: (value: string) => t(value) },
    {
      title: t('svc.col.sla'),
      dataIndex: 'slaLeft',
      key: 'sla',
      render: (value: string) =>
        value === '-' ? (
          <span className="lx-muted">-</span>
        ) : (
          <LxTag variant={value.startsWith('00') ? 'review' : 'lang'}>
            <span className="lx-num">{value}</span>
          </LxTag>
        ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: TicketRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`svc.status.${value}`)}</LxTag>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('svc.action.handle')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<TicketRow>
      titleKey="svc.page.home"
      subtitleKey="svc.page.homeSub"
      kpis={[
        { labelKey: 'svc.kpi.records', value: '168', sub: t('svc.kpi.sub.month'), trend: 'up', delta: '6.4%', color: 'primary', spark: [10, 12, 14, 13, 18, 20, 19, 24] },
        { labelKey: 'svc.kpi.openTickets', value: '24', sub: t('svc.kpi.sub.inProgress'), trend: 'fl', delta: '0', color: 'secondary', spark: [4, 5, 4, 5, 5, 4, 5, 5] },
        { labelKey: 'svc.kpi.sla', value: '96.5%', sub: t('svc.kpi.sub.target'), trend: 'up', delta: '1.2pt', color: 'accent', spark: [8, 8, 9, 9, 9, 10, 10, 10] },
        { labelKey: 'svc.kpi.avgHours', value: '6.2h', sub: t('svc.kpi.sub.avg'), trend: 'dn', delta: '0.8h', color: 'success', spark: [9, 8, 8, 7, 7, 6, 6, 6] },
      ]}
      insightsTitleKey="svc.insight.title"
      insightsSubKey="svc.insight.sub"
      insightsMoreKey="svc.insight.more"
      insights={[
        { typeKey: 'svc.insight.sla.type', textKey: 'svc.insight.sla.text', sourceKey: 'svc.insight.sla.source', accent: 'accent', tone: 'echo', icon: <AlertOutlined /> },
        { typeKey: 'svc.insight.quality.type', textKey: 'svc.insight.quality.text', sourceKey: 'svc.insight.quality.source', accent: 'primary', tone: 'sage', icon: <InteractionOutlined /> },
        { typeKey: 'svc.insight.kb.type', textKey: 'svc.insight.kb.text', sourceKey: 'svc.insight.kb.source', accent: 'success', tone: 'echo', icon: <SolutionOutlined /> },
      ]}
      quicks={[
        { titleKey: 'svc.quick.create', descKey: 'svc.quick.createDesc', icon: <FileAddOutlined />, tone: 'primary' },
        { titleKey: 'svc.quick.record', descKey: 'svc.quick.recordDesc', icon: <FormOutlined />, tone: 'accent' },
        { titleKey: 'svc.quick.feedback', descKey: 'svc.quick.feedbackDesc', icon: <CustomerServiceOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="svc.list.title"
      listSubKey="svc.list.sub"
      listMoreKey="svc.list.more"
      searchPlaceholderKey="svc.list.search"
      filterLabelKey="svc.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="svc.list.empty"
      emptyHintKey="svc.list.emptyHint"
      total={24}
    />
  );
}
