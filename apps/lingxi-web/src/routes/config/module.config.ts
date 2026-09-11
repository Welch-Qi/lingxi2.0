import type { ModuleConfig } from '@/app/router/types';

/**
 * 路由分区「配置中心」清单（技术规约2.0 §4.2.2 强制）。
 *
 * <p>为什么必须登记：新增模块 = 新增路由分区 + 注册 manifest + 登记权限资源，
 * 禁止私挂路由与菜单；菜单与权限码由配置中心下发，前端按权限码过滤渲染。
 *
 * <p>功能编号：CC-
 */
const config: ModuleConfig = {
  key: 'config',
  basePath: '/config',
  titleKey: 'cc.menu.config',
  bizCodes: 'CC-',
  permPrefix: 'cc',
  enabled: true,
  routes: [
    // { path: '/config', element: () => import('./index'), permCode: 'cc:*:view' },
  ],
};

export default config;
