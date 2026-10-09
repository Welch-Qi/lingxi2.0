import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  LeftOutlined,
  LinkOutlined,
  RightOutlined,
  RobotOutlined,
  RocketOutlined,
  StarFilled,
} from '@ant-design/icons';
import { LxAgentCard, LxChart, LxKpi, LxSectionHeader } from '@lingxi/ui';
import type { LxAgentGrade, LxAgentTone, LxKpiColor, LxProgressTone, LxTrend } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { roleTitleKey, type RoleKey } from '@/app/providers/roles';
import { useCurrentRole } from '@/stores/workspaceStore';
import { PointsDock } from './components/PointsDock';

/**
 * 工作台首屏（/workbench）—— 经营总览，使用者是总经理。
 *
 * 版式源自灵犀 1.0《超级工作台》，2026-09-23 按用户反馈收敛为五段：
 *   ① 关键指标 7 卡        —— 每卡「本日 / 本月 / 环比」三层口径
 *   ② 硅基员工（协作网络）—— 卡与卡之间以链接图标表示协作，不再画贯穿横线
 *   ③ 增长动能 + 需要人工决策 —— 左图表、右清单，并置回答"趋势如何"与"现在做什么"
 *   ④ 业务实时动态         —— 轮播 + 左右手动载入前序 / 后序事件
 *   ⑤ 右上角智能体悬浮入口 —— 今日要点滚动播报（行业 / 企业两组）+ 追问输入框
 *
 * 这一轮去掉的三块，理由各不同：
 *   · 问候 Banner：首屏第一眼该是数，而不是一句问候；待办入口在侧栏与今日简报页都在。
 *   · 今日要点 3 卡：属于「知道就好、不必立刻动手」的信息，却在首屏横占一整行，
 *     与「先看盘面」的主线争位置 —— 收进右上角悬浮入口，需要时一键展开。
 *   · 快捷操作 3 卡：侧栏两次点击内都能到，本质是导航冗余，不占首屏。
 *
 * 页头的「经营总览 + 关键指标 · 硅基员工 · 业务实时动态」也一并撤掉（2026-09-23）：
 * 页名在侧栏与顶栏都已标出，副标题是给导航做注释、不是给看板做注释；
 * 撤掉后首屏第一行直接就是关键指标。h1 仍留在 DOM 里（hideTitle），读屏不丢页面名。
 *
 * ③ 是 1.0 版式里最"显性"的一段：它把硅基员工与人类员工放在同一界面里被同样管理
 * （产品规划说明书 V2.1 §2.11）。这与 2.0 通用首页"不刻意凸显智能体"的取向相反，
 * 但工作台是**管理视角**的页面，负责人需要知道"谁在替我干活、干到哪了"。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据只存 key 与数值，文案留在语言包里。
 * 关键指标与实时动态的 key 都写成完整字面量（而非 `${id}` 拼接）——门禁按字面量采集，
 * 拼接会让它退化成族匹配，族在、个别成员缺时照样报通过。
 *
 * 静态骨架：数值为占位演示数据，接入后由 /api/v1/wb/* 提供。
 */

interface KpiSpec {
  labelKey: string;
  /** 本日数值：卡面大字 */
  today: string;
  /** 本月数值：卡面下方 */
  month: string;
  /** 环比（较上月） */
  delta: string;
  trend: LxTrend;
  color: LxKpiColor;
}

/** ① 关键指标：口径自上而下收窄——大字是本日，下方才是月累计与环比。 */
const KPIS: readonly KpiSpec[] = [
  { labelKey: 'wb.kpi.newCustomer', today: '12', month: '128', delta: '12.4%', trend: 'up', color: 'primary' },
  { labelKey: 'wb.kpi.newOpp', today: '9', month: '96', delta: '8.1%', trend: 'up', color: 'secondary' },
  { labelKey: 'wb.kpi.highIntent', today: '5', month: '34', delta: '9.7%', trend: 'up', color: 'accent' },
  { labelKey: 'wb.kpi.newOrder', today: '7', month: '63', delta: '6.2%', trend: 'up', color: 'primary' },
  { labelKey: 'wb.kpi.deal', today: '3', month: '21', delta: '2.1%', trend: 'dn', color: 'success' },
  { labelKey: 'wb.kpi.exposure', today: '168K', month: '1.28M', delta: '18.6%', trend: 'up', color: 'secondary' },
  { labelKey: 'wb.kpi.conversion', today: '3.9%', month: '3.7%', delta: '0.4pt', trend: 'up', color: 'violet' },
];

interface AgentSpec {
  id: 'sage' | 'atlas' | 'muse' | 'echo';
  tone: LxAgentTone;
  grade: LxAgentGrade;
  gradeKey: string;
  progress: number;
  progressTone: LxProgressTone;
  avatar: string;
  busy: boolean;
  outputKey: string;
  successRate: string;
  to: string;
}

