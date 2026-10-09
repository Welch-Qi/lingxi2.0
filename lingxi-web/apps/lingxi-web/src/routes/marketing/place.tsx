import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App, Drawer } from 'antd';
import { LineChartOutlined, RocketOutlined } from '@ant-design/icons';
import {
  LxKpi,
  LxRankList,
  LxSearchInput,
  LxSectionHeader,
  LxTag,
  LxTable,
  LxTableCard,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { PLACE_DETAILS, type DetailRow } from './place-data';

/**
 * 营销中心 · 投放管理（/marketing/place）—— 三段流水线的第三段（产品规划说明书 V2.1 §2.8）。
 *
 * 典型使用者：投放负责人。他关心的是"钱花得值不值"，所以本页与分发段的分界很清楚：
 * 分发段回答"发出去了没有"，这一段回答"换回来多少" —— 不重复展示触达，
 * 只在渠道排行里保留"触达 → 线索"这一条最基础的漏斗。
 *
 * 本页结构：
 *   ① 投放 KPI —— 进行中的活动数、预算执行率、平均 ROAS、本期线索
 *   ② 活动卡 —— 预算消耗进度 + 计划预算 + ROAS + 状态，点「查看投放明细」看单活动
 *   ③ 渠道效果排行 —— 同一笔钱在哪个渠道换回最多线索（投放决策最直接的依据）
 *   ④ 投放明细 —— 按活动逐渠道拆开曝光 / 花费 / 花费 / 线索
 *
 * 预算进度条用 accent（黄）表示"超过 85% 要预警"：这是既有 KPI 卡片的告警色，
 * 未新增色相。状态标签沿用 LxTag 既有变体，不新增。
 *
 * 文案一律走 i18n key；演示数据在组件作用域内。静态骨架，接入后走 /api/v1/mkg/campaigns。
 */

interface Campaign {
  id: string;
  nameKey: string;
  channelKeys: readonly string[];
  budget: string;
  spent: number;
  roas: string;
  status: 'running' | 'review';
}

const CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'CP-001',
    nameKey: 'mkg.place.cp1',
    channelKeys: ['mkg.channel.tiktok', 'mkg.channel.instagram', 'mkg.channel.youtube'],
    budget: '€48,000',
    spent: 68,
    roas: '4.8x',
    status: 'running',
  },
  {
    id: 'CP-002',
    nameKey: 'mkg.place.cp2',
    channelKeys: ['mkg.channel.linkedin', 'mkg.channel.email'],
    budget: '€32,000',
    spent: 42,
    roas: '3.6x',
    status: 'running',
  },
  {
    id: 'CP-003',
    nameKey: 'mkg.place.cp3',
    channelKeys: ['mkg.channel.linkedin', 'mkg.channel.facebook'],
    budget: '€18,000',
    spent: 91,
    roas: '5.2x',
    status: 'review',
  },
];

const STATUS_TAG: Record<Campaign['status'], LxTagVariant> = {
  running: 'done',
  review: 'review',
};

/** 明细行与投放计划基础信息在 `./place-data`（与投放计划编辑页共用一份事实源）。 */


/** 渠道效果排行：同一笔钱换回多少线索（投放段唯一必须回答的问题）。 */
const RANK: readonly { key: string; labelKey: string; value: number }[] = [
  { key: 'c1', labelKey: 'mkg.channel.tiktok', value: 86 },
  { key: 'c2', labelKey: 'mkg.channel.instagram', value: 41 },
  { key: 'c3', labelKey: 'mkg.channel.linkedin', value: 38 },
  { key: 'c4', labelKey: 'mkg.channel.facebook', value: 33 },
  { key: 'c5', labelKey: 'mkg.channel.youtube', value: 24 },
  { key: 'c6', labelKey: 'mkg.channel.email', value: 12 },
];

