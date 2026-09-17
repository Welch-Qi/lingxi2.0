import type { ModuleConfig } from '@/app/router/types';

/**
 * 客户中心分区清单（一级菜单「客户中心」）。
 *
 * 功能编号对应《功能清单V2.0》二、客户中心（OP-CUS- / BO-SAL-）：
 * 2.1 客户档案 / 2.2 跟进记录 / 2.3 线索管理 / 2.4 客户沟通。
 *
 * 为什么是 L1 的第一个业务域：客户是企业唯一不会被平台替换掉的资产，
 * 其余三个数据源（海关 / 社媒 / 互联网）都由它派生，故必须先有"一企一档"，
 * 才有下游的内容、订单与服务。
 */
const config: ModuleConfig = {
  key: 'customer',
  basePath: '/customer',
  titleKey: 'cus.menu.customer',
  subtitleKey: 'cus.subtitle',
  bizCodes: 'OP-CUS- / BO-SAL-',
  permPrefix: 'cus',
  enabled: true,
  icon: 'customer',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/customer',
      element: () => import('./index'),
      permCode: 'cus:lead:view',
      titleKey: 'cus.menu.home',
    },
  ],
};

export default config;
