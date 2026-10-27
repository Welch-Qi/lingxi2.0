import type { ModuleConfig } from '@/app/router/types';

/**
 * 提示词资产分区清单（元枢管理台「提示词库」）。
 *
 * 归口表：KC-16~19、KC-22 提示词管理归元枢智能体工厂；
 * 话术 / 模板 / QA 等知识内容（KC-07~15）界面留在灵犀知识中心。
 * 权限码沿用 `kc:` 前缀（既有码不改名）；骨架期首页登录即可达，
 * 元枢提示词 API 接入后再挂 `kc:prompt:view`。
 */
const config: ModuleConfig = {
  key: 'prompts',
  basePath: '/prompts',
  titleKey: 'ys.prompts.menu',
  subtitleKey: 'ys.prompts.subtitle',
  bizCodes: 'KC-16~19 / KC-22',
  permPrefix: 'kc',
  enabled: true,
  icon: 'knowledge',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/prompts',
      element: () => import('./index'),
      titleKey: 'ys.prompts.menu',
    },
  ],
};

export default config;
