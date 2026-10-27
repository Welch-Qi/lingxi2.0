import type { ModuleConfig } from '@/app/router/types';

/**
 * 配置中心分区清单（一级菜单「配置中心」）。
 *
 * 功能编号对应《功能清单V2.1》十三、配置中心（CC-）。
 *
 * 首页主体是"业务字典与配置"：本分区只保留 CC-09~12 业务配置与企业公约。
 *
 * ⚠️ 三产品升级（元枢归口）：users / roles / audit / global 四项属元枢管理台
 *   （CC-13~18 权限用户角色、CC-05~08 审计与全局），已 git mv 迁至 apps/yuanshu-console/routes/iam，
 *   本分区不再登记这些路由（不留死链）。
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
      permCode: 'cc:biz:view',
      titleKey: 'cc.menu.home',
    },
    {
      path: '/config/business',
      element: () => import('./business'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.business.title',
      hideInMenu: true,
    },
    {
      path: '/config/business/social',
      element: () => import('./biz/social'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.biz.social',
      hideInMenu: true,
    },
    {
      // 商机阶段字典（2026-10-06 由占位壳落地为真实 CRUD）
      path: '/config/business/stage-opp',
      element: () => import('./biz/stage-opp'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.biz.stageOpp',
      hideInMenu: true,
    },
    {
      path: '/config/business/stage-order',
      element: () => import('./biz/stage-order'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.biz.stageOrder',
      hideInMenu: true,
    },
    {
      // 客户意向等级字典（2026-10-06 新增；此前四档硬编码散落在四个文件里）
      path: '/config/business/intent',
      element: () => import('./biz/intent'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.dict.intent',
      hideInMenu: true,
    },
    {
      // 商品类目字典（2026-10-06 新增；此前 /config/business 的类目入口跳出到 /product/category）
      path: '/config/business/category',
      element: () => import('./biz/category'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.dict.category',
      hideInMenu: true,
    },
    {
      // 活动类型字典（2026-10-07 第二十轮新增；此前是campaign-data.ts 的联合类型）
      path: '/config/business/camp-type',
      element: () => import('./biz/camp-type'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.dict.campType',
      hideInMenu: true,
    },
    {
      // 客户类型字典（2026-10-07 第二十轮新增；此前是 customer/data.ts 的联合类型）
      path: '/config/business/cus-type',
      element: () => import('./biz/cus-type'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.dict.cusType',
      hideInMenu: true,
    },
    {
      // 客户价值分层字典（2026-10-07 第二十轮新增）
      path: '/config/business/cus-tier',
      element: () => import('./biz/cus-tier'),
      permCode: 'cc:biz:view',
      titleKey: 'cc.dict.cusTier',
      hideInMenu: true,
    },
    {
      path: '/config/charter',
      element: () => import('./charter'),
      permCode: 'cc:charter:view',
      titleKey: 'cc.charter.title',
      hideInMenu: true,
    },
  ],
};

export default config;
