import type { ReactNode } from 'react';

/**
 * 智能体协调条 LxCoordBar（改造指引 5.3 第 1 项）。
 *
 * 用途：当一个智能体正在跨模块协调任务时（如 Muse 同时驱动内容、渠道、排期），
 * 在页面顶部显式声明"谁在协调什么"，避免跨模块协作变成不可见的黑箱。
 * 黄蓝渐变底表示"有智能体正在替你统筹"，与 LxBanner（面向用户的问候）区分。
 */
export function LxCoordBar({
  icon,
  children,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  children: ReactNode;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}) {
  return (
    <section className="lx-coordbar">
      <span className="lx-coordbar__icon">{icon}</span>
      <span className="lx-coordbar__text">{children}</span>
      {actionLabel ? (
        <button type="button" className="lx-coordbar__more lx-focusable" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
