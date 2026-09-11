import type { ThemeConfig } from 'antd';

/**
 * 设计令牌（AntD theme token 轨）—— 与 styles/design-tokens.css 的 CSS 变量一一对应。
 *
 * 设计系统：极光通感（Aurora Sense）。原型是交互与视觉契约，不是代码资产；
 * 此处按令牌重建，禁止复用原型的内联样式（技术规约2.0 §4.2.5）。
 */
export const auroraTokens = {
  colorPrimary: '#0E7C86', // 极光青（主色）
  colorInfo: '#2E6BE6', // 冰川蓝
  colorSuccess: '#3D9A6E', // 苔原绿
  colorWarning: '#F0A91A', // 日光黄
  colorError: '#E4644C', // 珊瑚红
  colorPurple: '#7A5AC0',
  colorBgLayout: '#F3F7FB', // 霜白
  borderRadius: 10,
  fontFamily:
    "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  fontFamilyCode: "'Manrope', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const lingxiTheme: ThemeConfig = {
  token: {
    colorPrimary: auroraTokens.colorPrimary,
    colorInfo: auroraTokens.colorInfo,
    colorSuccess: auroraTokens.colorSuccess,
    colorWarning: auroraTokens.colorWarning,
    colorError: auroraTokens.colorError,
    colorBgLayout: auroraTokens.colorBgLayout,
    borderRadius: auroraTokens.borderRadius,
    fontFamily: auroraTokens.fontFamily,
  },
  components: {
    // 玻璃拟态卡：与 CSS 变量保持一致
    Card: { colorBgContainer: 'rgba(255, 255, 255, 0.72)' },
    Table: { headerBg: 'rgba(243, 247, 251, 0.9)' },
  },
};
