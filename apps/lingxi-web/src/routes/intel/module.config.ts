import type { ModuleConfig } from '@/app/router/types';

/**
 * 路由分区「市场情报」清单（技术规约2.0 §4.2.2 强制）。
 *
 * <p>为什么必须登记：新增模块 = 新增路由分区 + 注册 manifest + 登记权限资源，
 * 禁止私挂路由与菜单；菜单与权限码由配置中心下发，前端按权限码过滤渲染。
 *
 * <p>功能编号：BO-MKT- / GM-
 */
const config: ModuleConfig = {
  key: 'intel',
  basePath: '/intel',
  titleKey: 'intel.menu.intel',
  bizCodes: 'BO-MKT- / GM-',
  permPrefix: 'intel',
  enabled: true,
  routes: [
    // { path: '/intel', element: () => import('./index'), permCode: 'intel:*:view' },
  ],
};

export default config;
