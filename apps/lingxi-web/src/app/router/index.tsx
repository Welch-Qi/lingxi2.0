import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from '@/app/layout/RootLayout';
import { RequireAuth } from '@/app/router/RequireAuth';
import { ErrorPage } from '@/components/ErrorPage';
import { moduleConfigs } from '@/app/router/modules';

/**
 * 路由构建：根 layout + 按分区懒加载（技术规约2.0 §4.2.2）。
 *
 * 约定：
 *  - 分区关闭（enabled=false）直接不出现在路由表中（功能开关由配置中心下发）
 *  - 权限守卫由 <RequireAuth> + <LxPermission> 双层承担
 *  - 跨分区跳转携带上下文一律走 URL query（禁止用全局变量/localStorage 传业务对象）
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('@/routes/login'),
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/workbench" replace /> },
      ...moduleConfigs
        .filter((m) => m.enabled)
        .flatMap((m) => [
          {
            path: m.basePath.slice(1),
            lazy: () => import('@/routes/' + m.key + '/layout').then((mod) => ({ Component: mod.default })),
            children: m.routes.map((r) => ({
              path: r.path.startsWith(m.basePath) ? r.path.slice(m.basePath.length + 1) || undefined : r.path,
              lazy: async () => ({ Component: (await r.element()).default }),
            })),
          },
        ]),
      { path: '*', element: <ErrorPage notFound /> },
    ],
  },
]);
