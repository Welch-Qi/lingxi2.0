import type { FormFieldOption, FormSection } from '@/components/EntityForm';
import { INDUSTRY_OPTIONS, MARKET_OPTIONS, OWNER_OPTIONS, SOURCE_OPTIONS } from './market-options';
import type { CustomerRecord } from './data';

/**
 * 客户档案字段清单 —— **新建页与编辑抽屉共用同一份**（2026-10-07 第二十轮）。
 *
 * 之前这份清单写在 `new.tsx` 里，于是客户 360 加「编辑客户」时它就只差一步抄第二份。
 * 两份的后果不是"多几行代码"：客户档案是**单一事实源**（商机、跟进、360 三处都引用它），
 * 字段增删要同步到两个页面，漏一处就会出现"新建时能填这个字段、编辑时改不了"——
 * 用户会判定编辑功能是残的，而两处字段清单长得一模一样时没人会去核对。
 *
 * 字段项本身不写在这里，见 `new.tsx` 的分节理由（归属与联系方式是两拨人关心的）。
 */

/** 客户类型：新潜 / 首次成交 / 复购。与配置中心「客户类型」字典同源取值域。 */
export const CUS_TYPE_OPTIONS: readonly FormFieldOption[] = [
  { value: 'prospect', labelKey: 'cus.type.prospect' },
  { value: 'first', labelKey: 'cus.type.first' },
  { value: 'repeat', labelKey: 'cus.type.repeat' },
];

/** 价值分层：S/A/B/C/D，与 360 页的分层徽标同源。 */
export const CUS_TIER_OPTIONS: readonly FormFieldOption[] = [
  { value: 's', labelKey: 'cus.tier.s' },
  { value: 'a', labelKey: 'cus.tier.a' },
  { value: 'b', labelKey: 'cus.tier.b' },
  { value: 'c', labelKey: 'cus.tier.c' },
  { value: 'd', labelKey: 'cus.tier.d' },
];

export const CUSTOMER_SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'cus.new.sec.basic',
    subKey: 'cus.new.sec.basic.sub',
    fields: [
      { name: 'name', labelKey: 'cus.col.name', kind: 'text', required: true, wide: true },
      {
        name: 'code',
        labelKey: 'cus.new.field.code',
        kind: 'text',
        hintKey: 'cus.new.hint.code',
      },
      { name: 'type', labelKey: 'cus.col.type', kind: 'select', required: true, options: CUS_TYPE_OPTIONS },
      { name: 'tier', labelKey: 'cus.new.field.tier', kind: 'select', required: true, options: CUS_TIER_OPTIONS },
      { name: 'industryKey', labelKey: 'cus.new.field.industry', kind: 'select', options: INDUSTRY_OPTIONS },
      { name: 'sourceKey', labelKey: 'cus.new.field.source', kind: 'select', options: SOURCE_OPTIONS },
    ],
  },
  {
    titleKey: 'cus.new.sec.contact',
    subKey: 'cus.new.sec.contact.sub',
    fields: [
      { name: 'countryKey', labelKey: 'cus.col.country', kind: 'select', required: true, options: MARKET_OPTIONS },
      { name: 'city', labelKey: 'cus.col.city', kind: 'text' },
      { name: 'contact', labelKey: 'cus.col.contact', kind: 'text', required: true },
      { name: 'contactRole', labelKey: 'cus.new.field.contactRole', kind: 'text' },
      {
        name: 'scale',
        labelKey: 'cus.new.field.scale',
        kind: 'number',
        hintKey: 'cus.new.hint.scale',
      },
      { name: 'ownerKey', labelKey: 'cus.col.owner', kind: 'select', required: true, options: OWNER_OPTIONS },
      {
        name: 'note',
        labelKey: 'cus.new.field.note',
        kind: 'textarea',
        rows: 3,
        wide: true,
      },
    ],
  },
];

/**
 * 编辑抽屉的字段清单 = 新建清单**去掉「备注」**（2026-10-07 第二十轮）。
 *
 * 理由是"可编辑的字段必须看得见改动"：360 页的页头与客户主体字段表里没有备注位，
 * 让用户在那里改一段备注、改完什么都没有，是静默失败 —— 比不给这个字段更糟。
 * 备注要在本页有落点（后续单独做）再放进编辑清单。
 *
 * 唯一例外清单是**建档时间**：它显示在字段表里，但属于历史事实而不是"基本信息"，
 * 改它等于伪造这条客户何时进入系统，故不给改。
 */