/**
 * ② 硅基员工：头像复用 1.0 的智能体形象（public/images/agent-*.png）。
 * tone / progressTone 沿用 1.0 的设定：Echo 进度落后于同侪，故标 warn。
 */
const AGENTS: readonly AgentSpec[] = [
  {
    id: 'sage',
    tone: 'sage',
    grade: 'gold',
    gradeKey: 'wb.grade.s',
    progress: 76,
    progressTone: 'good',
    avatar: '/images/agent-analyst.png',
    busy: true,
    outputKey: 'wb.agent.sage.output',
    successRate: '97%',
    to: '/analytics',
  },
  {
    id: 'atlas',
    tone: 'atlas',
    grade: 'gold',
    gradeKey: 'wb.grade.s',
    progress: 68,
    progressTone: 'default',
    avatar: '/images/agent-market.png',
    busy: true,
    outputKey: 'wb.agent.atlas.output',
    successRate: '94%',
    to: '/intel',
  },
  {
    id: 'muse',
    tone: 'muse',
    grade: 'silver',
    gradeKey: 'wb.grade.a',
    progress: 42,
    progressTone: 'default',
    avatar: '/images/agent-content.png',
    busy: true,
    outputKey: 'wb.agent.muse.output',
    successRate: '91%',
    to: '/marketing',
  },
  {
    id: 'echo',
    tone: 'echo',
    grade: 'bronze',
    gradeKey: 'wb.grade.b',
    progress: 81,
    progressTone: 'warn',
    avatar: '/images/agent-sales.png',
    busy: true,
    outputKey: 'wb.agent.echo.output',
    successRate: '96%',
    to: '/customer',
  },
];

interface DecisionSpec {
  key: string;
  icon: ReactNode;
  tone: 'danger' | 'accent' | 'primary' | 'muted';
  to: string;
  /** 由哪些角色关注（决定③右栏这一栏放什么，见 `roleDecisions`） */
  roles: readonly RoleKey[];
}

/**
 * ③ 右栏 需要人工决策：只放"卡在自主度上限、必须人过一下"的事项（技术规约2.0 §3.6 G4/G14）。
 *
 * `roles` 是本轮（2026-09-27）加上的角色口径：**同一个"卡住的事"，对不同角色就是不同的事**。
 * 总经理要拍板的是报价与预算，渠道总监盯的是渠道政策与市场内容，销售总监要的是下一个动作。
 * 一屏里摊开三个角色都要看的清单，等于把"该谁拍板"这件事推给读者自己判断。
 * 没有一个角色都适用的"全部" —— 那是把筛选责任丢给用户，与"默认页即当日工作"的取向相反。
 */
const DECISIONS: readonly DecisionSpec[] = [
  { key: 'quote', icon: <RobotOutlined />, tone: 'danger', to: '/order', roles: ['ceo', 'product', 'channel'] },
  { key: 'content', icon: <ClockCircleOutlined />, tone: 'muted', to: '/marketing', roles: ['ceo', 'channel', 'content'] },
  { key: 'opp', icon: <RocketOutlined />, tone: 'primary', to: '/intel', roles: ['ceo', 'product', 'sales'] },
];

/** ③ 右栏清单按当前角色取：切换角色，这一栏换内容。 */
const roleDecisions = (roleKey: RoleKey): readonly DecisionSpec[] =>
  DECISIONS.filter((item) => item.roles.includes(roleKey));

/** ③ 左栏 增长动能：三列同屏对比，"哪一段在漏"一眼可见。周次是编码，语言中立，不入 i18n。 */
const GROWTH_WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'] as const;

const GROWTH_SERIES = [
  { nameKey: 'wb.growth.series.impression', data: [420, 510, 580, 640, 720, 860, 940, 1120] },
  { nameKey: 'wb.growth.series.click', data: [86, 104, 121, 138, 152, 181, 204, 238] },
  { nameKey: 'wb.growth.series.opp', data: [38, 46, 55, 61, 72, 80, 88, 96] },
] as const;

interface FlowSpec {
  /** 用 id 而非 key：本文件的 i18n 门禁会扫描 `key: 'x'` 字面量来展开模板 key，
   *  队列之外的 id 若也叫 key，会被误当作队列成员展开，产生不存在的 key。 */
  id: string;
  timeKey: string;
  titleKey: string;
  descKey: string;
  resultKey: string;
  done: boolean;
}

/**
 * ④ 业务实时动态：今天已经产出了什么，按时间从早到晚摊开。
 * 时间都落在当天 10:30 之前，与页面右上角的进入时点自洽——演示数据也不该出现"未来的事"。
 */
