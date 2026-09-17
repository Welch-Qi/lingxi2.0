import type { ModuleConfig } from '@/app/router/types';

/**
 * 订单交付分区清单（一级菜单「订单交付」）。
 *
 * 功能编号对应《功能清单V2.0》四、订单交付（OP-ORD-）。
 *
 * 与客户中心的边界：客户中心管"要卖什么"，订单交付管"货到没到"。
 * OTD 节点模板（订单确认 / 排产 / 生产完工 / 出运 / 报关 / 到港 / 签收）
 * 由系统提供默认值、企业可增删改，以同时适配贸易型与生产型企业。
 */
const config: ModuleConfig = {
  key: 'order',
  basePath: '/order',
  titleKey: 'ord.menu.order',
  subtitleKey: 'ord.subtitle',
  bizCodes: 'OP-ORD-',
  permPrefix: 'ord',
  enabled: true,
  icon: 'order',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/order',
      element: () => import('./index'),
      permCode: 'ord:order:view',
      titleKey: 'ord.menu.home',
    },
  ],
};

export default config;
