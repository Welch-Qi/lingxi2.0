import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ExportOutlined,
  FileAddOutlined,
  MoneyCollectOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxFilterButton,
  LxSearchInput,
  LxSectionHeader,
  LxStageBoard,
  LxTable,
  LxTableCard,
  LxTag,
  LxWorkList,
} from '@lingxi/ui';
import type { LxStage, LxWorkItem } from '@lingxi/ui';
import { formatMoney } from '@lingxi/utils';
import { PageContainer } from '@/components/PageContainer';
import { ORDER_ROWS, OTD_STAGES } from './data';

/**
 * 订单交付首页（/order）—— 从签约到签收（产品规划说明书 V2.1 §2.6）。
 *
 * 典型使用者：渠道运营总监。§1.5 描述他关心"渠道结构健康不健康、履约顺不顺、
 * 准时不准时"，§5.3 给出的默认首屏是「订单量结构 + OTD 准时率与异常单 + 渠道产出排行」。
 *
 * 差异化的关键在 OTD 节点看板：其他模块看"有多少"，本模块看"卡在哪一段"。
 * 七个节点（订单确认→排产→生产完工→出运→报关→到港→签收）横排后，
 * 节点间数量骤减的位置就是瓶颈，这是订单模块独有的判断方式。
 *
 * 两个队列按"要不要立刻动手"分层：
 *   ① 交付风险单（danger）—— 已偏移标准工期，必须今天催办
 *   ② 待回款（accent）—— 有账期约束，本周内处理即可
 *
 * 金额处理：一律走 formatMoney（最小单位整数 + 币种），
 * 禁止在组件里做浮点运算或手工拼币种符号（技术规约2.0 §3.3 D5 / §4.10）。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据定义在 ./data。
 *
 * 2026-09-29 扩展：OTD 看板左侧加「全部订单」卡，所有卡可点筛选下方列表；
 * 风险 / 待回款区「查看全部」同样筛选下方列表；四个动作按钮与行内动作拉起二级页。
 */

const STATUS_TAG = {
  ontrack: 'done',
  risk: 'review',
  delayed: 'video',
} as const;

/** 列表筛选：'all' = 全部；OTD 阶段键 = 按节点；'risk'/'pay' = 按队列。 */
type ListFilter = string;

