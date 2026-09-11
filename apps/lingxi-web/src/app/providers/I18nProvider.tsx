import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '@/../packages/lingxi-i18n/src/config';

/**
 * 国际化 Provider（技术规约2.0 §4.10）。
 *
 * 强制：所有面向用户的文案走 i18n key，禁止硬编码中文（附录D 规则 10）。
 * 语言来源优先级：用户偏好 > 租户配置 > 浏览器语言。
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // 服务端与前端统一使用 UTC 存储、按用户时区展示；此处同步 html lang 与 tz 提示
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <>{children}</>;
}
