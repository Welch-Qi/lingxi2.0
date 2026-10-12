import { useTranslation } from 'react-i18next';
import {
  BarChartOutlined,
  FundProjectionScreenOutlined,
  NotificationOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { LxAgentCard, LxSectionHeader } from '@lingxi/ui';
import type { LxAgentStat } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 智能体中心首页（/agent）—— 三产品升级（元枢归口）后收窄为业务名册。
 *
 * 本分区只保留 AG-01~06 六智能体的**业务名册**（硅基员工花名册）：
 * 业务人员在各自模块里用智能体，管理员在此一眼看清"手上有几个硅基员工、各自状态"。
 *
 * ⚠️ 已迁出（不留死链）：自主度策略、待人工干预队列、效能 KPI、任务/轨迹列表
 *   属智能体工厂治理面（AC-01~09、AG-07~09），已迁至 apps/yuanshu-console/routes/governance。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据定义在组件作用域内。
 * 静态骨架：占位演示数据，接入后走 /api/v1/ag/roster。
 */

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

export default function AgentHomePage() {
  const { t } = useTranslation();

  return (
    <PageContainer titleKey="ag.page.home" hideTitle>
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
    </PageContainer>
  );
}
