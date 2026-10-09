import type { ModuleConfig } from '@/app/router/types';

/**
 * 客服中心分区清单（一级菜单「客服中心」）。
 *
 * 由「售后服务」升级为「客户统一交流沟通中心」（产品规划说明书 V2.1 §2.7）：
 * 售前沟通与售后咨询投诉在同一中心承接。功能编号沿用《功能清单V2.1》七、售后服务（OP-SVC- / BO-SVC-）。
 *
 * **2026-09-29 重构**：推翻旧版「四模块平铺目录 + 顶部切换器」，改为**服务顾问工作台**
 * （参考网易七鱼「统一客服平台」简化版）。四块能力（多渠道接入 / 实时在线沟通 /
 * 全渠道沟通记录 / 服务工单）内聚进 `/service` 单页——左栏接入与队列、中栏实时对话、
 * 右栏客户与工单上下文，工单创建/流转/闭环作为工作台内嵌能力，而非独立目录。
 *
 * 路由因此收敛为两条：工作台本身（/service）+ 从工作台拉起的「新建工单」表单
 * （/service/tickets/new，复用跨分区共用的 EntityForm 壳，属动作流不是导航模块）。
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
      permCode: 'svc:channel:view',
      titleKey: 'svc.menu.service',
    },
    {
      path: '/service/tickets/new',
      element: () => import('./tickets-new'),
      permCode: 'svc:ticket:create',
      titleKey: 'svc.new.title',
    },
    {
      path: '/service/tickets/:id',
      element: () => import('./ticket-detail'),
      permCode: 'svc:ticket:view',
      titleKey: 'svc.detail.title',
    },
  ],
};

export default config;
