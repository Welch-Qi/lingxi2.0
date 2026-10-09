import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTag } from '@lingxi/ui';
import { App } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { INTENT_SLA_DAYS } from '@/routes/customer/data';
import type { OppIntent, OppStage } from '@/routes/customer/data';
import { CLOSE_TONE, OPPORTUNITY_ROWS, OPP_TODAY, forwardStages, isClosedStage } from './data';
import type { OpportunityRow } from './data';
import { INTENT_TAG, useIntentOptions } from './options';
import { findFollowRecords, type FollowMode, type FollowRecord } from './follow-data';

/**
 * 商机跟进记录（`/opportunity/:id/follow`）—— 商机详情「跟进」按钮的去处。
 *
 * 为什么需要这一页：详情页回答"这条单子现在怎么样"，跟进记录回答"凭什么这么说"。
 * 销售写跟进时脑子里同时有三件事：**这次谈了什么**（小结）、**下一步是什么**
 * （下次跟进时间）、**这单还值不值得投时间**（意向等级 + 阶段）。
 * 三件事在一条记录里同时落地，才叫"记了一次跟进"；拆成三处就是让人填三遍。
 * 详情页的跟进按钮原先只弹一句message，是"点了没处去"——本页就是那个去处。
 *
 * 版式与录入页对齐（`lx-form--compact` 4 列栅格 + 「标签上·控件下」）：
 * 用户对本轮三个录入页提的"信息不够集中"是同一个诉求，跟进表单是同一类表单，
 * 不能在同一产品里做两种密度。故本页复用 `.lx-form` 骨架而非自造一套。
 *
 * **两处业务口径不能被"能编辑"破坏**：
 *   ① **意向等级只评未关闭商机** —— 已关闭（含本页的流失关闭）时等级不可改，
 *     显示"不评估"；这是 §3.6 的明文口径，不是保守。
 *   ② **阶段只能沿轨道前进或直接流失关闭** —— 不给"从商务谈判退回首触"，
 *      商机阶段是过程事实，退回等于把谈过的事当没谈过。
 *
 * 提交只反馈不落库：演示态改的是本页本地 state（与详情页「关闭」同一处置），
 * 数据层`follow-data.ts` 保持只读，接入后走 POST /api/v1/cus/follow-ups。
 */

/** 跟进方式选项（与 `follow-data.ts` 的 `MODE_CYCLE` 同一组，不在这里另立一套）。 */
const MODE_OPTIONS: readonly { value: FollowMode; labelKey: string }[] = [
  { value: 'call', labelKey: 'opp.follow.mode.call' },
  { value: 'visit', labelKey: 'opp.follow.mode.visit' },
  { value: 'email', labelKey: 'opp.follow.mode.email' },
  { value: 'meeting', labelKey: 'opp.follow.mode.meeting' },
];

