import type { ModuleConfig } from '@/app/router/types';

/**
 * 配置中心分区清单（一级菜单「配置中心」）。
 *
 * 功能编号对应《功能清单V2.0》十一、配置中心（CC-）。
 *
 * 首页主体是"用户与数据权限范围"：功能权限、字段权限最终都归结为
 * "这个人在这个租户里能看到哪些行、哪些列"。
 * 数据权限范围口径统一为 SELF / DEPT / DEPT_AND_SUB / CUSTOM / ALL，
 * 由平台统一定义，各模块不得自定义（技术规约2.0 §4.8.2）。
 *
 * 企业公约也在此维护——它同时是 AI 生成内容的约束注入源，
 * 变更后必须使相关提示词缓存失效（技术规约2.0 §3.5 F6）。
 */
const config: ModuleConfig = {
  key: 'config',
  basePath: '/config',
  titleKey: 'cc.menu.config',
  subtitleKey: 'cc.subtitle',
  bizCodes: 'CC-',
  permPrefix: 'cc',
  enabled: true,
  icon: 'config',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/config',
      element: () => import('./index'),
      permCode: 'cc:user:view',
      titleKey: 'cc.menu.home',
    },
  ],
};

export default config;
