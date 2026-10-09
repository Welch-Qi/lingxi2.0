import { EntityForm, type FormFieldOption, type FormSection } from '@/components/EntityForm';
import { PRODUCT_MASTER } from './data';

/**
 * 上传素材（`/product/upload`）—— §2.5「图片/视频上传」的人工入口。
 *
 * 与「产品素材库」（`/product/assets`）的分工：素材库里那张表回答"有哪些素材"，
 * 这一页负责"**把新的那条放进去，并且放到能被搜到的地方**"。
 * 所以字段分两截，顺序不能倒：
 *   ① 文件与类型 —— 传的是什么；
 *   ② 归属与检索 —— 以后靠什么找到它（所属商品 / 分类 / 语言版本 / 标签）。
 * 如果只让人选个文件就完事，素材会以"无分类无标签"的状态沉进库里，
 * 做内容时照样翻不到 —— 打标这一步必须在上传时顺手做完，别指望事后补。
 *
 * 语言版本填的是**主语言**而不是全部语种：一个文件传进来只可能是一种语言，
 * 其余语种由「多语种版本」能力生成。把主语言存下来，缺哪个语种的覆盖度才能被数出来。
 *
 * 选项全部写成字面量数组、不走 `.map()` 生成：
 * check-i18n 只认 `xxxKey: '字面量'` 这一种形态，用循环拼出来的 key
 * 在门禁眼里等于不存在 —— 拼错了也没人拦。多打几行换门禁真的管用，值。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/prd/materials。
 */

/** 素材类型：数据字典三种，与素材库的 `KIND_VARIANT` 同源。 */
const KIND_OPTIONS: readonly FormFieldOption[] = [
  { value: 'image', labelKey: 'prd.assets.kind.image' },
  { value: 'video', labelKey: 'prd.assets.kind.video' },
  { value: 'document', labelKey: 'prd.assets.kind.document' },
];

/** 素材分类：与素材库筛选行的「分类」同一份候选值（`prd.asset.cat.*`，单数）。 */
const CATEGORY_OPTIONS: readonly FormFieldOption[] = [
  { value: 'main', labelKey: 'prd.asset.cat.main' },
  { value: 'scene', labelKey: 'prd.asset.cat.scene' },
  { value: 'detail', labelKey: 'prd.asset.cat.detail' },
  { value: 'spec', labelKey: 'prd.asset.cat.spec' },
  { value: 'clip', labelKey: 'prd.asset.cat.clip' },
  { value: 'promo', labelKey: 'prd.asset.cat.promo' },
];

/** 语言版本：需与 `data.ts` 的 `MaterialLang` 保持一致（加语种时这里要手动跟上）。 */
const LANG_OPTIONS: readonly FormFieldOption[] = [
  { value: 'zh-CN', labelKey: 'prd.assets.lang.zh-CN' },
  { value: 'en-US', labelKey: 'prd.assets.lang.en-US' },
  { value: 'ja-JP', labelKey: 'prd.assets.lang.ja-JP' },
  { value: 'ar-AE', labelKey: 'prd.assets.lang.ar-AE' },
];

/**
 * 所属商品：值是 SKU（库里的外键），标签是 `SKU · 品名`。
 * 品名是专名不翻译，故用 `label` 而不是 `labelKey`（见 `FormFieldOption` 的说明）。
 */
const PRODUCT_OPTIONS: readonly FormFieldOption[] = PRODUCT_MASTER.map((product) => ({
  value: product.sku,
  label: `${product.sku} · ${product.name}`,
}));

/** 上传人：只列真人。智能体产出的素材走「AI生成素材」入口，不从这条路上传。 */
const OWNER_OPTIONS: readonly FormFieldOption[] = [
  { value: 'linlan', labelKey: 'demo.owner.linlan' },
  { value: 'zhoumu', labelKey: 'demo.owner.zhoumu' },
];

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'prd.upload.sec.file',
    subKey: 'prd.upload.sec.file.sub',
    fields: [
      {
        name: 'file',
        labelKey: 'prd.upload.field.file',
        kind: 'file',
        required: true,
        wide: true,
        placeholderKey: 'prd.upload.ph.file',
        hintKey: 'prd.upload.hint.file',
      },
      {
        name: 'kind',
        labelKey: 'prd.upload.field.kind',
        kind: 'select',
        required: true,
        options: KIND_OPTIONS,
      },
    ],
  },
  {
    titleKey: 'prd.upload.sec.meta',
    subKey: 'prd.upload.sec.meta.sub',
    fields: [
      {
        name: 'productCode',
        labelKey: 'prd.upload.field.product',
        kind: 'select',
        required: true,
        options: PRODUCT_OPTIONS,
        hintKey: 'prd.upload.hint.product',
      },
      { name: 'categoryKey', labelKey: 'prd.upload.field.category', kind: 'select', options: CATEGORY_OPTIONS },
      {
        name: 'lang',
        labelKey: 'prd.upload.field.lang',
        kind: 'select',
        required: true,
        options: LANG_OPTIONS,
        hintKey: 'prd.upload.hint.lang',
      },
      { name: 'owner', labelKey: 'prd.upload.field.owner', kind: 'select', required: true, options: OWNER_OPTIONS },
      { name: 'tags', labelKey: 'prd.upload.field.tags', kind: 'text', hintKey: 'prd.upload.hint.tags' },
      { name: 'spec', labelKey: 'prd.upload.field.spec', kind: 'text', hintKey: 'prd.upload.hint.spec' },
      {
        name: 'desc',
        labelKey: 'prd.upload.field.desc',
        kind: 'textarea',
        rows: 3,
        wide: true,
        placeholderKey: 'prd.upload.ph.desc',
      },
    ],
  },
];

export default function ProductUploadPage() {
  return (
    <EntityForm
      titleKey="prd.upload.title"
      subtitleKey="prd.upload.subtitle"
      backTo="/product"
      backLabelKey="prd.back.list"
      sections={SECTIONS}
      submitLabelKey="prd.upload.submit"
      submitHintKey="prd.upload.submitted"
    />
  );
}
