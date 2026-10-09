import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApiOutlined,
  BarChartOutlined,
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  NotificationOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxAgentCard,
  LxFilterButton,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  LxWorkList,
} from '@lingxi/ui';
import type { LxAgentStat, LxWorkItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 智能体中心首页（/agent）—— 硅基员工的管理台（产品规划说明书 V2.1 §2.11）。
 *
 * 典型使用者：数字化管理员 / 智能体运营（不是业务人员，业务人员在各自业务模块里用智能体）。
 * 因此本页是全站唯一"以智能体为主角"的页面，这是它的模块定位，不是设计缺陷；
 * 其余模块一律不出现智能体专区（业务人员只关心事情有没有办完）。
 *
 * 页面按管理动线组织：
 *   ① 智能体名册 —— 第一问是"我手上有几个硅基员工、各自什么状态"
 *   ② 待人工处理 —— 智能体跑通时不需要人看，人要介入的只有三类：
 *      需审批（自主度不足）、越界拦截（命中不做清单）、连续失败
 *      （技术规约2.0 §3.6 G14）
 *   ③ 效能指标 —— 产出量、采纳率、节省工时、人工介入量（§4.3 效能可量化）
 *   ④ 任务列表（主表）
 *
 * 自主度（A0~A3）逐任务可见：用户需要知道"这个动作是智能体自己做的，
 * 还是它只提了建议"，否则无法判断该不该复核。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据定义在组件作用域内。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/ag/tasks。
 */

interface TaskRow {
  id: string;
  taskKey: string;
  agentKey: string;
  status: 'PENDING' | 'RUNNING' | 'NEEDS_HUMAN' | 'SUCCEEDED';
  autonomy: 'A0' | 'A1' | 'A2' | 'A3';
  elapsed: string;
}

/** 智能体名册：以"硅基员工花名册"的方式呈现有形象的智能体。 */
interface RosterSpec {
  key: string;
  nameKey: string;
  roleKey: string;
  taskKey: string;
  gradeKey: string;
  grade: 'gold' | 'silver' | 'bronze';
  tone: 'sage' | 'atlas' | 'muse' | 'echo';
  avatar: string;
  progress: number;
  progressTone: 'default' | 'good' | 'warn';
  busy: boolean;
  stats: readonly { labelKey: string; value: string }[];
}

const ROSTER: readonly RosterSpec[] = [
  {
    key: 'sage', nameKey: 'wb.agent.sage.name', roleKey: 'wb.agent.sage.role', taskKey: 'wb.agent.sage.task',
    gradeKey: 'wb.grade.s', grade: 'gold', tone: 'sage', avatar: '/images/agent-analyst.png',
    progress: 72, progressTone: 'good', busy: true,
    stats: [{ labelKey: 'wb.agent.stat.tasks', value: '38' }, { labelKey: 'wb.agent.stat.adopt', value: '84%' }],
  },
  {
    key: 'atlas', nameKey: 'wb.agent.atlas.name', roleKey: 'wb.agent.atlas.role', taskKey: 'wb.agent.atlas.task',
    gradeKey: 'wb.grade.a', grade: 'silver', tone: 'atlas', avatar: '/images/agent-market.png',
    progress: 46, progressTone: 'default', busy: true,
    stats: [{ labelKey: 'wb.agent.stat.tasks', value: '24' }, { labelKey: 'wb.agent.stat.adopt', value: '79%' }],
  },
  {
    key: 'muse', nameKey: 'wb.agent.muse.name', roleKey: 'wb.agent.muse.role', taskKey: 'wb.agent.muse.task',
    gradeKey: 'wb.grade.s', grade: 'gold', tone: 'muse', avatar: '/images/agent-content.png',
    progress: 88, progressTone: 'default', busy: false,
    stats: [{ labelKey: 'wb.agent.stat.tasks', value: '63' }, { labelKey: 'wb.agent.stat.adopt', value: '91%' }],
  },
  {
    key: 'echo', nameKey: 'wb.agent.echo.name', roleKey: 'wb.agent.echo.role', taskKey: 'wb.agent.echo.task',
    gradeKey: 'wb.grade.b', grade: 'bronze', tone: 'echo', avatar: '/images/agent-sales.png',
    progress: 31, progressTone: 'warn', busy: true,
    stats: [{ labelKey: 'wb.agent.stat.tasks', value: '17' }, { labelKey: 'wb.agent.stat.adopt', value: '62%' }],
  },
];

const ROSTER_ICONS = {
  sage: <BarChartOutlined />,
  atlas: <FundProjectionScreenOutlined />,
  muse: <NotificationOutlined />,
  echo: <SearchOutlined />,
} as const;

const ROWS: readonly TaskRow[] = [
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

export default function AgentHomePage() {
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
      render: (value: TaskRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`agent.status.${value}`)}</LxTag>,
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
      render: (_value: unknown, row: TaskRow) => (
        <button type="button" className="lx-cell-link lx-focusable">
          {row.status === 'NEEDS_HUMAN' ? t('agent.takeover') : t('ag.action.trace')}
        </button>
      ),
    },
  ];

  return (
    <PageContainer titleKey="ag.page.home" hideTitle>
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

      <section className="lx-section">
        <LxSectionHeader
          title={t('wb.agents.title')}
          sub={t('wb.agents.sub')}
          actionLabel={t('wb.agents.manage')}
        />
        <div className="lx-grid lx-grid--agent lx-agent-net">
          {ROSTER.map((agent) => (
            <LxAgentCard
              key={agent.key}
              name={t(agent.nameKey)}
              role={t(agent.roleKey)}
              icon={ROSTER_ICONS[agent.tone]}
              tone={agent.tone}
              grade={agent.grade}
              gradeLabel={t(agent.gradeKey)}
              task={t(agent.taskKey)}
              progress={agent.progress}
              progressTone={agent.progressTone}
              busy={agent.busy}
              avatar={agent.avatar}
              stats={agent.stats.map<LxAgentStat>((stat) => ({
                label: t(stat.labelKey),
                value: stat.value,
              }))}
            />
          ))}
        </div>
      </section>

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
          sub={t('ag.list.sub')}
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
          <LxTable<TaskRow>
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
