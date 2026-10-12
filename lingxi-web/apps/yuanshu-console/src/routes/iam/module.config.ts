import type { ModuleConfig } from '@/app/router/types';

/**
 * IAM 分区清单（元枢管理台「用户与权限」）。
 *
 * 归口表：权限 CC-13~18、全球化 CC-05~08 的界面载体在元枢管理台；
 * 校验一律走元枢后端（前端只声明权限码，技术规约2.0 §4.9.2）。
 * 页面自 lingxi-web `routes/config/` 迁入，权限码口径保持 `cc:` 前缀不变
 * （契约红线：既有权限码不改名，只改界面归属）。
 */
const config: ModuleConfig = {
  key: 'iam',
  basePath: '/iam',
  titleKey: 'ys.iam.menu',
  subtitleKey: 'ys.iam.subtitle',
  bizCodes: 'CC-05~08 / CC-13~18',
  permPrefix: 'cc',
  enabled: true,
  icon: 'config',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/iam',
      element: () => import('./index'),
      permCode: 'cc:user:view',
      titleKey: 'cc.menu.home',
    },
    {
      path: '/iam/users',
      element: () => import('./users'),
      permCode: 'cc:user:view',
      titleKey: 'cc.users.title',
      hideInMenu: true,
    },
    {
      path: '/iam/roles',
      element: () => import('./roles'),
      permCode: 'cc:role:view',
      titleKey: 'cc.roles.title',
      hideInMenu: true,
    },
    {
      path: '/iam/audit',
      element: () => import('./audit'),
      permCode: 'cc:audit:view',
      titleKey: 'cc.audit.title',
      hideInMenu: true,
    },
    {
      path: '/iam/global',
      element: () => import('./global'),
      permCode: 'cc:global:view',
      titleKey: 'cc.global.title',
      hideInMenu: true,
    },
  ],
};

export default config;
