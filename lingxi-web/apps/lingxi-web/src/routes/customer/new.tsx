import { EntityForm } from '@/components/EntityForm';
import { CUSTOMER_SECTIONS } from './fields';

/**
 * 新建客户（`/customer/new`）—— 客户档案的人工录入入口。
 *
 * 为什么字段分两截而不是一路排下来：**归属与联系方式是两拨人关心的**。
 * 建档的人（客户运营）先要知道"这是谁、哪国的、什么类型"，
 * 而"谁负责、怎么联系"是跟进的人填的。混在一起会让一个只想登记公司名的人
 * 被迫先想清楚联系人的职务。
 *
 * 客户档案是**单一事实源**：商机、跟进、客户360 三处都引用它。
 * 因此客户类型与价值分层必须在这里定，不放到别处补 ——
 * 分层是商机优先级与 SLA 的输入（见 `data.ts` 的 `INTENT_SLA_DAYS`）。
 *
 * 城市是自由文本、国家是下拉：国家要参与市场口径统计（`demo.market.*` 是枚举），
 * 城市只是地址的一部分，做成枚举会永远缺一个选项。
 *
 * 选项沿用客户域共用枚举（`./market-options`），与国家/来源/行业在列表页的取法一致 ——
 * 两处各写一份必然会漂移成"新建时选得到、筛选时筛不出"。
 *
 * 字段清单放在 `./fields` 而不在本文件：客户 360 的「编辑客户」抽屉改的是同一批字段
 * （第二十轮），两处共用一份才不会漂成"新建能填、编辑不能改"。
 *
 * 静态骨架：提交只给结果反馈，接入后走 POST /api/v1/cus/customers。
 */

export default function CustomerNewPage() {
  return (
    <EntityForm
      titleKey="cus.new.title"
      subtitleKey="cus.new.subtitle"
      backTo="/customer"
      backLabelKey="cus.back.list"
      /* compact：4 列自适应栅格 + 「标签上·控件下」，同类属性一行多个（2026-10-06）。
         此前走 default 变体（2 列堆叠、标签左·控件右），10 个字段铺成 5 屏 ——
         "信息不够集中"正是这个症状。只有「客户名称」与「备注」保留 wide（长文本）。 */
      variant="compact"
      sections={CUSTOMER_SECTIONS}
      submitLabelKey="cus.new.submit"
      submitHintKey="cus.new.submitted"
    />
  );
}
