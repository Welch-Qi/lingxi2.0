import type { ModuleConfig } from '@/app/router/types';

/**
 * 总览分区清单（元枢管理台首页）：登录即可见，四类能力出口直达。
 */
const config: ModuleConfig = {
  key: 'overview',
  basePath: '/overview',
  titleKey: 'ys.overview.menu',
  subtitleKey: 'ys.overview.subtitle',
  bizCodes: 'YS-',
  permPrefix: 'ys',
  enabled: true,
  icon: 'workbench',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/overview',
      element: () => import('./index'),
      titleKey: 'ys.overview.menu',
    },
  ],
};

export default config;
