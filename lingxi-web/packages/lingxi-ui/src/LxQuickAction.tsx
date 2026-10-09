import type { ReactNode } from 'react';

/**
 * 快捷操作入口 LxQuickAction（改造指引 5.2 第 5 项）。
 *
 * 作用：让"新建客户 / 创建内容 / 生成报告"这类高频动作在工作台首屏一次点击可达，
 * 满足产品规划的入口铁律（任何基础运营功能 ≤2 次点击）。
 *
 * 标题与说明各有自己的 body 容器（`lx-quick__body`），不是裸 `<span>` 并排——
 * 初版两者都是行内 span，于是渲染成"新建客户录入公司信息，AI 自动补全背景与联系人"
 * 这样连成一串；中文因为本来就没有词间空格，看着像一句长话而不易察觉，
 * 切到 en-US 立刻现形（"New customerEnter a company; AI fills in background"）。
 * 这正是技术规约2.0 附录D 规则 11 说的情形：版式缺陷要在英文下才暴露，验收必须双语看。
 */
export type LxQuickTone = 'primary' | 'accent' | 'secondary';

export function LxQuickAction({
  title,
  desc,
  icon,
  tone = 'primary',
  onClick,
}: {
  title: string;
  desc?: string | undefined;
  icon: ReactNode;
  tone?: LxQuickTone | undefined;
  onClick?: (() => void) | undefined;
}) {
  return (
    <button type="button" className="lx-glass lx-quick lx-hoverable lx-focusable" onClick={onClick}>
      <span className={`lx-quick__icon lx-quick__icon--${tone}`}>{icon}</span>
      <span className="lx-quick__body">
        <span className="lx-quick__title">{title}</span>
        {desc ? <span className="lx-quick__desc">{desc}</span> : null}
      </span>
    </button>
  );
}
