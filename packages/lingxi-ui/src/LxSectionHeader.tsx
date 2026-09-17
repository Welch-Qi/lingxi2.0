/**
 * 章节头 LxSectionHeader（改造指引 5.2 第 3 项）。
 *
 * 统一"章节标题 + 副标题 + 右侧下钻入口"的结构，
 * 避免每个页面各写一套标题层级导致视觉节奏不一致。
 */
export function LxSectionHeader({
  title,
  sub,
  actionLabel,
  onAction,
}: {
  title: string;
  sub?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}) {
  return (
    <header className="lx-section__head">
      <h2 className="lx-section__title">{title}</h2>
      {sub ? <span className="lx-section__sub">{sub}</span> : null}
      {actionLabel ? (
        <button type="button" className="lx-section__more lx-focusable" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
