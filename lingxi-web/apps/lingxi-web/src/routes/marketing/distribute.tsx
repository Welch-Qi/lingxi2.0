import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import {
  LxChart,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTag,
  LxTable,
  LxTableCard,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { MKG_CHANNEL_KEYS, type ChannelKey } from './data';

/**
 * 营销中心 · 内容分发（/marketing/distribute）—— 三段流水线的第二段（产品规划说明书 V2.1 §2.8）。
 *
 * 典型使用者：内容运营专员。他关心的是"发出去了没有、哪个渠道吃到了"，
 * 因此本页只回答一个问题：**内容到渠道的触达**，而不是"内容本身好不好"（那是生产段）
 * 也不是"投多少钱赚多少"（那是投放段）。
 *
 * 本页结构：
 *   ① 分发概览 KPI —— 这一段的成果数字（本次触达、点击、点击率、待发）
 *   ② 近 7 日渠道触达与线索 —— 判断"发到哪里才有量"的根据
 *   ③ 渠道排期完成度 —— 当天各渠道该发几项、发完了几项（分发是排期活，不是创作活）
 *   ④ 内容 × 渠道投放矩阵 —— 每一行一份内容在各渠道的投放情况与合计曝光/点击
 *
 * 为什么矩阵里用勾选标记而不是渠道名称：渠道列只有 4 列空间，名称会把内容列挤到看不见；
 * 勾选标记表达的是"这一条有没有分发到这个渠道"，是这一段唯一要回答的问题。
 * 未分发的格子必须**同时**有颜色与形状（灰勾）与已分发区分开——只靠颜色的话，
 * 色觉障碍用户看到的一片灰白等于"是不是没加载出来"。
 *
 * 文案一律走 i18n key；演示数据在组件作用域内（与生产页同一约定）。
 * 静态骨架：行为占位演示数据，接入后走 /api/v1/mkg/distributions。
 */

interface MatrixRow {
  id: string;
  titleKey: string;
  type: 'video' | 'graphic';
  /** 渠道 → 触达量；未分发渠道不入键 */
  reach: Partial<Record<ChannelKey, number>>;
  clicks: Partial<Record<ChannelKey, number>>;
}

/** 渠道的呈现字段（触达完成度 / 已发条数）是演示数据，故留在本页；
 *  渠道标识本身从 `./data` 引，避免与日历页各存一份导致渠道漂移。 */
const CHANNEL_STATE: Record<ChannelKey, { percent: number; delivered: number }> = {
  tiktok: { percent: 82, delivered: 24 },
  instagram: { percent: 64, delivered: 18 },
  youtube: { percent: 50, delivered: 8 },
  linkedin: { percent: 91, delivered: 12 },
  facebook: { percent: 0, delivered: 0 },
};

const CHANNELS = MKG_CHANNEL_KEYS.map((key) => ({ key, ...CHANNEL_STATE[key] }));

const ROWS: readonly MatrixRow[] = [
  {
    id: 'CT-8821',
    titleKey: 'mkg.item.v1.title',
    type: 'video',
    reach: { tiktok: 128400, instagram: 62300, facebook: 33500 },
    clicks: { tiktok: 9860, instagram: 4120, facebook: 2180 },
  },
  {
    id: 'CT-8817',
    titleKey: 'mkg.asset.r1.title',
    type: 'graphic',
    reach: { instagram: 38600, linkedin: 45600, facebook: 21200 },
    clicks: { instagram: 2410, linkedin: 3980, facebook: 1360 },
  },
  {
    id: 'CT-8816',
    titleKey: 'mkg.asset.r2.title',
    type: 'video',
    reach: { tiktok: 91200, instagram: 54800, youtube: 28600, facebook: 30400 },
    clicks: { tiktok: 7240, instagram: 3910, youtube: 2050, facebook: 1980 },
  },
  {
    id: 'CT-8815',
    titleKey: 'mkg.content.r2',
    type: 'video',
    reach: { tiktok: 76500, instagram: 48900, facebook: 25100 },
    clicks: { tiktok: 6120, instagram: 3450, facebook: 1620 },
  },
  {
    id: 'CT-8814',
    titleKey: 'mkg.content.r1',
    type: 'graphic',
    reach: { linkedin: 18600, facebook: 12400 },
    clicks: { linkedin: 2240, facebook: 980 },
  },
];

const TYPE_TAG: Record<MatrixRow['type'], LxTagVariant> = {
  video: 'video',
  graphic: 'graphic',
};

/** 紧凑数字：中文写"万"，英文退化为 k/M（固定的量级后缀，不是翻译）。
 *  语言必须显式传入（i18n.language）——`Intl` 默认 locale 跟着浏览器走，不跟应用语言。 */
function compact(value: number, lang: string): string {
  if (lang.startsWith('zh')) {
    return value >= 10000 ? `${(value / 10000).toFixed(1)} 万` : String(value);
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(value);
}

export default function MarketingDistributePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const totalReach = ROWS.reduce((sum, row) => sum + Object.values(row.reach).reduce((a, b) => a + (b ?? 0), 0), 0);
  const totalClicks = ROWS.reduce(
    (sum, row) => sum + Object.values(row.clicks).reduce((a, b) => a + (b ?? 0), 0),
    0,
  );
  const ctr = totalReach === 0 ? 0 : (totalClicks / totalReach) * 100;

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.titleKey).includes(keyword) || row.id.includes(keyword))
    : ROWS;

  const columns = [
    {
      title: t('mkg.dist.col.content'),
      dataIndex: 'titleKey',
      key: 'content',
      width: '26%',
      render: (_value: string, row: MatrixRow) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{t(row.titleKey)}</div>
          <div className="lx-cell-code">{row.id}</div>
        </div>
      ),
    },
    {
      title: t('mkg.col.type'),
      dataIndex: 'type',
      key: 'type',
      width: '9%',
      render: (value: MatrixRow['type']) => <LxTag variant={TYPE_TAG[value]}>{t(`mkg.type.${value}`)}</LxTag>,
    },
    ...CHANNELS.map((channel) => ({
      title: t(`mkg.channel.${channel.key}`),
      key: channel.key,
      width: '9%',
      render: (_value: unknown, row: MatrixRow) =>
        row.reach[channel.key] === undefined ? (
          <span className="lx-mktdist__cell lx-mktdist__cell--off">
            <CloseOutlined />
          </span>
        ) : (
          <span className="lx-mktdist__cell lx-mktdist__cell--on">
            <CheckCircleFilled />
          </span>
        ),
    })),
    {
      title: t('mkg.dist.col.reach'),
      key: 'reach',
      width: '19%',
      render: (_value: unknown, row: MatrixRow) => (
        <span className="lx-num">{compact(Object.values(row.reach).reduce((a, b) => a + (b ?? 0), 0), i18n.language)}</span>
      ),
    },
    {
      title: t('mkg.dist.col.clicks'),
      key: 'clicks',
      width: '19%',
      render: (_value: unknown, row: MatrixRow) => (
        <span className="lx-num lx-mktdist__clicks">
          {compact(Object.values(row.clicks).reduce((a, b) => a + (b ?? 0), 0), i18n.language)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer titleKey="mkg.page.distribute" hideTitle>
      <div className="lx-mktdist__bar">
        <button
          type="button"
          className="lx-btn lx-btn--primary lx-focusable"
          onClick={() => void navigate('/marketing/publish')}
        >
          <CloudUploadOutlined />
          {t('mkg.dist.publish')}
        </button>
      </div>

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.dist.kpi.reach')}
          value={compact(totalReach, i18n.language)}
          sub={t('mkg.dist.kpi.reachSub')}
          trend="up"
          delta="12.4%"
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.dist.kpi.clicks')}
          value={compact(totalClicks, i18n.language)}
          sub={t('mkg.dist.kpi.clicksSub')}
          trend="up"
          delta="9.1%"
          color="secondary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.dist.kpi.ctr')}
          value={`${ctr.toFixed(1)}%`}
          sub={t('mkg.dist.kpi.ctrSub')}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.dist.kpi.pending')}
          value="42"
          sub={t('mkg.dist.kpi.pendingSub')}
          trend="fl"
          delta="0"
          color="accent"
          size="sm"
        />
      </div>

      <section className="lx-section">
        <LxSectionHeader
          title={t('mkg.dist.chart.title')}
          sub={t('mkg.dist.chart.sub')}
        />
        <div className="lx-grid lx-grid--kpi-4">
          <div className="lx-mktdist__chart">
            <LxChart
              type="bar"
              height={216}
              ariaLabel={t('mkg.dist.chart.aria')}
              categories={[1, 2, 3, 4, 5, 6, 7].map((day) => t(`mkg.dist.day.${day}`))}
              series={[
                { name: t('mkg.dist.series.reach'), data: [18, 26, 23, 34, 42, 38, 48] },
                { name: t('mkg.dist.series.leads'), data: [32, 38, 44, 52, 61, 55, 68] },
              ]}
            />
          </div>
          <div className="lx-mktdist__channels">
            <ul>
              {CHANNELS.map((channel) => (
                <li key={channel.key}>
                  <span className="lx-mktdist__chname">{t(`mkg.channel.${channel.key}`)}</span>
                  <span className="lx-mktdist__chnum">
                    {channel.delivered} {t('mkg.dist.channel.items')} · {channel.percent}%
                  </span>
                  <span className="lx-mktdist__chtrack">
                    <i style={{ width: `${channel.percent}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="lx-muted lx-mktdist__chhint">{t('mkg.dist.channel.hint')}</p>
          </div>
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('mkg.dist.matrix.title')}
          sub={t('mkg.dist.matrix.sub')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput
                value={keyword}
                placeholder={t('mkg.dist.search')}
                onChange={setKeyword}
              />
              <span className="lx-tools-note">
                <CheckCircleOutlined />
                {t('mkg.dist.matrix.hint')}
              </span>
            </>
          }
        >
          <LxTable<MatrixRow>
            fit
            columns={columns}
            dataSource={[...visibleRows]}
            total={visibleRows.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
