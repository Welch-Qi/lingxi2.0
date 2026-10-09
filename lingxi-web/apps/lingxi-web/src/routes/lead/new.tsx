import { EntityForm, type FormFieldOption, type FormSection } from '@/components/EntityForm';
import { MARKET_OPTIONS, OWNER_OPTIONS, SOURCE_OPTIONS } from '../customer/market-options';
import { PRODUCT_MASTER } from '../product/data';

/**
 * 登记线索（`/lead/new`）—— 线索中心的人工入口。
 *
 * 线索与客户的差别只在一句话：**线索是没被确认过的客户**。
 * 所以这一页刻意比「新建客户」少两样东西 —— 没有"价值分层"，也不能选"客户类型"：
 * 这两件事的答案要等跟进之后才知道，现在填只能靠猜，而猜错的分层会一路传进商机优先级。
 * 打分（`lead.col.score`）是有的，但它是**评估结果**而不是身份，所以放在第二段。
 *
 * 「线索来源」必填：线索中心的价值一半在"量从哪来"（投放与渠道复盘全靠这个字段），
 * 允许留空等于让这个复盘永久缺一角。客户侧不是必填 —— 客户可以从线索转来，
 * 来源在建档时已经记过一次了。
 *
 * 国家口径与客户侧共用 `../customer/market-options`：线索转化成客户时国家是直传的，
 * 两份列表一漂移就会出现"线索里选得到、转成客户时选不到"。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/cus/leads。
 */

/** 线索状态：待联系 / 已转化 / 无效。 */
const STATUS_OPTIONS: readonly FormFieldOption[] = [
  { value: 'pending', labelKey: 'lead.status.pending' },
  { value: 'converted', labelKey: 'lead.status.converted' },
  { value: 'invalid', labelKey: 'lead.status.invalid' },
];

/** 线索分级：评分落档（A/B/C/D），与列表页的分级标签同源。 */
const GRADE_OPTIONS: readonly FormFieldOption[] = [
  { value: 'a', labelKey: 'lead.grade.a' },
  { value: 'b', labelKey: 'lead.grade.b' },
  { value: 'c', labelKey: 'lead.grade.c' },
  { value: 'd', labelKey: 'lead.grade.d' },
];

/**
 * 意向产品：值是商品主键（`lead.intendedProductId` 的外键口径），
 * 标签是 `SKU · 品名`。品名是专名不翻译，故用 `label` 而不是 `labelKey`。
 */
const PRODUCT_OPTIONS: readonly FormFieldOption[] = PRODUCT_MASTER.map((product) => ({
  value: product.id,
  label: `${product.sku} · ${product.name}`,
}));

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'lead.new.sec.basic',
    subKey: 'lead.new.sec.basic.sub',
    fields: [
      { name: 'name', labelKey: 'lead.new.field.name', kind: 'text', required: true, wide: true },
      { name: 'code', labelKey: 'lead.new.field.code', kind: 'text', hintKey: 'lead.new.hint.code' },
      { name: 'sourceKey', labelKey: 'lead.col.source', kind: 'select', required: true, options: SOURCE_OPTIONS },
      { name: 'intendedProductId', labelKey: 'lead.new.field.product', kind: 'select', options: PRODUCT_OPTIONS },
      { name: 'countryKey', labelKey: 'lead.new.field.country', kind: 'select', required: true, options: MARKET_OPTIONS },
      { name: 'city', labelKey: 'lead.new.field.city', kind: 'text' },
    ],
  },
  {
    titleKey: 'lead.new.sec.contact',
    subKey: 'lead.new.sec.contact.sub',
    fields: [
      { name: 'contact', labelKey: 'lead.col.contact', kind: 'text', required: true },
      { name: 'contactRole', labelKey: 'lead.new.field.contactRole', kind: 'text' },
      { name: 'phone', labelKey: 'lead.new.field.phone', kind: 'text', hintKey: 'lead.new.hint.phone' },
      { name: 'status', labelKey: 'lead.col.status', kind: 'select', required: true, options: STATUS_OPTIONS },
      { name: 'ownerKey', labelKey: 'lead.new.field.owner', kind: 'select', options: OWNER_OPTIONS },
      {
        name: 'score',
        labelKey: 'lead.col.score',
        kind: 'number',
        hintKey: 'lead.new.hint.score',
      },
      { name: 'grade', labelKey: 'lead.new.field.grade', kind: 'select', options: GRADE_OPTIONS },
      { name: 'note', labelKey: 'lead.new.field.note', kind: 'textarea', rows: 3, wide: true },
    ],
  },
];

export default function LeadNewPage() {
  return (
    <EntityForm
      titleKey="lead.new.title"
      subtitleKey="lead.new.subtitle"
      backTo="/lead"
      backLabelKey="lead.back.list"
      sections={SECTIONS}
      submitLabelKey="lead.new.submit"
      submitHintKey="lead.new.submitted"
    />
  );
}
