import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  LineChartOutlined,
  NotificationOutlined,
  RightOutlined,
  RiseOutlined,
  RobotOutlined,
  SearchOutlined,
  StarFilled,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  LxAgentCard,
  LxBanner,
  LxChart,
  LxInsightCard,
  LxKpi,
  LxQuickAction,
  LxSectionHeader,
} from '@lingxi/ui';
import type { LxAgentStat } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * P2 超级工作台（改造指引 5.2 逐项落地）。
 *
 * 这是 CEO / 老板视角的首屏：默认页即当日该做的事（产品规划说明书 §5.3），
 * 结构为「问候 → 指标 → 智能体协作网络 → 今日要点 → 快捷操作
 *          → 增长动能 + 待决策 → 业务实时流」。
 *
 * 关于智能体：产品基线共六大智能体（《产品规划说明书2.0》§3.3），
 * 此处按改造指引的 4 列布局展示其中 4 位最高频的，其余经「管理智能体」进入智能体中心，
 * 不在工作台堆满 6 张卡（首屏信息密度是有上限的）。
 *
 * 静态骨架：数值为占位演示数据，接入后由 /api/v1/ana/* 与 /api/v1/ag/* 提供。
 */

interface KpiSpec {
  labelKey: string;
  value: string;
  subKey: string;
  delta: string;
  trend: 'up' | 'dn' | 'fl';
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'violet';
  spark: readonly number[];
}

const KPIS: readonly KpiSpec[] = [
  {
    labelKey: 'wb.kpi.newCustomer',
    value: '128',
    subKey: 'wb.kpi.sub.month',
    delta: '12.4%',
    trend: 'up',
    color: 'primary',
    spark: [12, 18, 15, 24, 21, 30, 28, 36],
  },
  {
    labelKey: 'wb.kpi.profiled',
    value: '96',
    subKey: 'wb.kpi.sub.profileRate',
    delta: '8.1%',
    trend: 'up',
    color: 'secondary',
    spark: [8, 12, 14, 13, 18, 22, 20, 26],
  },
  {
    labelKey: 'wb.kpi.highIntent',
    value: '34',
    subKey: 'wb.kpi.sub.intentRate',
    delta: '5',
    trend: 'up',
    color: 'accent',
    spark: [4, 6, 5, 9, 8, 11, 10, 14],
  },
  {
    labelKey: 'wb.kpi.deal',
    value: '12',
    subKey: 'wb.kpi.sub.gmv',
    delta: '1',
    trend: 'dn',
    color: 'success',
    spark: [3, 4, 6, 5, 4, 6, 5, 4],
  },
  {
    labelKey: 'wb.kpi.exposure',
    value: '1.28M',
    subKey: 'wb.kpi.sub.channels',
    delta: '18.6%',
    trend: 'up',
    color: 'primary',
    spark: [20, 26, 24, 34, 40, 38, 48, 56],
  },
  {
    labelKey: 'wb.kpi.conversion',
    value: '3.7%',
    subKey: 'wb.kpi.sub.click',
    delta: '0.4pt',
    trend: 'up',
    color: 'violet',
    spark: [2, 3, 3, 4, 3, 5, 4, 6],
  },
];

interface AgentSpec {
  key: string;
  nameKey: string;
  roleKey: string;
  taskKey: string;
  gradeKey: string;
  grade: 'gold' | 'silver' | 'bronze';
  tone: 'sage' | 'atlas' | 'muse' | 'echo';
  /** 形象图取自 public/images（原高保真原型的视觉资产，按域一一对应） */
  avatar: string;
  progress: number;
  progressTone: 'default' | 'good' | 'warn';
  busy: boolean;
  stats: readonly { labelKey: string; value: string }[];
}

