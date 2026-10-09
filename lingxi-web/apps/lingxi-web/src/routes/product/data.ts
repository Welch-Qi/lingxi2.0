/**
 * 商品主数据（`prd_product`）与素材（`prd_material`）—— 商品中心的唯一事实源。
 *
 * 为什么单独成文件、而不是留在 index.tsx 的组件作用域里：
 * 商机要按外键引用它（`cus_opportunity.intended_product_id` → `prd_product.id`），
 * 而跨分区 import 一个**页面组件**会把整页的依赖图拖进商机中心。
 * 这里只有数据与类型，不含任何 React 依赖，谁都可以引用。
 *
 * 品名是真实语种的专有名词，属专名、不翻译（故不像其它演示数据那样存 i18n key）。
 * 类目名、状态名走 i18n（categoryKey / status 在展示层经 `t()` 取译文）。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/prd/products 与 /api/v1/prd/materials。
 */

/** 商品状态枚举（数据字典 E47：待上架 / 在售 / 下架）。 */
export type ProductStatus = 'pending' | 'onSale' | 'offShelf';

export interface ProductRecord {
  id: string;
  /** 品名（专名，不翻译） */
  name: string;
  /** 商品编号（SKU 业务键） */
  sku: string;
  /** 类目 i18n key */
  categoryKey: string;
  /** 商品状态（待上架 / 在售 / 下架） */
  status: ProductStatus;
  /** 素材数（关联 prd_material 计数） */
  assets: number;
  /** SKU 数（同 SPU 下的库存量单位数） */
  skuCount: number;
  /**
   * 资料完整度 0-100（派生）。
   * 不在列表展示，仅用于「待补全」口径度量（见 COMPLETENESS_TARGET）。
   */
  completeness: number;
  /** 维护时间（最近一次编辑时间） */
  maintenanceTime: string;
  /** 商品主图（public/images 下的资源；缺失时 LxThumb 自动降级为图标色块） */
  image?: string | undefined;
}

/**
 * 待补全口径：资料完整度未达目标线即视为待补全。
 * 与总览完整度目标（目标 95%，卡片用 85% 作"达标"软线）保持一致的分档逻辑。
 */
export const COMPLETENESS_TARGET = 85;

export const PRODUCT_MASTER: readonly ProductRecord[] = [
  { id: '1', name: 'Portable Power Station 1000W', sku: 'PS-1000-EU', categoryKey: 'demo.category.energy', status: 'onSale', assets: 42, skuCount: 4, completeness: 96, maintenanceTime: '2026-09-20', image: '/images/product-power.png' },
  { id: '2', name: 'LiFePO4 Battery Module 5kWh', sku: 'BM-5K-48V', categoryKey: 'demo.category.battery', status: 'onSale', assets: 28, skuCount: 3, completeness: 88, maintenanceTime: '2026-09-18', image: '/images/product-health.png' },
  { id: '3', name: 'Foldable Solar Panel 200W', sku: 'SP-200-FD', categoryKey: 'demo.category.solar', status: 'onSale', assets: 35, skuCount: 2, completeness: 82, maintenanceTime: '2026-09-15', image: '/images/product-solar.png' },
  { id: '4', name: 'Hybrid Inverter 8kW', sku: 'IV-8K-HY', categoryKey: 'demo.category.inverter', status: 'pending', assets: 12, skuCount: 1, completeness: 64, maintenanceTime: '2026-09-10', image: '/images/product-smarthome.png' },
  { id: '5', name: 'EV Charger Wallbox 11kW', sku: 'EV-11K-WB', categoryKey: 'demo.category.charging', status: 'onSale', assets: 19, skuCount: 5, completeness: 71, maintenanceTime: '2026-09-12', image: '/images/product-sports.png' },
];

/** 按主键取商品 —— 商机的「意向产品」只存外键，展示时来这里换名称。 */
export function findProduct(id: string): ProductRecord | undefined {
  return PRODUCT_MASTER.find((product) => product.id === id);
}

/**
 * 商品素材（`prd_material`）—— 产品素材库页的数据源。
 *
 * 2026-09-27 随「产品素材库」二级页扩展：原先只有 id/image/productCode/productName/createdAt
 * 五个字段，够撑一张五列表格，撑不起 §2.5 写的那三件事 ——
 *   ① **分类**：内容创意挑素材时先按"主图 / 场景图 / 规格表"分，没有分类就等于没有索引；
 *   ② **打标**：同一批素材按用途（白底图、带尺寸、节日主题）打标，是比分类更细的一层；
 *   ③ **多语言版本**：跨境商品一套素材要多语种复用，缺哪个语种要能被数出来。
 * 与 SKU 的关联本来就有（productCode 外键），这里是把它从"一列"升级成"可筛选、可下钻"。
 *
 * `spec` 故意存"2.4 MB" / "00:35" 这种**上传物本身的属性**而不是文案：
 * 图片看体积、视频看时长，同一个字段装两种量纲，接入后由真实文件元信息填充。
 */
export type MaterialKind = 'image' | 'video' | 'document';

/** 多语言版本（§2.5「多语言版本」）。未列出的语种即"待翻译"。 */
export type MaterialLang = 'zh-CN' | 'en-US' | 'ja-JP' | 'ar-AE';

