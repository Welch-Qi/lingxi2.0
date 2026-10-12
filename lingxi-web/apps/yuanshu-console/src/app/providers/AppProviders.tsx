import type { ReactNode } from 'react';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';

/**
 * 全局 Provider 编排。
 *
 * 顺序有意为之：认证（决定租户与身份）→ 主题（依赖租户品牌配置）→ 国际化（依赖租户语言）
 * → 数据查询（拦截器需读取认证态与租户上下文）。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <QueryProvider>{children}</QueryProvider>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
