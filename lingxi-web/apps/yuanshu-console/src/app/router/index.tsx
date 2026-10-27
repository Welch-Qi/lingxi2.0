import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from '@/app/layout/RootLayout';
import { RequireAuth } from '@/app/router/RequireAuth';
import { RequirePerm } from '@/app/router/RequirePerm';
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
 *
 * `permCode` 在此**第一次被真正消费**（2026-10-06 接线）。此前它被本函数整个丢掉，
 * 于是所有 `permCode` 声明都是摆设——权限管理页改什么都不影响真实行为。
 * 现在把页面组件包进 <RequirePerm>，无权限即渲染 403（不静默跳转，理由见 RequirePerm 注释）。
 *
 * 为什么用 lazy 返回 element 而不是顶层 element 属性：lazy 里包一层守卫后，
 * 页面模块仍只在真正命中该路由时才下载（保持分包收益），而守卫本身只依赖
 * PermissionContext（@lingxi/ui 的叶子包），不引入额外加载。
 */
function toChildRoute(moduleBasePath: string, route: ModuleRoute) {
  const code = route.permCode;
  const lazy = async () => {
    const mod = await route.element();
    const Page = mod.default;
    if (!code) return { Component: Page };
    return {
      Component: function GuardedRoute() {
        return (
          <RequirePerm code={code}>
            <Page />
          </RequirePerm>
        );
      },
    };
  };
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
      // 元枢管理台首页落在总览分区（console 无 /workbench）
      { index: true, element: <Navigate to="/overview" replace /> },
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
