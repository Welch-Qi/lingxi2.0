import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { EntityForm, type FormSection } from '@/components/EntityForm';
import { findCampaign } from './campaign-data';
import { MKG_CHANNEL_KEYS } from './data';

/**
 * 营销中心 · 活动新建/编辑（/marketing/campaigns/new）—— SCRM 02.1 活动创建与目标。
 *
 * 复用五处录入页共用的 EntityForm 骨架（schema 驱动、提交回列表、必填统一校验）。
 * 两节：基础信息（名称/类型/负责人/部门）+ 目标与预算（周期/目标/预期 GMV/预算/主渠道）。
 * 提交后回活动列表，由列表页统一给出"去了哪"的反馈。
 *
 * 2026-10-06 **编辑态**（用户反馈"点编辑进去内容不可编辑、且不是这条活动"）：
 *   列表的「编辑」原先一律跳 `/marketing/campaigns/new`（**不带 id**），于是：
 *   ① 打开的是空白新建表单，看不到这条活动原有的任何配置；
 *   ② 页头写「新建活动」，与"编辑"这个动作自相矛盾。
 *   现改为 `?id=CM-xxx` 判定两种模式：有 id → 编辑（标题/提交文案切换 + `initialValues`
 *   预填该活动的基础字段）；无 id → 新建。字段清单**不增不减**（编辑态就是同一张表单的预填），
 *   故 SECTIONS 保持一份，靠 initialValues 区分。
 *
 * 预填字段与 `campaign-new` 的 SECTIONS 一一对应：`goalKey`/`ownerKey` 存的是 i18n key
 * （数据层约定：演示数据的中文也是文案 → 存 key），直接当表单值回填即可，
 * 展示仍由 select/label 走 `t()` 翻译。
 */

const CHANNEL_OPTIONS = MKG_CHANNEL_KEYS.map((key) => ({ value: key, labelKey: `mkg.channel.${key}` }));

const SECTIONS: readonly FormSection[] = [
  {
    titleKey: 'mkg.campaign.sec.basic',
    subKey: 'mkg.campaign.sec.basicSub',
    fields: [
      { name: 'name', labelKey: 'mkg.campaign.field.name', kind: 'text', required: true },
      {
        name: 'type',
        labelKey: 'mkg.campaign.field.type',
        kind: 'select',
        required: true,
        options: [
          { value: 'launch', labelKey: 'mkg.campaign.type.launch' },
          { value: 'activate', labelKey: 'mkg.campaign.type.activate' },
          { value: 'convert', labelKey: 'mkg.campaign.type.convert' },
          { value: 'brand', labelKey: 'mkg.campaign.type.brand' },
        ],
      },
      { name: 'owner', labelKey: 'mkg.campaign.field.owner', kind: 'text' },
      { name: 'dept', labelKey: 'mkg.campaign.field.dept', kind: 'text' },
    ],
  },
  {
    titleKey: 'mkg.campaign.sec.goal',
    subKey: 'mkg.campaign.sec.goalSub',
    fields: [
      { name: 'start', labelKey: 'mkg.campaign.field.start', kind: 'date' },
      { name: 'end', labelKey: 'mkg.campaign.field.end', kind: 'date' },
      { name: 'goal', labelKey: 'mkg.campaign.field.goal', kind: 'text' },
      { name: 'gmv', labelKey: 'mkg.campaign.field.gmv', kind: 'number' },
      { name: 'budget', labelKey: 'mkg.campaign.field.budget', kind: 'number' },
      { name: 'channels', labelKey: 'mkg.campaign.field.channels', kind: 'select', options: CHANNEL_OPTIONS },
    ],
  },
];

export default function MarketingCampaignNewPage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const campaign = useMemo(() => (id ? findCampaign(id) : undefined), [id]);
  const isEdit = Boolean(campaign);

  /* 编辑态预填：金额与 GMV 在数据层是 `€80,000` 这样的展示字符串，
     表单里是 number 控件 —— 直接回填会让 `input[type=number]` 拿到非数字值而清空，
     故先剥掉货币符号与千分位逗号。渠道是数组而表单字段是单选，预填第一个主渠道。 */
  const initialValues = campaign
    ? {
        name: campaign.nameKey,
        type: campaign.type,
        owner: campaign.ownerKey,
        start: campaign.start,
        end: campaign.end,
        goal: campaign.goalKey,
        gmv: campaign.gmv.replace(/[^\d.]/g, ''),
        budget: campaign.budget.replace(/[^\d.]/g, ''),
        channels: campaign.channels[0] ?? '',
      }
    : undefined;

  return (
    <EntityForm
      titleKey={isEdit ? 'mkg.campaign.edit.title' : 'mkg.campaign.create.title'}
      subtitleKey={isEdit ? 'mkg.campaign.edit.sub' : 'mkg.campaign.create.sub'}
      backTo="/marketing/campaigns"
      backLabelKey="mkg.campaign.menu"
      variant="compact"
      sections={SECTIONS}
      initialValues={initialValues}
      submitLabelKey={isEdit ? 'mkg.campaign.edit.submit' : 'mkg.campaign.create.submit'}
      submitHintKey={isEdit ? 'mkg.campaign.edit.submitted' : 'mkg.campaign.create.submitted'}
    />
  );
}
