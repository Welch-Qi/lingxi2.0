import type { FormFieldOption, FormSection } from '@/components/EntityForm';
import { PRODUCT_MASTER } from '../product/data';
import type { OpportunityRow } from './data';

/**
 * 商机字段清单 —— **新建页与详情页的编辑抽屉共用同一份**（2026-10-07 第二十轮）。
 *
 * 与客户档案同一条理由：字段清单抄两份，改一处（加字段、调整必填）就只改了一处，
 * 于是「新建能填、编辑不能改」，用户会判定编辑功能是残的。
 *
 * 清单放在 `fields` 而不是页面文件里：详情页要复用，而 `new.tsx` 是页面组件 ——
 * 从一个页面 import 另一个页面会把它连同默认导出与整棵依赖树一起拖进来，
 * 将来 `new.tsx` 若引 detail 页的东西就成环了。
 *
 * `PRODUCT_MASTER` 在此直接 map 而不从 `new.tsx` 取：反向依赖同样会成环
 * （new → fields → new），而 `PRODUCT_MASTER` 是数据层，两边都可安全依赖。
 */

/** 意向产品：值是商品主键（与 `Opportunity.intendedProductId` 同口径），标签是 `SKU · 品名`。 */
const PRODUCT_OPTIONS: readonly FormFieldOption[] = PRODUCT_MASTER.map((product) => ({
  value: product.id,
  label: `${product.sku} · ${product.name}`,
}));

/** 跟进人：只列真人，不含「待分配」—— 商机的跟进 SLA 挂在人头上，允许无主 = 允许没人管。 */
const OWNER_OPTIONS: readonly FormFieldOption[] = [
  { value: 'linlan', labelKey: 'demo.owner.linlan' },
  { value: 'zhoumu', labelKey: 'demo.owner.zhoumu' },
];

/** 负责人：记录里是 i18n key（`demo.owner.linlan`），下拉 value 是短码（`linlan`）。 */
function ownerCode(key: string): string {
  return key.split('.').pop() ?? key;
}

/**
 * 当前值不在候选里时，把它补进下拉顶部（label 用**翻译后的文本**）。
 *
 * 与客户侧 `customer/fields.ts` 的 `withCurrent` 是同一条判据，两处必须同时存在：
 * 演示数据里有一批商机的跟进人是 `demo.owner.echo`（Echo 智能体），
 * 而 `OWNER_OPTIONS` 按注释只列真人。原生 `<select>` 的 `value` 落不到任何
 * `<option>` 上时**显示空白** —— 用户看到的是"跟进人没填"，
 * 一路点保存就把跟进人静默抹掉。而空跟进人 = 跟进 SLA 无人可挂，
 * 详情页那条「A · 7 天内 ≥1 次跟进」立刻变成假话。
 *
 * 不改 `OWNER_OPTIONS` 加 Echo：那会让**新建页**也凭空多出一个智能体选项，
 * 而新建时机器跟进人是合理的默认（新商机先由智能体接住），不该由这份清单替产品做决定。
 * 本页是**编辑既有数据**，兜住既有值才是本分。
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
 * 构造字段清单。
 *
 * 阶段与意向的选项来自业务字典（配置中心可改顺序与启用状态），只能通过 hook 读，
 * 故不能留在模块作用域 —— 与 `new.tsx` 迁移前的处置一致。
 *
 * `editableStages` 是**可改阶段集合**，调用方给：
 *   · 新建页传全部阶段（此时 `new.tsx` 传 `STAGE_ORDER`）；
 *   · 详情页传 `forwardStages(row.stage)`（当前段及其之后）——
 *     阶段记的是过程事实，退回等于把谈过的事当没谈过。
 * 无论哪个调用方，下拉里都不会出现一段"选了却改不回去"的阶段：
 * 用户选了没生效，比不给这个选项更糟。
 */
