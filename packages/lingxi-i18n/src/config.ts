import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../../lingxi-web/src/locales/zh-CN/common.json';
import enUS from '../../lingxi-web/src/locales/en-US/common.json';

/**
 * 国际化初始化（技术规约2.0 §4.10）。
 *
 * 规范：
 *  - 语言包 key 命名 {域}.{模块}.{位置}.{含义}，如 cus.lead.list.title
 *  - 后端返回 messageKey（非文案），前端按当前语言渲染
 *  - 缺 key 时回落中文并在开发环境告警（避免上线后出现裸 key）
 */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'lx.locale';

function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    return saved as SupportedLocale;
  }
  return navigator.language.startsWith('en') ? 'en-US' : 'zh-CN';
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { common: zhCN },
    'en-US': { common: enUS },
  },
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

export default i18n;
