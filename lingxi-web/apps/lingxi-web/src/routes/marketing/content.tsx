import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { TableProps } from 'antd';
import {
  CheckCircleFilled,
  FileImageOutlined,
  PlayCircleOutlined,
  ThunderboltFilled,
  UploadOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxAssetGrid,
  LxFilterButton,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  LxThumb,
  LxWorkList,
} from '@lingxi/ui';
import type { LxAssetItem, LxTagVariant, LxWorkItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { AIContentStudio } from '@/components/AIContentStudio';
import { CONTENT_ROWS, type ContentRow, type ContentStatus, type ContentType } from './content-data';

/**
 * 营销中心 · 内容营销（/marketing）—— 内容生产与分发（产品规划说明书 V2.1 §2.8）。
 *
 * 典型使用者：内容创意总监。§1.5 描述他关心"内容产出效率与质量、多语言本地化、
 * 效果好不好"，§5.3 给出的默认首屏是「内容日历 + 待审内容 + 效果排行 + 账号健康」。
 *
 * 本页结构：
 *   ① 操作入口（新建 / 从商品素材生成 / 排期日历 / 社媒账号）
 *   ② 步骤条：把"生产 → 分发 → 投放"三段合在一页，避免用户在三个一级菜单之间找上下文
 *   ③ 待审内容队列 —— **本页最高频的人工动作**：对外内容必须人审（技术规约2.0 §3.6 G4，
 *      自主度 ≤A1），所以队列每行的动作直接是「审核」，不让人先进详情页
 *   ④ 内容成果墙 —— 展示已发布内容的实际效果（曝光/互动），体现的是**工作成果**，
 *      而不是"智能体建议你做什么"
 *   ⑤ 内容生产队列（主表）—— 全量内容与状态
 *
 * 关于智能体：已删除原先页面顶部的「Muse 正在协调…」协调条。
 * 理由是它把"智能体在忙"当成首屏主角，而用户真正需要看到的是内容产出与效果。
 * 智能体的贡献改为行内标记（「AI 生成草稿」「AI 已本地化」）+ 操作条成果数字。
 *
 * 2026-09-28：**待审队列改为从内容清单筛出来**（`status === 'review'`），不再是第二份数据；
 * 队列的行内动作、表格的动作列、成果墙的「查看全部」全部有了去向 ——
 * 这一页原先一共 6 个"点了没反应"的按钮，其中 2 个是用户最常点的「审核」「查看」。
 * 队列与表格共用 `/marketing/content/:code` 一个详情页，差别只在那页给不给通过 / 打回。
 *
 * 缩略图与类型标签色系与智能体色一致，保持五维色域不扩散（改造指引禁忌 8）。
 *
 * 文案一律走 i18n key（附录D 规则10）；内容数据在 `./content-data`（详情页共用）。
 *
 * 静态骨架：行为占位演示数据，接入后走 /api/v1/mkg/contents。
 */

const STATUS_TAG: Record<ContentStatus, LxTagVariant> = {
  review: 'review',
  producing: 'producing',
  done: 'done',
};

const TYPE_TAG: Record<ContentType, LxTagVariant> = {
  video: 'video',
  graphic: 'graphic',
};

export default function MarketingContentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  /** 「AI生成内容」打开的是营销侧工作台，与商品中心的「AI生成素材」同一份实现。 */
  const [studioOpen, setStudioOpen] = useState(false);
  /** 只看待审：工具栏那个「状态筛选」原先没有去向，现在真的筛。 */
  const [onlyReview, setOnlyReview] = useState(false);
  /** 排序方向（false = 最近更新在前）。 */
  const [oldestFirst, setOldestFirst] = useState(false);

  /** 详情/审核页的路由就是内容编号 —— 队列与表格因此共用同一个去向。 */
  const openDetail = (code: string) => {
    void navigate(`/marketing/content/${code}`);
  };

  /**
   * 待审队列**从内容清单里筛**（`status === 'review'`），不另存一份数据。
   * 两份数据的结果是：队列里点「审核」跳进详情，详情却写着「已分发」——
   * 而两边都长得像真的，谁也不知道该信哪个。
   * 队列是服务端口径（24 条）的第一页切片，故 `count` 仍取 24（见 data 层约定）。
   */
  const reviewItems: readonly LxWorkItem[] = CONTENT_ROWS.filter((row) => row.status === 'review').map(
    (row) => ({
      key: row.code,
      title: t(row.titleKey),
      sub: `${row.code} · ${t(row.channelKey)}`,
      tags: [
        { label: row.lang, variant: 'lang' },
        { label: t('mkg.status.review'), variant: 'review' },
      ],
      agentLabel: t('mkg.agent.draft'),
      value: t(row.updatedKey),
      actionLabel: t('mkg.action.review'),
      actionPrimary: true,
      onAction: () => openDetail(row.code),
    }),
  );

  /**
   * 内容成果墙：已发布内容的实际效果，是本页唯一"向外看"的区域。
   *
   * 2026-10-06 **缩略图可点进详情**（用户反馈"点击缩略图进入到内容详情"）：
   * 成果墙此前只挂了「查看全部」一个出口，卡片本身是死的 —— 看到一张封面
   * 想看它到底拍了什么，只能回列表再从「查看」进，两跳。改为卡片整体可点，
   * 直接进该条内容的详情/审核页（与列表的「查看」同一个去向 `openDetail`）。
   * r1 对应 `CT-20260911-018`（待审），r2 对应 `CT-20260911-017`（视频），
   * r3/r4 对应已分发的 `CT-20260910-042` / `CT-20260910-039`。
   */
  const resultAssets: readonly LxAssetItem[] = [
    {
      key: 'r1',
      title: t('mkg.asset.r1.title'),
      sub: t('mkg.asset.r1.sub'),
      image: '/images/content-balcony.png',
      tag: { label: t('mkg.type.graphic'), variant: 'graphic' },
      onClick: () => openDetail('CT-20260911-018'),
    },
    {
      key: 'r2',
      title: t('mkg.asset.r2.title'),
      sub: t('mkg.asset.r2.sub'),
      image: '/images/content-blackout.png',
      tag: { label: t('mkg.type.video'), variant: 'video' },
      onClick: () => openDetail('CT-20260911-017'),
    },
    {
      key: 'r3',
      title: t('mkg.asset.r3.title'),
      sub: t('mkg.asset.r3.sub'),
      image: '/images/content-vanlife.png',
      tag: { label: t('mkg.type.graphic'), variant: 'graphic' },
      onClick: () => openDetail('CT-20260910-042'),
    },
    {
      key: 'r4',
      title: t('mkg.asset.r4.title'),
      sub: t('mkg.asset.r4.sub'),
      image: '/images/content-balcony.png',
      tag: { label: t('mkg.type.graphic'), variant: 'graphic' },
      onClick: () => openDetail('CT-20260910-039'),
    },
  ];

  const columns: TableProps<ContentRow>['columns'] = [
    {
      title: t('mkg.col.content'),
      dataIndex: 'titleKey',
      key: 'content',
      width: '30%',
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
      width: '10%',
      render: (value: ContentRow['type']) => (
        <LxTag variant={TYPE_TAG[value]}>{t(`mkg.type.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.col.lang'),
      dataIndex: 'lang',
      key: 'lang',
      width: '10%',
      render: (value: string) => <LxTag variant="lang">{value}</LxTag>,
    },
    {
      title: t('mkg.col.channel'),
      dataIndex: 'channelKey',
      key: 'channel',
      width: '14%',
      render: (value: string) => t(value),
    },
    {
      title: t('mkg.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '11%',
      render: (value: ContentRow['status']) => (
        <LxTag variant={STATUS_TAG[value]}>{t(`mkg.status.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.col.updated'),
      dataIndex: 'updatedKey',
      key: 'updated',
      width: '13%',
      render: (value: string) => <span className="lx-muted">{t(value)}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: '12%',
      render: (_value, row) => (
        // 待审的点「审核」、已发的点「查看」，去的是同一页 ——
        // 差别只在那页给不给「通过 / 打回」。
        <button type="button" className="lx-cell-link lx-focusable" onClick={() => openDetail(row.code)}>
          {row.status === 'review' ? t('mkg.action.review') : t('mkg.action.trace')}
        </button>
      ),
    },
  ];

  /**
   * 两个工具栏按钮真的在筛 / 排（原先都没有去向）：
   * 「状态筛选」= 只看待审，「排序」= 更新时间倒序 / 正序。
   * 排序用 `updatedRank` 而不是 `updatedKey`——"2小时前"是文案，字面量排不了序。
   */
  let visibleRows = CONTENT_ROWS;
  if (onlyReview) {
    visibleRows = visibleRows.filter((row) => row.status === 'review');
  }
  if (keyword) {
    visibleRows = visibleRows.filter(
      (row) => t(row.titleKey).includes(keyword) || row.code.includes(keyword),
    );
  }
  visibleRows = [...visibleRows].sort((a, b) =>
    oldestFirst ? b.updatedRank - a.updatedRank : a.updatedRank - b.updatedRank,
  );

  return (
    <PageContainer titleKey="mkg.ov.mod.content" hideTitle>
      <LxActionBar
        primary={{
          key: 'upload',
          label: t('mkg.bar.create'),
          icon: <UploadOutlined />,
          onClick: () => {
            void navigate('/marketing/upload');
          },
        }}
        items={[
          {
            key: 'aiGenerate',
            label: t('mkg.bar.aiGenerate'),
            icon: <ThunderboltFilled />,
            onClick: () => setStudioOpen(true),
          },
          // 「内容日历 / 社媒账号 / 邮件营销 / 访客识别」这些**跳转类**入口不再放动作栏：
          // 动作栏只承载本页动作，跨页跳转统一交给 layout 的出口带，
          // 否则每加一个二级页都要回来改一处动作栏，还会和出口带重复出现。
        ]}
        note={
          <>
            {t('mkg.note.prefix')}
            <b>24</b>
            {t('mkg.note.suffix')}
          </>
        }
      />

      {/* 步骤条已上移到 layout：三段工作流现在是三个路由，切换即换页，
          而不是在同一个页面里换一段视图（详见 layout.tsx）。 */}

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi label={t('mkg.kpi.output')} value="168" sub={t('mkg.kpi.sub.month')} trend="up" delta="14.2%" color="secondary" size="sm" spark={[10, 14, 12, 18, 22, 20, 26, 30]} />
        <LxKpi label={t('mkg.kpi.review')} value="24" sub={t('mkg.kpi.sub.pending')} trend="up" delta="6" color="accent" size="sm" spark={[4, 5, 7, 6, 9, 8, 10, 12]} />
        <LxKpi label={t('mkg.kpi.engagement')} value="4.6%" sub={t('mkg.kpi.sub.avg')} trend="up" delta="0.6pt" color="success" size="sm" spark={[2, 3, 3, 4, 4, 5, 5, 6]} />
        <LxKpi label={t('mkg.kpi.delivery')} value="98.2%" sub={t('mkg.kpi.sub.success')} trend="fl" delta="0.0pt" color="violet" size="sm" spark={[9, 9, 10, 9, 10, 10, 9, 10]} />
      </div>

      <LxWorkList
        title={t('mkg.queue.review.title')}
        sub={t('mkg.queue.review.sub')}
        count={24}
        tone="accent"
        items={reviewItems}
        emptyText={t('mkg.queue.review.empty')}
      />

      <section className="lx-section">
        <LxSectionHeader
          title={t('mkg.result.title')}
          sub={t('mkg.result.sub')}
          actionLabel={t('mkg.result.more')}
          /* 「查看全部」去分发页：内容 × 渠道的曝光/点击合计在那边一张矩阵里，
             本页的成果墙只是前四张卡。 */
          onAction={() => {
            void navigate('/marketing/distribute');
          }}
        />
        <LxAssetGrid items={resultAssets} columns={4} />
      </section>

      <section className="lx-section">
        {/* 这里原先还有一个「查看全部」按钮 —— 它指的是正下方那张表，
            等于把同一份内容挂两个入口。表格就是全量，去掉。 */}
        <LxSectionHeader title={t('mkg.queue.title')} sub={t('mkg.queue.sub')} />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('mkg.queue.search')} onChange={setKeyword} />
              <LxFilterButton
                label={oldestFirst ? t('mkg.queue.sortAsc') : t('mkg.queue.sort')}
                onClick={() => setOldestFirst((prev) => !prev)}
              />
              <LxFilterButton
                label={onlyReview ? t('mkg.queue.statusReview') : t('mkg.queue.statusFilter')}
                onClick={() => setOnlyReview((prev) => !prev)}
              />
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
            /* 固定列宽 + 永不横滚：原先列表未声明列宽，内容自然宽撑破
               1280 内容区出横向滚动条；`fit`＝`table-layout:fixed`，列宽只认上面的百分比。 */
            fit
          />
        </LxTableCard>
      </section>

      <AIContentStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        titleKey="mkg.studio.title"
        submittedKey="mkg.studio.submitted"
      />
    </PageContainer>
  );
}
