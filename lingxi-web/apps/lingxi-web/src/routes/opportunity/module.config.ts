import type { ModuleConfig } from '@/app/router/types';

/**
 * 商机中心分区清单（一级菜单「商机中心」）。
 *
 * 功能编号对应《功能清单V2.1》四、商机中心（OP-OPP- / OP-CUS- / BO-SAL-）：
 * 4.1 商机创建与阶段推进 / 4.2 意向等级与 BANT / 4.3 商机过程管理 / 4.4 关闭与复盘。
 *
 * 菜单序在客户中心之后、线索中心之前（一期先交付客户与商机）。
 *
 * 2026-09-27 增第二条路由：商机详情 `/opportunity/:id`（`hideInMenu`）。
 * 列表只回答"这批商机走到哪一段"，而销售每天处理的是**单条商机的下一步**；
 * 说明书 §682 又已约定「客户360 → 商机 → 商机详情 → 回客户360」的往返动线，
 * 没有这一环，客户360 与列表行上的「跟进 / 关闭」就是点了没处去的按钮。
 * 它不进菜单树（详情没有"入口"可导航），但仍占一个独立权限码。
 *
 * 2026-10-06 增第三条：跟进记录 `/opportunity/:id/follow`。
 * 详情页的「跟进」按钮原先只弹一句message，与详情页同一毛病 ——
 * 把"点了没处去"从按钮挪到了按钮的下一步。
 *
 * 权限前缀仍用 `cus`（与客户中心、线索中心同域，见 lead/module.config.ts 的说明）。
 *
 * 交付批次：本菜单整体在 **P0**（一期交付范围含客户中心与商机中心）。
 */
const config: ModuleConfig = {
  key: 'opportunity',
  basePath: '/opportunity',
  titleKey: 'opp.menu.opp',
  subtitleKey: 'opp.subtitle',
  bizCodes: 'OP-OPP- / OP-CUS- / BO-SAL-',
  permPrefix: 'cus',
  enabled: true,
  icon: 'opportunity',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/opportunity',
      element: () => import('./index'),
      permCode: 'cus:opp:view',
      titleKey: 'opp.menu.home',
    },
    {
      // 新建商机（`OP-OPP-01`）。放在 `:id` 之前是**可读性**考虑，不是路由必需：
      // react-router 的静态段优先级本就高于动态段，`/opportunity/new` 不会被 `:id` 吃掉。
      // 但仍写在这里 —— 下一个改路由的人不必去回忆打分规则。
      path: '/opportunity/new',
      element: () => import('./new'),
      permCode: 'cus:opp:create',
      hideInMenu: true,
      titleKey: 'opp.new.title',
    },
    {
      // 导入商机（`OP-OPP-01`）：带金额的表，金额脏法最贵，故校验明细必须逐行给出。
      path: '/opportunity/import',
      element: () => import('./import'),
      permCode: 'cus:opp:import',
      hideInMenu: true,
      titleKey: 'opp.imp.title',
    },
    {
      // 商机详情：从列表行进入，属详情页，不进菜单树
      path: '/opportunity/:id',
      element: () => import('./detail'),
      permCode: 'cus:opp:viewDetail',
      hideInMenu: true,
      titleKey: 'opp.detail.title',
    },
    {
      // 跟进记录（`OP-OPP-03` 商机过程管理）：详情页「跟进」按钮的去处。
      // 2026-10-06 新增 —— 该按钮原先只弹一句 message，是"点了没处去"。
      // 声明在 `/opportunity/:id` **之后**：react-router 按段数与顺序匹配，
      // 两段路径不会被它吃掉，写在后面只是让读代码的人不必推理。
      path: '/opportunity/:id/follow',
      element: () => import('./follow'),
      permCode: 'cus:opp:follow',
      hideInMenu: true,
      titleKey: 'opp.follow.title',
    },
  ],
};

export default config;
