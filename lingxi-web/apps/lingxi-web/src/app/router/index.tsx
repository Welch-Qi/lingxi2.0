import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from '@/app/layout/RootLayout';
import { RequireAuth } from '@/app/router/RequireAuth';
import { ErrorPage } from '@/components/ErrorPage';
import { moduleConfigs } from '@/app/router/modules';
import type { ModuleRoute } from '@/app/router/types';

/**
 * 路由构建：根 layout + 按分区懒加载（技术规约2.0 §4.2.2）。
 *
 * 约定：
 *  - 分区关闭（enabled=false）直接不出现在路由表中（功能开关由配置中心下发）
 *  - 权限守卫由 <RequireAuth> + <LxPermission> 双层承担
 *  - 跨分区跳转携带上下文一律走 URL query（禁止用全局变量/localStorage 传业务对象）
 *
 * 两条独立分支，因为它们的外壳不同：
 *  - /workspace-select 是全屏版式（登录后第一屏，还没有租户上下文，不能套侧边栏与顶栏）
 *  - 其余业务路由共用 RootLayout（极光色带 + 侧边栏 + 顶栏 + 状态栏）
 */

/** 给不需要业务外壳、但仍需登录态的独立页套上认证守卫。 */
function withAuth(Component: ComponentType) {
  function AuthenticatedPage() {
    return (
      <RequireAuth>
        <Component />
      </RequireAuth>
    );
  }
  return AuthenticatedPage;
}

/**
 * 分区内的子路由转换：path 等于分区 basePath 时转成 index 路由。
 *
 * 为什么必须转：react-router 不允许非 index 子路由的 path 为空，
 * 而「一级菜单点击后落在分区首页」正是这种情形（如 /customer 自身）。
 */
function toChildRoute(moduleBasePath: string, route: ModuleRoute) {
  const lazy = async () => ({ Component: (await route.element()).default });
  if (route.path === moduleBasePath) {
    return { index: true as const, lazy };
  }
  const relative = route.path.startsWith(`${moduleBasePath}/`)
    ? route.path.slice(moduleBasePath.length + 1)
    : route.path.replace(/^\//, '');
  return { path: relative, lazy };
}

export const router = createBrowserRouter([
  {
    // 登录页不经认证守卫（否则会自锁）；回调参数由 AuthProvider 消费
    path: '/login',
    lazy: () => import('@/routes/login').then((m) => ({ Component: m.default })),
    errorElement: <ErrorPage />,
  },
  {
    // 工作区选择：登录后第一屏（改造指引 5.1）。全屏版式，故不进 RootLayout。
    path: '/workspace-select',
    lazy: () => import('@/routes/workspace-select').then((m) => ({ Component: withAuth(m.default) })),
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
        .map((m) => ({
          path: m.basePath.slice(1),
          lazy: () => m.layout().then((mod) => ({ Component: mod.default })),
          children: m.routes.map((r) => toChildRoute(m.basePath, r)),
        })),
      { path: '*', element: <ErrorPage notFound /> },
    ],
  },
]);
