import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { App } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTag, type LxTagVariant } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  CAMPAIGN_STAGES,
  findCampaign,
  nextStatus,
  type CampaignStatus,
} from './campaign-data';

/**
 * 营销中心 · 活动详情（/marketing/campaigns/:id）—— SCRM 02.3/02.4 配置与生命周期。
 *
 * 活动运营总监进来要同时看三件事：现在卡在哪段（生命周期时间线）、当初怎么配的
 * （目标/预算/渠道/素材）、下一步往哪推（推进阶段）。本页把这三件并排给全。
 *
 * 生命周期状态机：草稿 → 待审核 → 进行中 → 已结束。"推进阶段"按钮按状态机前进，
 * 已结束则禁用——避免"已结束的活动又被推进"这种状态机破坏。
 *
 * 文案一律走 i18n key；演示数据在 ./campaign-data，接入后走 /api/v1/mkg/campaigns/:id。
 */

const STATUS_TAG: Record<CampaignStatus, LxTagVariant> = {
  draft: 'graphic',
  review: 'review',
  running: 'producing',
  ended: 'done',
};

export default function MarketingCampaignDetailPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const campaign = useMemo(() => (id ? findCampaign(id) : undefined), [id]);
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'draft');

  if (!campaign) {
    return (
      <PageContainer titleKey="mkg.campaign.detailTitle" subtitleKey="mkg.campaign.detailSub">
        <p className="lx-muted">404</p>
      </PageContainer>
    );
  }

  const currentIndex = CAMPAIGN_STAGES.indexOf(status);
  const isEnded = status === 'ended';

  const advance = () => {
    const next = nextStatus(status);
    if (next === status) {
      return;
    }
    setStatus(next);
    message.success(t('mkg.campaign.detail.advanceDone', { stage: t(`mkg.campaign.status.${next}`) }));
  };

  const facts: { label: string; value: string }[] = [
    { label: t('mkg.campaign.detail.goal'), value: t(campaign.goalKey) },
    { label: t('mkg.campaign.detail.budget'), value: `${campaign.budget} / ${campaign.gmv}` },
    { label: t('mkg.campaign.detail.period'), value: `${campaign.start} ~ ${campaign.end}` },
    { label: t('mkg.campaign.detail.channels'), value: campaign.channels.map((c) => t(c)).join(' · ') },
    { label: t('mkg.campaign.detail.materials'), value: String(campaign.materials) },
    { label: t('mkg.campaign.detail.products'), value: String(campaign.products) },
  ];

  return (
    <PageContainer titleKey="mkg.campaign.detailTitle" subtitleKey="mkg.campaign.detailSub">
      <div className="lx-form__top">
        <button
          type="button"
          className="lx-chip lx-form__back lx-focusable"
          onClick={() => void navigate('/marketing/campaigns')}
        >
          <ArrowLeftOutlined />
          {t('mkg.campaign.menu')}
        </button>
      </div>

      <header className="lx-mkgcamp__head lx-glass lx-panel">
        <div className="lx-mkgcamp__headmain">
          <h2 className="lx-mkgcamp__name">{t(campaign.nameKey)}</h2>
          <span className="lx-mkgcamp__id lx-num">{campaign.id}</span>
          <LxTag variant={STATUS_TAG[status]}>{t(`mkg.campaign.status.${status}`)}</LxTag>
        </div>
        <div className="lx-mkgcamp__headmeta">
          <span>
            <b>{campaign.ownerKey ? t(campaign.ownerKey) : '—'}</b>
            <i>{t('mkg.campaign.col.owner')}</i>
          </span>
          <span>
            <b className="lx-num">{campaign.participants.toLocaleString()}</b>
            <i>{t('mkg.campaign.kpi.participants')}</i>
          </span>
          <span>
            <b className="lx-num">{campaign.budget}</b>
            <i>{t('mkg.campaign.col.budget')}</i>
          </span>
          <button
            type="button"
            className="lx-mkgcamp__advance lx-focusable"
            disabled={isEnded}
            onClick={advance}
          >
            <CheckOutlined />
            {t('mkg.campaign.detail.advance')}
          </button>
        </div>
      </header>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.campaign.detail.timeline')} sub={t('mkg.campaign.lifecycleSub')} />
        <div className="lx-mkgcamp__timeline">
          {CAMPAIGN_STAGES.map((stage, index) => {
            const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'todo';
            return (
              <div key={stage} className={`lx-mkgcamp__step lx-mkgcamp__step--${state}`}>
                <span className="lx-mkgcamp__dot">{index < currentIndex ? <CheckOutlined /> : index + 1}</span>
                <span className="lx-mkgcamp__steplabel">{t(`mkg.campaign.stage.${stage}`)}</span>
                {index < CAMPAIGN_STAGES.length - 1 ? <span className="lx-mkgcamp__connector" /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.campaign.detail.config')} />
        <div className="lx-mkgcamp__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="lx-mkgcamp__fact lx-glass lx-panel">
              <span className="lx-mkgcamp__factlabel">{fact.label}</span>
              <span className="lx-mkgcamp__factvalue">{fact.value}</span>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
