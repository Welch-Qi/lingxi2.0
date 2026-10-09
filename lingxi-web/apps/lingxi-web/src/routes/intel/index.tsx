import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from 'antd';
import {
  BarChartOutlined,
  BulbOutlined,
  FireOutlined,
  GlobalOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  LxChipGroup,
  LxChart,
  LxSectionHeader,
  LxTag,
  LxWorkflowSteps,
} from '@lingxi/ui';
import type { LxWorkflowStep } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 市场情报首页（/intel）—— 看清市场再动手（产品规划说明书 V2.1 §2.9）。
 *
 * 版式复用灵犀 1.0《产品开发》(lingxi-web/src/components/pages/product-page.tsx)：
 * 它是 1.0 里唯一把"从信号到创意"这条链讲完整的页面，三段式工作流
 * （市场趋势 → 产品开发 → 产品创意）正好对应本模块的功能清单
 * （7.1 搜索指数 / 7.2 热词分析 / 7.3 产品机会 / 7.4 贸易与客户大数据）。
 *
 * 三段的分工：
 *   01 市场趋势 —— 需求在涨还是在退？按细分品类拆，回答"钱往哪流"
 *   02 产品开发 —— 收敛成"进不进"的判断：机会评分 + 主要玩家份额 + 爽点/痛点
 *   03 产品创意 —— 把机会落成可立项的形态：目标客户、容量、渗透率、特色
 *
 * 三段共用同一个"商品类别"筛选：切换类别即整条链换一组数据，
 * 这样"看趋势"与"看机会"始终在同一口径下，不会出现跨品类的错配。
 *
 * 一期数据策略：以免费源为主 + 小范围商业数据验证价值（产品规划说明书 V2.1 §2.9），
 * 因此页面底部必须显性标注数据源与覆盖范围，避免把样本数据当成全量结论。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据只存 key 与数值。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/intel/*。
 */

/** 类别键与 demo.category.* 对齐（电池模组 / 充电桩 / 便携储能 / 逆变器 / 光伏组件）。 */
type CategoryKey = 'energy' | 'battery' | 'solar' | 'inverter' | 'charging';
type StepKey = 'trend' | 'opportunity' | 'idea';

const CATEGORIES: readonly CategoryKey[] = ['energy', 'battery', 'solar', 'inverter', 'charging'];

const STEPS: readonly { key: StepKey; index: string; icon: ReactNode }[] = [
  { key: 'trend', index: '01', icon: <BarChartOutlined /> },
  { key: 'opportunity', index: '02', icon: <GlobalOutlined /> },
  { key: 'idea', index: '03', icon: <BulbOutlined /> },
];

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'] as const;

interface TrendSpec {
  id: string;
  index: number;
  growth: string;
  series: readonly number[];
}

interface PlayerSpec {
  /** 玩家名多为品牌名，语言中立，不入 i18n */
  name: string;
  share: number;
}

interface OppSpec {
  id: string;
  marketKey: string;
  score: number;
  players: readonly PlayerSpec[];
}

interface IdeaSpec {
  id: string;
  image: string;
  /** 价格 / 容量 / 渗透率都是数字与符号，语言中立，不入 i18n */
  price: string;
  size: string;
  penetration: string;
  stage: 'idea' | 'dev' | 'verify';
}

interface CategorySpec {
  trends: readonly TrendSpec[];
  opportunities: readonly OppSpec[];
  ideas: readonly IdeaSpec[];
}

const IMG_SOLAR = '/images/product-solar.png';
const IMG_POWER = '/images/product-power.png';
const IMG_HOME = '/images/product-smarthome.png';

/**
 * 三段共用的一套数据。主类"便携储能"给足密度，其余类别给基础量——
 * 演示数据的作用是让每条路径都走得通，不必每类都堆满。
 */
