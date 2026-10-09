/**
 * 营销中心 · 内容清单（`mkg_content`）—— 内容列表页与内容详情/审核页的同一份事实源。
 *
 * 为什么从 `content.tsx` 里搬出来：列表页要"点进某一条"，详情页要"按编号取这一条"。
 * 数据留在列表组件里，详情页就只能靠路由参数重新拼一份，两份必然在加字段时漂移
 * （改了 `titleKey` 忘了改另一边 → 详情页标题空白）。
 * 与 `product/data.ts` 同一条理由：**只有数据与类型，不含 React 依赖**，谁都能引用。
 *
 * 2026-09-28 随「上传内容」与「查看/审核」两个二级页补齐字段：
 *   · `excerptKey` —— 详情页的正文预览（列表页不展示，但同一条内容的正文只有一份）；
 *   · `productCode` —— 这条内容是为哪个商品做的（详情页要能回答"改动会影响哪个 SKU"）；
 *   · `publishAt` / `ownerKey` —— 审核页要看的两个决策依据：什么时候发、谁负责；
 *   · `updatedRank` —— 更新时间**只能排序不能展示**（"2小时前"是文案，按它排不了序），
 *     故另存一个可比较的序号，值越小越新。
 * 不放在列表页的列里是因为列表的问题是"哪些还等着我"，详情的问题才是"这条能不能发"。
 *
 * `code` 是业务键（CT-yyyyMMdd-nnn），路由参数用的就是它 —— 不是 `id`：
 * 用户之间传的是"你看下 CT-20260911-018"，没人传自增主键。
 *
 * 「待审队列」不再是另一份数据：`content.tsx` 直接按 `status === 'review'` 从本表过滤。
 * 两份数据的结果是队列里点「审核」跳进详情，详情却写着"已分发" —— 而两边都长得像真的。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/mkg/contents。
 */

/** 内容形态：图文 / 视频（数据字典 E52）。 */
export type ContentType = 'video' | 'graphic';

/** 内容状态：待审核 / 生成中 / 已分发。对外内容必须人审（技术规约2.0 §3.6 G4）。 */
export type ContentStatus = 'review' | 'producing' | 'done';

export interface ContentRow {
  id: string;
  /** 内容标题 i18n key */
  titleKey: string;
  /** 内容编号（业务键，路由参数用它） */
  code: string;
  type: ContentType;
  /** 语种短码（EN / DE / AR / VI）——语言标识本身，不是展示文案，不进 i18n */
  lang: string;
  /** 分发渠道 i18n key */
  channelKey: string;
  status: ContentStatus;
  /** 更新时间 i18n key（展示用） */
  updatedKey: string;
  /** 可排序的更新序号（值越小越新；`updatedKey` 是文案，排不了序） */
  updatedRank: number;
  /** 正文摘要 i18n key（详情页预览用） */
  excerptKey: string;
  /** 关联商品 SKU */
  productCode: string;
  /** 计划发布时间（已分发的为实际发布时间） */
  publishAt: string;
  /** 负责人 i18n key */
  ownerKey: string;
  /** 缩略图（缺失时 LxThumb 降级为图标色块） */
  image?: string | undefined;
  /**
   * 视频文件地址（2026-10-06）—— **仅 `type === 'video'` 的行有**。
   *
   * 此前视频内容只有 `image`（封面），详情页对图文与视频一视同仁地渲染 `<img>`，
   * 于是"视频"永远停在一帧上，审核人无法判断动效与时长 —— 而这正是能不能发的关键。
   * 详情页据此改用 `<video controls poster={image}>`。
   */
  video?: string | undefined;
}

export const CONTENT_ROWS: readonly ContentRow[] = [
  {
    id: '1',
    titleKey: 'mkg.content.r1',
    code: 'CT-20260911-018',
    type: 'graphic',
    lang: 'EN',
    channelKey: 'mkg.channel.linkedin',
    status: 'review',
    updatedKey: 'mkg.updated.2h',
    updatedRank: 1,
    excerptKey: 'mkg.content.r1.excerpt',
    productCode: 'PS-1000-EU',
    publishAt: '2026-09-24 10:00',
    ownerKey: 'demo.owner.zhoumu',
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
    updatedRank: 2,
    excerptKey: 'mkg.content.r2.excerpt',
    productCode: 'SP-200-FD',
    publishAt: '2026-09-24 18:30',
    ownerKey: 'demo.owner.zhoumu',
    image: '/images/content-blackout.png',
    video: '/videos/content-balcony.mp4',
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
    updatedRank: 5,
    excerptKey: 'mkg.content.r3.excerpt',
    productCode: 'BM-5K-48V',
    publishAt: '2026-09-22 09:00',
    ownerKey: 'demo.owner.linlan',
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
    updatedRank: 6,
    excerptKey: 'mkg.content.r4.excerpt',
    productCode: 'EV-11K-WB',
    publishAt: '2026-09-25 14:00',
    ownerKey: 'demo.owner.linlan',
  },
  {
    id: '5',
    titleKey: 'mkg.content.r5',
    code: 'CT-20260911-012',
    type: 'graphic',
    lang: 'EN',
    channelKey: 'mkg.channel.instagram',
    status: 'review',
    updatedKey: 'mkg.updated.3h',
    updatedRank: 3,
    excerptKey: 'mkg.content.r5.excerpt',
    productCode: 'IV-8K-HY',
    publishAt: '2026-09-26 11:00',
    ownerKey: 'demo.owner.zhoumu',
    image: '/images/content-blackout.png',
  },
  {
    id: '6',
    titleKey: 'mkg.content.r6',
    code: 'CT-20260910-036',
    type: 'video',
    lang: 'VI',
    channelKey: 'mkg.channel.youtube',
    status: 'review',
    updatedKey: 'mkg.updated.yesterday',
    updatedRank: 4,
    excerptKey: 'mkg.content.r6.excerpt',
    productCode: 'PS-1000-EU',
    publishAt: '2026-09-25 16:00',
    ownerKey: 'demo.owner.linlan',
    image: '/images/content-vanlife.png',
    video: '/videos/content-vanlife.mp4',
  },
];

/** 按内容编号取一条 —— 详情页的路由参数就是它。 */
export function findContent(code: string): ContentRow | undefined {
  return CONTENT_ROWS.find((row) => row.code === code);
}
