import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { EntityForm, type FormFieldSpec, type FormFieldKind, type FormFieldOption } from '@/components/EntityForm';
import { findProduct, materialsOfProduct } from './data';
import { attrFieldsOfCategorySuffix, type AttrField } from './category-data';
import { ProductAssetsPanel } from './components/ProductAssetsPanel';

/**
 * 新建 / 编辑商品（`/product/new`，`?id=` 进编辑态）—— §2.5「商品主数据」的人工录入入口。
 *
 * 三组字段（基础 / 规格合规 / 销售交付）的划分依据是**谁来填**（见历史注释），保持不变。
 *
 * 关键变化（2026-09-28）：**「规格与合规」段按一级类目动态渲染**。
 * 商品只挂一级类目（储能 / 电池 / 光伏 / 充电），选了类目后该段自动换成
 * `category-data.ts` 里对应类目的属性模板字段（energy→容量/电压/防护等级/循环寿命/功率/拓扑/效率…），
 * 不同品类字段不同；未选类目时给提示。模板字段的枚举候选、必填、单位（kWh/V/…）一并带入。
 *
 * 2026-10-07 第二十轮：**编辑态增加商品素材管理段**（用户要求"商品编辑页面增加商品素材的管理，
 * 并可设置哪个是商品主图"）。它走 `footerExtra` 而不是 `headerExtra`：
 *   · `headerExtra` 那一位是「管理 SKU」——**页面级导航**，点它去另一个页面；
 *   · 素材管理是**本表单的一部分**，它改的是这个商品自己的素材与主图。
 * 放在页头会被读成"跳去素材库"，所以放正文末尾、提交按钮之前。
 * 另见 `./components/ProductAssetsPanel` 的实现说明（主图唯一、只用图片素材）。
 *
 * 类目只给一级类目：子类目与属性模板是分类体系自己的事，商品挂子类目会让品类树一改就得重挂。
 *
 * 字段名与标签复用已存在的 key（`prd.custom.*` / `prd.attr.*` / `prd.cat.*`），保证
 * 「品类管理」与「新建商品」里同一个概念长得一样。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/prd/products。
 */

/** 一级类目选项：与 `CATEGORY_TREE` 的四个根节点一一对应（value = suffix）。 */
const CATEGORY_OPTIONS: readonly FormFieldOption[] = [
  { value: 'energy', labelKey: 'prd.cat.energy' },
  { value: 'battery', labelKey: 'prd.cat.battery' },
  { value: 'solar', labelKey: 'prd.cat.solar' },
  { value: 'charging', labelKey: 'prd.cat.charging' },
] as const;

/** 上架状态选项：数据字典 E47 三值。 */
const STATUS_OPTIONS: readonly FormFieldOption[] = [
  { value: 'pending', labelKey: 'prd.status.pending' },
  { value: 'onSale', labelKey: 'prd.status.onSale' },
  { value: 'offShelf', labelKey: 'prd.status.offShelf' },
] as const;

/** 贸易术语：自定义字段 `prd.custom.incoterm` 的候选值。 */
const INCOTERM_OPTIONS: readonly FormFieldOption[] = [
  { value: 'FOB', labelKey: 'prd.attr.value.incoterm.FOB' },
  { value: 'CIF', labelKey: 'prd.attr.value.incoterm.CIF' },
  { value: 'EXW', labelKey: 'prd.attr.value.incoterm.EXW' },
] as const;

/** 负责人：只列演示数据里真实存在的两个归属人。 */
const OWNER_OPTIONS: readonly FormFieldOption[] = [
  { value: 'linlan', labelKey: 'demo.owner.linlan' },
  { value: 'zhoumu', labelKey: 'demo.owner.zhoumu' },
] as const;

/** 基础信息段（商品运营填，静态）。 */
const BASIC_FIELDS: readonly FormFieldSpec[] = [
  { name: 'name', labelKey: 'prd.new.field.name', kind: 'text', required: true },
  { name: 'sku', labelKey: 'prd.new.field.sku', kind: 'text', required: true, hintKey: 'prd.new.hint.sku' },
  { name: 'category', labelKey: 'prd.new.field.category', kind: 'select', required: true, options: CATEGORY_OPTIONS },
  { name: 'status', labelKey: 'prd.new.field.status', kind: 'select', required: true, options: STATUS_OPTIONS },
  { name: 'brand', labelKey: 'prd.custom.brand', kind: 'text' },
  { name: 'model', labelKey: 'prd.new.field.model', kind: 'text' },
];