const AGENTS: readonly AgentSpec[] = [
  {
    key: 'sage',
    nameKey: 'wb.agent.sage.name',
    roleKey: 'wb.agent.sage.role',
    taskKey: 'wb.agent.sage.task',
    gradeKey: 'wb.grade.s',
    grade: 'gold',
    tone: 'sage',
    avatar: '/images/agent-analyst.png',
    progress: 72,
    progressTone: 'good',
    busy: true,
    stats: [
      { labelKey: 'wb.agent.stat.tasks', value: '38' },
      { labelKey: 'wb.agent.stat.adopt', value: '84%' },
      { labelKey: 'wb.agent.stat.saved', value: '21h' },
    ],
  },
  {
    key: 'atlas',
    nameKey: 'wb.agent.atlas.name',
    roleKey: 'wb.agent.atlas.role',
    taskKey: 'wb.agent.atlas.task',
    gradeKey: 'wb.grade.a',
    grade: 'silver',
    tone: 'atlas',
    avatar: '/images/agent-market.png',
    progress: 46,
    progressTone: 'default',
    busy: true,
    stats: [
      { labelKey: 'wb.agent.stat.tasks', value: '24' },
      { labelKey: 'wb.agent.stat.adopt', value: '79%' },
      { labelKey: 'wb.agent.stat.saved', value: '14h' },
    ],
  },
  {
    key: 'muse',
    nameKey: 'wb.agent.muse.name',
    roleKey: 'wb.agent.muse.role',
    taskKey: 'wb.agent.muse.task',
    gradeKey: 'wb.grade.s',
    grade: 'gold',
    tone: 'muse',
    avatar: '/images/agent-content.png',
    progress: 88,
    progressTone: 'default',
    busy: false,
    stats: [
      { labelKey: 'wb.agent.stat.tasks', value: '63' },
      { labelKey: 'wb.agent.stat.adopt', value: '91%' },
      { labelKey: 'wb.agent.stat.saved', value: '46h' },
    ],
  },
  {
    key: 'echo',
    nameKey: 'wb.agent.echo.name',
    roleKey: 'wb.agent.echo.role',
    taskKey: 'wb.agent.echo.task',
    gradeKey: 'wb.grade.b',
    grade: 'bronze',
    tone: 'echo',
    avatar: '/images/agent-sales.png',
    progress: 31,
    progressTone: 'warn',
    busy: true,
    stats: [
      { labelKey: 'wb.agent.stat.tasks', value: '17' },
      { labelKey: 'wb.agent.stat.adopt', value: '62%' },
      { labelKey: 'wb.agent.stat.saved', value: '9h' },
    ],
  },
];

const AGENT_ICONS = {
  sage: <BarChartOutlined />,
  atlas: <FundProjectionScreenOutlined />,
  muse: <NotificationOutlined />,
  echo: <SearchOutlined />,
} as const;

const INSIGHTS = [
  {
    key: 'market',
    typeKey: 'wb.insight.market.type',
    textKey: 'wb.insight.market.text',
    sourceKey: 'wb.insight.market.source',
    accent: 'accent',
    tone: 'atlas',
    icon: <FundProjectionScreenOutlined />,
  },
  {
    key: 'opportunity',
    typeKey: 'wb.insight.opportunity.type',
    textKey: 'wb.insight.opportunity.text',
    sourceKey: 'wb.insight.opportunity.source',
    accent: 'success',
    tone: 'echo',
    icon: <TeamOutlined />,
  },
  {
    key: 'operation',
    typeKey: 'wb.insight.operation.type',
    textKey: 'wb.insight.operation.text',
    sourceKey: 'wb.insight.operation.source',
    accent: 'primary',
    tone: 'sage',
    icon: <LineChartOutlined />,
  },
] as const;

/**
 * 增长动能：近 8 周曝光 → 点击 → 建档的转化漏斗。
 *
 * 三列同屏对比的意义在于"哪一段在漏"一眼可见——单看绝对值看不出转化率变化。
 * 周次用 W1~W8 这类编码而非"第 1 周"，编码是语言中立的，不入 i18n。
 */
const GROWTH_WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'] as const;

