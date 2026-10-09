import type { ModuleConfig } from '@/app/router/types';

/**
 * 工作台分区清单（一级菜单「工作台」）。
 *
 * 功能编号对应《功能清单V2.1》一、工作台（UW-）：1.1 角色首页 / 1.2 智能助手 /
 * 1.3 任务中心 / 1.4 数据看板 / 1.5 通知中心。
 *
 * 为什么默认页是 dashboard 而不是列表页：产品规划说明书 V2.1 §6.3 要求
 * "默认页即当日该做的事"，工作台是 CEO 与总监每天的第一个落点，
 * 它必须直接呈现趋势与异常，而不是让人再去点一次菜单。
 *
 * 二级菜单：一期只落 dashboard（分区入口）与 brief（今日简报）两页；
 * 任务中心以全局抽屉承载（AgentTaskDrawer，任意页面可唤起），
 * 不另占一个二级菜单——否则"接管智能体"要先进工作台，违反入口铁律。
 */
const config: ModuleConfig = {
  key: 'workbench',
  basePath: '/workbench',
  titleKey: 'wb.menu.workbench',
  subtitleKey: 'wb.subtitle',
  bizCodes: 'UW-',
  permPrefix: 'wb',
  enabled: true,
  icon: 'workbench',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/workbench',
      element: () => import('./index'),
      permCode: 'wb:home:view',
      titleKey: 'wb.menu.dashboard',
    },
    {
      path: '/workbench/brief',
      element: () => import('./brief'),
      permCode: 'wb:brief:view',
      titleKey: 'wb.menu.brief',
    },
  ],
};

export default config;
