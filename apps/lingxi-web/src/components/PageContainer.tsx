import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 页面容器：统一页面标题、面包屑与内容内边距。
 *
 * 为什么统一：避免每个页面各写一套标题层级与间距，导致视觉与可访问性不一致
 * （技术规约2.0 §4.2.3 页面结构约定）。
 */
export function PageContainer({
  titleKey,
  extra,
  children,
}: {
  titleKey: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="lx-page">
      <header className="lx-page__header">
        <h1 className="lx-page__title">{t(titleKey)}</h1>
        {extra ? <div className="lx-page__extra">{extra}</div> : null}
      </header>
      <div className="lx-page__body">{children}</div>
    </section>
  );
}
