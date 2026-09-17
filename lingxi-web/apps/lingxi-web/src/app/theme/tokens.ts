import type { ThemeConfig } from 'antd';

/**
 * 设计令牌（AntD theme token 轨）—— 与 styles/design-tokens.css 的 CSS 变量一一对应。
 *
 * 设计系统：极光通感（Aurora Sense）。原型是交互与视觉契约，不是代码资产；
 * 此处按令牌重建，禁止复用原型的内联样式（技术规约2.0 §4.2.5）。
 *
 * 双轨的分工：AntD 组件内部取值走 theme token（本文件），
 * 自有组件与布局走 CSS 变量（design-tokens.css）；两处色值必须一致。
 */
export const auroraTokens = {
  colorPrimary: '#0E7C86', // 极光青（主色）
  colorInfo: '#2E6BE6', // 冰川蓝
  colorSuccess: '#3D9A6E', // 苔原绿
  colorWarning: '#F0A91A', // 日光黄
  colorError: '#E4644C', // 珊瑚红
  colorPurple: '#7A5AC0', // 智能体紫
  colorBgLayout: '#F3F7FB', // 霜白（页面底）
  colorBgContainer: '#FFFFFF',
  colorText: '#1E293B',
  colorTextSecondary: '#475569',
  colorTextTertiary: '#94A3B8',
  colorBorder: 'rgba(30, 41, 59, 0.14)',
  colorBorderSecondary: 'rgba(30, 41, 59, 0.08)',
  borderRadius: 10,
  fontFamily:
    "'Noto Sans SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
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
    colorBgContainer: auroraTokens.colorBgContainer,
    colorText: auroraTokens.colorText,
    colorTextSecondary: auroraTokens.colorTextSecondary,
    colorTextTertiary: auroraTokens.colorTextTertiary,
    colorBorder: auroraTokens.colorBorder,
    colorBorderSecondary: auroraTokens.colorBorderSecondary,
    borderRadius: auroraTokens.borderRadius,
    fontFamily: auroraTokens.fontFamily,
  },
  components: {
    // 玻璃拟态卡：与 CSS 变量保持一致，避免"有的卡透、有的卡实"
    Card: { colorBgContainer: 'rgba(255, 255, 255, 0.72)' },
    Table: {
      headerBg: 'rgba(243, 247, 251, 0.6)',
      headerColor: auroraTokens.colorTextTertiary,
      headerSplitColor: 'transparent',
      rowHoverBg: auroraTokens.colorBgLayout,
      borderColor: auroraTokens.colorBorderSecondary,
    },
    Menu: {
      itemSelectedBg: 'rgba(14, 124, 134, 0.08)',
      itemSelectedColor: auroraTokens.colorPrimary,
      itemBorderRadius: 10,
    },
    Button: { primaryShadow: 'none', fontWeight: 500 },
    Tag: { defaultBg: auroraTokens.colorBgLayout },
    Tooltip: { colorBgSpotlight: '#1E293B' },
  },
};
