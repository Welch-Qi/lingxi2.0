import type { ModuleConfig } from '@/app/router/types';

/**
 * 智能体工厂治理面分区清单（元枢管理台「智能体治理」）。
 *
 * 归口表：AC-01~09 能力中心与 AG-07~09（自主度 / 边界拦截 / 轨迹审批）归元枢；
 * 灵犀 `routes/agent` 只保留六智能体名册与任务的业务视角。
 * 开物五个场景智能体同样注册到此（AgentRegistrationApi，归口表 §6.3 风险3）。
 *
 * 骨架期不挂 permCode：治理 API（/api/v1/ys/**）属新增契约，只登记不实现；
 * 后端就绪后权限码一律由元枢下发（前端只声明，校验在平台，§4.9.2）。
 */
const config: ModuleConfig = {
  key: 'governance',
  basePath: '/governance',
  titleKey: 'ys.gov.menu',
  subtitleKey: 'ys.gov.subtitle',
  bizCodes: 'AC- / AG-07~09',
  permPrefix: 'ac',
  enabled: true,
  icon: 'agent',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/governance',
      element: () => import('./index'),
      titleKey: 'ys.gov.menu',
    },
  ],
};

export default config;