export default function OpportunityFollowPage() {
  const { t } = useTranslation();
  /** 意向等级选项：从业务字典派生（顺序与启用状态在配置中心可调）。 */
  const intentOptions = useIntentOptions();
  const { message } = App.useApp();
  const { id } = useParams();
  const navigate = useNavigate();

  const row: OpportunityRow | undefined = useMemo(
    () => OPPORTUNITY_ROWS.find((item) => item.id === id),
    [id],
  );

  /** 新记录的字段（演示态 local state，不回写数据层）。 */
  const [mode, setMode] = useState<FollowMode>('call');
  const [intent, setIntent] = useState<OppIntent>(row?.intent ?? 'b');
  const [stage, setStage] = useState<OppStage>(row?.stage ?? 'first');
  const [summary, setSummary] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(row?.nextFollowUp ?? OPP_TODAY);
  /** 本页新增的记录：插在最前，与 `findFollowRecords` 的倒序一致。 */
  const [added, setAdded] = useState<readonly FollowRecord[]>([]);

  if (!row) {
    return (
      <PageContainer titleKey="opp.follow.title" hideTitle>
        <div className="lx-oppd__topbar">
          <button
            type="button"
            className="lx-oppd__back lx-focusable"
            onClick={() => void navigate('/opportunity')}
          >
            <ArrowLeftOutlined />
            {t('opp.follow.back')}
          </button>
        </div>
        <section className="lx-glass lx-panel">
          <LxSectionHeader title={t('opp.follow.title')} />
          <p className="lx-oppd__prose">{t('opp.detail.missing')}</p>
        </section>
      </PageContainer>
    );
  }

  const history = [...added, ...findFollowRecords(row.id)];
  const closed = isClosedStage(stage);
  const slaDays = INTENT_SLA_DAYS[intent];
  const stageOptions = forwardStages(row.stage);

  const submit = () => {
    if (summary.trim() === '') {
      message.warning(t('opp.follow.needSummary'));
      return;
    }
    const record: FollowRecord = {
      id: `${row.id}-NEW${added.length + 1}`,
      oppId: row.id,
      date: OPP_TODAY,
      mode,
      ownerKey: row.ownerKey,
      stage,
      // 小结存原文而非 key：这是销售手写的数据，不进语言包（en 值禁中文检查会挡）。
      summaryText: summary.trim(),
      nextFollowUp,
    };
    setAdded((prev) => [record, ...prev]);
    setSummary('');
    message.success(t('opp.follow.saved', { count: history.length + 1 }));
  };

  return (
    <PageContainer titleKey="opp.follow.title" hideTitle>
      {/* 返回商机详情 —— 跟进记录是详情的一个下钻，不是独立目的地。 */}
      <div className="lx-oppd__topbar">
        <button
          type="button"
          className="lx-oppd__back lx-focusable"
          onClick={() => void navigate(`/opportunity/${row.id}`)}
        >
          <ArrowLeftOutlined />
          {t('opp.follow.backDetail')}
        </button>
      </div>

      {/* 页头：这条单子是谁的、现在什么状态、这次跟进要落在什么判断上。 */}
      <section className="lx-glass lx-oppd__hero">
        <div className="lx-oppd__head">
          <div className="lx-oppd__idblock">
            <h2 className="lx-oppd__name">{row.name}</h2>
            <div className="lx-oppd__tags">
              <span
                className={`lx-oppstage${CLOSE_TONE[stage] ? ` lx-oppstage--${CLOSE_TONE[stage]}` : ''}`}
              >
                {t(`cus.oppstage.${stage}`)}
              </span>
              {closed ? (
                <span className="lx-muted">{t('opp.intent.closed')}</span>
              ) : (
                <LxTag variant={INTENT_TAG[intent]}>{t(`cus.intent.${intent}`)}</LxTag>
              )}
              <span className="lx-oppd__tagsub">
                {t('opp.detail.code')} · {row.code}
              </span>
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
            </div>
          </div>
          <div className="lx-oppd__actions">
            <span className="lx-oppd__slatag">
              {slaDays > 0 ? t('opp.detail.sla.days', { count: slaDays }) : t('opp.detail.sla.none')}
            </span>
          </div>
        </div>
      </section>

      <div className="lx-oppd__body">
        {/* ── 左栏：记一次跟进 ───────────────────────────── */}
        <div className="lx-oppd__col">
          <section className="lx-glass lx-panel lx-form lx-form--compact lx-oppf__new">
            <LxSectionHeader title={t('opp.follow.sec.record')} sub={t('opp.follow.sec.recordSub')} />

            <div className="lx-form__grid">
              <div className="lx-field">
                <label className="lx-field__label" htmlFor="f-mode">
                  {t('opp.follow.field.mode')}
                  <b className="lx-field__required">*</b>
                </label>
                <select
                  id="f-mode"
                  className="lx-form__control"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as FollowMode)}
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lx-field">
                <label className="lx-field__label" htmlFor="f-intent">
                  {t('cus.col.intent')}
                </label>
                {/* 已关闭商机不评意向（§3.6 口径）—— 置灰并回落到"不评估"文案 */}
                <select
                  id="f-intent"
                  className="lx-form__control"
                  value={intent}
                  disabled={closed}
                  onChange={(event) => setIntent(event.target.value as OppIntent)}
                >
                  {closed ? (
                    <option value={intent}>{t('opp.intent.closed')}</option>
                  ) : (
                    intentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))
                  )}
                </select>
                <span className="lx-field__hint">{t('opp.follow.hint.intent')}</span>
              </div>

              <div className="lx-field">
                <label className="lx-field__label" htmlFor="f-stage">
                  {t('opp.col.stage')}
                  <b className="lx-field__required">*</b>
                </label>
                <select
                  id="f-stage"
                  className="lx-form__control"
                  value={stage}
                  onChange={(event) => setStage(event.target.value as OppStage)}
                >
                  {stageOptions.map((option) => (
                    <option key={option} value={option}>
                      {t(`cus.oppstage.${option}`)}
                    </option>
                  ))}
                </select>
                <span className="lx-field__hint">{t('opp.follow.hint.stage')}</span>
              </div>

              <div className="lx-field">
                <label className="lx-field__label" htmlFor="f-next">
                  {t('opp.detail.fact.nextFollow')}
                </label>
                <input
                  id="f-next"
                  className="lx-form__control"
                  type="date"
                  value={nextFollowUp}
                  onChange={(event) => setNextFollowUp(event.target.value)}
                />
                <span className="lx-field__hint">{t('opp.follow.hint.next')}</span>
              </div>

              <div className="lx-field lx-field--wide">
                <label className="lx-field__label" htmlFor="f-summary">
                  {t('opp.follow.field.summary')}
                  <b className="lx-field__required">*</b>
                </label>
                <textarea
                  id="f-summary"
                  className="lx-form__control"
                  rows={3}
                  value={summary}
                  placeholder={t('opp.follow.ph.summary')}
                  onChange={(event) => setSummary(event.target.value)}
                />
                <span className="lx-field__hint">{t('opp.follow.hint.summary')}</span>
              </div>
            </div>

            <div className="lx-form__foot">
              <button type="button" className="lx-form__submit lx-focusable" onClick={submit}>
                {t('opp.follow.submit')}
              </button>
            </div>
          </section>
        </div>

        {/* ── 右栏：跟进历史 ─────────────────────────────── */}
        <div className="lx-oppd__col">
          <section className="lx-glass lx-oppd__block">
            <div className="lx-oppd__blockhead">
              <h3 className="lx-oppd__blocktitle">
                <HistoryOutlined aria-hidden="true" /> {t('opp.follow.sec.history')}
              </h3>
              <span className="lx-oppd__blocksub">{t('opp.follow.sec.historySub', { count: history.length })}</span>
            </div>

            <div className="lx-oppd__timeline">
              {history.map((record) => (
                <article key={record.id} className="lx-oppd__tlitem">
                  <div className="lx-oppd__tltime">
                    {record.date}
                    <span className="lx-oppf__tlmode">{t(`opp.follow.mode.${record.mode}`)}</span>
                  </div>
                  <div className="lx-oppd__tlbody">
                    <div className="lx-oppd__tlmeta">
                      <span>{t(record.ownerKey)}</span>
                      <span>{t(`cus.oppstage.${record.stage}`)}</span>
                      <span>
                        {t('opp.detail.follow.next')} · {record.nextFollowUp}
                      </span>
                    </div>
                    <p className="lx-oppd__tltext">
                      {record.summaryText ?? t(record.summaryKey ?? 'opp.follow.log.first')}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}