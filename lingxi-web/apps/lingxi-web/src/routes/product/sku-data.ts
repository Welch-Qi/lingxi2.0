/**
 * 商品 SKU（`prd_sku`）演示数据 —— 商品中心的延伸能力。
 *
 * 为什么单独成文件、与 `data.ts` 的 `PRODUCT_MASTER` 同源但分开放：
 * SKU 是「一个 SPU 下的多个可售规格」，结构比主数据细一层（`ProductRecord.skuCount`
 * 就是这一层的数量快照）。把它和主数据混在一张表会让 `data.ts` 既当商品又当 SKU，
 * 跨分区引用时又得拖一大坨。
 *
 * 字段（对齐用户要求：编码 / 名称 / 规格 / 价格 / 图片 / 库存）：
 *  - `code`   SKU 业务编码（带区域后缀，与主数据的 `sku` 同源写法）
 *  - `name`   可售规格名称（专名，不翻译）
 *  - `spec`   规格说明（英文专名写法，遵循 `data.ts` 的演示数据约定：不硬编码中文文案）
 *  - `price`  参考售价（USD，字符串便于受控输入）
 *  - `stock`  库存（台）
 *  - `image`  主图文件名（一期无文件服务，仅留文件名；缺省走 LxThumb 降级）
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/prd/products/:id/skus。
 */

export interface SkuItem {
  id: string;
  /** SKU 业务编码 */
  code: string;
  /** 可售规格名称（专名，不翻译） */
  name: string;
  /** 规格说明 */
  spec: string;
  /** 参考售价（USD） */
  price: string;
  /** 主图文件名 */
  image?: string | undefined;
  /** 库存（台） */
  stock: string;
}

/** 按商品主键索引的 SKU 列表（`ProductRecord.id` 为键）。 */
export const SKUS_BY_PRODUCT: Record<string, readonly SkuItem[]> = {
  '1': [
    { id: '1-s1', code: 'PS-1000-EU', name: 'Portable Power Station 1000W EU', spec: '1000W / EU', price: '899', image: '/images/product-power.png', stock: '120' },
    { id: '1-s2', code: 'PS-1000-US', name: 'Portable Power Station 1000W US', spec: '1000W / US', price: '879', image: '/images/product-power.png', stock: '95' },
    { id: '1-s3', code: 'PS-1000-UK', name: 'Portable Power Station 1000W UK', spec: '1000W / UK', price: '909', image: '/images/product-power.png', stock: '60' },
    { id: '1-s4', code: 'PS-1000-JP', name: 'Portable Power Station 1000W JP', spec: '1000W / JP', price: '929', image: '/images/product-power.png', stock: '40' },
  ],
  '2': [
    { id: '2-s1', code: 'BM-5K-48V', name: 'LiFePO4 Battery Module 5kWh', spec: '5kWh / 48V', price: '1599', image: '/images/product-health.png', stock: '80' },
    { id: '2-s2', code: 'BM-5K-51V', name: 'LiFePO4 Battery Module 5kWh HV', spec: '5kWh / 51.2V', price: '1699', image: '/images/product-health.png', stock: '55' },
    { id: '2-s3', code: 'BM-5K-48V-Rack', name: 'LiFePO4 Battery Module 5kWh Rack', spec: '5kWh / 48V / Rack', price: '1749', image: '/images/product-health.png', stock: '30' },
  ],
  '3': [
    { id: '3-s1', code: 'SP-200-FD', name: 'Foldable Solar Panel 200W', spec: '200W / Foldable', price: '349', image: '/images/product-solar.png', stock: '210' },
    { id: '3-s2', code: 'SP-200-FD-Pro', name: 'Foldable Solar Panel 200W Pro', spec: '200W / Foldable / Dual USB-C', price: '399', image: '/images/product-solar.png', stock: '140' },
  ],
  '4': [{ id: '4-s1', code: 'IV-8K-HY', name: 'Hybrid Inverter 8kW', spec: '8kW / Hybrid', price: '1299', image: '/images/product-smarthome.png', stock: '45' }],
  '5': [
    { id: '5-s1', code: 'EV-11K-WB', name: 'EV Charger Wallbox 11kW', spec: '11kW / Wallbox', price: '599', image: '/images/product-sports.png', stock: '130' },
    { id: '5-s2', code: 'EV-11K-WB-Pro', name: 'EV Charger Wallbox 11kW Pro', spec: '11kW / Wallbox / Connected', price: '699', image: '/images/product-sports.png', stock: '90' },
    { id: '5-s3', code: 'EV-22K-WB', name: 'EV Charger Wallbox 22kW', spec: '22kW / Wallbox', price: '899', image: '/images/product-sports.png', stock: '70' },
    { id: '5-s4', code: 'EV-11K-WB-Dual', name: 'EV Charger Wallbox 11kW Dual', spec: '11kW / Dual-gun', price: '829', image: '/images/product-sports.png', stock: '50' },
    { id: '5-s5', code: 'EV-11K-WB-Smart', name: 'EV Charger Wallbox 11kW Smart', spec: '11kW / Smart dispatch', price: '759', image: '/images/product-sports.png', stock: '60' },
  ],
};

/** 取某商品的 SKU 列表（返回深拷贝，避免直接改到演示常量）。 */
export function skusOfProduct(productId: string): SkuItem[] {
  const source = SKUS_BY_PRODUCT[productId];
  return source ? source.map((item) => ({ ...item })) : [];
}
