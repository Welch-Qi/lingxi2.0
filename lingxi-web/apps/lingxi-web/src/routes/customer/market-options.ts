/**
 * 目标市场（23 国）—— 客户建档、客户导入、线索登记、线索导入共用的一个国家下拉。
 *
 * 为什么单独成文件而不是塞回 `data.ts`：`data.ts` 是**客户记录**的事实源（164 家客户），
 * 这里是**枚举**（国家选项）。两件事的变更频率与变更人都不一样 ——
 * 加一个国家不该碰到 800 行的客户数据。
 *
 * 为什么客户域与线索域共用一份：线索转化成客户时国家字段是直传的，
 * 两份列表一旦漂移，就会出现"线索里有菲律宾、转成客户时选不到"。
 * 客户域三中心本来就共用词汇与枚举（见 MEMORY §八）。
 *
 * `value` 用 ISO 3166 二位码：它是数据、不是文案（英文站也不该显示"德国"），
 * 展示名走 `demo.market.xx`，与客户列表里国家列的取法一致。
 *
 * 写成字面量数组、不用 `.map()` 生成：check-i18n 只认 `xxxKey: '字面量'`，
 * 循环拼出来的 key 在门禁眼里等于不存在。
 */

/** 选项形状与 `@/components/EntityForm` 的 `FormFieldOption` 一致（此处不 import，避免数据文件依赖组件）。 */
export interface MarketOption {
  /** ISO 3166-1 alpha-2 大写在前的国家码 */
  readonly value: string;
  /** 展示名 i18n key */
  readonly labelKey: string;
}

export const MARKET_OPTIONS: readonly MarketOption[] = [
  { value: 'AT', labelKey: 'demo.market.at' },
  { value: 'AU', labelKey: 'demo.market.au' },
  { value: 'BR', labelKey: 'demo.market.br' },
  { value: 'CA', labelKey: 'demo.market.ca' },
  { value: 'CL', labelKey: 'demo.market.cl' },
  { value: 'DE', labelKey: 'demo.market.de' },
  { value: 'DK', labelKey: 'demo.market.dk' },
  { value: 'EE', labelKey: 'demo.market.ee' },
  { value: 'ES', labelKey: 'demo.market.es' },
  { value: 'FR', labelKey: 'demo.market.fr' },
  { value: 'IT', labelKey: 'demo.market.it' },
  { value: 'JP', labelKey: 'demo.market.jp' },
  { value: 'NL', labelKey: 'demo.market.nl' },
  { value: 'NO', labelKey: 'demo.market.no' },
  { value: 'PE', labelKey: 'demo.market.pe' },
  { value: 'PH', labelKey: 'demo.market.ph' },
  { value: 'PL', labelKey: 'demo.market.pl' },
  { value: 'SE', labelKey: 'demo.market.se' },
  { value: 'TR', labelKey: 'demo.market.tr' },
  { value: 'UK', labelKey: 'demo.market.uk' },
  { value: 'US', labelKey: 'demo.market.us' },
  { value: 'VN', labelKey: 'demo.market.vn' },
  { value: 'ZA', labelKey: 'demo.market.za' },
];

/** 线索来源 / 客户来源：与客户列表的「来源」列同一份候选值。 */
export const SOURCE_OPTIONS: readonly MarketOption[] = [
  { value: 'customs', labelKey: 'demo.source.customs' },
  { value: 'email', labelKey: 'demo.source.email' },
  { value: 'expo', labelKey: 'demo.source.expo' },
  { value: 'social', labelKey: 'demo.source.social' },
  { value: 'website', labelKey: 'demo.source.website' },
];

/** 所属行业：客户档案的行业字段。 */
export const INDUSTRY_OPTIONS: readonly MarketOption[] = [
  { value: 'storage', labelKey: 'demo.industry.storage' },
  { value: 'solar', labelKey: 'demo.industry.solar' },
  { value: 'inverter', labelKey: 'demo.industry.inverter' },
  { value: 'charging', labelKey: 'demo.industry.charging' },
  { value: 'mining', labelKey: 'demo.industry.mining' },
];

/**
 * 归属人：只列真人。
 * 「待分配」单独给——导入场景下确实允许先不指派（等认领），
 * 但人工新建时选它是明确的意思表达，故保留在候选里而不隐藏。
 */
export const OWNER_OPTIONS: readonly MarketOption[] = [
  { value: 'linlan', labelKey: 'demo.owner.linlan' },
  { value: 'zhoumu', labelKey: 'demo.owner.zhoumu' },
  { value: 'unassigned', labelKey: 'demo.owner.unassigned' },
];
