import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * 服务端状态统一由 TanStack Query 承载（技术规约2.0 §4.2.1）。
 *
 * 铁律：接口数据只能用它；禁止手工缓存与同步，禁止把接口数据存进 Zustand。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 默认 30 秒内视为新鲜数据；看板类可由各页面覆盖 staleTime
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 写操作不自动重试：幂等键由请求层统一注入，重试交给用户显式操作
      retry: 0,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
