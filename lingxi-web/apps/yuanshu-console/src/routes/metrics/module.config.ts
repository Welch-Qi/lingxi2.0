import type { ModuleConfig } from '@/app/router/types';

/**
 * 指标与语义分区清单（元枢管理台「指标口径中心」）。
 *
 * 归口表：DT-01~07 / GM-01~12 大数据与指标口径归元枢；
 * OP-BA-02 效能看板为元枢供数、灵犀消费（业务看板在灵犀 /analytics，不迁移）。
 */
const config: ModuleConfig = {
  key: 'metrics',
  basePath: '/metrics',
  titleKey: 'ys.metrics.menu',
  subtitleKey: 'ys.metrics.subtitle',
  bizCodes: 'DT- / GM- / OP-BA-02',
  permPrefix: 'dt',
  enabled: true,
  icon: 'analytics',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/metrics',
      element: () => import('./index'),
      titleKey: 'ys.metrics.menu',
    },
  ],
};

export default config;