export const CUSTOMER_EDIT_SECTIONS: readonly FormSection[] = CUSTOMER_SECTIONS.map((section) => ({
  ...section,
  fields: section.fields.filter((field) => field.name !== 'note'),
}));

/* ---------------------------------------------------------------------------
 * 客户记录的枚举字段 ↔ 表单控件值的编解码。
 *
 * 为什么要编解码而不是直接 `value={customer.countryKey}`：**两边编码不同**。
 *   · 数据层 `countryKey: 'demo.market.de'`（i18n key，页面用 `t(key)` 渲染）；
 *   · 表单下拉 `MARKET_OPTIONS` 的 value 是 `'DE'`（ISO 3166-1 二位码，注释里
 *     写明"它是数据不是文案"，英文站也不该显示"德国"）。
 * 差别覆盖国家/行业/来源/负责人四项，四个字段各写一次转换就是四处重复。
 *
 * 换出来的值**仍存完整 i18n key**（与 `CustomerRecord` 同构），这样 360 页的
 * 渲染代码一行都不用改、编辑后的显示也自动跟随语言切换；若改成存末段短码，
 * 页头 `t(customer.industryKey)` 就会渲染出一个裸的 `storage`。
 * --------------------------------------------------------------------------- */

/** 完整 key → 末段短码（`'demo.market.de'` → `'de'`）。 */
function keyToCode(key: string): string {
  return key.split('.').pop() ?? key;
}

/**
 * 末段短码 → 完整 key（`'DE'` → `'demo.market.de'`）。
 * 一律小写：ISO 码是大写、国家 key 是小写，其余四项本来就是小写。
 */
function codeToKey(code: string, prefix: string): string {
  return `${prefix}.${code.toLowerCase()}`;
}

/**
 * 某字段的当前值不在候选里时，把它补进下拉顶部。
 *
 * 这是**必须**的，不是兜底美化：演示数据里 `ownerKey` 有 `demo.owner.echo`
 * （Echo 智能体，见 zh-CN 语言包），而 `OWNER_OPTIONS` 按其文件头约定
 * 「只列真人 + 待分配」并不含它。直接 `value='echo'` 落不到任何 `<option>` 上，
 * 原生 select 会显示**空白**——用户看到的正是"负责人没填"，
 * 再点保存就把负责人静默抹成空值。一条演示数据被编辑一次就坏一个字段。
 *
 * 不改 `OWNER_OPTIONS` 加 Echo：那份是客户域与线索域共用的"人工指派"候选，
 * 文件头明确写了只列真人；为修一个编辑态的显示问题去动共用候选，
 * 会让线索新建页凭空多出一个智能体负责人。
 *
 * `label` 传**翻译后的文本**而不是原始 key（2026-10-07 目视截图发现）：
 * 兜底项的文案是从记录里现取的，用 key 当 label 会让下拉里赫然写着
 * `demo.owner.echo`，而同一个字段在 360 页头显示的是「Echo（智能体）」——
 * 同一个值在同一页出现两种写法，用户会以为数据坏了。`labelKey` 不适用，
 * 这里的 key 是运行时从记录里读出来的，不是静态字面量。
 */
function withCurrent(
  options: readonly FormFieldOption[],
  value: string,
  label: string,
): readonly FormFieldOption[] {
  if (value === '' || options.some((option) => option.value === value)) {
    return options;
  }
  return [{ value, label }, ...options];
}

/**
 * 编辑抽屉的 sections：把 `CUSTOMER_EDIT_SECTIONS` 里四个枚举字段的候选
 * 补上"当前值"兜底。
 *
 * 传 `original`（原客户记录）而不是仅传 values：只有**原记录里**那个值才需要被
 * 兜住。若按表单当前值补，一个刚被用户选中的新值自然已在候选里，补了也是空操作；
 * 而原值不在候选时，兜底才真的起作用。
 *
 * `t` 供兜底项翻译 label 用，理由见 `withCurrent` 的注释。
 */
