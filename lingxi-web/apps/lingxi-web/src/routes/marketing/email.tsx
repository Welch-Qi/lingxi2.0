import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Drawer, Input, Select } from 'antd';
import {
  MailOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { formatMoneyCompact } from '@lingxi/utils';
import {
  LxActionBar,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  MAIL_CAMPAIGNS,
  MAIL_PRESETS,
  bounceRate,
  clickRate,
  openRate,
  rateText,
  sumVariants,
  type MailCampaign,
  type MailStatus,
} from './email-data';

/**
 * 邮件营销（/marketing/email）—— §2.8「邮件与 WhatsApp 触达」的邮件部分。
 *
 * 典型使用者：外贸营销专员。她这一页要看的不是"这周发了几封"，
 * 而是"这几封有没有到人手里、人有没有点、点进去有没有成交"。
 *
 * 本页结构：
 *   ① 操作入口 —— 新建活动（主）+ AI 写信（AI 写信能力）
 *   ② 四个大盘指标 —— 送达 / 打开 / 退信 / 归因金额
 *   ③ 活动表 —— 主题行、受众、漏斗三段、金额、状态
 *   ④ 右栏 —— 主题 A/B 对照 + 退信预警
 *
 * 右栏两块的取舍标准是一样的：**它们都是"要动手的"而不是"要知道的"**。
 * 主题对照让人决定下一封用哪个标题，退信预警让人去清列表或查域名信誉。
 * 若把它们做成纯展示卡片，"数据大盘"就只剩好看，不产生任何动作。
 *
 * 退信率用红色胶囊而不是绿色：退信是唯一的"纯负面"指标
 * （打开高、点击高都是好事，退信高一定坏），所以它的涨跌方向与其余相反。
 */

const STATUS_VARIANT: Record<MailStatus, LxTagVariant> = {
  sending: 'producing',
  sent: 'done',
  draft: 'lang',
  paused: 'review',
};

/** 退信率的告警线：超过这条线就不是文案问题，是列表质量或域名信誉问题。 */
const BOUNCE_ALERT = 3;

export default function MarketingEmailPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
  const [preset, setPreset] = useState(MAIL_PRESETS[0].key);

  const money = (amountMinor: number) =>
    formatMoneyCompact(amountMinor, 'USD', i18n.language);

  const rows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) {
      return MAIL_CAMPAIGNS;
    }
    return MAIL_CAMPAIGNS.filter((campaign) =>
      (
        t(`mkg.mail.name.${campaign.nameKey}`) +
        ' ' +
        t(`mkg.mail.subject.${campaign.variants[0].subjectKey}`) +
        ' ' +
        t(`mkg.mail.subject.${campaign.variants[1].subjectKey}`)
      )
        .toLowerCase()
        .includes(needle),
    );
  }, [keyword, t]);

  const funnel = (campaign: MailCampaign) => sumVariants(campaign.variants);

  const sent = MAIL_CAMPAIGNS.filter((campaign) => campaign.status === 'sent');
  const totalDelivered = sent.reduce((sum, campaign) => sum + funnel(campaign).delivered, 0);
  const avgOpen =
    sent.length === 0
      ? 0
      : sent.reduce((sum, campaign) => sum + openRate(funnel(campaign)), 0) / sent.length;
  const avgBounce =
    sent.length === 0
      ? 0
      : sent.reduce((sum, campaign) => sum + bounceRate(funnel(campaign)), 0) / sent.length;
  const totalAmount = MAIL_CAMPAIGNS.reduce((sum, campaign) => sum + campaign.amountMinor, 0);

  /** 主题 A/B 对照：按「B − A」的差值绝对值排序，差距最大的排最前（最值得拿来看）。 */
  const abPairs = sent
    .map((campaign) => {
      const [a, b] = campaign.variants;
      return {
        campaign,
        aOpen: openRate(a),
        bOpen: openRate(b),
        delta: Math.round((openRate(b) - openRate(a)) * 10) / 10,
      };
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const bouncy = MAIL_CAMPAIGNS.filter((campaign) => bounceRate(funnel(campaign)) > BOUNCE_ALERT)
    .sort((a, b) => bounceRate(funnel(b)) - bounceRate(funnel(a)));

  /** 没发出去的（草稿 / 发送中）漏斗全是 0，展示 0.0% 会被读成"效果为零"。 */
  const funnelText = (value: number) => (value === 0 ? '—' : rateText(value));
  const show = (value: number) => (value === 0 ? '—' : value.toLocaleString(i18n.language));

  const columns = [
    {
      title: t('mkg.mail.col.name'),
      dataIndex: 'nameKey',
      key: 'name',
      width: '17%',
      render: (value: string, row: MailCampaign) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{t(`mkg.mail.name.${value}`)}</div>
          <div className="lx-cell-code">{row.id}</div>
        </div>
      ),
    },
    {
      title: t('mkg.mail.col.subject'),
      key: 'subject',
      width: '23%',
      render: (_v: unknown, row: MailCampaign) => (
        <span className="lx-cell-text">
          <span className="lx-cell-title">
            A. {t(`mkg.mail.subject.${row.variants[0].subjectKey}`)}
          </span>
          <span className="lx-cell-code">
            B. {t(`mkg.mail.subject.${row.variants[1].subjectKey}`)}
          </span>
        </span>
      ),
    },
    {
      title: t('mkg.mail.col.audience'),
      dataIndex: 'audience',
      key: 'audience',
      width: '11%',
      render: (value: MailCampaign['audience']) => t(`mkg.mail.audience.${value}`),
    },
    {
      title: t('mkg.mail.col.size'),
      dataIndex: 'audienceSize',
      key: 'size',
      width: '8%',
      render: (value: number) => <span className="lx-num">{show(value)}</span>,
    },
    {
      title: t('mkg.mail.col.delivered'),
      key: 'delivered',
      width: '8%',
      render: (_v: unknown, row: MailCampaign) => (
        <span className="lx-num">
          {funnel(row).delivered === 0 ? '—' : funnel(row).delivered.toLocaleString(i18n.language)}
        </span>
      ),
    },
    {
      title: t('mkg.mail.col.open'),
      key: 'open',
      width: '8%',
      render: (_v: unknown, row: MailCampaign) => (
        <span className="lx-num">{funnelText(openRate(funnel(row)))}</span>
      ),
    },
    {
      title: t('mkg.mail.col.click'),
      key: 'click',
      width: '8%',
      render: (_v: unknown, row: MailCampaign) => (
        <span className="lx-num">{funnelText(clickRate(funnel(row)))}</span>
      ),
    },
    {
      title: t('mkg.mail.col.amount'),
      dataIndex: 'amountMinor',
      key: 'amount',
      width: '9%',
      render: (value: number) => (
        <span className="lx-num">{value === 0 ? '—' : money(value)}</span>
      ),
    },
    {
      title: t('mkg.mail.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '8%',
      render: (value: MailStatus) => (
        <LxTag variant={STATUS_VARIANT[value]}>{t(`mkg.mail.status.${value}`)}</LxTag>
      ),
    },
  ];

  return (
    <PageContainer titleKey="mkg.mail.page" subtitleKey="mkg.mail.pageSub">
      <LxActionBar
        primary={{
          key: 'create',
          label: t('mkg.mail.bar.create'),
          icon: <PlusOutlined />,
          onClick: () => {
            message.success(t('mkg.mail.bar.createHint'));
          },
        }}
        items={[
          {
            key: 'aiWrite',
            label: t('mkg.mail.bar.aiWrite'),
            icon: <ThunderboltOutlined />,
            onClick: () => setDraftOpen(true),
          },
        ]}
        note={t('mkg.mail.note')}
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.mail.kpi.delivered')}
          value={show(totalDelivered)}
          sub={t('mkg.mail.kpi.deliveredSub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.mail.kpi.open')}
          value={rateText(avgOpen)}
          sub={t('mkg.mail.kpi.openSub')}
          trend={avgOpen >= 20 ? 'up' : 'dn'}
          delta={`${rateText(avgOpen)} / ${rateText(20)}`}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.mail.kpi.bounce')}
          value={rateText(avgBounce)}
          sub={t('mkg.mail.kpi.bounceSub')}
          trend={avgBounce > BOUNCE_ALERT ? 'up' : 'dn'}
          delta={`${rateText(avgBounce)} / ${BOUNCE_ALERT.toFixed(1)}%`}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.mail.kpi.amount')}
          value={totalAmount === 0 ? '—' : money(totalAmount)}
          sub={t('mkg.mail.kpi.amountSub')}
          color="secondary"
          size="sm"
        />
      </div>

      <div className="lx-mkgmail__body">
        <section className="lx-glass lx-panel">
          <LxSectionHeader
            title={t('mkg.mail.section.campaigns')}
            sub={t('mkg.mail.section.campaignsSub')}
          />
          <LxTableCard
            tools={
              <LxSearchInput
                value={keyword}
                placeholder={t('mkg.mail.search')}
                onChange={setKeyword}
              />
            }
          >
            <LxTable
              fit
              columns={columns}
              dataSource={[...rows]}
              total={rows.length}
              pageNo={1}
              pageSize={20}
            />
          </LxTableCard>
        </section>

        <aside className="lx-glass lx-panel lx-mkgmail__side">
          <LxSectionHeader title={t('mkg.mail.ab.title')} sub={t('mkg.mail.ab.sub')} />
          <ul className="lx-mkgmail__ablist">
            {abPairs.map(({ campaign, aOpen, bOpen, delta }) => (
              <li key={campaign.id} className="lx-mkgmail__abitm">
                <span className="lx-mkgmail__abhead">
                  <span className="lx-mkgmail__abname">{t(`mkg.mail.name.${campaign.nameKey}`)}</span>
                  {/* B 赢了是"下次照这个写"的结论，用主色强调；B 输了保持灰，− 号自己会说话 */}
                  <span className={`lx-num lx-mkgmail__abdelta${delta > 0 ? ' is-up' : ''}`}>
                    B {delta >= 0 ? '+' : '−'}
                    {Math.abs(delta).toFixed(1)}
                  </span>
                </span>
                <span className="lx-mkgmail__abrow">
                  A · {t(`mkg.mail.subject.${campaign.variants[0].subjectKey}`)}
                  <i className="lx-num">{rateText(aOpen)}</i>
                </span>
                <span className="lx-mkgmail__abrow">
                  B · {t(`mkg.mail.subject.${campaign.variants[1].subjectKey}`)}
                  <i className="lx-num">{rateText(bOpen)}</i>
                </span>
              </li>
            ))}
          </ul>

          <LxSectionHeader title={t('mkg.mail.bounce.title')} sub={t('mkg.mail.bounce.sub')} />
          {bouncy.length === 0 ? (
            <p className="lx-mkgmail__hint">{t('mkg.mail.bounce.empty')}</p>
          ) : (
            <ul className="lx-mkgmail__bouncelist">
              {bouncy.map((campaign) => {
                const rate = bounceRate(funnel(campaign));
                return (
                  <li key={campaign.id} className="lx-mkgmail__bounceitem">
                    <span className="lx-mkgmail__bouncehead">
                      <span className="lx-mkgmail__bouncename">
                        {t(`mkg.mail.name.${campaign.nameKey}`)}
                      </span>
                      <span className="lx-num lx-mkgmail__bouncerate">{rateText(rate)}</span>
                    </span>
                    <span className="lx-mkgmail__bouncetrack">
                      <i style={{ width: `${Math.min(rate * 10, 100)}%` }} />
                    </span>
                    <button
                      type="button"
                      className="lx-mkgmail__bouncebtn lx-focusable"
                      onClick={() => {
                        message.info(t('mkg.mail.bounce.action'));
                      }}
                    >
                      <MailOutlined />
                      {t('mkg.mail.bounce.clean')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {/* AI 写信：只出草稿，不代发 —— 对外内容必须人审（技术规约 2.0 §3.6 G4，自主度 ≤A1）。 */}
      <Drawer
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title={t('mkg.mail.draft.title')}
        width={560}
        destroyOnHidden
      >
        <div className="lx-mkgmail__draft">
          <span className="lx-mkgmail__draftlabel">{t('mkg.mail.draft.scene')}</span>
          <Select
            value={preset}
            onChange={setPreset}
            style={{ width: '100%' }}
            options={MAIL_PRESETS.map((item) => ({
              value: item.key,
              label: t(`mkg.mail.preset.${item.key}`),
            }))}
          />
          <span className="lx-mkgmail__drafthint">{t('mkg.mail.draft.hint')}</span>
          <Input.TextArea
            className="lx-mkgmail__drafttext"
            rows={10}
            value={t(`mkg.mail.draft.body.${preset}`)}
            readOnly
          />
          <button
            type="button"
            className="lx-mkgmail__draftbtn lx-focusable"
            onClick={() => {
              setDraftOpen(false);
              message.success(t('mkg.mail.draft.done'));
            }}
          >
            <ThunderboltOutlined />
            {t('mkg.mail.draft.use')}
          </button>
        </div>
      </Drawer>
    </PageContainer>
  );
}
