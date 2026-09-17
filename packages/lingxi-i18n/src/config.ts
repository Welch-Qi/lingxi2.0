import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Resource } from 'i18next';

/**
 * 国际化初始化（技术规约2.0 §4.10）。
 *
 * 规范：
 *  - 语言包 key 命名 {域}.{模块}.{位置}.{含义}，如 `cus.lead.list.title`
 *  - 后端返回 messageKey（非文案），前端按当前语言渲染
 *  - 缺 key 时回落中文并在开发环境告警（避免上线后出现裸 key）
 *
 * 资源由谁提供（§2.3 前端工程结构）：
 *  语言包实体归 `apps/lingxi-web/src/locales/`，本包只提供「工具」。
 *  因此这里用 createI18n(resources) 由应用注入资源，本包**不得**反向 import 应用文件——
 *  否则内部包会依赖应用，包一旦被另一个应用复用就整体失联。
 */

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** 语言包资源：{ 语言: { 命名空间: 词条树 } }。命名空间固定 common，域前缀由 key 承载。 */
export type I18nResources = Resource;

const STORAGE_KEY = 'lx.locale';

/** 语言来源优先级：用户偏好 > 租户配置（由调用方覆盖）> 浏览器语言 */
function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    return saved as SupportedLocale;
  }
  return navigator.language.startsWith('en') ? 'en-US' : 'zh-CN';
}

let initialized = false;

/**
 * 初始化 i18next 并绑定 react-i18next。
 *
 * 幂等：初始化只执行一次，模块被多处 import 时不会重复 init
 * （i18next 重复 init 会打印告警，且第二次会丢失第一次的语言偏好）。
 */
export function createI18n(resources: I18nResources): typeof i18n {
  if (initialized) {
    return i18n;
  }
  initialized = true;

  void i18n.use(initReactI18next).init({
    resources,
    lng: detectLocale(),
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.lang = lng;
  });

  return i18n;
}

/** 切换语言：写偏好 → 触发 languageChanged（持久化与 html lang 由上面的监听统一处理） */
export function setLocale(locale: SupportedLocale): Promise<unknown> {
  return i18n.changeLanguage(locale);
}

export default i18n;
