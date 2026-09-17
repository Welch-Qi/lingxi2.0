import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createI18n } from '@lingxi/i18n';
import zhCN from '@/locales/zh-CN/common.json';
import enUS from '@/locales/en-US/common.json';

/**
 * 国际化 Provider（技术规约2.0 §4.10）。
 *
 * 强制：所有面向用户的文案走 i18n key，禁止硬编码中文（附录D 规则 10）。
 * 语言来源优先级：用户偏好 > 租户配置 > 浏览器语言。
 *
 * 资源在这里注入而非写在内部包内：语言包归 `apps/lingxi-web/src/locales/`（§2.3），
 * `@lingxi/i18n` 只提供初始化工具，二者方向单向——包不反向依赖应用。
 * 初始化在模块加载时完成（i18next 是全局单例），故必须在任何组件调用 useTranslation 之前执行。
 */
createI18n({
  'zh-CN': { common: zhCN },
  'en-US': { common: enUS },
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // 时间一律 UTC 存储、按用户时区展示；此处同步 html lang，供样式与读屏器识别语种
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <>{children}</>;
}