const CATEGORY_DATA: Readonly<Record<CategoryKey, CategorySpec>> = {
  energy: {
    trends: [
      { id: 'balcony', index: 92, growth: '+43%', series: [42, 47, 53, 61, 70, 79, 88, 92] },
      { id: 'portable', index: 86, growth: '+31%', series: [38, 42, 48, 55, 62, 71, 80, 86] },
      { id: 'backup', index: 78, growth: '+26%', series: [30, 35, 41, 48, 56, 64, 72, 78] },
      { id: 'rv', index: 71, growth: '+22%', series: [28, 32, 38, 44, 52, 60, 66, 71] },
    ],
    opportunities: [
      {
        id: 'op1',
        marketKey: 'demo.market.de',
        score: 92,
        players: [
          { name: 'Anker SOLIX', share: 28 },
          { name: 'EcoFlow', share: 22 },
          { name: 'Zendure', share: 14 },
        ],
      },
      {
        id: 'op2',
        marketKey: 'demo.market.fr',
        score: 88,
        players: [
          { name: 'Jackery', share: 31 },
          { name: 'Bluetti', share: 19 },
          { name: 'Goal Zero', share: 12 },
        ],
      },
    ],
    ideas: [
      { id: 'i1', image: IMG_SOLAR, price: '€899', size: '€129M', penetration: '6.8%', stage: 'idea' },
      { id: 'i2', image: IMG_POWER, price: '€549', size: '€86M', penetration: '9.2%', stage: 'dev' },
      { id: 'i3', image: IMG_HOME, price: '€159', size: '€48M', penetration: '4.5%', stage: 'verify' },
    ],
  },
  battery: {
    trends: [
      { id: 'lfp', index: 88, growth: '+36%', series: [34, 39, 46, 54, 63, 72, 81, 88] },
      { id: 'sodium', index: 74, growth: '+28%', series: [22, 27, 33, 40, 48, 57, 66, 74] },
      { id: 'stack', index: 69, growth: '+19%', series: [31, 35, 40, 46, 53, 59, 64, 69] },
    ],
    opportunities: [
      {
        id: 'op1',
        marketKey: 'demo.market.us',
        score: 87,
        players: [
          { name: 'CATL', share: 33 },
          { name: 'EVE Energy', share: 18 },
          { name: 'Pylontech', share: 12 },
        ],
      },
    ],
    ideas: [
      { id: 'i1', image: IMG_HOME, price: '$1,280', size: '$210M', penetration: '5.4%', stage: 'idea' },
      { id: 'i2', image: IMG_POWER, price: '$960', size: '$74M', penetration: '3.1%', stage: 'dev' },
    ],
  },
  solar: {
    trends: [
      { id: 'folding', index: 85, growth: '+32%', series: [33, 38, 45, 53, 62, 71, 78, 85] },
      { id: 'balconyPv', index: 79, growth: '+27%', series: [29, 34, 40, 47, 55, 63, 71, 79] },
      { id: 'flexible', index: 66, growth: '+15%', series: [30, 33, 38, 43, 49, 55, 61, 66] },
    ],
    opportunities: [
      {
        id: 'op1',
        marketKey: 'demo.market.de',
        score: 84,
        players: [
          { name: 'Anker SOLIX', share: 26 },
          { name: 'Renogy', share: 17 },
          { name: 'EcoFlow', share: 13 },
        ],
      },
    ],
    ideas: [
      { id: 'i1', image: IMG_SOLAR, price: '€329', size: '€58M', penetration: '7.4%', stage: 'idea' },
      { id: 'i2', image: IMG_HOME, price: '€449', size: '€36M', penetration: '4.2%', stage: 'verify' },
    ],
  },
  inverter: {
    trends: [
      { id: 'hybrid', index: 82, growth: '+29%', series: [32, 37, 43, 50, 58, 67, 75, 82] },
      { id: 'micro', index: 72, growth: '+21%', series: [28, 32, 37, 43, 50, 57, 65, 72] },
      { id: 'storage', index: 76, growth: '+24%', series: [30, 35, 41, 47, 55, 63, 70, 76] },
    ],
    opportunities: [
      {
        id: 'op1',
        marketKey: 'demo.market.it',
        score: 81,
        players: [
          { name: 'SMA', share: 24 },
          { name: 'GoodWe', share: 20 },
          { name: 'Deye', share: 15 },
        ],
      },
    ],
    ideas: [
      { id: 'i1', image: IMG_POWER, price: '€1,150', size: '€92M', penetration: '4.8%', stage: 'idea' },
      { id: 'i2', image: IMG_SOLAR, price: '€780', size: '€41M', penetration: '3.6%', stage: 'dev' },
    ],
  },
  charging: {
    trends: [
      { id: 'ac', index: 78, growth: '+26%', series: [31, 36, 42, 49, 56, 64, 71, 78] },
      { id: 'portableEv', index: 70, growth: '+18%', series: [27, 31, 36, 42, 48, 55, 62, 70] },
      { id: 'dc', index: 64, growth: '+12%', series: [29, 32, 36, 41, 46, 52, 58, 64] },
    ],
    opportunities: [
      {
        id: 'op1',
        marketKey: 'demo.market.br',
        score: 76,
        players: [
          { name: 'ABB', share: 22 },
          { name: 'Wallbox', share: 18 },
          { name: 'Autel', share: 14 },
        ],
      },
    ],
    ideas: [
      { id: 'i1', image: IMG_HOME, price: '$590', size: '$67M', penetration: '5.9%', stage: 'idea' },
      { id: 'i2', image: IMG_POWER, price: '$240', size: '$28M', penetration: '8.2%', stage: 'verify' },
    ],
  },
};

