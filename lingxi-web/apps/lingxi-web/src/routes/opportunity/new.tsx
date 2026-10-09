import { EntityForm, type FormFieldOption } from '@/components/EntityForm';
import { STAGE_ORDER } from '@/routes/customer/data';
import { useIntentOptions, useStageOptions } from './options';
import { buildOppSections } from './fields';

/**
 * 新建商机（`/opportunity/new`）—— 商机中心的人工入口。
 *
 * 商机不是"客户的一个字段"，而是**一次有金额、有阶段、有下一步的买卖过程**。
 * 所以这一页必填的四项正好是这四个问题的答案：
 *   名称（是什么）· 客户（卖给谁）· 阶段（走到哪了）· 意向等级（值不值得投时间）。
 * 其余字段（金额、预计成交、下次跟进）都允许先空着 —— 首次接触时本来就不知道。
 *
 * 意向等级必填且只给 A-D 四档：`data.ts` 里 `INTENT_SLA_DAYS` 是**按等级算跟进 SLA** 的
 * （A 级 7 天、B 级 30 天、C/D 不设），没有等级就没有超期判据，
 * 跟进页那条"超期队列"会直接少掉这一类商机。这就是它不能留空的原因。
 *
 * 归属人**不给「待分配」**：商机的跟进 SLA 挂在人头上，允许无主 = 允许没人管。
 * 线索可以待认领（登记时确实不知道谁跟），商机不行。
 *
 * 「所属客户」一期是自由文本（输入客户编码或名称）：客户列表有 164 家，
 * 做成下拉会是一个 164 项的长列表，比手输更难用。接入后改为联想选择。
 *
 * 字段清单在 `./fields`（2026-10-07 抽出，与详情页的「编辑商机」抽屉共用），
 * 阶段/意向的选项来自业务字典（配置中心可改顺序与启用状态），
 * 而字典只能通过 hook 读，故清单在组件内构造而非留在模块作用域。
 *
 * 新建时阶段可选**全部 7 段**（`STAGE_ORDER`）—— 详情页才收窄到 `forwardStages`。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/cus/opportunities。
 */

export default function OpportunityNewPage() {
  /** 阶段/意向选项来自业务字典（配置中心可改顺序与启用状态），
      不再在本页硬编码 —— 收敛前 new/detail/follow/index 四处各有一份字面量。 */
  const stageOptions: readonly FormFieldOption[] = useStageOptions(true).map((o) => ({
    value: o.value,
    labelKey: o.labelKey,
  }));
  const intentOptions: readonly FormFieldOption[] = useIntentOptions().map((o) => ({
    value: o.value,
    labelKey: o.labelKey,
  }));

  return (
    <EntityForm
      titleKey="opp.new.title"
      subtitleKey="opp.new.subtitle"
      backTo="/opportunity"
      backLabelKey="opp.back.list"
      /* compact：4 列自适应栅格 + 「标签上·控件下」，同类属性一行多个（2026-10-06）。
         与客户新建页同一版式决策：default 变体下 11 个字段铺成 6 屏，
         "信息不够集中"就是它造成的。只有商机名称与备注保留 wide。 */
      variant="compact"
      sections={buildOppSections(stageOptions, intentOptions, STAGE_ORDER)}
      submitLabelKey="opp.new.submit"
      submitHintKey="opp.new.submitted"
    />
  );
}
