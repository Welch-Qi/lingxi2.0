import type { ReactNode } from 'react';

/**
 * 空态 LxEmpty（改造指引禁忌 9：数据为空必须有空态）。
 *
 * 关键不是"没有数据"这四个字，而是给出下一步动作（产品规划说明书 V2.1 §6.6 空数据规范：
 * 新租户首次进入用引导式任务代替空白页）。
 */
export function LxEmpty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode | undefined;
  title: string;
  hint?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="lx-empty">
      {icon ? (
        <span className="lx-empty__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="lx-empty__text">{title}</span>
      {hint ? <span className="lx-empty__hint">{hint}</span> : null}
      {action}
    </div>
  );
}
