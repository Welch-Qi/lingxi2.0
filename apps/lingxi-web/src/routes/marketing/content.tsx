import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableProps } from 'antd';
import {
  CheckCircleFilled,
  FileImageOutlined,
  PlayCircleOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import {
  LxCoordBar,
  LxFilterButton,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxStepper,
  LxTable,
  LxTableCard,
  LxTag,
  LxThumb,
} from '@lingxi/ui';
import type { LxTagVariant } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * P3 内容营销（改造指引 5.3 逐项落地）。
 *
 * 结构：Muse 协调条 → 步骤条 → 内容 KPI → 内容预览墙 → 内容生产队列。
 *
 * 三个设计要点：
 *  ① 步骤条把"生产 → 分发 → 投放"三段合成一页，避免用户在三个一级菜单之间找内容；
 *  ② 队列表格的状态列直接暴露"待审核"，因为对外内容必须人审（技术规约2.0 §3.6 G4），
 *     审核是这个页面最高频的人工动作；
 *  ③ 缩略图与类型标签色系与智能体色一致，保持五维色域不扩散（禁忌 8）。
 *
 * 静态骨架：行为占位演示数据，接入后走 /api/v1/mkg/contents。
 */

interface ContentRow {
  id: string;
  titleKey: string;
  code: string;
  type: 'video' | 'graphic';
  lang: string;
  channelKey: string;
  status: 'review' | 'producing' | 'done';
  updatedKey: string;
  /** 封面图（随原型资产移植）；缺省时降级为图标色块 */
  image?: string | undefined;
}

const ROWS: readonly ContentRow[] = [
  {
    id: '1',
    titleKey: 'mkg.content.r1',
    code: 'CT-20260911-018',
    type: 'graphic',
    lang: 'EN',
    channelKey: 'mkg.channel.linkedin',
    status: 'review',
    updatedKey: 'mkg.updated.2h',
    image: '/images/content-balcony.png',
  },
  {
    id: '2',
    titleKey: 'mkg.content.r2',
    code: 'CT-20260911-017',
    type: 'video',
    lang: 'EN',
    channelKey: 'mkg.channel.tiktok',
    status: 'producing',
    updatedKey: 'mkg.updated.4h',
    image: '/images/content-blackout.png',
  },
  {
    id: '3',
    titleKey: 'mkg.content.r3',
    code: 'CT-20260910-042',
    type: 'graphic',
    lang: 'DE',
    channelKey: 'mkg.channel.email',
    status: 'done',
    updatedKey: 'mkg.updated.yesterday',
    image: '/images/content-vanlife.png',
  },
  {
    id: '4',
    titleKey: 'mkg.content.r4',
    code: 'CT-20260910-039',
    type: 'graphic',
    lang: 'AR',
    channelKey: 'mkg.channel.facebook',
    status: 'review',
    updatedKey: 'mkg.updated.yesterday',
  },
];

/** 内容预览墙：三个主推素材，让"内容长什么样"在列表之外也能被直观看到。 */
const GALLERY = [
  { key: 'r1', titleKey: 'mkg.gallery.r1', image: '/images/content-balcony.png', lang: 'EN', typeKey: 'mkg.type.graphic' },
  { key: 'r2', titleKey: 'mkg.gallery.r2', image: '/images/content-blackout.png', lang: 'EN', typeKey: 'mkg.type.video' },
  { key: 'r3', titleKey: 'mkg.gallery.r3', image: '/images/content-vanlife.png', lang: 'DE', typeKey: 'mkg.type.graphic' },
] as const;

const STATUS_TAG: Record<ContentRow['status'], LxTagVariant> = {
  review: 'review',
  producing: 'producing',
  done: 'done',
};

const TYPE_TAG: Record<ContentRow['type'], LxTagVariant> = {
  video: 'video',
  graphic: 'graphic',
};

export default function MarketingContentPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [keyword, setKeyword] = useState('');

  const steps = [t('mkg.step.produce'), t('mkg.step.distribute'), t('mkg.step.place')];

  const columns: TableProps<ContentRow>['columns'] = [
    {
      title: t('mkg.col.content'),
      dataIndex: 'titleKey',
      key: 'content',
      render: (_value, row) => (
        <div className="lx-cell-media">
          <LxThumb
            src={row.image}
            alt={t(row.titleKey)}
            kind={row.type}
            icon={row.type === 'video' ? <PlayCircleOutlined /> : <FileImageOutlined />}
          />
          <span>
            <div className="lx-cell-title">{t(row.titleKey)}</div>
            <div className="lx-cell-code">{row.code}</div>
          </span>
        </div>
      ),
    },
    {
      title: t('mkg.col.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: ContentRow['type']) => (
        <LxTag variant={TYPE_TAG[value]}>{t(`mkg.type.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.col.lang'),
      dataIndex: 'lang',
      key: 'lang',
      render: (value: string) => <LxTag variant="lang">{value}</LxTag>,
    },
    {
      title: t('mkg.col.channel'),
      dataIndex: 'channelKey',
      key: 'channel',
      render: (value: string) => t(value),
    },
    {
      title: t('mkg.col.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: ContentRow['status']) => (
        <LxTag variant={STATUS_TAG[value]}>{t(`mkg.status.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.col.updated'),
      dataIndex: 'updatedKey',
      key: 'updated',
      render: (value: string) => <span className="lx-muted">{t(value)}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: (_value, row) => (
        <button type="button" className="lx-cell-link lx-focusable">
          {row.status === 'review' ? t('mkg.action.review') : t('mkg.action.trace')}
        </button>
      ),
    },
  ];

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.titleKey).includes(keyword) || row.code.includes(keyword))
    : ROWS;

  return (
    <PageContainer titleKey="mkg.page.content" subtitleKey="mkg.page.contentSub">
      <LxCoordBar
        icon={<ScheduleOutlined />}
        actionLabel={t('mkg.coord.action')}
        onAction={() => undefined}
      >
        {t('mkg.coord.prefix')}
        <b>{t('mkg.coord.emphasis')}</b>
        {t('mkg.coord.suffix')}
      </LxCoordBar>

      <LxStepper steps={steps} active={step} onChange={setStep} />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi label={t('mkg.kpi.output')} value="168" sub={t('mkg.kpi.sub.month')} trend="up" delta="14.2%" color="secondary" size="sm" spark={[10, 14, 12, 18, 22, 20, 26, 30]} />
        <LxKpi label={t('mkg.kpi.review')} value="24" sub={t('mkg.kpi.sub.pending')} trend="up" delta="6" color="accent" size="sm" spark={[4, 5, 7, 6, 9, 8, 10, 12]} />
        <LxKpi label={t('mkg.kpi.engagement')} value="4.6%" sub={t('mkg.kpi.sub.avg')} trend="up" delta="0.6pt" color="success" size="sm" spark={[2, 3, 3, 4, 4, 5, 5, 6]} />
        <LxKpi label={t('mkg.kpi.delivery')} value="98.2%" sub={t('mkg.kpi.sub.success')} trend="fl" delta="0.0pt" color="violet" size="sm" spark={[9, 9, 10, 9, 10, 10, 9, 10]} />
      </div>

      <section className="lx-section">
        <LxSectionHeader title={t('mkg.gallery.title')} sub={t('mkg.gallery.sub')} />
        <div className="lx-gallery">
          {GALLERY.map((item) => (
            <div key={item.key} className="lx-glass lx-hoverable lx-gallery__item">
              <LxThumb src={item.image} alt={t(item.titleKey)} kind={item.typeKey === 'mkg.type.video' ? 'video' : 'graphic'} size="card" />
              <div className="lx-gallery__meta">
                <span>
                  <div className="lx-gallery__title">{t(item.titleKey)}</div>
                  <div className="lx-gallery__sub">{t(item.typeKey)}</div>
                </span>
                <LxTag variant="lang">{item.lang}</LxTag>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('mkg.queue.title')}
          sub={t('mkg.queue.sub')}
          actionLabel={t('mkg.queue.more')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('mkg.queue.search')} onChange={setKeyword} />
              <LxFilterButton label={t('mkg.queue.sort')} />
              <LxFilterButton label={t('mkg.queue.statusFilter')} />
              <span className="lx-tools-note">
                <CheckCircleFilled />
                {t('mkg.queue.syncHint')}
              </span>
            </>
          }
        >
          <LxTable<ContentRow>
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
