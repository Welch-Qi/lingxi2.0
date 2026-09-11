import type { ModuleConfig } from '@/app/router/types';

/**
 * 路由分区「商品中心」清单（技术规约2.0 §4.2.2 强制）。
 *
 * <p>为什么必须登记：新增模块 = 新增路由分区 + 注册 manifest + 登记权限资源，
 * 禁止私挂路由与菜单；菜单与权限码由配置中心下发，前端按权限码过滤渲染。
 *
 * <p>功能编号：OP-PRD-
 */
const config: ModuleConfig = {
  key: 'product',
  basePath: '/product',
  titleKey: 'prd.menu.product',
  bizCodes: 'OP-PRD-',
  permPrefix: 'prd',
  enabled: true,
  routes: [
    // { path: '/product', element: () => import('./index'), permCode: 'prd:*:view' },
  ],
};

export default config;
