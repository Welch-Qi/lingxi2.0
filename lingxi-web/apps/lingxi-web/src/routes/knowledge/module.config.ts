import type { ModuleConfig } from '@/app/router/types';

/**
 * 知识中心分区清单（一级菜单「知识中心」）。
 *
 * 功能编号对应《功能清单V2.1》十二、知识中心（KC-）。
 *
 * 四类资产各有明确消费者，混在一起会导致"写完没人用"：
 * 模板 / 话术 → 人工通道（业务员直接引用）
 * QA 库       → 营销客服智能体（标准答疑）
 * 提示词库     → 智能体通道（版本化 + A/B）
 *
 * 提示词必须入库（技术规约2.0 §3.6 G7）：代码内联提示词会导致改一句话要发一次版，
 * 且无法做 A/B 与回归评测；代码只引用场景码，不引用模型名。
 */
const config: ModuleConfig = {
  key: 'knowledge',
  basePath: '/knowledge',
  titleKey: 'kc.menu.knowledge',
  subtitleKey: 'kc.subtitle',
  bizCodes: 'KC-',
  permPrefix: 'kc',
  enabled: true,
  icon: 'knowledge',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/knowledge',
      element: () => import('./index'),
      permCode: 'kc:asset:view',
      titleKey: 'kc.menu.home',
    },
  ],
};

export default config;