const FLOWS: readonly FlowSpec[] = [
  { id: 'r1', timeKey: 'wb.flow.r1.time', titleKey: 'wb.flow.r1.title', descKey: 'wb.flow.r1.desc', resultKey: 'wb.flow.r1.result', done: true },
  { id: 'r2', timeKey: 'wb.flow.r2.time', titleKey: 'wb.flow.r2.title', descKey: 'wb.flow.r2.desc', resultKey: 'wb.flow.r2.result', done: false },
  { id: 'r3', timeKey: 'wb.flow.r3.time', titleKey: 'wb.flow.r3.title', descKey: 'wb.flow.r3.desc', resultKey: 'wb.flow.r3.result', done: true },
  { id: 'r4', timeKey: 'wb.flow.r4.time', titleKey: 'wb.flow.r4.title', descKey: 'wb.flow.r4.desc', resultKey: 'wb.flow.r4.result', done: true },
  { id: 'r5', timeKey: 'wb.flow.r5.time', titleKey: 'wb.flow.r5.title', descKey: 'wb.flow.r5.desc', resultKey: 'wb.flow.r5.result', done: true },
  { id: 'r6', timeKey: 'wb.flow.r6.time', titleKey: 'wb.flow.r6.title', descKey: 'wb.flow.r6.desc', resultKey: 'wb.flow.r6.result', done: false },
  { id: 'r7', timeKey: 'wb.flow.r7.time', titleKey: 'wb.flow.r7.title', descKey: 'wb.flow.r7.desc', resultKey: 'wb.flow.r7.result', done: true },
  { id: 'r8', timeKey: 'wb.flow.r8.time', titleKey: 'wb.flow.r8.title', descKey: 'wb.flow.r8.desc', resultKey: 'wb.flow.r8.result', done: true },
];

/** 轮播视窗能同时摆下的事件卡数：再宽也保持 3 张，好让左右两侧永远有切换按钮的位置。 */
const FLOW_VISIBLE = 3;

/** 自动播报间隔：比人读完一条略长，扫读时才不会被拽着走。 */
const FLOW_INTERVAL_MS = 4500;

