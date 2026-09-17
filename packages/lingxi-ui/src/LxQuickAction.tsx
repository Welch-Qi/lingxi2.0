import type { ReactNode } from 'react';

/**
 * 快捷操作入口 LxQuickAction（改造指引 5.2 第 5 项）。
 *
 * 作用：让"新建客户 / 创建内容 / 生成报告"这类高频动作在工作台首屏一次点击可达，
 * 满足产品规划的入口铁律（任何基础运营功能 ≤2 次点击）。
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
      <span>
        <span className="lx-quick__title">{title}</span>
        {desc ? <span className="lx-quick__desc">{desc}</span> : null}
      </span>
    </button>
  );
}
