import type { ModuleConfig } from '@/app/router/types';

/**
 * 经营分析分区清单（一级菜单「经营分析」）。
 *
 * 功能编号对应《功能清单V2.0》八、经营分析（DM-）。
 *
 * 首页主体是预警中心而非看板：看板回答"现在怎么样"（可随时下钻），
 * 预警回答"哪件事必须今天处理"；作为每日入口，后者才驱动动作。
 *
 * 问答式取数（"上季度德国市场投入产出比是多少"）由经营分析智能体承担，
 * 链路为：意图识别 → 槽位抽取 → 语义层映射参数化 SQL → 受限执行 → 结果解释。
 * LLM 不直接生成 SQL（技术规约2.0 §3.6 G9）。
 */
const config: ModuleConfig = {
  key: 'analytics',
  basePath: '/analytics',
  titleKey: 'ana.menu.analytics',
  subtitleKey: 'ana.subtitle',
  bizCodes: 'DM-',
  permPrefix: 'ana',
  enabled: true,
  icon: 'analytics',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/analytics',
      element: () => import('./index'),
      permCode: 'ana:alert:view',
      titleKey: 'ana.menu.home',
    },
  ],
};

export default config;