export default function OrderHomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('all');

  /** OTD 节点名走 i18n（`ord.stage.*.label`）；最左侧合成「全部订单」卡。 */
  const otdStages: readonly LxStage[] = [
    { key: 'all', label: t('ord.stage.all'), count: 96, value: '¥12.8M' },
    ...OTD_STAGES.map((stage) => ({ ...stage, label: t(`ord.stage.${stage.key}.label`) })),
  ];

  const activeKey = listFilter === 'all' ? 'all' : OTD_STAGES.some((s) => s.key === listFilter) ? listFilter : undefined;

  /** 交付风险单：ETA 与卡点节点是催办的依据；AI 提前预警在标记里体现。 */
  const riskItems: readonly LxWorkItem[] = [
    {
      key: 'r1',
      title: 'BluePeak Storage LLC',
      sub: t('ord.item.r1.sub'),
      tags: [{ label: t('ord.item.r1.tag1'), variant: 'review' }],
      agentLabel: t('ord.item.r1.agent'),
      value: '$99,500',
      valueTone: 'danger',
      actionLabel: t('ord.action.urge'),
      actionPrimary: true,
      onAction: () => void navigate('/order/3/urge'),
    },
    {
      key: 'r2',
      title: 'Saigon Solar Co., Ltd',
      sub: t('ord.item.r2.sub'),
      tags: [{ label: t('ord.item.r2.tag1'), variant: 'review' }],
      agentLabel: t('ord.item.r2.agent'),
      value: '$42,800',
      valueTone: 'danger',
      actionLabel: t('ord.action.urge'),
      actionPrimary: true,
      onAction: () => void navigate('/order/2/urge'),
    },
    {
      key: 'r3',
      title: 'Anatolia Power A.S.',
      sub: t('ord.item.r3.sub'),
      tags: [{ label: t('ord.item.r3.tag1'), variant: 'producing' }],
      value: '€71,200',
      valueTone: 'accent',
      actionLabel: t('ord.item.r3.action'),
      onAction: () => void navigate('/order/4/nodes'),
    },
  ];

  /** 待回款：账期临近的应收账款，处理动作是"登记回款"而不是"催客户"。 */
  const receivableItems: readonly LxWorkItem[] = [
    {
      key: 'm1',
      title: 'Nordwind Energie GmbH',
      sub: t('ord.item.m1.sub'),
      tags: [{ label: t('ord.item.m1.tag1'), variant: 'producing' }],
      value: '€156,000',
      actionLabel: t('ord.action.logPayment'),
      actionPrimary: true,
      onAction: () => void navigate('/order/payment'),
    },
    {
      key: 'm2',
      title: 'Atacama Mining SpA',
      sub: t('ord.item.m2.sub'),
      tags: [{ label: t('ord.item.m2.tag1'), variant: 'review' }],
      value: '$36,400',
      valueTone: 'danger',
      actionLabel: t('ord.action.logPayment'),
      actionPrimary: true,
      onAction: () => void navigate('/order/payment'),
    },
  ];

  const baseRows =
    listFilter === 'all'
      ? ORDER_ROWS
      : listFilter === 'risk'
        ? ORDER_ROWS.filter((row) => row.status === 'risk' || row.status === 'delayed')
        : listFilter === 'pay'
          ? ORDER_ROWS.filter((row) => row.pendingPayment)
          : ORDER_ROWS.filter((row) => row.stageKey === listFilter);

  const visibleRows = keyword
    ? baseRows.filter((row) => row.customer.includes(keyword) || row.orderNo.includes(keyword))
    : baseRows;

  const columns = [
    {
      title: t('ord.col.order'),
      dataIndex: 'orderNo',
      key: 'order',
      render: (_value: string, row: (typeof ORDER_ROWS)[number]) => (
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
      render: (_value: number, row: (typeof ORDER_ROWS)[number]) => (
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
      render: (value: (typeof ORDER_ROWS)[number]['status']) => (
        <LxTag variant={STATUS_TAG[value]}>{t(`ord.status.${value}`)}</LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      render: (_value: string, row: (typeof ORDER_ROWS)[number]) => (
        <button
          type="button"
          className="lx-cell-link lx-focusable"
          onClick={() => void navigate(`/order/${row.id}/track`)}
        >
          {t('ord.action.track')}
        </button>
      ),
    },
  ];

  return (
    <PageContainer titleKey="ord.page.home" hideTitle>
      <LxActionBar
        primary={{
          key: 'create',
          label: t('ord.bar.create'),
          icon: <RocketOutlined />,
          onClick: () => void navigate('/order/create'),
        }}
        items={[
          { key: 'parse', label: t('ord.bar.parse'), icon: <FileAddOutlined />, onClick: () => void navigate('/order/parse') },
          { key: 'payment', label: t('ord.bar.payment'), icon: <MoneyCollectOutlined />, onClick: () => void navigate('/order/payment') },
          { key: 'statement', label: t('ord.bar.statement'), icon: <ExportOutlined />, onClick: () => void navigate('/order/statement') },
        ]}
        note={
          <>
            {t('ord.note.prefix')}
            <b>96</b>
            {t('ord.note.suffix')}
          </>
        }
      />

      <LxStageBoard
        stages={otdStages}
        onSelect={(key) => setListFilter(key)}
        activeKey={activeKey}
      />

      {listFilter === 'all' && (
        <div className="lx-workgrid">
          <div className="lx-workgrid__col">
            <LxWorkList
              title={t('ord.queue.risk.title')}
              sub={t('ord.queue.risk.sub')}
              count={3}
              tone="danger"
              moreLabel={t('ord.queue.risk.more')}
              onMore={() => setListFilter('risk')}
              items={riskItems}
              emptyText={t('ord.queue.risk.empty')}
            />
          </div>

          <div className="lx-workgrid__col">
            <LxWorkList
              title={t('ord.queue.pay.title')}
              sub={t('ord.queue.pay.sub')}
              count={5}
              tone="accent"
              moreLabel={t('ord.queue.pay.more')}
              onMore={() => setListFilter('pay')}
              items={receivableItems}
              emptyText={t('ord.queue.pay.empty')}
            />
          </div>
        </div>
      )}

      <section className="lx-section">
        <LxSectionHeader
          title={t('ord.list.title')}
          sub={t('ord.list.sub')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('ord.list.search')} onChange={setKeyword} />
              <LxFilterButton label={t('ord.list.filter')} />
              <span className="lx-tools-note">
                <ThunderboltOutlined />
                {t('ord.list.syncHint')}
              </span>
            </>
          }
        >
          <LxTable<(typeof ORDER_ROWS)[number]>
            columns={columns}
            dataSource={[...visibleRows]}
            total={listFilter === 'all' && !keyword ? 96 : visibleRows.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
