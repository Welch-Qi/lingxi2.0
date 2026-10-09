import type { ReactNode } from 'react';

/**
 * 章节头 LxSectionHeader（改造指引 5.2 第 3 项）。
 *
 * 统一"章节标题 + 副标题 + 右侧入口"的结构，
 * 避免每个页面各写一套标题层级导致视觉节奏不一致。
 *
 * 右侧入口有两种形态，同一章里不会同时出现：
 *  - `actionLabel` / `onAction`：单一文字链（下钻入口，沿用 1.0 的 `lx-section__more`）；
 *  - `actions`：任意节点（如商机中心的「沟通记录」按钮 —— 它带图标，且将来可能变成
 *    一组动作）。`actions` 是后加的：章节头要放的不止"下钻"一种东西，
 *    硬塞成第二个 actionLabel 会让"下钻"和"动作"两种语义继续混用。
 */
export function LxSectionHeader({
  title,
  sub,
  actionLabel,
  onAction,
  actions,
}: {
  title: string;
  sub?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header className="lx-section__head">
      <h2 className="lx-section__title">{title}</h2>
      {sub ? <span className="lx-section__sub">{sub}</span> : null}
      {actions ? <div className="lx-section__actions">{actions}</div> : null}
      {actionLabel ? (
        <button type="button" className="lx-section__more lx-focusable" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