export default function WorkbenchDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /** 本页按角色呈现：「需要人工决策」那一栏随角色换内容（见 `roleDecisions`）。 */
  const role = useCurrentRole();
  const decisions = roleDecisions(role);

  const series = useMemo(
    () => GROWTH_SERIES.map((item) => ({ name: t(item.nameKey), data: item.data })),
    [t],
  );

  /** 智能体卡：文案按 id 拼出，保证语言包逐条可查。 */
  const agents = useMemo(
    () =>
      AGENTS.map((agent) => ({
        ...agent,
        name: t(`wb.agent.${agent.id}.name`),
        role: t(`wb.agent.${agent.id}.role`),
        task: t(`wb.agent.${agent.id}.task`),
        gradeLabel: t(agent.gradeKey),
        stats: [
          { label: t('wb.agent.stat.output'), value: t(agent.outputKey) },
          { label: t('wb.agent.stat.success'), value: agent.successRate },
        ],
      })),
    [t],
  );

  /* --- ④ 业务实时动态：轮播位置 --- */
  const flowMax = Math.max(0, FLOWS.length - FLOW_VISIBLE);
  const [flowIndex, setFlowIndex] = useState(0);
  const [flowDir, setFlowDir] = useState<'next' | 'prev'>('next');
  // 用户若在系统层面关了动效，就不该再替他把内容滚起来
  const [flowAuto, setFlowAuto] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!flowAuto || flowIndex >= flowMax) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setFlowDir('next');
      setFlowIndex((index) => Math.min(index + 1, flowMax));
    }, FLOW_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [flowAuto, flowIndex, flowMax]);

  const stepFlow = (delta: number) => {
    setFlowDir(delta > 0 ? 'next' : 'prev');
    setFlowIndex((index) => Math.min(Math.max(index + delta, 0), flowMax));
  };

  return (
    <PageContainer
      titleKey="wb.page.dashboard"
      subtitleKey="wb.page.dashboardSub"
      /* 首屏第一眼必须是数据：标题与副标题视觉上不渲染（h1 仍在 DOM 里给读屏）。
         智能体入口走 floating 而不是 extra —— extra 会占出页头一整行（40px + 22px 间距），
         那正是"指标卡没顶到顶"的那段空白。浮层不占行高，压在指标卡的右上角：
         卡片标签行右端本就是空白（时点标签已挪到数值行），压在上面不遮任何数据。 */
      hideTitle
      floating={<PointsDock />}
    >
      {/* ① 关键指标：一屏一行 */}
      <div className="lx-grid lx-grid--kpi-7">
        {KPIS.map((kpi) => (
          <LxKpi
            key={kpi.labelKey}
            label={t(kpi.labelKey)}
            value={kpi.today}
            valueLabel={t('wb.kpi.today')}
            sub={`${t('wb.kpi.month')} ${kpi.month}`}
            trend={kpi.trend}
            delta={kpi.delta}
            color={kpi.color}
          />
        ))}
      </div>

      {/* ② 硅基员工：协作关系用卡间的链接图标表达（.lx-agentnet） */}
      <section className="lx-section">
        <LxSectionHeader
          title={t('wb.agents.title')}
          sub={t('wb.agents.sub')}
          actionLabel={t('wb.agents.manage')}
          onAction={() => void navigate('/agent')}
        />
        <div className="lx-agentnet">
          {agents.map((agent, index) => (
            <Fragment key={agent.id}>
              {index > 0 ? (
                <span className="lx-agentnet__link" aria-hidden="true">
                  <LinkOutlined />
                </span>
              ) : null}
              <LxAgentCard
                name={agent.name}
                role={agent.role}
                icon={<RobotOutlined />}
                avatar={agent.avatar}
                tone={agent.tone}
                grade={agent.grade}
                gradeLabel={agent.gradeLabel}
                task={agent.task}
                progress={agent.progress}
                progressTone={agent.progressTone}
                stats={agent.stats}
                busy={agent.busy}
                onClick={() => void navigate(agent.to)}
              />
            </Fragment>
          ))}
        </div>
      </section>

      {/* ③ 增长动能 + 需要人工决策 */}
      <div className="lx-split lx-split--panel">
        <section className="lx-glass lx-panel">
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
        </section>

        <section className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('wb.decision.title')}</div>
              {/* 副说明带上角色：这一栏是"以 xxx 的视角要看的事"，不是一份公共清单。
                  顶栏角色胶囊已经标了角色，这里再标一次是为了让"内容变了"有出处，
                  而不是让人以为刚才那个角色切换没生效。 */}
              <div className="lx-panel__sub">{t('wb.decision.sub')} · {t(roleTitleKey(role))}</div>
            </div>
            <span className="lx-panel__badge lx-panel__badge--danger">{decisions.length}</span>
          </div>
          <div className="lx-panel__body">
            <div className="lx-decision">
              {decisions.map((decision) => (
                <button
                  key={decision.key}
                  type="button"
                  className="lx-decision__item lx-focusable"
                  onClick={() => void navigate(decision.to)}
                >
                  <span className={`lx-decision__icon lx-decision__icon--${decision.tone}`}>
                    {decision.icon}
                  </span>
                  <span className="lx-decision__body">
                    <span className="lx-decision__title">{t(`wb.decision.item.${decision.key}.title`)}</span>
                    <span className="lx-decision__meta">{t(`wb.decision.item.${decision.key}.meta`)}</span>
                  </span>
                  <ArrowRightOutlined className="lx-decision__arrow" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ④ 业务实时动态：轮播视窗 + 左右手动载入 */}
      <section className="lx-glass lx-panel">
        <div className="lx-panel__head">
          <div>
            <div className="lx-panel__title">{t('wb.flow.title')}</div>
            <div className="lx-panel__sub">{t('wb.flow.sub')}</div>
          </div>
          <span className="lx-panel__badge lx-panel__badge--success">{t('wb.flow.badge')}</span>
        </div>
        <div
          className="lx-dyn"
          onMouseEnter={() => setFlowAuto(false)}
          onMouseLeave={() => setFlowAuto(true)}
          onFocus={() => setFlowAuto(false)}
          onBlur={() => setFlowAuto(true)}
        >
          <button
            type="button"
            className="lx-dyn__nav lx-focusable"
            aria-label={t('wb.flow.prev')}
            title={t('wb.flow.prev')}
            disabled={flowIndex === 0}
            onClick={() => stepFlow(-1)}
          >
            <LeftOutlined />
          </button>
          {/* key 随页变：换页时重放滑入动画，让人看出这批事件是从哪一侧进来的 */}
          <div className="lx-dyn__stage" data-dir={flowDir} key={flowIndex}>
            <div className="lx-flow">
              {FLOWS.slice(flowIndex, flowIndex + FLOW_VISIBLE).map((flow) => (
                <div key={flow.id} className="lx-flow__cell">
                  <div className="lx-flow__top">
                    <span className="lx-flow__time">{t(flow.timeKey)}</span>
                    {flow.done ? (
                      <span className="lx-flow__icon lx-flow__icon--done">
                        <StarFilled />
                      </span>
                    ) : (
                      <span className="lx-flow__icon">
                        <ClockCircleOutlined />
                      </span>
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
          </div>
          <button
            type="button"
            className="lx-dyn__nav lx-focusable"
            aria-label={t('wb.flow.next')}
            title={t('wb.flow.next')}
            disabled={flowIndex >= flowMax}
            onClick={() => stepFlow(1)}
          >
            <RightOutlined />
          </button>
        </div>
      </section>
    </PageContainer>
  );
}
