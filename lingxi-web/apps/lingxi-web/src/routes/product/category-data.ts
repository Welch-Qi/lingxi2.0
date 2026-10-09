/**
 * 商品分类与属性（`prd_category` / `prd_attr_template` / `prd_custom_field`）——
 * 《产品规划说明书V2.1》§2.5「商品分类与属性」的演示数据。
 *
 * 2026-09-27 起 `productCountOf` 需要商品数据做计数，故**反向 import** `./data`：
 * 依赖方向是本文件 → `./data`（纯数据），不涉及页面组件，不会把依赖图拖进来。
 *
 * 与 `PRODUCT_MASTER.categoryKey` 的关系：商品的类目只存**一级类目**
 * （如 `demo.category.energy`），子类目与属性模板是分类体系自己的事 ——
 * 商品不直接挂子类目，否则品类树一改，商品的外键就得跟着重挂一遍。
 */

import { PRODUCT_MASTER } from './data';

/** 品类（一级 / 二级）。id 是稳定标识，展示名走 i18n（`demo.category.*` 之外的族）。 */
export interface CategoryNode {
  id: string;
  /** 父级 id；为 null 即一级类目 */
  parentId: string | null;
  /**
   * 展示用 i18n key，存**完整 key**（如 `prd.cat.energy.storage`）。
   * 不存后缀再由调用处拼前缀：二级类目的后缀本身带点（energy.storage），
   * 而 i18n 门禁把任何 Key 字段里的带点字符串一律当完整 key 校验 ——
   * 后缀方案永远过不了门禁。这也与全仓 nameKey 直存完整 key 的约定一致。
   */
  nameKey: string;
}

/**
 * 属性字段类型。
 *
 * `enum` 的候选值同样是 key 后缀（`prd.attr.value.`），
 * 这样加一个"认证：CE / UL"不用改代码里的任何字面量。
 */
export type AttrFieldType = 'text' | 'number' | 'enum' | 'bool';

export interface AttrField {
  id: string;
  /** 展示名 i18n key（完整 key，字段名族 `prd.attr.*`） */
  nameKey: string;
  type: AttrFieldType;
  required: boolean;
  /** `enum` 的候选值 key 后缀列表 */
  valueKeys: readonly string[];
  /**
   * 单位 i18n key 后缀（`prd.unit.` 前缀 + 值）。单位也是文案：
   * kWh / V / W 是符号可以不翻，但「次」「年」是词，英文站必须跟着换（cycles / yr）。
   * 全部统一走 key 而不做「符号直存、词走 key」的双轨 —— 双轨会让下一个人猜该用哪个。
   */
  unitKey?: string | undefined;
}

/** 属性模板：一组属性字段，挂在某个类目上。 */
export interface AttrTemplate {
  id: string;
  /** 展示名 i18n key（完整 key，模板名族 `prd.attr.template.*`） */
  nameKey: string;
  /** 适用类目 id（对应 `CategoryNode.id`） */
  categoryId: string;
  /** 是否全类目通用（通用模板可挂到多个类目） */
  shared: boolean;
  fields: readonly AttrField[];
}

/** 自定义字段：不进任何模板、直接挂在商品上的补充字段。 */
export interface CustomField {
  id: string;
  nameKey: string;
  type: AttrFieldType;
  /** 出现在哪些一级类目下（`[]` 表示全类目） */
  appliesTo: readonly string[];
  /** 枚举型自定义字段的候选值 key 后缀；非枚举为空。自定义字段不进模板，故与 `AttrField` 分开存 */
  valueKeys?: readonly string[] | undefined;
}