export interface MaterialRecord {
  id: string;
  /** 素材主图（缺失时降级为图标色块） */
  image?: string | undefined;
  kind: MaterialKind;
  /** 所属商品编码（`prd_product.sku` 外键） */
  productCode: string;
  /** 所属商品名称（冗余快照，便于素材列表独立展示） */
  productName: string;
  /** 素材分类 i18n key 后缀（`prd.asset.cat.` 前缀 + 本值） */
  categoryKey: string;
  /** 素材标签 i18n key 列表（`prd.asset.tag.` 前缀 + 各值） */
  tagKeys: readonly string[];
  /** 已生成的语言版本 */
  langs: readonly MaterialLang[];
  /** 上传归属人 i18n key */
  ownerKey: string;
  createdAt: string;
  /** 图片为体积、视频为时长（见上方注释） */
  spec: string;
}

export const PRODUCT_MATERIALS: readonly MaterialRecord[] = [
  { id: 'm1', image: '/images/product-power.png', kind: 'image', productCode: 'PS-1000-EU', productName: 'Portable Power Station 1000W', categoryKey: 'main', tagKeys: ['whiteBg', 'hero'], langs: ['zh-CN', 'en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-09-20', spec: '2.4 MB' },
  { id: 'm2', image: '/images/product-solar.png', kind: 'image', productCode: 'SP-200-FD', productName: 'Foldable Solar Panel 200W', categoryKey: 'scene', tagKeys: ['outdoor'], langs: ['en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-09-15', spec: '3.1 MB' },
  { id: 'm3', image: '/images/product-health.png', kind: 'image', productCode: 'BM-5K-48V', productName: 'LiFePO4 Battery Module 5kWh', categoryKey: 'spec', tagKeys: ['withSize', 'whiteBg'], langs: ['zh-CN', 'en-US'], ownerKey: 'demo.owner.linlan', createdAt: '2026-09-18', spec: '1.8 MB' },
  { id: 'm4', image: '/images/product-sports.png', kind: 'image', productCode: 'EV-11K-WB', productName: 'EV Charger Wallbox 11kW', categoryKey: 'scene', tagKeys: ['installed'], langs: ['en-US'], ownerKey: 'demo.owner.linlan', createdAt: '2026-09-12', spec: '2.9 MB' },
  { id: 'm5', image: '/images/product-power.png', kind: 'video', productCode: 'PS-1000-EU', productName: 'Portable Power Station 1000W', categoryKey: 'clip', tagKeys: ['demo', 'vertical'], langs: ['en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-09-08', spec: '00:35' },
  { id: 'm6', image: '/images/product-solar.png', kind: 'image', productCode: 'SP-200-FD', productName: 'Foldable Solar Panel 200W', categoryKey: 'detail', tagKeys: ['foldable'], langs: ['zh-CN', 'en-US', 'ja-JP'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-09-02', spec: '1.2 MB' },
  { id: 'm7', image: '/images/product-health.png', kind: 'image', productCode: 'BM-5K-48V', productName: 'LiFePO4 Battery Module 5kWh', categoryKey: 'scene', tagKeys: ['home', 'storage'], langs: ['en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-08-28', spec: '2.6 MB' },
  { id: 'm8', image: '/images/product-power.png', kind: 'image', productCode: 'PS-1000-EU', productName: 'Portable Power Station 1000W', categoryKey: 'promo', tagKeys: ['seasonal'], langs: ['en-US'], ownerKey: 'demo.owner.linlan', createdAt: '2026-08-24', spec: '3.4 MB' },
  { id: 'm9', image: '/images/product-solar.png', kind: 'video', productCode: 'SP-200-FD', productName: 'Foldable Solar Panel 200W', categoryKey: 'clip', tagKeys: ['demo'], langs: ['zh-CN', 'en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-08-19', spec: '01:12' },
  { id: 'm10', image: '/images/product-sports.png', kind: 'document', productCode: 'EV-11K-WB', productName: 'EV Charger Wallbox 11kW', categoryKey: 'spec', tagKeys: ['datasheet'], langs: ['zh-CN', 'en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-08-15', spec: '820 KB' },
  { id: 'm11', image: '/images/product-health.png', kind: 'image', productCode: 'BM-5K-48V', productName: 'LiFePO4 Battery Module 5kWh', categoryKey: 'detail', tagKeys: ['cell', 'withSize'], langs: ['en-US'], ownerKey: 'demo.owner.linlan', createdAt: '2026-08-11', spec: '1.6 MB' },
  { id: 'm12', image: '/images/product-power.png', kind: 'document', productCode: 'PS-1000-EU', productName: 'Portable Power Station 1000W', categoryKey: 'spec', tagKeys: ['datasheet', 'certification'], langs: ['en-US'], ownerKey: 'demo.owner.zhoumu', createdAt: '2026-08-06', spec: '1.1 MB' },
];

/** 素材库按 SKU 关联的口径：同一商品下的素材条数（`prd_product.assets` 的展开依据）。 */
export function materialsOfProduct(productCode: string): readonly MaterialRecord[] {
  return PRODUCT_MATERIALS.filter((material) => material.productCode === productCode);
}
