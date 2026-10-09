import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PlusOutlined } from '@ant-design/icons';
import {
  LxActionBar,
  LxKpi,
  LxSearchInput,
  LxStageBoard,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  type LxTagVariant,
  type LxStage,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { formatMoneyCompact } from '@lingxi/utils';
import { CAMPAIGNS, CAMPAIGN_TODAY, campaignKpi, type Campaign, type CampaignStatus, type CampaignType } from './campaign-data';

/**
 * 营销中心 · 活动管理列表（/marketing/campaigns）—— SCRM 02 活动管理。
 *
 * 典型使用者：活动运营总监。他打开页面的第一问是"卡在哪一段"与"哪些在进行"，
 * 因此首屏是生命周期看板（草稿/待审核/进行中/已结束），点一段即筛下方列表；
 * 看板下方是活动总表。
 *
 * 生命周期状态机（02.4.1）：草稿 → 待审核 → 进行中 → 已结束，驳回可重新提交。
 * 看板用不同 tone 表达业务口径：进行中=success（绿，进行中）、待审核=accent（黄，待办）、
 * 草稿/已结束=中性。
 *
 * 文案一律走 i18n key；演示数据在 ./campaign-data，接入后走 /api/v1/mkg/campaigns。
 */

const STATUS_TAG: Record<CampaignStatus, LxTagVariant> = {
  draft: 'graphic',
  review: 'review',
  running: 'producing',
  ended: 'done',
};

/** 类型不表达好坏，用中性灰胶囊（`graphic` 变体）。 */
const TYPE_TAG: Record<CampaignType, LxTagVariant> = {
  launch: 'graphic',
  activate: 'graphic',
  convert: 'graphic',
  brand: 'graphic',
};

const STAGE_ORDER: readonly { key: CampaignStatus; tone?: LxStage['tone'] }[] = [
  { key: 'draft' },
  { key: 'review', tone: 'accent' },
  { key: 'running', tone: 'success' },
  { key: 'ended' },
];

export default function MarketingCampaignsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<CampaignStatus | null>(null);

  /**
   * 生命周期看板与四张指标卡**必须同源**（2026-10-07 第二十轮）。
   * 此前看板用本地 `counts`、指标卡另算一遍，两处各数一次 CAMPAIGNS ——
   * 改数据时容易只改一处，于是「看板说 2 场进行中、卡片说 1 场」。
   * 现统一取数据层派生点 `campaignKpi()`。
   */
  const kpi = useMemo(() => campaignKpi(CAMPAIGN_TODAY), []);

  const stages: readonly LxStage[] = STAGE_ORDER.map((stage) => ({
    key: stage.key,
    label: t(`mkg.campaign.stage.${stage.key}`),
    count: kpi.byStatus[stage.key],
    tone: stage.tone,
  }));

  const visibleRows = CAMPAIGNS.filter((campaign) => {
    if (stageFilter && campaign.status !== stageFilter) {
      return false;
    }
    if (keyword) {
      const haystack = `${t(campaign.nameKey)} ${campaign.id} ${t(campaign.goalKey)}`.toLowerCase();
      if (!haystack.includes(keyword.trim().toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const columns = [
    {
      title: t('mkg.campaign.col.name'),
      dataIndex: 'nameKey',
      key: 'name',
      width: '22%',
      render: (_v: string, row: Campaign) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{t(row.nameKey)}</div>
          <div className="lx-cell-code">{row.id}</div>
        </div>
      ),
    },
    {
      title: t('mkg.campaign.col.type'),
      dataIndex: 'type',
      key: 'type',
      width: '11%',
      render: (value: CampaignType) => <LxTag variant={TYPE_TAG[value]}>{t(`mkg.campaign.type.${value}`)}</LxTag>,
    },
    {
      title: t('mkg.campaign.col.goal'),
      dataIndex: 'goalKey',
      key: 'goal',
      width: '15%',
      render: (value: string) => <span className="lx-muted">{t(value)}</span>,
    },
    {
      title: t('mkg.campaign.col.budget'),
      dataIndex: 'budget',
      key: 'budget',
      width: '11%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('mkg.campaign.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '11%',
      render: (value: CampaignStatus) => (
        <LxTag variant={STATUS_TAG[value]}>{t(`mkg.campaign.status.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.campaign.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '11%',
      render: (value: string) => t(value),
    },
    {
      title: t('mkg.campaign.col.period'),
      dataIndex: 'start',
      key: 'period',
      width: '11%',
      render: (_v: string, row: Campaign) => (
        <span className="lx-muted lx-num">
          {row.start.slice(5)} ~ {row.end.slice(5)}
        </span>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: '8%',
      render: (_v: string, row: Campaign) => (
        <>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => void navigate(`/marketing/campaigns/${row.id}`)}
          >
            {t('mkg.action.trace')}
          </button>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            /* 编辑必须带 id：新建页据此切到编辑态并预填这条活动（否则打开的是空白新建表单）。 */
            onClick={() => void navigate(`/marketing/campaigns/new?id=${row.id}`)}
          >
            {t('mkg.action.edit')}
          </button>
        </>
      ),
    },
  ];

  return (
    <PageContainer titleKey="mkg.campaign.page" hideTitle>
      <LxActionBar
        primary={{
          key: 'create',
          label: t('mkg.campaign.bar.create'),
          icon: <PlusOutlined />,
          onClick: () => void navigate('/marketing/campaigns/new'),
        }}
        note={t('mkg.campaign.pageSub')}
      />

      {/* 四张指标卡：**必须一行**（2026-10-07 第二十轮）。
          此前用 `lx-grid--kpi-4`，而它在 `lingxi-ui.css` 的 `≤1100px` 断点降为
          **2 列** —— 于是在 1280/1366 这两个最常见的视口下，四张卡排成两行，
          把下面的生命周期看板顶到第二屏。用户报的就是这个。

          修法有两种：改全局断点，或本页显式覆盖。**选后者**：
          `lx-grid--kpi-4` 是全站共用的类，降它的断点会让工作台、商品中心等
          同样用这个类的页面一起变宽 —— 那些页面的卡片内容更长（带涨跌胶囊、
          副标题两行），4 列在窄屏上会挤成两行文字。

          指标口径全部来自 `campaignKpi()`（数据层唯一派生点）：
          进行中 / 待审核 / 本月 GMV / 参与人数。此前 GMV 那张是写死的 `€510K`，
          与数据无关 —— 四张卡里有一张是常量，看起来是指标其实不会动。 */}
      <div className="lx-grid lx-grid--kpi-4 lx-mkgkpi">
        <LxKpi
          label={t('mkg.campaign.kpi.active')}
          value={String(kpi.running)}
          sub={t('mkg.campaign.kpi.activeSub')}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.campaign.kpi.review')}
          value={String(kpi.review)}
          sub={t('mkg.campaign.kpi.reviewSub')}
          trend={kpi.review > 0 ? 'up' : 'fl'}
          delta={kpi.review > 0 ? '!' : '0'}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.campaign.kpi.gmv')}
          value={formatMoneyCompact(kpi.monthGmvMinor, 'EUR', i18n.language)}
          sub={t('mkg.campaign.kpi.gmvSub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.campaign.kpi.participants')}
          value={kpi.participants.toLocaleString(i18n.language)}
          sub={t('mkg.campaign.kpi.participantsSub')}
          color="violet"
          size="sm"
        />
      </div>

      <LxStageBoard
        stages={stages}
        caption={t('mkg.campaign.lifecycleSub')}
        activeKey={stageFilter ?? undefined}
        onSelect={(key) => setStageFilter((prev) => (prev === key ? null : (key as CampaignStatus)))}
      />

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.campaign.listTitle')} sub={t('mkg.campaign.listSub')} />
        <LxTableCard
          tools={
            <LxSearchInput value={keyword} placeholder={t('mkg.campaign.search')} onChange={setKeyword} />
          }
        >
          <LxTable<Campaign>
            fit
            columns={columns}
            dataSource={[...visibleRows]}
            total={visibleRows.length}
            pageNo={1}
            pageSize={20}
            onRow={(row) => ({
              onClick: () => void navigate(`/marketing/campaigns/${row.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
