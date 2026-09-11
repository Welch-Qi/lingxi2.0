import type { ModuleConfig } from '@/app/router/types';

/**
 * 路由分区「售后服务」清单（技术规约2.0 §4.2.2 强制）。
 *
 * <p>为什么必须登记：新增模块 = 新增路由分区 + 注册 manifest + 登记权限资源，
 * 禁止私挂路由与菜单；菜单与权限码由配置中心下发，前端按权限码过滤渲染。
 *
 * <p>功能编号：OP-SVC- / BO-SVC-
 */
const config: ModuleConfig = {
  key: 'service',
  basePath: '/service',
  titleKey: 'svc.menu.service',
  bizCodes: 'OP-SVC- / BO-SVC-',
  permPrefix: 'svc',
  enabled: true,
  routes: [
    // { path: '/service', element: () => import('./index'), permCode: 'svc:*:view' },
  ],
};

export default config;
