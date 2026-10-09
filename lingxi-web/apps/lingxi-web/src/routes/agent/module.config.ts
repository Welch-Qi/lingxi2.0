import type { ModuleConfig } from '@/app/router/types';

/**
 * 智能体中心分区清单（一级菜单「智能体中心」）。
 *
 * 功能编号对应《功能清单V2.1》十一、智能体中心（AG- / AC-）：
 * 9.1 智能体能力 / 9.2 智能体平台管理。
 *
 * 侧边栏角标来源声明在此（badgeSource），而不是在导航组件里写死模块名：
 * 角标数据来自任务中心（NEEDS_HUMAN + 待审批），换个分区承载只需改 manifest。
 *
 * 首页以"待人工处理的任务"为核心，而不是以智能体清单为核心：
 * 智能体全自动跑通时不需要人看，人真正要介入的只有三类——
 * 需审批（自主度不足）、越界拦截（命中不做清单）、连续失败，
 * 三者都置为 NEEDS_HUMAN 并生成人工待办（技术规约2.0 §3.6 G14）。
 */
const config: ModuleConfig = {
  key: 'agent',
  basePath: '/agent',
  titleKey: 'ag.menu.agent',
  subtitleKey: 'ag.subtitle',
  bizCodes: 'AG- / AC-',
  permPrefix: 'ag',
  enabled: true,
  icon: 'agent',
  badgeSource: 'pendingAgentTasks',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/agent',
      element: () => import('./index'),
      permCode: 'ag:task:view',
      titleKey: 'ag.menu.home',
    },
  ],
};

export default config;