export function customerEditSections(
  original: CustomerRecord,
  t: (key: string) => string,
): readonly FormSection[] {
  const ownerCode = keyToCode(original.ownerKey);
  const industryCode = keyToCode(original.industryKey);
  const sourceCode = keyToCode(original.sourceKey);
  const countryCode = keyToCode(original.countryKey).toUpperCase();

  return CUSTOMER_EDIT_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      if (field.kind !== 'select' || !field.options) {
        return field;
      }
      switch (field.name) {
        case 'ownerKey':
          return { ...field, options: withCurrent(field.options, ownerCode, t(original.ownerKey)) };
        case 'industryKey':
          return { ...field, options: withCurrent(field.options, industryCode, t(original.industryKey)) };
        case 'sourceKey':
          return { ...field, options: withCurrent(field.options, sourceCode, t(original.sourceKey)) };
        case 'countryKey':
          return { ...field, options: withCurrent(field.options, countryCode, t(original.countryKey)) };
        default:
          return field;
      }
    }),
  }));
}

/**
 * 客户记录 → 编辑抽屉初值。
 *
 * `t` 必须显式传入：语言包在运行时才可读，模块作用域里取不到，
 * 而联系人的展示值是**人名**（`demo.contact.weber` → "Weber"）——
 * 直接把 key 填进文本框，用户会看到 `demo.contact.weber` 这串东西。
 *
 * `t` 的类型用 `(key: string) => string` 而非 i18n 的 `TFunction`：
 * 这里只需要"把 key 翻成当前语言的文本"，把依赖面收到最小。
 */
export function customerEditValues(
  customer: CustomerRecord,
  t: (key: string) => string,
): Record<string, string> {
  return {
    name: customer.name,
    code: customer.code,
    type: customer.type,
    tier: customer.tier,
    // 行业/来源/国家/负责人：完整 key → 短码
    industryKey: keyToCode(customer.industryKey),
    sourceKey: keyToCode(customer.sourceKey),
    countryKey: keyToCode(customer.countryKey).toUpperCase(),
    ownerKey: keyToCode(customer.ownerKey),
    city: t(customer.cityKey),
    contact: t(customer.contactKey),
    contactRole: t(customer.contactRoleKey),
    scale: String(customer.scale),
  };
}

/**
 * 编辑抽屉提交值 → 客户记录**的部分覆盖**（形状与 `CustomerRecord` 同构）。
 *
 * 返回的是**覆盖量**而不是整条记录：演示态不写共享数据集（`CUSTOMERS` 是模块级
 * 常量，164 家客户的数组被四个页面引用），所以改动只落在本页 state 里。
 * 用覆盖量而不是"改好的一条完整记录"是为了让未编辑的字段天然保持原值 ——
 * 要凑出完整记录就得把 id / createdAt / opportunities 也复制一遍。
 *
 * `original` 用于联系人/城市三项的兜底：那三项在记录里是 i18n key
 * （`demo.contact.weber`），而表单给的是**翻译后的文本**（"Weber"）。
 * 提交值与原文不同即视为用户改过，落文本；相同则保留原 key。
 * 演示态不做"文本反查 key"（同名不同人无法机器判定），中文态下原文保真，
 * 英文态下若用户没动则仍显示原 key 翻译后的英文 —— 与改动前一致。
 */
export function customerEditPatch(
  values: Record<string, string>,
  original: CustomerRecord,
  t: (key: string) => string,
): Partial<CustomerRecord> {
  const text = (name: string, originalKey: string): string => {
    const next = values[name] ?? '';
    return next === '' || next === t(originalKey) ? originalKey : next;
  };

  return {
    name: values.name ?? '',
    code: values.code ?? '',
    type: (values.type || 'prospect') as CustomerRecord['type'],
    tier: (values.tier || 'd') as CustomerRecord['tier'],
    industryKey: codeToKey(values.industryKey ?? '', 'demo.industry'),
    sourceKey: codeToKey(values.sourceKey ?? '', 'demo.source'),
    countryKey: codeToKey(values.countryKey ?? '', 'demo.market'),
    ownerKey: codeToKey(values.ownerKey ?? '', 'demo.owner'),
    cityKey: text('city', original.cityKey),
    contactKey: text('contact', original.contactKey),
    contactRoleKey: text('contactRole', original.contactRoleKey),
    scale: Number(values.scale) || 0,
  };
}
