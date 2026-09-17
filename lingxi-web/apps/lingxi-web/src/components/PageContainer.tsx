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
 */
export function PageContainer({
  titleKey,
  subtitleKey,
  extra,
  children,
}: {
  titleKey: string;
  subtitleKey?: string | undefined;
  extra?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="lx-page">
      <header className="lx-page__header">
        <span className="lx-page__heading">
          <h1 className="lx-page__title">{t(titleKey)}</h1>
          {subtitleKey ? <span className="lx-page__subtitle">{t(subtitleKey)}</span> : null}
        </span>
        {extra ? <div className="lx-page__extra">{extra}</div> : null}
      </header>
      <div className="lx-page__body">{children}</div>
    </section>
  );
}
