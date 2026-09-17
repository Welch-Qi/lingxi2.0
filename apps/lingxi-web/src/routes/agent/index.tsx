import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  ApiOutlined,
  BarChartOutlined,
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  NotificationOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxAgentCard, LxSectionHeader, LxTag } from '@lingxi/ui';
import type { LxAgentStat } from '@lingxi/ui';

/**
 * 智能体中心首页（/agent）—— 硅基员工的管理台（产品规划说明书 §2.9）。
 *
 * 首页以"待人工处理的任务"为核心，而不是以智能体清单为核心：
 * 智能体全自动跑通时不需要人看，人真正要介入的只有三类——
 * 需审批（自主度不足）、越界拦截（命中不做清单）、连续失败。
 * 三者都被置为 NEEDS_HUMAN 并生成人工待办（技术规约2.0 §3.6 G14）。
 *
 * 自主度（A0~A3）必须逐任务可见：用户需要知道"这个动作是智能体自己做的，
 * 还是它只提了建议"，否则无法判断该不该复核。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/ag/tasks。
 */

interface TaskRow extends ModuleHomeRow {
  id: string;
  taskKey: string;
  agentKey: string;
  status: 'PENDING' | 'RUNNING' | 'NEEDS_HUMAN' | 'SUCCEEDED';
  autonomy: 'A0' | 'A1' | 'A2' | 'A3';
  elapsed: string;
}

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

/**
 * 智能体名册：以"硅基员工花名册"的方式呈现有形象的智能体。
 *
 * 为什么名册要放在任务列表之前：这个页面的第一问不是"有哪些任务"，
 * 而是"我手上有几个硅基员工、它们各自什么状态"。任务表回答的是第二问。
 */
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

export default function AgentHomePage() {
  const { t } = useTranslation();

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
    <ModuleHome<TaskRow>
      titleKey="ag.page.home"
      subtitleKey="ag.page.homeSub"
      kpis={[
        { labelKey: 'ag.kpi.online', value: '6', sub: t('ag.kpi.sub.total'), trend: 'fl', delta: '0', color: 'primary', spark: [6, 6, 6, 6, 6, 6, 6, 6] },
        { labelKey: 'ag.kpi.running', value: '18', sub: t('ag.kpi.sub.queue'), trend: 'up', delta: '4', color: 'secondary', spark: [8, 10, 11, 13, 12, 15, 16, 18] },
        { labelKey: 'ag.kpi.needsHuman', value: '6', sub: t('ag.kpi.sub.breakdown'), trend: 'dn', delta: '2', color: 'accent', spark: [9, 8, 9, 8, 7, 8, 7, 6] },
        { labelKey: 'ag.kpi.tokenCost', value: '1,240', sub: t('ag.kpi.sub.cost'), trend: 'up', delta: '8.4%', color: 'success', spark: [12, 14, 13, 16, 18, 17, 20, 22] },
      ]}
      extra={
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
      }
      insightsTitleKey="ag.insight.title"
      insightsSubKey="ag.insight.sub"
      insightsMoreKey="ag.insight.more"
      insights={[
        { typeKey: 'ag.insight.blocked.type', textKey: 'ag.insight.blocked.text', sourceKey: 'ag.insight.blocked.source', accent: 'accent', tone: 'sage', icon: <AlertOutlined /> },
        { typeKey: 'ag.insight.efficiency.type', textKey: 'ag.insight.efficiency.text', sourceKey: 'ag.insight.efficiency.source', accent: 'primary', tone: 'sage', icon: <BarChartOutlined /> },
        { typeKey: 'ag.insight.cost.type', textKey: 'ag.insight.cost.text', sourceKey: 'ag.insight.cost.source', accent: 'success', tone: 'sage', icon: <ThunderboltOutlined /> },
      ]}
      quicks={[
        { titleKey: 'ag.quick.configure', descKey: 'ag.quick.configureDesc', icon: <SettingOutlined />, tone: 'primary' },
        { titleKey: 'ag.quick.skills', descKey: 'ag.quick.skillsDesc', icon: <DeploymentUnitOutlined />, tone: 'accent' },
        { titleKey: 'ag.quick.mcp', descKey: 'ag.quick.mcpDesc', icon: <ApiOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="ag.list.title"
      listSubKey="ag.list.sub"
      listMoreKey="ag.list.more"
      searchPlaceholderKey="ag.list.search"
      filterLabelKey="ag.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="ag.list.empty"
      emptyHintKey="ag.list.emptyHint"
      total={ROWS.length}
    />
  );
}
