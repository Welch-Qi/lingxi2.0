import type { ModuleConfig } from '@/app/router/types';

/**
 * 营销中心分区清单（一级菜单「营销中心」）。
 *
 * 功能编号对应《功能清单V2.0》六、营销中心（OP-MKT- / BO-MKG-）：
 * 6.1 社媒账号 / 6.2 内容创作 / 6.3 内容分发与排期 / 6.4 邮件营销 /
 * 6.5 WhatsApp 营销 / 6.6 访客识别与流量转化 / 6.7 自动开发与效果分析。
 *
 * 一级菜单只有一个内容页，把"生产 → 分发 → 投放"三段用步骤条合在一页：
 * 内容工作流是串行的，若拆成三个一级入口，用户会在菜单之间来回找上下文。
 *
 * 对外内容必须人审（技术规约2.0 §3.6 G4，自主度 ≤A1），
 * 因此"待审核"是这一页最高频的人工动作，在状态列直接暴露。
 */
const config: ModuleConfig = {
  key: 'marketing',
  basePath: '/marketing',
  titleKey: 'mkg.menu.marketing',
  subtitleKey: 'mkg.subtitle',
  bizCodes: 'OP-MKT- / BO-MKG-',
  permPrefix: 'mkg',
  enabled: true,
  icon: 'marketing',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/marketing',
      element: () => import('./index'),
      permCode: 'mkg:content:view',
      titleKey: 'mkg.menu.content',
    },
  ],
};

export default config;