export function buildOppSections(
  stageOptions: readonly FormFieldOption[],
  intentOptions: readonly FormFieldOption[],
  editableStages: readonly string[],
): readonly FormSection[] {
  const stageSubset = stageOptions.filter((option) => editableStages.includes(option.value));

  return [
    {
      titleKey: 'opp.new.sec.basic',
      subKey: 'opp.new.sec.basic.sub',
      fields: [
        { name: 'name', labelKey: 'opp.new.field.name', kind: 'text', required: true, wide: true },
        {
          name: 'customer',
          labelKey: 'opp.col.customer',
          kind: 'text',
          required: true,
          hintKey: 'opp.new.hint.customer',
        },
        { name: 'intendedProductId', labelKey: 'opp.col.product', kind: 'select', options: PRODUCT_OPTIONS },
        { name: 'stage', labelKey: 'opp.col.stage', kind: 'select', required: true, options: stageSubset },
        { name: 'intent', labelKey: 'cus.col.intent', kind: 'select', required: true, options: intentOptions },
        {
          name: 'amount',
          labelKey: 'opp.new.field.amount',
          kind: 'number',
          hintKey: 'opp.new.hint.amount',
        },
      ],
    },
    {
      titleKey: 'opp.new.sec.follow',
      subKey: 'opp.new.sec.follow.sub',
      fields: [
        { name: 'ownerKey', labelKey: 'opp.col.owner', kind: 'select', required: true, options: OWNER_OPTIONS },
        { name: 'expectedClose', labelKey: 'opp.new.field.expectedClose', kind: 'date' },
        { name: 'nextFollowUp', labelKey: 'cus.col.nextFollow', kind: 'date' },
        { name: 'bant', labelKey: 'opp.new.field.bant', kind: 'text', hintKey: 'opp.new.hint.bant' },
        {
          name: 'note',
          labelKey: 'opp.new.field.note',
          kind: 'textarea',
          rows: 4,
          wide: true,
          placeholderKey: 'opp.new.ph.note',
        },
      ],
    },
  ];
}

/**
 * 详情页编辑抽屉的字段清单（2026-10-07）。
 *
 * 相对新建清单做两处裁剪/变形，每处都有理由：
 *  ① **「所属客户」只读展示** —— 换客户等于这条商机归属换了主体，是**转单**不是改单，
 *     而本页没有承接转单的流程。所以它**不可改**；
 *     但 2026-10-07 起**不再裁掉**：藏起来会让用户以为这条商机没有客户
 *     （用户原话"点击编辑后未展示客户信息"）。展示 + `readOnly` 才是"看得到、动不了"。
 *  ② **「备注」不给改** —— 详情页正文没有备注的展示位（见客户 360 的同条处置）。
 *  ③ **BANT 保留可改**：它在本页右栏「商机过程」里有展示位，是要当场纠正的事实。
 *
 * 阶段与意向**保留在清单里**但按当前值收窄：页头的阶段下拉与右栏的意向下拉
 * 是那两个字段的第一入口，抽屉里再给一次是**同一取值域的第二条路径**，
 * 两条路径的可改范围必须一致（都走 `forwardStages` / 都在已关闭时锁定意向）。
 */
export function oppEditSections(
  row: OpportunityRow,
  stageOptions: readonly FormFieldOption[],
  intentOptions: readonly FormFieldOption[],
  editableStages: readonly string[],
  t: (key: string) => string,
): readonly FormSection[] {
  const lockedIntent = !row.isOpen;
  return buildOppSections(stageOptions, intentOptions, editableStages).map((section) => ({
    ...section,
    fields: section.fields
      // ① 备注不可改；客户**保留但转只读**（见下）
      .filter((field) => field.name !== 'note')
      .map((field) => {
        if (field.name === 'customer') {
          /* 「所属客户」改为**只读展示**（2026-10-07，用户反馈"点击编辑后未展示客户信息"）。
             此前是整字段裁掉，理由是"换客户是转单不是改单"—— 那个理由对**不可改**成立，
             但推不出"不展示"：抽屉里看不见客户名，用户第一反应是这条商机怎么没有客户，
             而不是"哦这个字段不给改"。

             两害相权：**展示但禁用**优于**藏起来**。所以走 `readOnly` 而不是
             `kind: 'text'` + 不写回 —— 后者是一个能改却不生效的控件，那是撒谎。

             客户名仍是 `required`（它有展示位，抽屉不该因为它为空拦提交），
             但 `readOnly` 字段不参与必填校验（FormSections 的 collectMissing 只看 required），
             两者不冲突。 */
          return { ...field, readOnly: true, required: false, hintKey: 'opp.new.hint.customer' };
        }
        if (field.name === 'intent' && lockedIntent) {
          // 已关闭商机不评意向等级（§3.6 口径）：下拉只留当前值并整体禁用，
          // 与页内那个下拉的置灰处置一致。
          return {
            ...field,
            options: (field.options ?? []).filter((option) => option.value === row.intent),
          };
        }
        if (field.name === 'ownerKey') {
          // 兜住"跟进人是智能体 / 已离职同事"这类不在候选里的既有值，
          // 否则打开抽屉这一格就是空白，保存即抹掉。理由见 withCurrent。
          return {
            ...field,
            options: withCurrent(field.options ?? [], ownerCode(row.ownerKey), t(row.ownerKey)),
          };
        }
        return field;
      }),
  }));
}

