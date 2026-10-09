import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { EntityForm, type FormSection } from '@/components/EntityForm';
import { OTD_STAGES } from './data';
import { findOpportunityByCode } from '@/routes/opportunity/data';

/**
 * 新建订单（/order/create）—— 录入新销售订单，关联客户与交付节点。
 * 复用五处录入页共用的 EntityForm 壳，字段清单见下。接入后走 /api/v1/ord/orders。
 *
 * 2026-10-07 支持**从商机转单**预填（用户要求商机列表加「转订单」）：
 *   带 `?opp=<商机编码>` 进来时，客户 / 订单号 / 金额 / 预计到港四项由该商机带出。
 *
 *   为什么用查询参数而不是 route state：刷新 / 分享链接后预填仍在，
 *   而 route state 一刷新就丢 —— 那正是"点了转订单、页面看起来是空的"最容易发生的地方。
 *   编码（`opp.code`）而不是 id 上 URL：编码是这套系统里对外的稳定标识
 *   （客户码 / 商机码 / 订单号同族），id 是库内主键，不该出现在地址栏。
 *
 *   订单号在此**按商机编码派生**而非让用户填：转单场景下订单号是系统产物，
 *   让人手输等于给了一个必然填错的机会。规则见 `orderNoFromOpp`。
 */

const STAGE_VALUES = OTD_STAGES.map((s) => s.key);

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'ord.create.title',
    subKey: 'ord.create.sub',
    fields: [
      { name: 'customer', labelKey: 'ord.create.customer', kind: 'text', required: true },
      { name: 'orderNo', labelKey: 'ord.create.orderNo', kind: 'text', required: true },
      {
        name: 'currency',
        labelKey: 'ord.create.currency',
        kind: 'select',
        required: true,
        options: [
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ],
      },
      { name: 'amount', labelKey: 'ord.create.amount', kind: 'number', required: true },
      {
        name: 'stage',
        labelKey: 'ord.create.stage',
        kind: 'select',
        required: true,
        options: STAGE_VALUES.map((key) => ({ value: key, labelKey: `ord.stage.${key}.label` })),
      },
      { name: 'eta', labelKey: 'ord.create.eta', kind: 'date', required: true },
      { name: 'note', labelKey: 'ord.create.note', kind: 'textarea', wide: true, rows: 4 },
    ],
  },
];

/**
 * 订单号由商机编码派生：`SO-` + 商机码的末 6 位。
 *
 * 与订单域既有演示数据的编号形态一致（`SO-2026-0418`），这样转出来的单号
 * 落在订单列表里看着是同一套号，不会出现"转出来的订单号跟别的完全不是一个样"。
 * 商机码末 6 位已含国家与客户内序号，撞号概率在本演示数据内为零。
 */
function orderNoFromOpp(oppCode: string): string {
  return `SO-${oppCode.slice(-6)}`;
}

export default function OrderCreatePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const oppCode = params.get('opp');

  const row = useMemo(() => findOpportunityByCode(oppCode ?? undefined), [oppCode]);

  /**
   * 预填值。
   *
   * 金额除以 100：商机侧 `amountMinor` 是**分**，订单表单的 `amount` 是人填的
   * 主单位整数。演示数据的商机金额本来就是「万元级整数」（如 1560000 分 = 1.56 万），
   * 直接传 1560000 会让表单里出现七位数，用户以为单位错了。
   *
   * 预计到港用商机的 `expectedClose`：转单发生在成交前后，此时"预计到港"只能以
   * 预计成交时间为起点，没有更准的数可给（`Opportunity.expectedClose` 是必填 string，
   * 不存在空值分支）。
   */
  const initialValues = useMemo<Record<string, string> | undefined>(() => {
    if (!row) {
      return undefined;
    }
    return {
      customer: row.customerName,
      orderNo: orderNoFromOpp(row.code),
      amount: String(Math.round(row.amountMinor / 100)),
      eta: row.expectedClose,
    };
  }, [row]);

  return (
    <EntityForm
      titleKey={row ? 'ord.create.fromOpp' : 'ord.create.title'}
      /* 转单来时把来源说清楚：否则用户在一个空表单里看到预填的 4 个值，
         分不清是系统带过来的还是自己刚才填的（而他其实什么都没填）。 */
      subtitleKey={row ? 'ord.create.fromOppSub' : 'ord.create.sub'}
      backTo={row ? `/opportunity/${row.id}` : '/order'}
      backLabelKey={row ? 'opp.detail.back' : 'ord.create.back'}
      sections={SECTIONS}
      submitLabelKey="ord.create.submit"
      submitHintKey="ord.create.hint"
      variant="compact"
      initialValues={initialValues}
      /* 客户名带上来源商机编码：转单后回头查"这单是哪条商机转来的"，
         只看客户名无从判断（一个客户会有多条商机）。 */
      headerExtra={
        row ? <span className="lx-chip lx-muted">{t('ord.create.fromOppTag', { code: row.code })}</span> : undefined
      }
    />
  );
}