const GROWTH_SERIES = [
  { nameKey: 'wb.growth.series.impression', data: [420, 510, 580, 640, 720, 860, 940, 1120] },
  { nameKey: 'wb.growth.series.click', data: [86, 104, 121, 138, 152, 181, 204, 238] },
  { nameKey: 'wb.growth.series.profiled', data: [38, 46, 55, 61, 72, 80, 88, 96] },
] as const;

interface DecisionSpec {
  key: string;
  titleKey: string;
  metaKey: string;
  icon: ReactNode;
  tone: 'danger' | 'accent' | 'primary' | 'muted';
  to: string;
}

/** 需要人工决策：只放"卡在自主度上限、必须人过一下"的事项（技术规约2.0 §3.6 G4/G14）。 */
const DECISIONS: readonly DecisionSpec[] = [
  {
    key: 'quote',
    titleKey: 'wb.decision.quote.title',
    metaKey: 'wb.decision.quote.meta',
    icon: <AlertOutlined />,
    tone: 'danger',
    to: '/order',
  },
  {
    key: 'content',
    titleKey: 'wb.decision.content.title',
    metaKey: 'wb.decision.content.meta',
    icon: <ClockCircleOutlined />,
    tone: 'muted',
    to: '/marketing',
  },
  {
    key: 'product',
    titleKey: 'wb.decision.product.title',
    metaKey: 'wb.decision.product.meta',
    icon: <ExperimentOutlined />,
    tone: 'primary',
    to: '/product',
  },
];

interface FlowSpec {
  key: string;
  timeKey: string;
  titleKey: string;
  descKey: string;
  resultKey: string;
  done: boolean;
}

/** 业务实时流：智能体之间的任务交接与成果回流（"硅基员工"协作的可视化证据）。 */
const FLOWS: readonly FlowSpec[] = [
  {
    key: 'r1',
    timeKey: 'wb.flow.r1.time',
    titleKey: 'wb.flow.r1.title',
    descKey: 'wb.flow.r1.desc',
    resultKey: 'wb.flow.r1.result',
    done: true,
  },
  {
    key: 'r2',
    timeKey: 'wb.flow.r2.time',
    titleKey: 'wb.flow.r2.title',
    descKey: 'wb.flow.r2.desc',
    resultKey: 'wb.flow.r2.result',
    done: false,
  },
  {
    key: 'r3',
    timeKey: 'wb.flow.r3.time',
    titleKey: 'wb.flow.r3.title',
    descKey: 'wb.flow.r3.desc',
    resultKey: 'wb.flow.r3.result',
    done: false,
  },
  {
    key: 'r4',
    timeKey: 'wb.flow.r4.time',
    titleKey: 'wb.flow.r4.title',
    descKey: 'wb.flow.r4.desc',
    resultKey: 'wb.flow.r4.result',
    done: false,
  },
];

