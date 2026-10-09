import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 页面容器：统一页面标题、副标题与内容间距。
 *
 * 为什么统一：避免每个页面各写一套标题层级与间距，导致视觉与可访问性不一致
 * （技术规约2.0 §4.2.3 页面结构约定）。
 *
 * 标题走 i18n key（禁止硬编码中文文案）；副标题用来说明"这一页管什么"，
 * 与顶栏副标题分工：顶栏说明分区职责，此处说明当前视图职责。
 *
 * `hideTitle` 用于"首屏第一眼必须是数据"的页面（目前是超级工作台）：
 * 标题与副标题视觉上不渲染，但 h1 仍留在 DOM 里。
 * **不做成"不传 titleKey"**：那样页面会失去标题层级，读屏用户与浏览器大纲
 * 都拿不到"这是哪一页"，而收益只是少几行 JSX。
 *
 * `floating` 用于"正文第一屏必须顶到顶"的页面（超级工作台，2026-09-23）：
 * 它渲染成绝对定位的浮层，**不占行高**，首行内容因此直接顶到内容区顶部。
 * 与 `extra` 的分工：`extra` 是页头里的一个槽位（跟着标题行一起排），
 * `floating` 是压在正文上的浮层（与正文重叠，需要时把 z-index 交给自己管）。
 * 两者可同时给：页头照常渲染标题，浮层照常压在正文右上角。
 */
export function PageContainer({
  titleKey,
  subtitleKey,
  hideTitle = false,
  extra,
  floating,
  children,
}: {
  titleKey: string;
  subtitleKey?: string | undefined;
  /** 视觉隐藏标题（h1 仍保留）。副标题随之隐藏。 */
  hideTitle?: boolean | undefined;
  extra?: ReactNode | undefined;
  /** 压在正文上的浮层（如右上角智能体入口），不占行高。 */
  floating?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  /* 标题被隐藏且页头没有别的内容要放时，整个页头不渲染 ——
     留一个空 header 会让首行内容凭空下移一整行（约 40px）。 */
  const showHeader = !hideTitle || Boolean(extra);
  return (
    <section className="lx-page">
      {/* 视觉隐藏的 h1 必须留在 DOM 里，且不能放进上面那个条件里 */}
      {hideTitle ? <h1 className="lx-visually-hidden">{t(titleKey)}</h1> : null}
      {showHeader ? (
        <header className={`lx-page__header${hideTitle ? ' lx-page__header--bare' : ''}`}>
          {hideTitle ? null : (
            <span className="lx-page__heading">
              <h1 className="lx-page__title">{t(titleKey)}</h1>
              {subtitleKey ? <span className="lx-page__subtitle">{t(subtitleKey)}</span> : null}
            </span>
          )}
          {extra ? <div className="lx-page__extra">{extra}</div> : null}
        </header>
      ) : null}
      {floating ? <div className="lx-page__floating">{floating}</div> : null}
      <div className="lx-page__body">{children}</div>
    </section>
  );
}
