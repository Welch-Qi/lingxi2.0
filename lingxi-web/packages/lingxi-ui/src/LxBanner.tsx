import type { ReactNode } from 'react';

/**
 * 问候 / 提示条 LxBanner（改造指引 4.11）。
 *
 * 用于工作台首屏问候与需要引起注意的全局提示；
 * 渐变底 + 主色描边是"这里有话要说"的视觉信号，不用来做普通容器。
 */
export function LxBanner({
  title,
  desc,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  desc?: string | undefined;
  icon: ReactNode;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}) {
  return (
    <section className="lx-banner">
      <span className="lx-banner__icon">{icon}</span>
      <span className="lx-banner__body">
        <span className="lx-banner__title">{title}</span>
        {desc ? <span className="lx-banner__desc">{desc}</span> : null}
      </span>
      {actionLabel ? (
        <button type="button" className="lx-banner__more lx-focusable" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