export default function WorkbenchDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // series 的 name 是文案，必须走 i18n；data 是纯数值，不参与重算
  const series = useMemo(
    () =>
      GROWTH_SERIES.map((item) => ({
        name: t(item.nameKey),
        data: item.data,
      })),
    [t],
  );

  return (
    <PageContainer titleKey="wb.page.dashboard" subtitleKey="wb.page.dashboardSub">
      <LxBanner
        title={t('wb.banner.title')}
        desc={t('wb.banner.desc')}
        icon={<StarFilled />}
        actionLabel={t('wb.banner.action')}
        onAction={() => void navigate('/workbench/brief')}
      />

      <div className="lx-grid lx-grid--kpi">
        {KPIS.map((kpi) => (
          <LxKpi
            key={kpi.labelKey}
            label={t(kpi.labelKey)}
            value={kpi.value}
            sub={t(kpi.subKey)}
            trend={kpi.trend}
            delta={kpi.delta}
            color={kpi.color}
            spark={kpi.spark}
          />
        ))}
      </div>

      <section className="lx-section">
        <LxSectionHeader
          title={t('wb.agents.title')}
          sub={t('wb.agents.sub')}
          actionLabel={t('wb.agents.manage')}
          onAction={() => void navigate('/agent')}
        />
        <div className="lx-grid lx-grid--agent lx-agent-net">
          {AGENTS.map((agent) => (
            <LxAgentCard
              key={agent.key}
              name={t(agent.nameKey)}
              role={t(agent.roleKey)}
              icon={AGENT_ICONS[agent.tone]}
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
              onClick={() => void navigate('/agent')}
            />
          ))}
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('wb.insights.title')}
          sub={t('wb.insights.sub')}
          actionLabel={t('wb.insights.more')}
          onAction={() => void navigate('/analytics')}
        />
        <div className="lx-grid lx-grid--3">
          {INSIGHTS.map((item) => (
            <LxInsightCard
              key={item.key}
              type={t(item.typeKey)}
              text={t(item.textKey)}
              source={t(item.sourceKey)}
              accent={item.accent}
              tone={item.tone}
              icon={item.icon}
            />
          ))}
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('wb.quick.title')} sub={t('wb.quick.sub')} />
        <div className="lx-grid lx-grid--3">
          <LxQuickAction
            title={t('wb.quick.customer')}
            desc={t('wb.quick.customerDesc')}
            icon={<UserAddOutlined />}
            tone="primary"
            onClick={() => void navigate('/customer')}
          />
          <LxQuickAction
            title={t('wb.quick.content')}
            desc={t('wb.quick.contentDesc')}
            icon={<FileTextOutlined />}
            tone="accent"
            onClick={() => void navigate('/marketing')}
          />
          <LxQuickAction
            title={t('wb.quick.report')}
            desc={t('wb.quick.reportDesc')}
            icon={<RiseOutlined />}
            tone="secondary"
            onClick={() => void navigate('/analytics')}
          />
        </div>
      </section>

      <section className="lx-grid lx-grid--split">
        <div className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('wb.growth.title')}</div>
              <div className="lx-panel__sub">{t('wb.growth.sub')}</div>
            </div>
            <span className="lx-panel__badge lx-panel__badge--success">{t('wb.growth.badge')}</span>
          </div>
          <div className="lx-panel__body">
            <LxChart categories={GROWTH_WEEKS} series={series} ariaLabel={t('wb.growth.title')} />
          </div>
        </div>

        <div className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('wb.decision.title')}</div>
              <div className="lx-panel__sub">{t('wb.decision.sub')}</div>
            </div>
            <span className="lx-panel__badge lx-panel__badge--danger">
              {DECISIONS.length}
            </span>
          </div>
          <div className="lx-panel__body">
            <div className="lx-decision">
              {DECISIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="lx-decision__item lx-focusable"
                  onClick={() => void navigate(item.to)}
                >
                  <span className={`lx-decision__icon lx-decision__icon--${item.tone}`}>
                    {item.icon}
                  </span>
                  <span className="lx-decision__body">
                    <span className="lx-decision__title">{t(item.titleKey)}</span>
                    <span className="lx-decision__meta">{t(item.metaKey)}</span>
                  </span>
                  <RightOutlined className="lx-decision__arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lx-glass lx-panel">
        <div className="lx-panel__head">
          <div>
            <div className="lx-panel__title">{t('wb.flow.title')}</div>
            <div className="lx-panel__sub">{t('wb.flow.sub')}</div>
          </div>
        </div>
        <div className="lx-flow">
          {FLOWS.map((flow) => (
            <div key={flow.key} className="lx-flow__cell">
              <div className="lx-flow__top">
                <span className="lx-flow__time">{t(flow.timeKey)}</span>
                {flow.done ? (
                  <CheckCircleFilled className="lx-flow__icon lx-flow__icon--done" />
                ) : (
                  <RobotOutlined className="lx-flow__icon" />
                )}
              </div>
              <div>
                <div className="lx-flow__title">{t(flow.titleKey)}</div>
                <div className="lx-flow__desc">{t(flow.descKey)}</div>
              </div>
              <div className="lx-flow__result">{t(flow.resultKey)}</div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