export const CATEGORY_TREE: readonly CategoryNode[] = [
  { id: 'c1', parentId: null, nameKey: 'prd.cat.energy' },
  { id: 'c1-1', parentId: 'c1', nameKey: 'prd.cat.energy.storage' },
  { id: 'c1-2', parentId: 'c1', nameKey: 'prd.cat.energy.inverter' },
  { id: 'c2', parentId: null, nameKey: 'prd.cat.battery' },
  { id: 'c2-1', parentId: 'c2', nameKey: 'prd.cat.battery.module' },
  { id: 'c3', parentId: null, nameKey: 'prd.cat.solar' },
  { id: 'c3-1', parentId: 'c3', nameKey: 'prd.cat.solar.panel' },
  { id: 'c4', parentId: null, nameKey: 'prd.cat.charging' },
  { id: 'c4-1', parentId: 'c4', nameKey: 'prd.cat.charging.wallbox' },
];

export const ATTR_TEMPLATES: readonly AttrTemplate[] = [
  {
    id: 't1',
    nameKey: 'prd.attr.template.storage',
    categoryId: 'c1-1',
    shared: false,
    fields: [
      { id: 'f1', nameKey: 'prd.attr.capacity', type: 'number', required: true, valueKeys: [], unitKey: 'kwh' },
      { id: 'f2', nameKey: 'prd.attr.voltage', type: 'number', required: true, valueKeys: [], unitKey: 'volt' },
      { id: 'f3', nameKey: 'prd.attr.cycleLife', type: 'number', required: false, valueKeys: [], unitKey: 'cycles' },
      { id: 'f4', nameKey: 'prd.attr.ipGrade', type: 'enum', required: true, valueKeys: ['ip20', 'ip54', 'ip65'] },
    ],
  },
  {
    id: 't2',
    nameKey: 'prd.attr.template.inverter',
    categoryId: 'c1-2',
    shared: false,
    fields: [
      { id: 'f5', nameKey: 'prd.attr.power', type: 'number', required: true, valueKeys: [], unitKey: 'watt' },
      { id: 'f6', nameKey: 'prd.attr.topology', type: 'enum', required: true, valueKeys: ['topology.Transformer', 'topology.Transformerless'] },
      { id: 'f7', nameKey: 'prd.attr.efficiency', type: 'number', required: false, valueKeys: [], unitKey: 'percent' },
    ],
  },
  {
    id: 't3',
    nameKey: 'prd.attr.template.battery',
    categoryId: 'c2-1',
    shared: false,
    fields: [
      { id: 'f8', nameKey: 'prd.attr.cellType', type: 'enum', required: true, valueKeys: ['cell.LFP', 'cell.NMC', 'cell.LTO'] },
      { id: 'f9', nameKey: 'prd.attr.capacity', type: 'number', required: true, valueKeys: [], unitKey: 'ah' },
      { id: 'f10', nameKey: 'prd.attr.certification', type: 'enum', required: true, valueKeys: ['cert.CE', 'cert.UL', 'cert.IEC'] },
      { id: 'f11', nameKey: 'prd.attr.warranty', type: 'number', required: false, valueKeys: [], unitKey: 'years' },
    ],
  },
  {
    id: 't4',
    nameKey: 'prd.attr.template.panel',
    categoryId: 'c3-1',
    shared: false,
    fields: [
      { id: 'f12', nameKey: 'prd.attr.power', type: 'number', required: true, valueKeys: [], unitKey: 'watt' },
      { id: 'f13', nameKey: 'prd.attr.foldTimes', type: 'number', required: false, valueKeys: [], unitKey: 'cycles' },
      { id: 'f14', nameKey: 'prd.attr.waterproof', type: 'enum', required: true, valueKeys: ['ip54', 'ip65', 'ip67'] },
    ],
  },
  {
    id: 't5',
    nameKey: 'prd.attr.template.wallbox',
    categoryId: 'c4-1',
    shared: true,
    fields: [
      { id: 'f15', nameKey: 'prd.attr.power', type: 'number', required: true, valueKeys: [], unitKey: 'kw' },
      { id: 'f16', nameKey: 'prd.attr.connector', type: 'enum', required: true, valueKeys: ['connector.Type1', 'connector.Type2', 'connector.CCS2'] },
      { id: 'f17', nameKey: 'prd.attr.installType', type: 'enum', required: false, valueKeys: ['install.Wall', 'install.Pole'] },
    ],
  },
];