export default function MarketingPlacePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [activeDetail, setActiveDetail] = useState<DetailRow | null>(null);

  const visibleDetails = keyword
    ? PLACE_DETAILS.filter((row) => t(row.channelKey).includes(keyword) || t(row.campaignKey).includes(keyword))
    : PLACE_DETAILS;

  const columns = [
    {
      title: t('mkg.place.col.campaign'),
      dataIndex: 'campaignKey',
      key: 'campaign',
      width: '24%',
      render: (value: string) => <span className="lx-cell-title">{t(value)}</span>,
    },
    {
      title: t('mkg.col.channel'),
      dataIndex: 'channelKey',
      key: 'channel',
      width: '16%',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    {
      title: t('mkg.place.col.reach'),
      dataIndex: 'reach',
      key: 'reach',
      width: '16%',
      render: (value: number) => <span className="lx-num">{value.toLocaleString()}</span>,
    },
    {
      title: t('mkg.place.col.cost'),
      dataIndex: 'cost',
      key: 'cost',
      width: '16%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('mkg.place.col.leads'),
      dataIndex: 'leads',
      key: 'leads',
      width: '10%',
      render: (value: number) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('mkg.place.col.cpl'),
      dataIndex: 'cpl',
      key: 'cpl',
      width: '10%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: '8%',
      render: (_value: unknown, row: DetailRow) => (
        <>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => setActiveDetail(row)}
          >
            {t('mkg.action.trace')}
          </button>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            /* 带 id：编辑页据此回填这条计划的基础信息（否则打开的是空白新建表单）。 */
            onClick={() => void navigate(`/marketing/place/new?id=${row.id}`)}
          >
            {t('mkg.action.edit')}
          </button>
        </>
      ),
    },
  ];

  return (
    <PageContainer titleKey="mkg.page.place" hideTitle>
      <div className="lx-mktplace__bar">
        <button
          type="button"
          className="lx-btn lx-btn--primary lx-mktplace__cta lx-focusable"
          onClick={() => void navigate('/marketing/place/new')}
        >
          <RocketOutlined />
          {t('mkg.plan.title')}
        </button>
      </div>

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.place.kpi.running')}
          value="3"
          sub={t('mkg.place.kpi.runningSub')}
          trend="up"
          delta="1"
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.place.kpi.budget')}
          value="67%"
          sub={t('mkg.place.kpi.budgetSub')}
          trend="up"
          delta="5.2pt"
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.place.kpi.roas')}
          value="4.5x"
          sub={t('mkg.place.kpi.roasSub')}
          trend="up"
          delta="0.4x"
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.place.kpi.leads')}
          value="2,146"
          sub={t('mkg.place.kpi.leadsSub')}
          trend="up"
          delta="18.6%"
          color="violet"
          size="sm"
        />
      </div>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.place.campaigns.title')} sub={t('mkg.place.campaigns.sub')} />
        <div className="lx-grid lx-grid--3">
          {CAMPAIGNS.map((campaign) => (
            <article key={campaign.id} className="lx-mktplace__card">
              <header>
                <span className="lx-mktplace__icon">
                  <RocketOutlined />
                </span>
                <LxTag variant={STATUS_TAG[campaign.status]}>
                  {t(`mkg.place.status.${campaign.status}`)}
                </LxTag>
              </header>
              <h3 className="lx-mktplace__name">{t(campaign.nameKey)}</h3>
              <p className="lx-mktplace__chans">{campaign.channelKeys.map((key) => t(key)).join(' · ')}</p>
              <div className="lx-mktplace__bar">
                <span>{t('mkg.place.budget')}</span>
                <b>{campaign.spent}%</b>
                <span className="lx-mktplace__track">
                  <i
                    className={campaign.spent >= 85 ? 'is-warn' : undefined}
                    style={{ width: `${campaign.spent}%` }}
                  />
                </span>
              </div>
              <div className="lx-mktplace__facts">
                <div>
                  <span>{t('mkg.place.planBudget')}</span>
                  <b>{campaign.budget}</b>
                </div>
                <div>
                  <span>ROAS</span>
                  <b>{campaign.roas}</b>
                </div>
              </div>
              <button
                type="button"
                className="lx-mktplace__detail lx-focusable"
                onClick={() => {
                  message.success(t('mkg.place.detailDone', { name: t(campaign.nameKey) }));
                }}
              >
                <LineChartOutlined />
                {t('mkg.place.detail')}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.place.rank.title')} sub={t('mkg.place.rank.sub')} />
        <LxRankList
          ariaLabel={t('mkg.place.rank.aria')}
          items={RANK.map((item) => ({ key: item.key, label: t(item.labelKey), value: item.value }))}
          valueSuffix={` ${t('mkg.place.rank.unit')}`}
        />
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.place.detailTitle')} sub={t('mkg.place.detailSub')} />
        <LxTableCard
          tools={<LxSearchInput value={keyword} placeholder={t('mkg.place.search')} onChange={setKeyword} />}
        >
          <LxTable<DetailRow>
            fit
            columns={columns}
            dataSource={[...visibleDetails]}
            total={visibleDetails.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>

      <Drawer
        open={activeDetail !== null}
        onClose={() => setActiveDetail(null)}
        width={400}
        title={activeDetail ? t(activeDetail.campaignKey) : ''}
      >
        {activeDetail ? (
          <dl className="lx-mkgcal__dlist">
            <dt>{t('mkg.col.channel')}</dt>
            <dd>
              <LxTag variant="lang">{t(activeDetail.channelKey)}</LxTag>
            </dd>
            <dt>{t('mkg.place.col.reach')}</dt>
            <dd className="lx-num">{activeDetail.reach.toLocaleString()}</dd>
            <dt>{t('mkg.place.col.cost')}</dt>
            <dd className="lx-num">{activeDetail.cost}</dd>
            <dt>{t('mkg.place.col.leads')}</dt>
            <dd className="lx-num">{activeDetail.leads}</dd>
            <dt>{t('mkg.place.col.cpl')}</dt>
            <dd className="lx-num">{activeDetail.cpl}</dd>
          </dl>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
