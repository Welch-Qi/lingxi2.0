import { EntityForm, type FormSection } from '@/components/EntityForm';

/**
 * 新建工单（/service/tickets/new）—— 服务顾问工作台的「创建工单」动作流入口。
 *
 * 复用五处录入页共用的 EntityForm 壳（客户 / 商机 / 线索 / 商品 / 内容 同款骨架），
 * 只给字段清单。从工作台右栏「创建工单」拉起，提交后回工作台（/service）。
 *
 * 字段：客户名称 / 接入渠道 / 问题类型 / 优先级 / 问题描述。均为演示字段，接入后走 /api/v1/svc/tickets。
 */
const CHANNEL_VALUES = ['ecommerce', 'wechat', 'tiktok', 'whatsapp', 'instagram', 'linkedin', 'facebook'] as const;
const ISSUE_VALUES = ['battery', 'inverter', 'logistics', 'docs'] as const;
const PRIORITY_VALUES = ['high', 'medium', 'low'] as const;

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'svc.new.title',
    subKey: 'svc.new.sub',
    fields: [
      { name: 'customer', labelKey: 'svc.new.customer', kind: 'text', required: true, placeholderKey: 'svc.new.customerPh' },
      { name: 'channel', labelKey: 'svc.new.channel', kind: 'select', required: true, options: CHANNEL_VALUES.map((value) => ({ value, labelKey: `svc.channel.${value}` })) },
      { name: 'issue', labelKey: 'svc.new.issue', kind: 'select', required: true, options: ISSUE_VALUES.map((value) => ({ value, labelKey: `svc.issue.${value}` })) },
      { name: 'priority', labelKey: 'svc.new.priority', kind: 'select', required: true, options: PRIORITY_VALUES.map((value) => ({ value, labelKey: `svc.priority.${value}` })) },
      { name: 'desc', labelKey: 'svc.new.desc', kind: 'textarea', required: true, wide: true, rows: 4, placeholderKey: 'svc.new.descPh' },
    ],
  },
];

export default function ServiceTicketNewPage() {
  return (
    <EntityForm
      titleKey="svc.new.title"
      subtitleKey="svc.new.sub"
      backTo="/service"
      backLabelKey="svc.new.back"
      sections={SECTIONS}
      submitLabelKey="svc.new.submit"
      submitHintKey="svc.new.hint"
    />
  );
}
