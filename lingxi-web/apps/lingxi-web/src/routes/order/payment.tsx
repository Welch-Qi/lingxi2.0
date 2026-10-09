import { EntityForm, type FormSection } from '@/components/EntityForm';

/**
 * 登记回款（/order/payment）—— 记录一笔到账，更新应收账款。
 * 复用 EntityForm 壳。接入后走 /api/v1/ord/receivables。
 */

const METHOD_VALUES = ['wire', 'check', 'card'] as const;

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'ord.payment.title',
    subKey: 'ord.payment.sub',
    fields: [
      { name: 'orderNo', labelKey: 'ord.payment.orderNo', kind: 'text', required: true },
      { name: 'amount', labelKey: 'ord.payment.amount', kind: 'number', required: true },
      { name: 'date', labelKey: 'ord.payment.date', kind: 'date', required: true },
      {
        name: 'method',
        labelKey: 'ord.payment.method',
        kind: 'select',
        required: true,
        options: METHOD_VALUES.map((m) => ({ value: m, labelKey: `ord.payment.method.${m}` })),
      },
      { name: 'note', labelKey: 'ord.payment.note', kind: 'textarea', wide: true, rows: 3 },
    ],
  },
];

export default function OrderPaymentPage() {
  return (
    <EntityForm
      titleKey="ord.payment.title"
      subtitleKey="ord.payment.sub"
      backTo="/order"
      backLabelKey="ord.payment.back"
      sections={SECTIONS}
      submitLabelKey="ord.payment.submit"
      submitHintKey="ord.payment.hint"
      variant="compact"
    />
  );
}
