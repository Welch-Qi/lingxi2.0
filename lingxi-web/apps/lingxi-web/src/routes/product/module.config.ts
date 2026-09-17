import type { ModuleConfig } from '@/app/router/types';

/**
 * 商品中心分区清单（一级菜单「商品中心」）。
 *
 * 功能编号对应《功能清单V2.0》三、商品中心（OP-PRD-）。
 *
 * 为什么"数据完整度"是要害指标：商品主数据被内容创意、社媒运营、订单建单三处消费，
 * 字段缺失不是本模块的问题，会直接放大成内容质量与交付准确性问题，
 * 因此完整度必须显性度量并可一键交给智能体补全（HS 编码 / 属性 / 多语种素材）。
 */
const config: ModuleConfig = {
  key: 'product',
  basePath: '/product',
  titleKey: 'prd.menu.product',
  subtitleKey: 'prd.subtitle',
  bizCodes: 'OP-PRD-',
  permPrefix: 'prd',
  enabled: true,
  icon: 'product',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/product',
      element: () => import('./index'),
      permCode: 'prd:product:view',
      titleKey: 'prd.menu.home',
    },
  ],
};

export default config;
