import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { lingxiTheme } from '@/app/theme/tokens';

/**
 * 主题与组件库配置（技术规约2.0 §4.2.5）。
 *
 * 设计令牌双轨：CSS 变量（见 styles/design-tokens.css）+ AntD theme token（见 theme/tokens.ts）。
 * 禁止在组件内写死颜色；禁止混入第二套组件库。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <ConfigProvider locale={i18n.language === 'en-US' ? enUS : zhCN} theme={lingxiTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
