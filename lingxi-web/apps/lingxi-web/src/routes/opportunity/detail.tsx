import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTag } from '@lingxi/ui';
import { formatMoney } from '@lingxi/utils';
import { App } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { FormEditDrawer } from '@/components/FormSections';
import {
  INTENT_SLA_DAYS,
  STAGE_KIND,
  STAGE_ORDER,
} from '@/routes/customer/data';
import type { OppIntent, OppStage } from '@/routes/customer/data';
import { CLOSE_TONE, OPPORTUNITY_ROWS, OPP_TODAY, forwardStages } from './data';
import type { OpportunityRow } from './data';
import { INTENT_TAG, useIntentOrder, useIntentOptions, useStageOptions } from './options';
import { oppEditPatch, oppEditSections, oppEditValues } from './fields';

/**
 * 商机详情（/opportunity/:id）——《产品规划说明书V2.1》§3.6「商机中心」的落地页。
 *
 * 为什么需要这个页面：商机中心的列表回答"这一批商机走到哪一段了"，
 * 但销售每天真正要处理的是**单条商机的下一步** —— 这条还差什么、要不要重评、
 * 卡在谁那里、客户情况变了我这一单还成立不成立。这些问题列表给不了答案，
 * 而§682 已经约定"客户360 → 商机 → 商机详情 → 回客户360"是往返动线，
 * 缺了这一环，客户360 里那句「跟进 / 关闭」就会变成点了没处去的按钮。
 *
 * 页面按 §2.4 的能力表组织，一处不落：
 *   · 生命周期阶段      → 首触→…→已验收 + 兜底流失关闭，当前段高亮（见下方 stageIndex 说明）
 *   · 意向等级          → A/B/C/D，只评未关闭；**可页内编辑**，重评机制落在「重评」块
 *   · 金额与预测        → 页头事实带的「预计成交金额 / 预计成交时间」
 *   · 跟进节奏          → 最近跟进 / 下次跟进 / SLA（A 级 7 天、B 级 30 天）
 *   · 商机过程          → BANT 成立理由、竞品情况、本次跟进小结
 *   · 关闭与回流        → 成交 / 流失两种关闭各自带来的客户主体回流结果
 *
 * **2026-10-06 两处从只读改为可编辑**（用户明确要求）：
 *   ① 阶段 —— 页头徽标换成 `<select>`，只给**当前段及其之后**（`forwardStages`）。
 *      不给退回：阶段记的是过程事实，退回等于把谈过的事当没谈过。
 *   ② 意向等级 —— 右栏「意向等级」块换成 `<select>`，已关闭商机置灰。
 *      此前 §2.4 的重评机制只能"看"不能"做"：看到"已到重评档期"却无处可改。
 *
 * 两处都走 `intentOverride` / `stageOverride`（`null` = 未改，读时回落 `row`），
 * 所以轨道高亮、SLA 天数、逾期标记、关闭后果会一起跟着变 —— 改一处而别处
 * 仍显示旧值，是这种页面最容易留下的破绽。
 *
 * ⚠️ 一处**刻意不编造字段**的地方：阶段停留时长。§2.4 提到"阶段停留时长统计"，
 * 但演示数据里商机只有 createdAt、**没有阶段进场时间**，算不出停留天数。
 * 与其编一个字段出来，本页给的是**商机存续天数**（createdAt → 基准日）——
 * 它同样能回答"这条单子拖了多久"，且是数据里真实存在的。等接入 `opp_stage_log`
 * 后这里换成阶段进场时间即可，判据不变。
 *
 * 基准日 `OPP_TODAY` 与列表同源：演示数据固定为 2026-09-24，不取 `new Date()` ——
 * 否则截图与断言每天都会变，验收不可复现（见 data.ts 的同一说明）。
 *
 * 「跟进」按钮的去处是 `/opportunity/:id/follow`（新建页）：原先只弹一句
 * message，是"点了没处去"——销售写跟进要同时落下小结、下次跟进与阶段判断，
 * 三件事在一条记录里完成才叫记了一次跟进。
 */

