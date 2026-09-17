import type { ModuleConfig } from '@/app/router/types';

/**
 * 售后服务分区清单（一级菜单「售后服务」）。
 *
 * 功能编号对应《功能清单V2.0》五、售后服务（OP-SVC- / BO-SVC-）。
 *
 * 售后不是终点而是产品开发的输入：质量类问题必须归纳成改品建议回灌商品中心，
 * 否则同一个质量问题会在不同客户身上重复赔付。
 * SLA 展示口径：达标率与剩余时长同时呈现——"剩余 40 分钟"比"未超时"更能驱动动作。
 */
const config: ModuleConfig = {
  key: 'service',
  basePath: '/service',
  titleKey: 'svc.menu.service',
  subtitleKey: 'svc.subtitle',
  bizCodes: 'OP-SVC- / BO-SVC-',
  permPrefix: 'svc',
  enabled: true,
  icon: 'service',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/service',
      element: () => import('./index'),
      permCode: 'svc:ticket:view',
      titleKey: 'svc.menu.home',
    },
  ],
};

export default config;