/** 销售与交付段（销售运营填，静态）。 */
const SALES_FIELDS: readonly FormFieldSpec[] = [
  { name: 'launchDate', labelKey: 'prd.new.field.launchDate', kind: 'date' },
  { name: 'owner', labelKey: 'prd.new.field.owner', kind: 'select', required: true, options: OWNER_OPTIONS },
  { name: 'price', labelKey: 'prd.new.field.price', kind: 'number', hintKey: 'prd.new.hint.price' },
  { name: 'moq', labelKey: 'prd.new.field.moq', kind: 'number', hintKey: 'prd.new.hint.moq' },
  { name: 'incoterm', labelKey: 'prd.custom.incoterm', kind: 'select', options: INCOTERM_OPTIONS },
  { name: 'packingList', labelKey: 'prd.custom.packingList', kind: 'text' },
  {
    name: 'desc',
    labelKey: 'prd.new.field.desc',
    kind: 'textarea',
    rows: 4,
    wide: true,
    placeholderKey: 'prd.new.ph.desc',
  },
];

/** 属性模板字段 → 表单字段规格（enum→select、number→number、bool→select、text→text；单位附标签）。 */
const toFormField = (f: AttrField): FormFieldSpec => {
  const kind: FormFieldKind =
    f.type === 'enum' ? 'select' : f.type === 'number' ? 'number' : f.type === 'bool' ? 'select' : 'text';
  const options: readonly FormFieldOption[] | undefined =
    f.type === 'enum'
      ? f.valueKeys.map((vk) => ({ value: vk, labelKey: `prd.attr.value.${vk}` }))
      : f.type === 'bool'
        ? [
            { value: 'true', labelKey: 'prd.attr.value.yes' },
            { value: 'false', labelKey: 'prd.attr.value.no' },
          ]
        : undefined;
  return {
    name: f.id,
    labelKey: f.nameKey,
    kind,
    required: f.required,
    options,
    unitKey: f.unitKey ? `prd.unit.${f.unitKey}` : undefined,
  };
};

/**
 * 动态 sections：规格与合规段按当前选中的一级类目渲染对应属性模板字段；
 * 未选类目时给提示，字段集为空。
 */
const buildSections = (values: Record<string, string>) => {
  const suffix = values.category;
  const attrFields = suffix ? attrFieldsOfCategorySuffix(suffix) : [];
  const specSub = suffix ? 'prd.new.sec.spec.sub' : 'prd.new.spec.pickFirst';
  return [
    { titleKey: 'prd.new.sec.basic', subKey: 'prd.new.sec.basic.sub', fields: BASIC_FIELDS },
    { titleKey: 'prd.new.sec.spec', subKey: specSub, fields: attrFields.map(toFormField) },
    { titleKey: 'prd.new.sec.sales', subKey: 'prd.new.sec.sales.sub', fields: SALES_FIELDS },
  ];
};

export default function ProductNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get('id');
  const isEdit = Boolean(editingId);
  const product = editingId ? findProduct(editingId) : undefined;

  /* 编辑态（列表「编辑」带 ?id= 进入）才显式提供 SKU 入口；
     新建态还没有商品，没有可挂的 SKU。 */
  const skuManage = editingId ? (
    <button
      type="button"
      className="lx-form__submit lx-focusable"
      onClick={() => void navigate(`/product/${editingId}/sku`)}
    >
      {t('prd.sku.manage')}
    </button>
  ) : null;

  /* 素材管理段：只给编辑态。
     新建态还没有商品记录、没有 SKU，而素材按 `productCode`（= SKU）关联 ——
     给一个永远为空的素材段不如不给（用户会以为是加载失败）。 */
  const assetsPanel =
    product && editingId ? (
      <ProductAssetsPanel
        materials={materialsOfProduct(product.sku)}
        fallbackImage={product.image}
      />
    ) : null;

  /* 编辑态预填基础字段（含类目 → 触发对应属性段）。属性模板暂无持久化值，留空由用户填。 */
  const initialValues = product
    ? {
        name: product.name,
        sku: product.sku,
        category: product.categoryKey.replace('demo.category.', ''),
        status: product.status,
      }
    : undefined;

  return (
    <EntityForm
      variant="compact"
      titleKey={isEdit ? 'prd.edit.title' : 'prd.new.title'}
      subtitleKey={isEdit ? 'prd.edit.subtitle' : 'prd.new.subtitle'}
      backTo="/product"
      backLabelKey="prd.back.list"
      sectionsResolver={buildSections}
      initialValues={initialValues}
      submitLabelKey={isEdit ? 'prd.edit.submit' : 'prd.new.submit'}
      submitHintKey={isEdit ? 'prd.edit.submitted' : 'prd.new.submitted'}
      headerExtra={skuManage}
      footerExtra={assetsPanel}
    />
  );
}
