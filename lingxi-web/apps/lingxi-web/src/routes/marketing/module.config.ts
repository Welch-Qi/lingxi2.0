import type { ModuleConfig } from '@/app/router/types';

/**
 * 营销中心分区清单（一级菜单「营销中心」）。
 *
 * 基于 SCRM 营销系统功能清单重构为四主线：素材 / 活动 / 投放 / 分发。
 * 功能编号对应《功能清单V2.1》八、营销中心（OP-MKT- / BO-MKG-）。
 *
 * 入口（/marketing）= 营销日历（2026-10-06 改版，见 index.tsx）。
 * 一级菜单只挂一个入口，二级模块都在分区内通过顶部快捷按钮与子路由可达（≤2 次点击）。
 *
 * 五个快捷入口（顺序即用户指定顺序，营销日历最左且为默认正文）：
 *   营销日历       /marketing/calendar     五类排期混排 + 冲突检测
 *   内容管理       /marketing/assets（列表/审核）+ /upload + /content/:code
 *   内容分发       /marketing/distribute（主视图）+ /publish + /channel + /schedule + /email + /visitor
 *   活动管理（SCRM 02）：/marketing/campaigns（列表/生命周期）+ /campaigns/new + /campaigns/:id
 *   投放管理       /marketing/place（+ /place/new）
 *
 * 对外内容必须人审（技术规约2.0 §3.6 G4，自主度 ≤A1），故「待审核」是高频动作，在状态列直接暴露。
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
      titleKey: 'mkg.ov.mod.content',
    },
    {
      path: '/marketing/assets',
      element: () => import('./content'),
      permCode: 'mkg:content:view',
      titleKey: 'mkg.ov.mod.content',
    },
    {
      path: '/marketing/campaigns',
      element: () => import('./campaigns'),
      permCode: 'mkg:campaign:view',
      titleKey: 'mkg.campaign.menu',
    },
    {
      path: '/marketing/campaigns/new',
      element: () => import('./campaign-new'),
      permCode: 'mkg:campaign:create',
      titleKey: 'mkg.campaign.create.title',
    },
    {
      path: '/marketing/campaigns/:id',
      element: () => import('./campaign-detail'),
      permCode: 'mkg:campaign:view',
      titleKey: 'mkg.campaign.detailTitle',
    },
    {
      path: '/marketing/distribute',
      element: () => import('./distribute'),
      permCode: 'mkg:distribute:view',
      titleKey: 'mkg.menu.distribute',
    },
    {
      path: '/marketing/publish',
      element: () => import('./publish'),
      permCode: 'mkg:distribute:create',
      titleKey: 'mkg.pub.title',
    },
    {
      // 营销日历（2026-10-06 重构）：五类排期混排 + 冲突检测，见 mkt-calendar.tsx 文件头。
      // 它同时是营销中心总览的默认正文（/marketing 落地即此页）。
      path: '/marketing/calendar',
      element: () => import('./mkt-calendar'),
      permCode: 'mkg:calendar:view',
      titleKey: 'mkg.cal.title',
    },
    {
      // 内容排期（2026-10-06 由 /marketing/calendar 迁至 /marketing/schedule）：
      // 原路径让位给营销日历。两者不是同一件事换皮 —— 排期页回答"哪条内容几点发哪个渠道"，
      // 营销日历回答"这一天该做什么、撞没撞档"。混在一起两边都说不清。
      path: '/marketing/schedule',
      element: () => import('./calendar'),
      permCode: 'mkg:calendar:view',
      titleKey: 'mkg.cal.page',
    },
    {
      path: '/marketing/channel',
      element: () => import('./channel'),
      permCode: 'mkg:channel:view',
      titleKey: 'mkg.chn.page',
    },
    {
      path: '/marketing/place',
      element: () => import('./place'),
      permCode: 'mkg:place:view',
      titleKey: 'mkg.menu.place',
    },
    {
      path: '/marketing/place/new',
      element: () => import('./place-new'),
      permCode: 'mkg:place:create',
      titleKey: 'mkg.plan.title',
    },
    {
      path: '/marketing/email',
      element: () => import('./email'),
      permCode: 'mkg:email:view',
      titleKey: 'mkg.mail.page',
    },
    {
      path: '/marketing/visitor',
      element: () => import('./visitor'),
      permCode: 'mkg:visitor:view',
      titleKey: 'mkg.vis.page',
    },
    {
      path: '/marketing/upload',
      element: () => import('./upload'),
      permCode: 'mkg:content:create',
      titleKey: 'mkg.upload.title',
    },
    {
      path: '/marketing/content/:code',
      element: () => import('./content-detail'),
      permCode: 'mkg:content:review',
      titleKey: 'mkg.detail.page',
    },
  ],
};

export default config;