const STAGE_TAG = {
  idea: 'producing',
  dev: 'graphic',
  verify: 'review',
} as const;

const STAGE_KEY = {
  idea: 'intel.stage.idea',
  dev: 'intel.stage.dev',
  verify: 'intel.stage.verify',
} as const;

/** 推进按钮文案：创意→开发→验证→业绩（与 1.0 一致的四段递进）。 */
const ADVANCE_KEY = {
  idea: 'intel.advance.dev',
  dev: 'intel.advance.verify',
  verify: 'intel.advance.result',
} as const;

export default function IntelHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryKey>('energy');
  const [step, setStep] = useState<StepKey>('trend');

  const data = CATEGORY_DATA[category];

  const workflowSteps: readonly LxWorkflowStep[] = STEPS.map((item) => ({
    ...item,
    label: t(`intel.wf.step.${item.key}`),
  }));

  const chips = CATEGORIES.map((key) => ({ key, label: t(`demo.category.${key}`) }));

  /** 趋势折线：三条细分品类同屏对比，才看得出"谁在抢同一批需求"。 */
  const chartSeries = useMemo(
    () =>
      data.trends.map((trend) => ({
        name: t(`intel.trend.${category}.${trend.id}`),
        data: trend.series,
      })),
    [data.trends, category, t],
  );

  return (
    <PageContainer titleKey="intel.page.home" hideTitle>
      {/* 产品发现工作流：三段是同一条链上的三个切面，故用可切换的步骤条而非进度条 */}
      <LxWorkflowSteps
        title={t('intel.wf.title')}
        sub={t('intel.wf.sub')}
        icon={<FireOutlined />}
        steps={workflowSteps}
        active={step}
        onChange={(key) => setStep(key as StepKey)}
      />

      <LxChipGroup
        label={t('intel.cat.label')}
        options={chips}
        value={category}
        onChange={(key) => setCategory(key as CategoryKey)}
      />

      {/* 01 市场趋势 */}
      {step === 'trend' ? (
        <div className="lx-split lx-split--map">
          <section className="lx-glass lx-panel">
            <div className="lx-panel__head">
              <div>
                <div className="lx-panel__title">
                  {t('intel.tab.trend.title', { category: t(`demo.category.${category}`) })}
                </div>
                <div className="lx-panel__sub">{t('intel.tab.trend.sub')}</div>
              </div>
              <span className="lx-panel__badge lx-panel__badge--success">{t('intel.tab.trend.badge')}</span>
            </div>
            <div className="lx-panel__body">
              <LxChart
                categories={WEEKS}
                series={chartSeries}
                height={248}
                ariaLabel={t('intel.tab.trend.title', { category: t(`demo.category.${category}`) })}
              />
            </div>
          </section>

          <div className="lx-grid">
            {data.trends.map((trend) => (
              <section key={trend.id} className="lx-glass lx-panel">
                <div className="lx-panel__body">
                  <div className="lx-trendcard">
                    <div className="lx-trendcard__head">
                      <span className="lx-opp__name">{t(`intel.trend.${category}.${trend.id}`)}</span>
                      <span className="lx-trend lx-trend--up">{trend.growth}</span>
                    </div>
                    <div className="lx-opp__track">
                      <i style={{ width: `${trend.index}%` }} />
                    </div>
                    <div className="lx-opp__meta">
                      {t('intel.tab.trend.index')} <b className="lx-num">{trend.index}</b>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {/* 02 产品开发 */}
      {step === 'opportunity' ? (
        <div className="lx-split lx-split--rank">
          {data.opportunities.map((opportunity) => (
            <section key={opportunity.id} className="lx-glass lx-panel">
              <div className="lx-panel__body">
                <div className="lx-opp">
                  <div className="lx-opp__head">
                    <div>
                      <div className="lx-opp__name">{t(`intel.opp.${category}.${opportunity.id}.name`)}</div>
                      <div className="lx-opp__meta">
                        {t(opportunity.marketKey)} · {t('intel.opp.code')} {opportunity.id.toUpperCase()}
                      </div>
                    </div>
                    <div className="lx-opp__score">
                      <b>{opportunity.score}</b>
                      <span>{t('intel.opp.score')}</span>
                    </div>
                  </div>

                  <div className="lx-opp__section">
                    <h4>{t('intel.opp.players')}</h4>
                    {opportunity.players.map((player) => (
                      <div key={player.name} className="lx-opp__player">
                        <span>{player.name}</span>
                        <span className="lx-opp__track">
                          <i style={{ width: `${player.share}%` }} />
                        </span>
                        <b className="lx-num">{player.share}%</b>
                      </div>
                    ))}
                  </div>

                  <div className="lx-opp__note">
                    <b>{t('intel.opp.competition')}</b>
                    {t(`intel.opp.${category}.${opportunity.id}.competition`)}
                  </div>

                  <div className="lx-opp__pains">
                    <div className="lx-opp__pain lx-opp__pain--good">
                      <h4>
                        <ThunderboltOutlined />
                        {t('intel.opp.good')}
                      </h4>
                      <ul>
                        {[1, 2, 3].map((n) => (
                          <li key={n}>{t(`intel.opp.${category}.${opportunity.id}.good${n}`)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="lx-opp__pain lx-opp__pain--bad">
                      <h4>
                        <FireOutlined />
                        {t('intel.opp.bad')}
                      </h4>
                      <ul>
                        {[1, 2, 3].map((n) => (
                          <li key={n}>{t(`intel.opp.${category}.${opportunity.id}.bad${n}`)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="lx-opp__brief">
                    <h4>{t('intel.opp.brief')}</h4>
                    <p>{t(`intel.opp.${category}.${opportunity.id}.brief`)}</p>
                    <div className="lx-opp__spec">
                      <span>
                        <b>{t('intel.opp.spec.feature')}</b>
                        {t(`intel.opp.${category}.${opportunity.id}.feature`)}
                      </span>
                      <span>
                        <b>{t('intel.opp.spec.competitiveness')}</b>
                        {t(`intel.opp.${category}.${opportunity.id}.competitiveness`)}
                      </span>
                    </div>
                  </div>

                  <Button
                    block
                    icon={<RocketOutlined />}
                    onClick={() => setStep('idea')}
                  >
                    {t('intel.opp.action.idea')}
                  </Button>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* 03 产品创意 */}
      {step === 'idea' ? (
        <div className="lx-grid lx-grid--3">
          {data.ideas.map((idea) => (
            <section key={idea.id} className="lx-glass lx-panel lx-idea">
              <div className="lx-idea__cover">
                <img src={idea.image} alt="" loading="lazy" decoding="async" />
                <span className="lx-idea__badge">
                  <LxTag variant={STAGE_TAG[idea.stage]}>{t(STAGE_KEY[idea.stage])}</LxTag>
                </span>
              </div>
              <div className="lx-idea__body">
                <div>
                  <div className="lx-idea__name">{t(`intel.idea.${category}.${idea.id}.name`)}</div>
                  <div className="lx-idea__sub">{t(`intel.idea.${category}.${idea.id}.sub`)}</div>
                </div>

                <dl className="lx-idea__specs">
                  <div>
                    <dt>{t('intel.idea.target')}</dt>
                    <dd>{t(`intel.idea.${category}.${idea.id}.target`)}</dd>
                  </div>
                  <div>
                    <dt>{t('intel.idea.market')}</dt>
                    <dd>{t(`intel.idea.${category}.${idea.id}.market`)}</dd>
                  </div>
                  <div>
                    <dt>{t('intel.idea.competitor')}</dt>
                    <dd>{t(`intel.idea.${category}.${idea.id}.competitor`)}</dd>
                  </div>
                  <div>
                    <dt>{t('intel.idea.price')}</dt>
                    <dd className="is-price">{idea.price}</dd>
                  </div>
                  <div>
                    <dt>{t('intel.idea.size')}</dt>
                    <dd>{idea.size}</dd>
                  </div>
                  <div>
                    <dt>{t('intel.idea.penetration')}</dt>
                    <dd>{idea.penetration}</dd>
                  </div>
                </dl>

                <div>
                  <div className="lx-opp__meta">{t('intel.idea.features')}</div>
                  <div className="lx-idea__features">
                    {[1, 2, 3].map((n) => (
                      <LxTag key={n} variant="lang">
                        {t(`intel.idea.${category}.${idea.id}.feature${n}`)}
                      </LxTag>
                    ))}
                  </div>
                </div>

                <Button
                  block
                  type={idea.stage === 'idea' ? 'primary' : 'default'}
                  icon={<RocketOutlined />}
                  onClick={() => void navigate('/product')}
                >
                  {t(ADVANCE_KEY[idea.stage])}
                </Button>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <section className="lx-section">
        <LxSectionHeader title={t('intel.source.title')} sub={t('intel.source.sub')} />
        <p className="lx-source-note">
          <FireOutlined />
          {t('intel.source.note')}
        </p>
      </section>
    </PageContainer>
  );
}