/**
 * 强制重评的阶段（§2.4「重评机制」）：处于这两段的商机每 30 天必须重评意向等级。
 * 用字面量联合而不是 `OppStage[]`：漏一个阶段会被类型挡住，而不是悄悄漏掉。
 */
const REEVAL_STAGES = ['nurture', 'proposal'] as const satisfies readonly OppStage[];

/** 两个日期之间的天数（to − from），按 UTC 日界算，避免时区把差一天算成差两天。 */
function daysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export default function OpportunityDetailPage() {
  const { t, i18n } = useTranslation();
  /** 意向等级可选项：从业务字典派生（顺序与启用状态在配置中心可调），
      不再在本页硬编码 a/b/c/d —— 收敛前 detail/follow/new/index 各有一份。 */
  const intentLevels = useIntentOrder();
  // 静态 message 在 App Provider 外不生效，反馈必须走 App.useApp()（技术规约 §4.2）
  const { message } = App.useApp();
  const { id } = useParams();
  const navigate = useNavigate();

  /** 关闭动作改的是本页这块内容，不是整份数据 —— 演示态不改共享数据集。 */
  const [closed, setClosed] = useState(false);
  /**
   * 意向等级 / 阶段改为**页内可编辑**（2026-10-06）：原先两者都是只读文本，
   * 销售在这一页看得到"重评到期"却改不了，只能回列表 —— 那不叫重评机制。
   *
   * 两个状态都存`null` 表示"未改"，读到时回落到 `row`：
   * 这样页面上其余 20 处读`row.intent` / `row.stage` 的地方（轨道、SLA、
   * 逾期标记、关闭后果…）会自动跟着新值走，不必逐处改，也不必复制一份行对象。
   * 若直接 `useState(row.intent)`，改阶段后轨道仍按旧值算 —— 那种不一致最难查。
   */
  const [intentOverride, setIntentOverride] = useState<OppIntent | null>(null);
  const [stageOverride, setStageOverride] = useState<OppStage | null>(null);

  /**
   * 「编辑商机」抽屉的打开状态与覆盖量（2026-10-07 第二十轮）。
   *
   * 为什么与上面两个 override 分开存而不合并成一个 patch：
   * 阶段/意向有**页内专责入口**（页头徽标下拉、右栏意向下拉），它们是被频繁微调的两个值；
   * 其余字段（名称、金额、负责人、预计成交、下次跟进、BANT）只在抽屉里改。
   * 合并成一个对象后，"抽屉里选了阶段"会覆盖页头刚改的阶段，而两条路径的语义
   * 应该是同一个值（该合流）—— 但**取值范围的守卫逻辑不同**（页头走 `forwardStages`，
   * 抽屉走 `forwardStages` + 落库前再校验一次），分开存才能各写各的守卫。
   * 读的时候 `stage = stageOverride ?? patch?.stage ?? row.stage`，两者都不会漏。
   */
  const [editing, setEditing] = useState(false);
  const [patch, setPatch] = useState<Partial<OpportunityRow> | null>(null);

  const row: OpportunityRow | undefined = useMemo(
    () => OPPORTUNITY_ROWS.find((item) => item.id === id),
    [id],
  );

  /**
   * 编辑抽屉的字段清单需要的两个字典选项（阶段/意向）。
   * 与 `new.tsx` 同源：选项来自业务字典（配置中心可改顺序与启用状态），
   * 阶段还要再按 `forwardStages` 收窄（`oppEditSections` 内做）。
   */
  /* 不加 `as string`：`SelectOption<OppStage>.value` 的类型本来就是 `string`
     （OppStage 的每个成员都是字符串字面量，联合类型与之相容），
     强转会触发 no-unnecessary-type-assertion。 */
  const stageOptions = useStageOptions().map((o) => ({ value: o.value, labelKey: o.labelKey }));
  const intentOptions = useIntentOptions().map((o) => ({ value: o.value, labelKey: o.labelKey }));

  const money = useCallback(
    (amountMinor: number) => formatMoney(amountMinor, 'CNY', i18n.language),
    [i18n.language],
  );

  if (!row) {
    return (
      <PageContainer titleKey="opp.detail.title" hideTitle>
        <div className="lx-oppd__topbar">
          <button type="button" className="lx-oppd__back lx-focusable" onClick={() => void navigate('/opportunity')}>
            <ArrowLeftOutlined />
            {t('opp.detail.back')}
          </button>
        </div>
        <section className="lx-glass lx-panel">
          <LxSectionHeader title={t('opp.detail.title')} />
          <p className="lx-oppd__prose">{t('opp.detail.missing')}</p>
        </section>
      </PageContainer>
    );
  }

  /**
   * 本页生效的商机记录：抽屉覆盖量叠加在数据层那一行之上。
   *
   * 后续所有读 `row.xxx` 的地方都改读 `view.xxx`：抽屉改一次，页头事实带
   * （金额 / 预计成交）、右栏（负责人 / BANT / 跟进节奏）与关闭后果一起跟着变。
   * 若只让抽屉改自己那几处，就会出现"金额卡显示 156 万、右栏写 120 万"这类自相矛盾。
   */
  const view: OpportunityRow = { ...row, ...patch };

  /**
   * 本页生效的意向等级 / 阶段：override 优先，其次抽屉覆盖量，最后数据层的值。
   *
   * 顺序即**专责顺序**：页头下拉是这两个值的主要入口，抽屉是次要入口，
   * 谁后改听谁的。
   */
  const intent = intentOverride ?? view.intent;
  const stage = stageOverride ?? view.stage;

  /** 阶段在 7 段推进序里的下标；「流失关闭」置末位，故下标即轨道位置。 */
  const currentStageIndex = STAGE_ORDER.indexOf(stage);
  const isLost = STAGE_KIND[stage] === 'lost';
  /* 「还开着」= **阶段处于 open 段**（首触/跟进培育/方案报价/商务谈判），
     而非"不是流失"。
     2026-10-07 修：此前写的是 `STAGE_KIND[stage] !== 'lost'`，
     于是「已签约 / 交付中 / 已验收」三段被算成"还开着" ——
     而列表页的同一判据用 `isOpenStage`（只认 open），于是一条已签约的商机
     在列表里是破折号（无事可做）、进详情页却还能跟进、还能改意向等级。
     同一份数据两个页面两个说法，用户会当成其中一个坏了。

     顺带修正两处连带的口径：`intentLocked`（意向只评未关闭）与
     「下次跟进逾期」告警 —— 已签约的商机不该再催跟进，
     那个红标是催一条已经谈成的单，纯属噪音。 */
  const isOpen = STAGE_KIND[stage] === 'open' && !closed;
  /* createdAt 与 lastFollowUp 是**过程事实**（报备时点 / 上次跟进时点），不在编辑范围内，
     故这两处仍读 row；下次跟进是可改字段，逾期判据必须跟着 view 走 ——
     否则抽屉里把下次跟进改到明天，事实带还挂着"逾期"红标。 */
  const stageDays = daysBetween(row.createdAt, OPP_TODAY);
  const slaDays = INTENT_SLA_DAYS[intent];
  const followGap = daysBetween(OPP_TODAY, view.nextFollowUp);
  const needReeval = REEVAL_STAGES.some((item) => item === stage);
  const elapsedDays = daysBetween(row.lastFollowUp, OPP_TODAY);
  const reevalDue = needReeval && elapsedDays >= 30;

  /** 已关闭商机不再评意向等级（§3.6 口径）—— 下拉置灰并回落到"不评估"。 */
  const intentLocked = !isOpen;

  return (
    <PageContainer titleKey="opp.detail.title" hideTitle>
      {/* 页面级返回 —— 与客户360 同一处置：放在卡片**之外**，才是页面级导航而非卡片级。 */}
      <div className="lx-oppd__topbar">
        <button type="button" className="lx-oppd__back lx-focusable" onClick={() => void navigate('/opportunity')}>
          <ArrowLeftOutlined />
          {t('opp.detail.back')}
        </button>
      </div>

      {/* 页头 = 这一单是谁的、走到哪了、值多少钱。 */}
      <section className="lx-glass lx-oppd__hero">
        <div className="lx-oppd__head">
          <div className="lx-oppd__idblock">
            {/* 商机名称与编码按《CRM字段配置表》的商机字段，不翻译（专名）。 */}
            <h2 className="lx-oppd__name">{view.name}</h2>
            <div className="lx-oppd__tags">
              {/* 阶段徽标沿用列表页那套 `lx-oppstage`（同一阶段在任何页面长得一样）。
                  它同时是**阶段编辑器**：徽标本身是下拉，改完轨道与 SLA 一起动。
                  `<span>` 换成 `<select>` 是因为阶段在本页是**状态也是操作** ——
                  而"重评机制"（下方块）规定阶段可被随时更正，只读就等于没有机制。 */}
              <span className="lx-oppd__stageedit">
                <select
                  className={`lx-oppstage lx-oppd__stagesel${CLOSE_TONE[stage] ? ` lx-oppstage--${CLOSE_TONE[stage]}` : ''}`}
                  value={stage}
                  aria-label={t('opp.col.stage')}
                  onChange={(event) => {
                    const next = event.target.value as OppStage;
                    setStageOverride(next);
                    message.success(t('opp.detail.stageSet', { stage: t(`cus.oppstage.${next}`) }));
                  }}
                >
                  {/* forwardStages 的入参是**生效阶段**而非 row.stage：
                      抽屉把阶段推进过一段之后，下拉的可选范围要跟着后移 ——
                      按旧值算会允许"退回上一段"，那正是阶段不可回退要防的事。 */}
                  {forwardStages(stage).map((option) => (
                    <option key={option} value={option}>
                      {t(`cus.oppstage.${option}`)}
                    </option>
                  ))}
                </select>
              </span>
              {isOpen ? (
                <LxTag variant={INTENT_TAG[intent]}>{t(`cus.intent.${intent}`)}</LxTag>
              ) : (
                <span className="lx-muted">{t('opp.intent.closed')}</span>
              )}
              <span className="lx-oppd__tagsub">
                {t('opp.detail.tag.customer')} ·{' '}
                <button
                  type="button"
                  className="lx-focusable"
                  onClick={() => void navigate(`/customer/360/${row.customerId}`)}
                >
                  {row.customerName}
                </button>
              </span>
              <span className="lx-oppd__tagsub">
                {t('opp.col.owner')} · {t(view.ownerKey)}
              </span>
              <span className="lx-oppd__tagsub">
                {t('opp.detail.code')} · {row.code}
              </span>
            </div>
          </div>
          {/* 右上角动作组（2026-10-07 用户要求：跟进 / 关闭与「编辑商机」并排）。
              **三个动作搬到这里之前散在正文两处**：跟进在左栏「跟进记录」段的段头动作，
              关闭在左栏最下面「关闭与回流」段的提示条里。用户要在一屏内完成
              "看这单 → 跟进 / 关闭 / 改信息"，而散在两处时关闭要滚过整页才看得见。

              视觉权重刻意分三档（同一组按钮里必须有主次，否则就是三个一样重的按钮）：
              · 跟进 = 主动作（实心）。这是流转中商机最高频的动作。
              · 编辑 = 次动作（描边）。改信息是偶发动作，不该抢视觉重心。
              · 关闭 = 危险动作（描边 + 危险色）。它不可逆（关闭会改写客户主体、
                重算分层），所以**不放在最右** —— 最右是鼠标默认落点，
                放"不可逆"在那里等于邀请误点。
              已关闭的商机只留「编辑」：跟进与关闭对它都无事可做，
              给一个禁用按钮不如不给（与列表页给破折号同一处置）。 */}
          <div className="lx-oppd__acts">
            {isOpen ? (
              <>
                <button
                  type="button"
                  className="lx-oppd__followbtn lx-focusable"
                  onClick={() => void navigate(`/opportunity/${row.id}/follow`)}
                >
                  <PlusOutlined />
                  {t('opp.action.followUp')}
                </button>
                <button
                  type="button"
                  className="lx-oppd__closebtn lx-focusable"
                  onClick={() => {
                    setClosed(true);
                    message.success(t('opp.detail.close.done'));
                  }}
                >
                  {t('opp.action.close')}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="lx-oppd__editbtn lx-focusable"
              onClick={() => setEditing(true)}
            >
              <EditOutlined />
              {t('opp.detail.editOpp')}
            </button>
          </div>
        </div>

        <dl className="lx-oppd__facts">
          <div className="lx-oppd__fact">
            <dt>{t('opp.detail.fact.amount')}</dt>
            <dd className="lx-num">{money(view.amountMinor)}</dd>
          </div>
          <div className="lx-oppd__fact">
            <dt>{t('opp.detail.fact.expectedClose')}</dt>
            <dd className="lx-num">{view.expectedClose}</dd>
          </div>
          <div className="lx-oppd__fact">
            <dt>{t('opp.detail.fact.age')}</dt>
            <dd className="lx-num">{t('opp.detail.fact.days', { count: stageDays })}</dd>
          </div>
          <div className="lx-oppd__fact">
            <dt>{t('opp.detail.fact.lastFollow')}</dt>
            <dd className="lx-num">{row.lastFollowUp}</dd>
          </div>
          <div className={`lx-oppd__fact${followGap < 0 && isOpen ? ' lx-oppd__fact--warn' : ''}`}>
            <dt>{t('opp.detail.fact.nextFollow')}</dt>
            <dd className="lx-oppd__factdd">
              <span className="lx-num">{view.nextFollowUp}</span>
              {isOpen && followGap < 0 ? (
                <span className="lx-oppd__facttag" style={{ color: 'var(--lx-color-danger)' }}>
                  {t('opp.overdue')}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <div className="lx-oppd__body">
        {/* ── 左栏：推进与过程 ───────────────────────────── */}
        <div className="lx-oppd__col">
          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.stage')}</h3>
              <span className="lx-oppd__blocksub">{t('opp.detail.section.stageSub')}</span>
            </div>

            {/* 轨道：8 个点 + 序号（编码，不翻译）。8 个英文阶段名并排在 998px 里
                必然互相挤，故只让当前段出大字，其余段保持序号 + 短名。
                轨道**只读**（改阶段在页头徽标下拉里做）：一屏里放 8 个可点目标，
                误点一次的代价是改掉一条商机的真实阶段，读起来更快的做法是给标题挂 title。

                修饰符必须写成 BEM 的 `--done` / `--active` / `--lost`
                （2026-10-07 修）：此前这里拼的是 `` `lx-oppd__step${state}` ``
                而 state 是 `' done'`（**空格**分隔），实际产出的 class 是
                `lx-oppd__step done` —— 与 `opportunity.css` 里的
                `.lx-oppd__step--done .lx-oppd__dot` 永远匹配不上，
                于是 8 个点的背景色一律落到基础规则里的 `--lx-color-frost`，
                探针实测 8 个点 `dotBg` 全是同一个灰 `rgb(243,247,251)`：
                轨道看上去"从没点亮过"，而代码里的 `isCurrent` / `isDone` 算得完全正确。
                这类缺陷四道门禁与版式探针都测不出来 —— 它们只判"元素在不在、宽高对不对"，
                判不了"状态类有没有命中对应的 CSS 规则"。判据只能是**逐点读 computedStyle**。 */}
            <div className="lx-oppd__track">
              {STAGE_ORDER.map((step, index) => {
                const isCurrent = index === currentStageIndex;
                const isDone = !isLost && index < currentStageIndex;
                const state = isLost ? '--lost' : isCurrent ? '--active' : isDone ? '--done' : '';
                /* 基础类名与修饰符**都要挂**（2026-10-07 二次修）。
                   只写 `` `lx-oppd__step${state}` `` 时，state 为 `--done` 会把
                   基础类名整个替换掉 —— 实测 class 变成 `lx-oppd__step--done`，
                   `.lx-oppd__step` 的 `display:flex / flex-direction:column`
                   全部落空，元素退回默认 `display:block` 的行内流：dot / 序号 /
                   阶段名横向挤成一行，10×10 的圆点被压成 24px 高的竖条，
                   三者**叠字**（截图里 "First contact" 压在说明文字上）。

                   这一版比上一版更难被探针抓到：上一版的 class 是
                   `lx-oppd__step done`（两个 token），基础类还在，
                   所以布局正常、只有修饰符不命中；这一版基础类没了，
                   连 `.lx-oppd__step` 这条选择器都匹配不上 ——
                   浏览器实测该元素只匹配到 `* { box-sizing }`。
                   判据必须是**读元素实际 className** + **读 computedStyle的
                   flex-direction**，不能只看"class 里含不含 done"。 */
                const cls = state ? `lx-oppd__step ${`lx-oppd__step${state}`}` : 'lx-oppd__step';
                return (
                  <div key={step} className={cls} title={t(`cus.oppstage.${step}`)}>
                    <span className="lx-oppd__dot" aria-hidden="true" />
                    <span className="lx-oppd__index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="lx-oppd__label">{t(`cus.oppstage.${step}`)}</span>
                  </div>
                );
              })}
            </div>

            <div className={`lx-oppd__alert${followGap < 0 && isOpen ? ' lx-oppd__alert--danger' : ''}`}>
              <span>{t('opp.detail.alert.sla')}</span>
              <b>
                {intent.toUpperCase()} · {slaDays > 0 ? t('opp.detail.sla.days', { count: slaDays }) : t('opp.detail.sla.none')}
              </b>
              <span>{t('opp.detail.alert.followDue', { count: Math.abs(followGap) })}</span>
            </div>
          </section>

          <section className="lx-glass lx-oppd__block">
            {/* 段头动作撤下（2026-10-07）：「跟进」已搬到页头动作组。
                这里原先挂着一个同名按钮，于是同一页有两个「跟进」入口 ——
                用户点哪个、行为是否一致，全凭记忆；而分散的入口里
                那个不被常用的最终会变成"点了没反应"的那一个。 */}
            <LxSectionHeader
              title={t('opp.detail.section.follow')}
              sub={`${t('opp.detail.fact.lastFollow')} · ${row.lastFollowUp}`}
            />
            <div className="lx-oppd__timeline">
              <article className="lx-oppd__tlitem">
                <div className="lx-oppd__tltime">{row.lastFollowUp}</div>
                <div className="lx-oppd__tlbody">
                  <div className="lx-oppd__tlmeta">
                    <span>{t(view.ownerKey)}</span>
                    <span>{t('opp.detail.follow.next')} · {view.nextFollowUp}</span>
                  </div>
                  <p className="lx-oppd__tltext">{t(row.followSummaryKey)}</p>
                </div>
              </article>
            </div>
          </section>

          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.close')}</h3>
              <span className="lx-oppd__blocksub">{t('opp.detail.section.closeSub')}</span>
            </div>

            <dl className="lx-oppd__closerow">
              <dt>{t('opp.detail.close.will')}</dt>
              <dd>{t(STAGE_KIND[stage] === 'won' ? 'opp.detail.close.wonEffect' : 'opp.detail.close.lostEffect')}</dd>
            </dl>
            <p className="lx-oppd__prose">{t(stage === 'lost' ? 'opp.detail.close.lostNote' : 'opp.detail.close.wonNote')}</p>

            <div className="lx-oppd__alert">
              <span>{t('opp.detail.close.hint')}</span>
              {/* 关闭按钮搬到页头动作组（2026-10-07）。这里原本是它的落点，
                  段内只保留**后果说明**——「关闭与回流」这一段的价值恰恰是
                  "关掉会发生什么"，而那件事用户不该为了执行它而滚到这里。 */}
            </div>
          </section>
        </div>

        {/* ── 右栏：评估与归属 ───────────────────────────── */}
        <div className="lx-oppd__col">
          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.intent')}</h3>
              <span className="lx-oppd__blocksub">{t('opp.detail.section.intentSub')}</span>
            </div>
            {/* 三行都换成 flex 而非 `<dl>` 的两列 grid：`dt` 列是 `auto`，
                会被同行的下拉控件压到不足一个词宽，于是「意向等级」被折成两行
                （探针 WRAP=1，硬缺陷）。flex 行里标签 `flex-shrink:0` 才是硬约束，
                压不动 —— 这也正是 MEMORY §三「flex 行标题 nowrap + shrink:0」的由来。 */}
            <div className="lx-oppd__kvrow">
              {/* 意向等级：可编辑下拉。§2.4 的重评机制规定"重大变化即时更新"，
                  只读标签会让这条规则无处落地 —— 看到"已到重评档期"却改不了，
                  是本页原先最大的问题。已关闭商机置灰（意向不评已关闭）。 */}
              <span className="lx-oppd__kvlabel">{t('cus.col.intent')}</span>
              <select
                className="lx-form__control lx-oppd__edit"
                value={intent}
                disabled={intentLocked}
                aria-label={t('cus.col.intent')}
                onChange={(event) => {
                  const next = event.target.value as OppIntent;
                  setIntentOverride(next);
                  message.success(t('opp.detail.intentSet', { level: next.toUpperCase() }));
                }}
              >
                {(intentLocked ? [intent] : intentLevels).map((level) => (
                  <option key={level} value={level}>
                    {intentLocked ? t('opp.intent.closed') : t(`cus.intent.${level}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="lx-oppd__kvrow">
              <span className="lx-oppd__kvlabel">{t('opp.detail.intent.reviewAt')}</span>
              <span>{row.lastFollowUp}</span>
            </div>
            {/* 所处阶段：第二处可编辑入口（页头徽标是第一处）。
                两处同源同一个 `stage`，故不存在"页头说A、正文说 B"的可能。 */}
            <div className="lx-oppd__kvrow">
              <span className="lx-oppd__kvlabel">{t('opp.detail.intent.line')}</span>
              <span className={`lx-oppstage${CLOSE_TONE[stage] ? ` lx-oppstage--${CLOSE_TONE[stage]}` : ''}`}>
                {t(`cus.oppstage.${stage}`)}
              </span>
            </div>
            {/* 重评是§2.4 明文规定的动作，但演示数据没有"上次重评时间"字段，
                故只暴露规则与当前依据，不编一个日期出来。 */}
            <div className={`lx-oppd__alert${reevalDue ? ' lx-oppd__alert--warn' : ''}`}>
              <span>{t('opp.detail.reeval.rule')}</span>
              {needReeval ? (
                <b>{reevalDue ? t('opp.detail.reeval.due') : t('opp.detail.reeval.wait')}</b>
              ) : (
                <b>{t('opp.detail.reeval.none')}</b>
              )}
            </div>
          </section>

          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.bant')}</h3>
              <span className="lx-oppd__blocksub">{t('opp.detail.section.bantSub')}</span>
            </div>
            <p className="lx-oppd__prose" title={t(view.bantKey)}>
              {t(view.bantKey)}
            </p>
          </section>

          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.competition')}</h3>
              <span className="lx-oppd__blocksub">{t('opp.detail.section.competitionSub')}</span>
            </div>
            <p className="lx-oppd__prose" title={t(row.competitionKey)}>
              {t(row.competitionKey)}
            </p>
          </section>

          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">{t('opp.detail.section.customer')}</h3>
            </div>
            <button
              type="button"
              className="lx-oppd__custlink lx-focusable"
              onClick={() => void navigate(`/customer/360/${row.customerId}`)}
            >
              <span className="lx-oppd__custname">
                {row.customerName}
                <span className="lx-oppd__custmeta" style={{ display: 'block' }}>
                  {row.customerCode}
                </span>
              </span>
              <TeamOutlined aria-hidden="true" />
            </button>
          </section>
        </div>
      </div>

      {/* 编辑商机抽屉。字段清单与商机新建页共用 `./fields` 的同一份，
          阶段下拉按 `forwardStages` 收窄、已关闭时意向只剩当前值 ——
          两处守卫与页内那两个下拉完全一致（见 oppEditSections 的注释）。
          初值从 `view` 取（含已改过的阶段/意向），不写死 `row`，
          否则在页头改过阶段后打开抽屉会看到旧值、以为改动丢了。 */}
      <FormEditDrawer
        open={editing}
        onClose={() => setEditing(false)}
        titleKey="opp.detail.editTitle"
        subtitleKey="opp.detail.editSub"
        sections={oppEditSections(view, stageOptions, intentOptions, forwardStages(stage), t)}
        initialValues={oppEditValues(view, t)}
        submitLabelKey="opp.detail.editSubmit"
        submitHintKey="opp.detail.edited"
        onSubmit={(values) => setPatch(oppEditPatch(values, view, t, forwardStages(stage)))}
      />
    </PageContainer>
  );
}
