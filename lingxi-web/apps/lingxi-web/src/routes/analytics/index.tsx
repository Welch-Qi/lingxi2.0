import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
// 图标名以本仓锁定的 @ant-design/icons 5.5.0 为准：
// BadgeCheck / Boxes / MousePointerClick / Sparkles / Users 在该版本并不存在，
// 换成语义最接近且在版本内的 Aim / Appstore / CheckCircle / Highlight / Team。
import {
  AimOutlined,
  AppstoreOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  EyeOutlined,
  FireOutlined,
  HighlightOutlined,
  RocketOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { LxChart, LxFunnel, LxKpi, LxRankList, LxTag, LxWorldMap } from '@lingxi/ui';
import type { LxFunnelStep, LxKpiColor, LxRankItem, LxWorldMapDatum } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 经营分析首页（/analytics）—— 让决策有依据（产品规划说明书 V2.1 §2.10）。
 *
 * 版式复用灵犀 1.0《经营分析》(lingxi-web/src/components/pages/analytics-page.tsx)：
 * 它是 1.0 里信息密度最高的一页，也是唯一把"全球分布"讲清楚的一页。
 * 六段结构（与 1.0 一一对应）：
 *   ① 智能分析入口       —— 输入框 + 「智能分析」，结果**内联展开在正下方**
 *   ② KPI 7 张          —— 商品 / 曝光 / 点击 / 商机 / 订单 / 成交 全链路
 *   ③ 全球销量热度地图 + 订单 Top10 国家
 *      地图回答"货卖到哪去了、哪里还是空白"——排行榜只给前 10 名，
 *      看不到"完全没有销量"的区域，而那往往才是机会所在
 *   ④ 订单 Top10 产品 + 营销转化漏斗
 *      漏斗回答的不是"各环节有多少"，而是"哪一段在漏"
 *   ⑤ 近 30 天核心指标趋势
 *   ⑥ 分析报告（在 ① 的下方就地展开，不弹浮层）
 *
 * ① ⑥ 的交互口径：CEO 的问题多半是临时起意的，固定看板穷举不现实，
 * 所以自然语言入口必须比看板更靠前。链路为：意图识别 → 槽位抽取 →
 * 语义层映射参数化 SQL → 受限执行 → 结果解释（**LLM 不直接生成 SQL**，技术规约2.0 §3.6 G9）。
 *
 * 为什么是"内联展开"而不是"右下角浮层"（2026-09-22 改）：
 *   浮层只有 400px 宽，装不下一排数据卡；且它盖在看板上方，
 *   用户要对照地图或漏斗看结论时得来回关开关开。改成在输入框正下方就地展开后，
 *   结论、数据卡、建议与页面上的图在同一屏、可对照着读。
 *   一期报告为静态演示，接入后走 /api/v1/ana/ask。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据只存 key 与数值。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/ana/*。
 */

interface KpiSpec {
  labelKey: string;
  value: string;
  /** 今日值；与月值构成双口径（1.0 的卡片结构） */
  today: string;
  delta: string;
  color: LxKpiColor;
  icon: ReactNode;
  spark: readonly number[];
}

const KPIS: readonly KpiSpec[] = [
  { labelKey: 'ana.kpi.sku', value: '2,841', today: '+12', delta: '4.2%', color: 'primary', icon: <AppstoreOutlined />, spark: [30, 33, 31, 36, 38, 41, 44, 48] },
  { labelKey: 'ana.kpi.hot', value: '186', today: '+3', delta: '12.8%', color: 'accent', icon: <FireOutlined />, spark: [12, 14, 13, 16, 18, 21, 23, 26] },
  { labelKey: 'ana.kpi.impression', value: '24.6M', today: '486K', delta: '28.4%', color: 'secondary', icon: <EyeOutlined />, spark: [40, 46, 44, 52, 58, 55, 63, 72] },
  { labelKey: 'ana.kpi.click', value: '1.86M', today: '32.4K', delta: '21.7%', color: 'violet', icon: <AimOutlined />, spark: [25, 28, 30, 34, 38, 42, 47, 53] },
  { labelKey: 'ana.kpi.opp', value: '18,642', today: '326', delta: '24.2%', color: 'primary', icon: <RocketOutlined />, spark: [20, 23, 22, 27, 29, 33, 36, 40] },
  { labelKey: 'ana.kpi.order', value: '3,280', today: '68', delta: '18.6%', color: 'secondary', icon: <ShoppingCartOutlined />, spark: [8, 9, 11, 10, 13, 15, 16, 19] },
  { labelKey: 'ana.kpi.deal', value: '2,180', today: '38', delta: '15.3%', color: 'success', icon: <CheckCircleOutlined />, spark: [5, 6, 6, 8, 9, 10, 12, 14] },
];

interface CountrySpec {
  /** ECharts 地图区域名（英文），必须与 public/geo/world.json 的 properties.name 一致 */
  name: string;
  /** 本地化名称的 i18n key */
  key: string;
  orders: number;
  /** 地图热度 0~100，仅用于分档着色 */
  heat: number;
  opp: number;
  deal: number;
}

/**
 * 国家口径：Top10 与地图配色同源。
 * 只列目标市场——没进过的国家留给地图的"未销售"色，那本身就是一条信息。
 */
const COUNTRIES: readonly CountrySpec[] = [
  { name: 'Germany', key: 'demo.market.de', orders: 864, heat: 100, opp: 5840, deal: 612 },
  { name: 'France', key: 'demo.market.fr', orders: 612, heat: 72, opp: 3920, deal: 428 },
  { name: 'United Kingdom', key: 'demo.market.uk', orders: 448, heat: 52, opp: 2860, deal: 310 },
  { name: 'Netherlands', key: 'demo.market.nl', orders: 324, heat: 38, opp: 1980, deal: 224 },
  { name: 'Italy', key: 'demo.market.it', orders: 266, heat: 31, opp: 1620, deal: 182 },
  { name: 'Spain', key: 'demo.market.es', orders: 218, heat: 25, opp: 1320, deal: 148 },
  { name: 'Poland', key: 'demo.market.pl', orders: 184, heat: 21, opp: 1080, deal: 124 },
  { name: 'Sweden', key: 'demo.market.se', orders: 142, heat: 17, opp: 860, deal: 96 },
  { name: 'Denmark', key: 'demo.market.dk', orders: 118, heat: 14, opp: 720, deal: 80 },
  { name: 'Austria', key: 'demo.market.at', orders: 104, heat: 12, opp: 640, deal: 72 },
  { name: 'United States', key: 'demo.market.us', orders: 78, heat: 8, opp: 480, deal: 52 },
  { name: 'Norway', key: 'demo.market.no', orders: 96, heat: 10, opp: 580, deal: 66 },
  { name: 'Canada', key: 'demo.market.ca', orders: 58, heat: 6, opp: 360, deal: 38 },
  { name: 'Australia', key: 'demo.market.au', orders: 68, heat: 9, opp: 420, deal: 46 },
  { name: 'Japan', key: 'demo.market.jp', orders: 44, heat: 5, opp: 300, deal: 30 },
  { name: 'Brazil', key: 'demo.market.br', orders: 36, heat: 3, opp: 240, deal: 26 },
  { name: 'Vietnam', key: 'demo.market.vn', orders: 52, heat: 6, opp: 320, deal: 34 },
];

/** 探针三行的圆点色：与地图色阶同源，直接取品牌令牌，避免引入新色相。 */
const DOT_OPP = 'var(--lx-color-accent)';
const DOT_ORDER = 'var(--lx-color-secondary)';
const DOT_DEAL = 'var(--lx-color-success)';

/** 产品 Top10：商品编码沿用商品中心的主数据口径（型号 + 品类）。 */
const PRODUCTS: readonly { key: string; orders: number }[] = [
  { key: 'p1', orders: 724 },
  { key: 'p2', orders: 612 },
  { key: 'p3', orders: 486 },
  { key: 'p4', orders: 398 },
  { key: 'p5', orders: 344 },
  { key: 'p6', orders: 286 },
  { key: 'p7', orders: 248 },
  { key: 'p8', orders: 216 },
  { key: 'p9', orders: 186 },
  { key: 'p10', orders: 164 },
];

/** 漏斗四阶：数值取 1.0 的量级，阶段转化率由组件现算。 */
const FUNNEL: readonly LxFunnelStep[] = [
  { key: 'impression', label: '', value: 24_600_000 },
  { key: 'click', label: '', value: 1_860_000 },
  { key: 'opp', label: '', value: 186_420 },
  { key: 'order', label: '', value: 3_280 },
];

const DAYS = Array.from({ length: 30 }, (_, index) => `D${index + 1}`) as readonly string[];

/** 近 30 天：四条线同屏，看得出"曝光涨了但订单没跟上"这类背离。 */
const TREND_SERIES = [
  {
    nameKey: 'ana.trend.series.impression',
    data: [538, 509, 467, 553, 422, 436, 525, 510, 444, 550, 535, 549, 582, 560, 536, 492, 600, 549, 485, 581, 507, 505, 639, 645, 504, 599, 653, 507, 520, 558],
  },
  {
    nameKey: 'ana.trend.series.click',
    data: [191, 184, 201, 224, 185, 196, 227, 224, 256, 203, 252, 198, 251, 207, 212, 251, 216, 204, 250, 213, 247, 234, 216, 236, 261, 240, 235, 226, 286, 237],
  },
  {
    nameKey: 'ana.trend.series.opp',
    data: [99, 99, 93, 112, 110, 89, 109, 115, 93, 99, 105, 95, 90, 120, 92, 122, 111, 116, 105, 98, 99, 118, 114, 106, 109, 109, 125, 123, 123, 102],
  },
  {
    nameKey: 'ana.trend.series.order',
    data: [26, 21, 22, 21, 21, 22, 27, 25, 23, 23, 28, 25, 29, 30, 29, 30, 30, 30, 30, 27, 29, 28, 32, 26, 29, 27, 25, 33, 33, 33],
  },
] as const;

/**
 * 智能分析报告（一期静态演示）。
 *
 * 结构固定四段：结论 → 关键数据 → 关键发现 → 建议动作。
 * 为什么"数据卡"是必需的：只给一句结论，用户无从判断该不该信；
 * 四个数字把结论的支撑量级摆出来，结论才有落点。
 *
 * 提问匹配按**下标**而不是关键词包含：
 * 关键词匹配在中文里很脆（"转化"既命中"转化率最高"也命中"哪个环节流失"），
 * 而这里的示例提问是固定的，下标匹配结果确定且不依赖分词。
 * 自由输入走 FALLBACK_REPORT（大盘口径）——一期是静态演示，接后端后改为流式返回。
 */
interface AskMetric {
  labelKey: string;
  /** 语言无关的数值（阿拉伯数字、百分号、¥+数字） */
  value?: string;
  /** 含中文量级词的数值（如「¥1.62 万/吨」），走 i18n 由两种语言各自表述 */
  valueKey?: string;
  /** 单位（"单""天"…）：中英文案不同，走 i18n key */
  unitKey?: string;
  /** 口径说明或对比基准 */
  noteKey: string;
  color: LxKpiColor;
}

interface AskReport {
  conclusionKey: string;
  metrics: readonly AskMetric[];
  /** 关键发现，固定 3 条 */
  findingKeys: readonly string[];
  adviceKey: string;
}

const REPORTS: readonly AskReport[] = [
  // A —— 对应 ana.chat.q1：德国渠道毛利率
  {
    conclusionKey: 'ana.ask.a1.conclusion',
    metrics: [
      { labelKey: 'ana.ask.a1.m1.label', value: '23.6%', noteKey: 'ana.ask.a1.m1.note', color: 'accent' },
      { labelKey: 'ana.ask.a1.m2.label', value: '26.1%', noteKey: 'ana.ask.a1.m2.note', color: 'primary' },
      { labelKey: 'ana.ask.a1.m3.label', valueKey: 'ana.ask.a1.m3.value', noteKey: 'ana.ask.a1.m3.note', color: 'violet' },
      { labelKey: 'ana.ask.a1.m4.label', value: '3', unitKey: 'ana.ask.unit.doc', noteKey: 'ana.ask.a1.m4.note', color: 'secondary' },
    ],
    findingKeys: ['ana.ask.a1.f1', 'ana.ask.a1.f2', 'ana.ask.a1.f3'],
    adviceKey: 'ana.ask.a1.advice',
  },
  // B —— 对应 ana.chat.q2：回款逾期
  {
    conclusionKey: 'ana.ask.a2.conclusion',
    metrics: [
      { labelKey: 'ana.ask.a2.m1.label', value: '112', unitKey: 'ana.ask.unit.day', noteKey: 'ana.ask.a2.m1.note', color: 'accent' },
      { labelKey: 'ana.ask.a2.m2.label', valueKey: 'ana.ask.a2.m2.value', noteKey: 'ana.ask.a2.m2.note', color: 'primary' },
      { labelKey: 'ana.ask.a2.m3.label', value: '3', unitKey: 'ana.ask.unit.company', noteKey: 'ana.ask.a2.m3.note', color: 'violet' },
      { labelKey: 'ana.ask.a2.m4.label', value: '2', unitKey: 'ana.ask.unit.company', noteKey: 'ana.ask.a2.m4.note', color: 'secondary' },
    ],
    findingKeys: ['ana.ask.a2.f1', 'ana.ask.a2.f2', 'ana.ask.a2.f3'],
    adviceKey: 'ana.ask.a2.advice',
  },
  // C —— 对应 ana.chat.q3：转化流失
  {
    conclusionKey: 'ana.ask.a3.conclusion',
    metrics: [
      { labelKey: 'ana.ask.a3.m1.label', value: '10.0%', noteKey: 'ana.ask.a3.m1.note', color: 'accent' },
      { labelKey: 'ana.ask.a3.m2.label', value: '13.4%', noteKey: 'ana.ask.a3.m2.note', color: 'primary' },
      { labelKey: 'ana.ask.a3.m3.label', value: '9', unitKey: 'ana.ask.unit.field', noteKey: 'ana.ask.a3.m3.note', color: 'violet' },
      { labelKey: 'ana.ask.a3.m4.label', value: '7.6%', noteKey: 'ana.ask.a3.m4.note', color: 'secondary' },
    ],
    findingKeys: ['ana.ask.a3.f1', 'ana.ask.a3.f2', 'ana.ask.a3.f3'],
    adviceKey: 'ana.ask.a3.advice',
  },
];

/** 自由输入（未命中示例提问）时的兜底：讲大盘，避免"答非所问"的空回复。 */
const FALLBACK_REPORT: AskReport = {
  conclusionKey: 'ana.ask.d.conclusion',
  metrics: [
    { labelKey: 'ana.ask.d.m1.label', value: '3,280', unitKey: 'ana.unit.order', noteKey: 'ana.ask.d.m1.note', color: 'primary' },
    { labelKey: 'ana.ask.d.m2.label', value: '10.0%', noteKey: 'ana.ask.d.m2.note', color: 'accent' },
    { labelKey: 'ana.ask.d.m3.label', value: '17', unitKey: 'ana.ask.unit.market', noteKey: 'ana.ask.d.m3.note', color: 'violet' },
    { labelKey: 'ana.ask.d.m4.label', value: '864', unitKey: 'ana.unit.order', noteKey: 'ana.ask.d.m4.note', color: 'secondary' },
  ],
  findingKeys: ['ana.ask.d.f1', 'ana.ask.d.f2', 'ana.ask.d.f3'],
  adviceKey: 'ana.ask.d.advice',
};

/** 示例提问（也是报告 A/B/C 的索引来源，顺序不可调换） */
const STARTER_KEYS = ['ana.chat.q1', 'ana.chat.q2', 'ana.chat.q3'] as const;

interface AskState {
  question: string;
  report: AskReport;
}

export default function AnalyticsHomePage() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [ask, setAsk] = useState<AskState | null>(null);
  const [thinking, setThinking] = useState(false);

  const starters = useMemo(() => STARTER_KEYS.map((key) => t(key)), [t]);

  /** 提交：先进入"解析中"，再就地展开报告（演示用的 700ms 模拟语义层取数）。 */
  const run = (text: string) => {
    if (thinking) {
      return;
    }
    // 空输入不算错误：直接按大盘口径给一份整体分析。
    // 若在这里 return，用户看到的是一个"点了没反应"的按钮，比给错答案更劝退。
    const question = text.trim() || t('ana.ask.defaultQuestion');
    const matched = starters.indexOf(question);
    setInput('');
    setThinking(true);
    setAsk(null);
    window.setTimeout(() => {
      // noUncheckedIndexedAccess 下数组取值可能为 undefined，故给大盘报告兜底
      const report = (matched >= 0 ? REPORTS[matched] : undefined) ?? FALLBACK_REPORT;
      setAsk({ question, report });
      setThinking(false);
    }, 700);
  };

  const mapData: readonly LxWorldMapDatum[] = COUNTRIES.map((country) => ({
    name: country.name,
    value: country.heat,
    details: [
      { label: t('ana.map.opp'), value: country.opp.toLocaleString(), color: DOT_OPP },
      { label: t('ana.map.order'), value: country.orders.toLocaleString(), color: DOT_ORDER },
      { label: t('ana.map.deal'), value: country.deal.toLocaleString(), color: DOT_DEAL },
    ],
  }));

  const countryNames = useMemo(
    () => new Map(COUNTRIES.map((country) => [country.name, country.key])),
    [],
  );

  const countryRank: readonly LxRankItem[] = [...COUNTRIES]
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10)
    .map((country) => ({ key: country.key, label: t(country.key), value: country.orders }));

  const productRank: readonly LxRankItem[] = PRODUCTS.map((product) => ({
    key: product.key,
    label: t(`ana.product.${product.key}`),
    value: product.orders,
  }));

  const funnelSteps: readonly LxFunnelStep[] = FUNNEL.map((step) => ({
    ...step,
    label: t(`ana.funnel.${step.key}`),
  }));

  const trendSeries = useMemo(
    () => TREND_SERIES.map((item) => ({ name: t(item.nameKey), data: item.data })),
    [t],
  );

  return (
    <PageContainer titleKey="ana.page.home" hideTitle>
      {/* ① 智能分析：输入框 + 按钮，报告就地展开在下方 */}
      <section className="lx-glass lx-ana__ask">
        <div className="lx-ana__askrow">
          <span className="lx-ana__who">
            <span className="lx-ana__avatar">
              <img src="/images/agent-analyst.png" alt="" loading="lazy" decoding="async" />
              <span className="lx-ana__dot" />
            </span>
            <span className="lx-ana__ident">
              <span className="lx-ana__name">
                {t('ana.chat.name')}
                <LxTag variant="lang">AI</LxTag>
              </span>
              <span className="lx-ana__hint">{t('ana.chat.entryHint')}</span>
            </span>
          </span>

          <form
            className="lx-ana__form"
            onSubmit={(event) => {
              event.preventDefault();
              run(input);
            }}
          >
            <input
              className="lx-ana__input"
              value={input}
              placeholder={t('ana.ask.placeholder')}
              aria-label={t('ana.ask.placeholder')}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // 中文输入法组词中的回车是"选词"，不是"提交"
                if (event.key === 'Enter' && event.nativeEvent.isComposing) {
                  event.preventDefault();
                }
              }}
            />
            <button
              type="submit"
              className="lx-ana__go lx-focusable"
              disabled={thinking}
            >
              <HighlightOutlined />
              {t('ana.ask.action')}
            </button>
          </form>
        </div>

        <div className="lx-ana__askfoot">
          <span className="lx-ana__cueslabel">{t('ana.ask.cues')}</span>
          <div className="lx-ana__cues">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                className="lx-ana__cue lx-focusable"
                onClick={() => run(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
          <span className="lx-ana__stamp">{t('ana.stamp')}</span>
        </div>

        {thinking || ask ? (
          <div className="lx-ana__report" aria-live="polite">
            <div className="lx-ana__reportbar">
              <span className="lx-ana__reporttitle">
                <BulbOutlined />
                {t('ana.ask.reportTitle')}
              </span>
              <span className="lx-ana__reportmeta">{t('ana.ask.reportMeta')}</span>
              <button
                type="button"
                className="lx-ana__reportclose lx-focusable"
                aria-label={t('ana.ask.collapse')}
                onClick={() => {
                  setAsk(null);
                  setThinking(false);
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            {thinking ? (
              <div className="lx-ana__thinking">
                <span className="lx-ana__typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {t('ana.ask.thinking')}
              </div>
            ) : null}

            {ask ? (
              <div className="lx-ana__reportbody">
                <div className="lx-ana__qa">
                  <span className="lx-ana__qline">
                    <span className="lx-ana__mark lx-ana__mark--q">{t('ana.ask.ask')}</span>
                    {/* 正文各自独立成块，不与其他元素并排——铁律10：flex 容器承载多段文本会按 item 折行 */}
                    {/* （问题/结论都是整句，包在各自的 span 里走正常文本流） */}
                    <span className="lx-ana__qtext">{ask.question}</span>
                  </span>
                  <span className="lx-ana__aline">
                    <span className="lx-ana__mark lx-ana__mark--a">{t('ana.ask.answer')}</span>
                    <span className="lx-ana__atext">{t(ask.report.conclusionKey)}</span>
                  </span>
                </div>

                <div className="lx-ana__metrics">
                  {ask.report.metrics.map((metric) => (
                    <div
                      key={metric.labelKey}
                      className={`lx-ana__metric lx-ana__metric--${metric.color}`}
                    >
                      <span className="lx-ana__metriclabel">{t(metric.labelKey)}</span>
                      <span className="lx-ana__metricvalue lx-num">
                        {metric.valueKey ? t(metric.valueKey) : metric.value}
                        {metric.unitKey ? (
                          <span className="lx-ana__metricunit">{t(metric.unitKey)}</span>
                        ) : null}
                      </span>
                      <span className="lx-ana__metricnote">{t(metric.noteKey)}</span>
                    </div>
                  ))}
                </div>

                <div className="lx-ana__detail">
                  <div className="lx-ana__findingsblock">
                    <div className="lx-ana__detailtitle">{t('ana.ask.findings')}</div>
                    <ol className="lx-ana__findings">
                      {ask.report.findingKeys.map((key) => (
                        <li key={key}>
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="lx-ana__advice">
                    <span className="lx-ana__advicetitle">{t('ana.ask.advice')}</span>
                    <span className="lx-ana__advicetext">{t(ask.report.adviceKey)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ② KPI 全链路 */}
      <div className="lx-grid lx-grid--kpi-7">
        {KPIS.map((kpi) => (
          <LxKpi
            key={kpi.labelKey}
            label={t(kpi.labelKey)}
            value={kpi.value}
            sub={t('ana.kpi.sub.today', { value: kpi.today })}
            trend="up"
            delta={kpi.delta}
            color={kpi.color}
            spark={kpi.spark}
          />
        ))}
      </div>

      {/* ③ 全球销量热度地图 + 订单 Top10 国家 */}
      <div className="lx-split lx-split--map">
        <section className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('ana.map.title')}</div>
              <div className="lx-panel__sub">{t('ana.map.sub')}</div>
            </div>
          </div>
          <div className="lx-panel__body">
            <LxWorldMap
              geoUrl={`${import.meta.env.BASE_URL}geo/world.json`}
              data={mapData}
              legend={{
                noData: t('ana.map.legend.none'),
                levels: [
                  t('ana.map.legend.l1'),
                  t('ana.map.legend.l2'),
                  t('ana.map.legend.l3'),
                  t('ana.map.legend.l4'),
                  t('ana.map.legend.l5'),
                ],
              }}
              formatName={(name) => {
                const key = countryNames.get(name);
                return key ? t(key) : name;
              }}
              height={340}
              ariaLabel={t('ana.map.title')}
            />
          </div>
        </section>

        <section className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('ana.rank.country.title')}</div>
              <div className="lx-panel__sub">{t('ana.rank.country.sub')}</div>
            </div>
          </div>
          <div className="lx-panel__body">
            <LxRankList items={countryRank} valueSuffix={t('ana.unit.order')} />
          </div>
        </section>
      </div>

      {/* ④ 产品 Top10 + 营销转化漏斗 */}
      <div className="lx-split lx-split--rank">
        <section className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('ana.rank.product.title')}</div>
              <div className="lx-panel__sub">{t('ana.rank.product.sub')}</div>
            </div>
          </div>
          <div className="lx-panel__body">
            <LxRankList items={productRank} valueSuffix={t('ana.unit.order')} />
          </div>
        </section>

        <section className="lx-glass lx-panel">
          <div className="lx-panel__head">
            <div>
              <div className="lx-panel__title">{t('ana.funnel.title')}</div>
              <div className="lx-panel__sub">{t('ana.funnel.sub')}</div>
            </div>
          </div>
          <div className="lx-panel__body">
            <LxFunnel
              steps={funnelSteps}
              rateTemplate={t('ana.funnel.rate')}
              ariaLabel={t('ana.funnel.title')}
            />
          </div>
        </section>
      </div>

      {/* ⑤ 近 30 天趋势 */}
      <section className="lx-glass lx-panel">
        <div className="lx-panel__head">
          <div>
            <div className="lx-panel__title">{t('ana.trend.title')}</div>
            <div className="lx-panel__sub">{t('ana.trend.sub')}</div>
          </div>
        </div>
        <div className="lx-panel__body">
          <LxChart categories={DAYS} series={trendSeries} height={208} ariaLabel={t('ana.trend.title')} />
        </div>
      </section>
    </PageContainer>
  );
}
