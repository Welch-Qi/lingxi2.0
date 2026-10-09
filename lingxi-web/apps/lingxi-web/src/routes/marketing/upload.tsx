import { EntityForm, type FormFieldOption, type FormSection } from '@/components/EntityForm';
import { PRODUCT_MASTER } from '../product/data';

/**
 * 上传内容（`/marketing/upload`）—— §2.8「内容创作」的人工入口。
 *
 * 与商品中心的「上传素材」是两个动作，别共用一页：
 *   素材是**给商品用的原件**（白底图、参数表、实拍），传完就进弹药库备着；
 *   内容是**要发出去的作品**（带渠道、带语种、带发布时间），传完就进待审队列。
 * 两者的字段集只在"有个文件"这一点上重合，合并会让一边多出一半无关字段。
 *
 * 字段分两截：文件与形态（传的是什么）→ 发布与归属（发给谁看、谁负责）。
 * 「分发渠道」是这一页与素材上传最关键的区别：内容没有渠道就没有受众，
 * 而渠道一旦定下，排期日历与分发页的泳道就跟着多一条 —— 所以它是必填。
 *
 * 语种是**内容本身的语种**（EN / DE / AR / VI / ZH），不是界面语言：
 * 这条内容发出去给谁看，跟操作界面的语言无关，故不复用 `nav.*` 的文案。
 *
 * 选项全部写成字面量数组、不走 `.map()` 生成：check-i18n 只认 `xxxKey: '字面量'`，
 * 循环拼出来的 key 在门禁眼里等于不存在 —— 拼错了也没人拦。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/mkg/contents。
 */

/** 内容形态：数据字典 E52（图文 / 视频），与列表页的类型标签同源。 */
const TYPE_OPTIONS: readonly FormFieldOption[] = [
  { value: 'graphic', labelKey: 'mkg.type.graphic' },
  { value: 'video', labelKey: 'mkg.type.video' },
];

/** 分发渠道：与分发页、日历页共用 `mkg.channel.*`，加渠道时三处一起长。 */
const CHANNEL_OPTIONS: readonly FormFieldOption[] = [
  { value: 'tiktok', labelKey: 'mkg.channel.tiktok' },
  { value: 'instagram', labelKey: 'mkg.channel.instagram' },
  { value: 'youtube', labelKey: 'mkg.channel.youtube' },
  { value: 'linkedin', labelKey: 'mkg.channel.linkedin' },
  { value: 'facebook', labelKey: 'mkg.channel.facebook' },
  { value: 'email', labelKey: 'mkg.channel.email' },
];

/** 内容语种：留言板里最常出现的五个市场语种。 */
const LANG_OPTIONS: readonly FormFieldOption[] = [
  { value: 'en', labelKey: 'mkg.lang.en' },
  { value: 'de', labelKey: 'mkg.lang.de' },
  { value: 'ar', labelKey: 'mkg.lang.ar' },
  { value: 'vi', labelKey: 'mkg.lang.vi' },
  { value: 'zh', labelKey: 'mkg.lang.zh' },
];

/** 关联商品：值是 SKU，标签是 `SKU · 品名`（品名是专名不翻译，故用 label 不用 labelKey）。 */
const PRODUCT_OPTIONS: readonly FormFieldOption[] = PRODUCT_MASTER.map((product) => ({
  value: product.sku,
  label: `${product.sku} · ${product.name}`,
}));

/** 负责人：只列真人。智能体生产的草稿走「AI生成内容」，提交时自动挂到发起人。 */
const OWNER_OPTIONS: readonly FormFieldOption[] = [
  { value: 'linlan', labelKey: 'demo.owner.linlan' },
  { value: 'zhoumu', labelKey: 'demo.owner.zhoumu' },
];

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'mkg.upload.sec.file',
    subKey: 'mkg.upload.sec.file.sub',
    fields: [
      {
        name: 'file',
        labelKey: 'mkg.upload.field.file',
        kind: 'file',
        required: true,
        wide: true,
        placeholderKey: 'mkg.upload.ph.file',
        hintKey: 'mkg.upload.hint.file',
      },
      {
        name: 'type',
        labelKey: 'mkg.upload.field.type',
        kind: 'select',
        required: true,
        options: TYPE_OPTIONS,
      },
    ],
  },
  {
    titleKey: 'mkg.upload.sec.meta',
    subKey: 'mkg.upload.sec.meta.sub',
    fields: [
      {
        name: 'title',
        labelKey: 'mkg.upload.field.title',
        kind: 'text',
        required: true,
        /* 不再 wide（2026-10-06）：compact 栅格下这一段本该「渠道·语种·商品·时间·负责人」
           一行排开，标题却独占整行，把 6 个字段挤成两屏 —— 正是"信息不够集中"。
           标题是短文本，220px 的列宽足够；真正需要整行的只有文件拾取区与正文。 */
        placeholderKey: 'mkg.upload.ph.title',
      },
      {
        name: 'channelKey',
        labelKey: 'mkg.upload.field.channel',
        kind: 'select',
        required: true,
        options: CHANNEL_OPTIONS,
        hintKey: 'mkg.upload.hint.channel',
      },
      {
        name: 'lang',
        labelKey: 'mkg.upload.field.lang',
        kind: 'select',
        required: true,
        options: LANG_OPTIONS,
      },
      {
        name: 'productCode',
        labelKey: 'mkg.upload.field.product',
        kind: 'select',
        options: PRODUCT_OPTIONS,
        hintKey: 'mkg.upload.hint.product',
      },
      { name: 'publishAt', labelKey: 'mkg.upload.field.publishAt', kind: 'date' },
      { name: 'owner', labelKey: 'mkg.upload.field.owner', kind: 'select', required: true, options: OWNER_OPTIONS },
      {
        name: 'body',
        labelKey: 'mkg.upload.field.body',
        kind: 'textarea',
        rows: 5,
        wide: true,
        placeholderKey: 'mkg.upload.ph.body',
        hintKey: 'mkg.upload.hint.body',
      },
    ],
  },
];

export default function MarketingUploadPage() {
  return (
    <EntityForm
      titleKey="mkg.upload.title"
      subtitleKey="mkg.upload.subtitle"
      backTo="/marketing"
      backLabelKey="mkg.back.content"
      variant="compact"
      sections={SECTIONS}
      submitLabelKey="mkg.upload.submit"
      submitHintKey="mkg.upload.submitted"
    />
  );
}