/**
 * 商机行 → 编辑抽屉初值。
 *
 * 金额除以 100：`Opportunity.amountMinor` 是**分**，表单 `amount` 是主单位整数。
 * 阶段与意向落**原值**（`row.stage` / `row.intent`）而不是详情页可能已改过的 override ——
 * 抽屉初值描述的是"这条商机存的是什么"，而 override 只是本页 UI 的临时状态；
 * 两者混用会出现"打开抽屉看到的是页头刚改的那个值，保存后却把原值写了回去"。
 *
 * `t` 用于把 BANT 那类**存 i18n key 的文本字段**翻成当前语言的文本再填进输入框。
 * 这是 2026-10-07 目视截图发现的：文本框里赫然写着 `demo.bant.a1`，
 * 而它在右栏「商机过程」里的展示是「预算已定，采购流程走起」——
 * 同一个值两种写法，用户会以为字段坏了。`bantKey` 是自由文本字段，
 * 它可能是一句人话而不是 key，故一律走 `t()`：查不到时 i18next 原样返回入参，
 * 那正是"这句本来就是文本"的正确行为。
 */
export function oppEditValues(row: OpportunityRow, t: (key: string) => string): Record<string, string> {
  return {
    name: row.name,
    customer: row.customerName,
    intendedProductId: row.intendedProductId,
    stage: row.stage,
    intent: row.intent,
    amount: String(Math.round(row.amountMinor / 100)),
    ownerKey: ownerCode(row.ownerKey),
    expectedClose: row.expectedClose,
    nextFollowUp: row.nextFollowUp,
    bant: t(row.bantKey),
  };
}

/**
 * 编辑抽屉提交值 → 商机行的**部分覆盖**（形状与 `OpportunityRow` 同构）。
 *
 * 只回填可改字段：客户（不可改 —— 换客户是转单不是改单）、备注（无展示位）。
 * 阶段与意向虽然也在清单里，但它们的**专责入口是页头与右栏那两个下拉**；
 * 抽屉里的这条是同一条路径的第二个入口，故一律**回落到原值**：
 * 两个入口都允许改，那么"保存后哪个生效"必须有确定答案 —— 约定是
 * 页头/右栏改的（stageOverride / intentOverride）优先，抽屉只是把值写回原处，
 * 不会静默推翻用户刚在下拉里做的选择。
 *
 * 阶段另有一道守卫：提交值不在 `forwardStages` 范围内就丢弃。
 * 下拉已经收窄过，这道是防"配置中心在另一处改了阶段字典的启用状态、
 * 导致可选项与本行实际阶段不一致"的边缘情况 —— 那时宁可不改，也不能改成一个非法阶段。
 *
 * 负责人回填完整 i18n key（`demo.owner.linlan`），与数据层同构，
 * 这样详情页的 `t(view.ownerKey)` 照旧工作、英文态自动跟随。
 *
 * BANT（以及客户侧的城市/联系人）存的是 i18n key，而表单给的是**翻译后的文本**。
 * 演示态不做"文本反查 key"（同一句 BANT 理由可能对应多个 key，无法机器判定），
 * 故：值与原翻译文本相同就保留原 key，改了才落文本。
 * 落文本后 `t(key)` 查不到该 key —— 本仓没配 `parseMissingKeyHandler`，
 * i18next 的默认行为是**原样返回入参**，于是页面上就显示用户刚填的那段话，
 * 英文态同理（不会变成裸 key）。这是刻意依赖该默认行为，故写在这里。
 */
export function oppEditPatch(
  values: Record<string, string>,
  row: OpportunityRow,
  t: (key: string) => string,
  editableStages: readonly string[],
): Partial<OpportunityRow> {
  const stage = values.stage ?? '';
  const amount = Number(values.amount);
  const nextOwner = values.ownerKey ?? '';
  const bant = values.bant ?? '';

  return {
    name: values.name ?? '',
    intendedProductId: values.intendedProductId ?? '',
    stage: editableStages.includes(stage) ? (stage as OpportunityRow['stage']) : row.stage,
    intent: row.intent,
    amountMinor: Number.isFinite(amount) ? Math.round(amount * 100) : row.amountMinor,
    ownerKey: nextOwner === '' ? row.ownerKey : `demo.owner.${nextOwner.toLowerCase()}`,
    expectedClose: values.expectedClose === '' ? row.expectedClose : (values.expectedClose as string),
    nextFollowUp: values.nextFollowUp === '' ? row.nextFollowUp : (values.nextFollowUp as string),
    bantKey: bant === '' || bant === t(row.bantKey) ? row.bantKey : bant,
  };
}
