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
 *
 * ⚠️ 改这个文件时注意：`createI18n` 的幂等门闩**不能退回成单个布尔量**。
 * 语言包 JSON 与本文件是两个模块图，JSON 变了本模块未必被替换；
 * 纯布尔门闩会把新资源静默吞掉，页面于是显示裸 key（2026-10-06 踩过）。
 * 判据必须是资源指纹，见函数内注释。
 */

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** 语言包资源：{ 语言: { 命名空间: 词条树 } }。命名空间固定 common，域前缀由 key 承载。 */
export type I18nResources = Resource;

const STORAGE_KEY = 'lx.locale';

/**
 * 语言来源优先级：用户偏好 > 租户配置（由调用方覆盖）> **默认中文**。
 *
 * 为什么不跟随 `navigator.language`：本系统面向天能内部用户（均在湖州），
 * 但相当一部分人装的是英文版浏览器/系统，跟随浏览器语言会让这些人
 * 一进系统就看到英文界面——且他们并不知道这是"浏览器语言决定的"，
 * 只会判断成"系统有问题"（真实事故，见 TopBar 语言入口那条注释）。
 * 内部系统里「默认母语」比「通用国际化惯例」更贴合实际。
 *
 * 代价：外籍/英文偏好用户首次进入需自己切一次，之后由 localStorage 记住。
 * 若将来要做多租户，租户默认语言应由调用方通过 options 覆盖，而不是回到浏览器探测。
 */
function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    return saved as SupportedLocale;
  }
  return 'zh-CN';
}

let initialized = false;

/** 上一次 init 时的资源指纹（`JSON.stringify` 结果），见 `createI18n` 的说明。 */
let lastFingerprint = '';

/**
 * 初始化 i18next 并绑定 react-i18next。
 *
 * 幂等：初始化只执行一次，模块被多处 import 时不会重复 init
 * （i18next 重复 init 会打印告警，且第二次会丢失第一次的语言偏好）。
 *
 * **2026-10-06 增：资源热更新**。原先只有一个 `initialized` 布尔门闩，于是
 * 「语言包 JSON 变了、config 模块没被替换」时（Vite 里JSON 与 ts 是两个模块图）
 * 二次调用会被静默吞掉 —— 页面上新增的键全部显示成 `opp.follow.title` 这样的
 * 裸 key，而 curl 同一个 dev server 拿到的却是**新**资源。这类问题最难查的地方
 * 在于「磁盘对、服务对、只有浏览器里那份是旧的」，截图只显示症状。
 *
 * 改为**用资源内容本身做判据**（`JSON.stringify` 指纹）：指纹相同才真跳过。
 * 指纹不同则调`addResourceBundle` 覆盖 —— i18next 支持在已init 后追加/替换资源，
 * 触发 `languageChanged` 让 react-i18next 重渲染，无需刷新页面。
 */
export function createI18n(resources: I18nResources): typeof i18n {
  const fingerprint = JSON.stringify(resources);

  if (initialized && fingerprint === lastFingerprint) {
    return i18n;
  }
  lastFingerprint = fingerprint;

  if (!initialized) {
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

  /*已初始化但资源变了：逐语言覆盖资源包，再广播一次以驱动重渲染。 */
  for (const [lng, namespaces] of Object.entries(resources)) {
    for (const [ns, bundle] of Object.entries(namespaces as Record<string, object>)) {
      i18n.addResourceBundle(lng, ns, bundle, true, true);
    }
  }
  void i18n.changeLanguage(i18n.resolvedLanguage ?? detectLocale());
  return i18n;
}

/** 切换语言：写偏好 → 触发 languageChanged（持久化与 html lang 由上面的监听统一处理） */
export function setLocale(locale: SupportedLocale): Promise<unknown> {
  return i18n.changeLanguage(locale);
}

export default i18n;