export const CUSTOM_FIELDS: readonly CustomField[] = [
  { id: 'cf1', nameKey: 'prd.custom.hsCode', type: 'text', appliesTo: [] },
  { id: 'cf2', nameKey: 'prd.custom.brand', type: 'text', appliesTo: [] },
  { id: 'cf3', nameKey: 'prd.custom.warrantyMonths', type: 'number', appliesTo: [] },
  { id: 'cf4', nameKey: 'prd.custom.packingList', type: 'text', appliesTo: [] },
  {
    id: 'cf5',
    nameKey: 'prd.custom.incoterm',
    type: 'enum',
    appliesTo: [],
    valueKeys: ['incoterm.FOB', 'incoterm.CIF', 'incoterm.EXW'],
  },
];

/** 按 id 取类目（品类树的节点查找）。 */
export function findCategory(id: string): CategoryNode | undefined {
  return CATEGORY_TREE.find((node) => node.id === id);
}

/**
 * 一级类目 → 演示数据 `PRODUCT_MASTER.categoryKey` 的后缀。
 *
 * 商品只挂一级类目（见文件头），故统计"这个类目下有几个商品"时，
 * 选中子类目要退回父类目算 —— 否则子类目的计数恒为 0，看着像数据坏了。
 */
const DEMO_CATEGORY_SUFFIX: Record<string, string> = {
  c1: 'energy',
  c2: 'battery',
  c3: 'solar',
  c4: 'charging',
};

/**
 * 一级类目 suffix（商品 `categoryKey` 后缀、新建表单 select 的 value）→ 品类树节点 id。
 * 反向于 `DEMO_CATEGORY_SUFFIX`，供「选了类目 → 取该类目属性模板字段」使用。
 */
export const CATEGORY_ID_BY_SUFFIX: Record<string, string> = {
  energy: 'c1',
  battery: 'c2',
  solar: 'c3',
  charging: 'c4',
};

/** 该类目（取父类目）覆盖的商品数。 */
export function productCountOf(categoryId: string): number {
  const parentId = DEMO_CATEGORY_SUFFIX[categoryId] ? categoryId : findCategory(categoryId)?.parentId;
  const suffix = parentId ? DEMO_CATEGORY_SUFFIX[parentId] : undefined;
  if (!suffix) {
    return 0;
  }
  return PRODUCT_MASTER.filter((product) => product.categoryKey === `demo.category.${suffix}`).length;
}

/** 某类目（含其子类目）下的属性模板 —— 选中品类树节点时右侧跟着换。 */
export function templatesOf(categoryId: string): readonly AttrTemplate[] {
  const childIds = new Set(
    CATEGORY_TREE.filter((node) => node.parentId === categoryId).map((node) => node.id),
  );
  return ATTR_TEMPLATES.filter(
    (template) => template.categoryId === categoryId || childIds.has(template.categoryId),
  );
}

/**
 * 按一级类目 suffix（energy / battery / solar / charging）取该类目下**所有**属性字段。
 *
 * 商品只挂一级类目，而模板挂在子类目上（energy→储能机 + 逆变器），故这里把
 * `templatesOf` 的各模板字段扁平化、按 field.id 去重后返回。新建/编辑商品表单的
 * 「规格与合规」段据此动态渲染 —— 选不同类目，字段随之不同。
 */
export function attrFieldsOfCategorySuffix(suffix: string): readonly AttrField[] {
  const categoryId = CATEGORY_ID_BY_SUFFIX[suffix];
  if (!categoryId) {
    return [];
  }
  const seen = new Set<string>();
  const out: AttrField[] = [];
  for (const template of templatesOf(categoryId)) {
    for (const field of template.fields) {
      if (!seen.has(field.id)) {
        seen.add(field.id);
        out.push(field);
      }
    }
  }
  return out;
}
