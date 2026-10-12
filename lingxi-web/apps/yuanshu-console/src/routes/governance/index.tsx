import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApiOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxFilterButton,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  LxWorkList,
} from '@lingxi/ui';
import type { LxWorkItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 智能体工厂 · 治理面（/governance）—— AC-01~09、AG-07~09（配置与拦截日志）。
 *
 * 本页自 lingxi-web `routes/agent/index.tsx` 拆分迁入（归口表：自主度策略、
 * 边界拦截、审批与轨迹是元枢运行时治理，灵犀只保留六智能体的业务逻辑与名册展示）。
 *
 * 管理动线：
 *   ① 待人工处理 —— 智能体跑通时不需要人看，人要介入的只有三类：
 *      需审批（自主度不足）、越界拦截（命中不做清单）、连续失败
 *      （技术规约2.0 §3.6 G14）
 *   ② 效能指标 —— 产出量、采纳率、节省工时、人工介入量（§4.3 效能可量化）
 *   ③ 治理事件与轨迹（主表）
 *
 * 自主度（A0~A3）逐任务可见：用户需要知道"这个动作是智能体自己做的，
 * 还是它只提了建议"，否则无法判断该不该复核。
 * 自主度策略的判据唯一来自元枢 AutonomyPolicyApi，禁止集群内自建（硬约束 2）。
 *
 * 文案一律走 i18n key（附录D 规则10），演示数据沿用原 agent 分区的既有文案段。
 *
 * 静态骨架：占位演示数据，接入后走元枢治理 API（/api/v1/ys/**，契约见 contracts.md）。
 */

interface GovernanceRow {
  id: string;
  taskKey: string;
  agentKey: string;
  status: 'PENDING' | 'RUNNING' | 'NEEDS_HUMAN' | 'SUCCEEDED';
  autonomy: 'A0' | 'A1' | 'A2' | 'A3';
  elapsed: string;
}

const ROWS: readonly GovernanceRow[] = [
  { id: '1', taskKey: 'ag.task.r1', agentKey: 'wb.agent.muse.name', status: 'RUNNING', autonomy: 'A1', elapsed: '04:12' },
  { id: '2', taskKey: 'ag.task.r2', agentKey: 'wb.agent.echo.name', status: 'NEEDS_HUMAN', autonomy: 'A1', elapsed: '12:38' },
  { id: '3', taskKey: 'ag.task.r3', agentKey: 'wb.agent.atlas.name', status: 'SUCCEEDED', autonomy: 'A3', elapsed: '06:45' },
  { id: '4', taskKey: 'ag.task.r4', agentKey: 'wb.agent.sage.name', status: 'RUNNING', autonomy: 'A3', elapsed: '02:20' },
  { id: '5', taskKey: 'ag.task.r5', agentKey: 'wb.agent.echo.name', status: 'NEEDS_HUMAN', autonomy: 'A0', elapsed: '18:05' },
];

const STATUS_TAG = {
  PENDING: 'producing',
  RUNNING: 'graphic',
  NEEDS_HUMAN: 'review',
  SUCCEEDED: 'done',
} as const;

export default function GovernanceHomePage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  /** 待人工处理队列：行内动作按介入原因分裂——审批 / 接管 / 排查。 */
  const humanItems: readonly LxWorkItem[] = [
    {
      key: 'h1',
      title: t('ag.item.h1.title'),
      sub: t('ag.item.h1.sub'),
      tags: [{ label: t('ag.item.h1.tag1'), variant: 'review' }],
      value: t('ag.item.h1.value'),
      valueTone: 'danger',
      actionLabel: t('ag.item.h1.action'),
      actionPrimary: true,
    },
    {
      key: 'h2',
      title: t('ag.item.h2.title'),
      sub: t('ag.item.h2.sub'),
      tags: [{ label: t('ag.item.h2.tag1'), variant: 'review' }],
      value: t('ag.item.h2.value'),
      valueTone: 'danger',
      actionLabel: t('agent.takeover'),
      actionPrimary: true,
    },
    {
      key: 'h3',
      title: t('ag.item.h3.title'),
      sub: t('ag.item.h3.sub'),
      tags: [{ label: t('ag.item.h3.tag1'), variant: 'review' }],
      value: t('ag.item.h3.value'),
      valueTone: 'accent',
      actionLabel: t('ag.item.h3.action'),
    },
  ];

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.taskKey).includes(keyword))
    : ROWS;

  const columns = [
    { title: t('ag.col.task'), dataIndex: 'taskKey', key: 'task', render: (value: string) => t(value) },
    { title: t('ag.col.agent'), dataIndex: 'agentKey', key: 'agent', render: (value: string) => t(value) },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: GovernanceRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`agent.status.${value}`)}</LxTag>,
    },
    {
      title: t('ag.col.autonomy'),
      dataIndex: 'autonomy',
      key: 'autonomy',
      render: (value: string) => (
        <LxTag variant={value === 'A0' || value === 'A1' ? 'review' : 'lang'}>
          <span className="lx-num">{value}</span>
        </LxTag>
      ),
    },
    {
      title: t('ag.col.elapsed'),
      dataIndex: 'elapsed',
      key: 'elapsed',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: (_value: unknown, row: GovernanceRow) => (
        <button type="button" className="lx-cell-link lx-focusable">
          {row.status === 'NEEDS_HUMAN' ? t('agent.takeover') : t('ag.action.trace')}
        </button>
      ),
    },
  ];

  return (
    <PageContainer titleKey="ys.gov.page" hideTitle>
      <LxActionBar
        primary={{ key: 'configure', label: t('ag.bar.configure'), icon: <SettingOutlined /> }}
        items={[
          { key: 'skills', label: t('ag.bar.skills'), icon: <DeploymentUnitOutlined /> },
          { key: 'mcp', label: t('ag.bar.mcp'), icon: <ApiOutlined /> },
          { key: 'models', label: t('ag.bar.models'), icon: <FundProjectionScreenOutlined /> },
        ]}
        note={
          <>
            {t('ag.note.prefix')}
            <b>138</b>
            {t('ag.note.suffix')}
          </>
        }
      />

      <div className="lx-workgrid">
        <div className="lx-workgrid__col">
          <LxWorkList
            title={t('ag.queue.title')}
            sub={t('ag.queue.sub')}
            count={6}
            tone="danger"
            moreLabel={t('ag.queue.more')}
            items={humanItems}
            emptyText={t('ag.queue.empty')}
          />
        </div>

        <div className="lx-workgrid__col">
          <div className="lx-grid lx-grid--kpi-4">
            <LxKpi label={t('ag.kpi.running')} value="18" sub={t('ag.kpi.sub.queue')} trend="up" delta="4" color="secondary" size="sm" />
            <LxKpi label={t('ag.kpi.adopt')} value="84%" sub={t('ag.kpi.sub.adopt')} trend="up" delta="2.1pt" color="success" size="sm" />
            <LxKpi label={t('ag.kpi.saved')} value="41h" sub={t('ag.kpi.sub.saved')} trend="up" delta="6h" color="primary" size="sm" />
            <LxKpi label={t('ag.kpi.needsHuman')} value="6" sub={t('ag.kpi.sub.breakdown')} trend="dn" delta="2" color="accent" size="sm" />
          </div>
        </div>
      </div>

      <section className="lx-section">
        <LxSectionHeader
          title={t('ag.list.title')}
          sub={t('ys.gov.listSub')}
          actionLabel={t('ag.list.more')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('ag.list.search')} onChange={setKeyword} />
              <LxFilterButton label={t('ag.list.filter')} />
            </>
          }
        >
          <LxTable<GovernanceRow>
            columns={columns}
            dataSource={[...visibleRows]}
            total={ROWS.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
