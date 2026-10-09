import type { ModuleConfig } from '@/app/router/types';

/**
 * 客户中心分区清单（一级菜单「客户中心」）。
 *
 * 功能编号对应《功能清单V2.1》二、客户中心（OP-CUS- / BO-SAL-）：
 * 2.1 客户档案 / 2.2 跟进记录 / 2.3 客户沟通。
 * 商机与线索已独立为一级菜单（商机中心 / 线索中心），不在本分区（见产品 V2.1 §3.7）；
 * 三者同域相邻，菜单序为「客户中心 → 商机中心 → 线索中心」。
 *
 * 为什么是 L1 的第一个业务域：客户是企业唯一不会被平台替换掉的资产，
 * 其余三个数据源（海关 / 社媒 / 互联网）都由它派生，故必须先有"一企一档"，
 * 才有下游的内容、订单与服务。
 */
const config: ModuleConfig = {
  key: 'customer',
  basePath: '/customer',
  titleKey: 'cus.menu.customer',
  subtitleKey: 'cus.subtitle',
  bizCodes: 'OP-CUS- / BO-SAL-',
  permPrefix: 'cus',
  enabled: true,
  icon: 'customer',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/customer',
      element: () => import('./index'),
      permCode: 'cus:customer:view',
      titleKey: 'cus.menu.home',
    },
    {
      // 跟进记录：§4.4 的二级入口之一。客户 360 里的跟进那张表是它的**投影**
      // （看"发生过什么"），本页看的是"接下来做什么" —— 第一排序键不同，不能合并。
      path: '/customer/follow',
      element: () => import('./follow'),
      permCode: 'cus:customer:viewFollow',
      titleKey: 'cus.follow.page',
    },
    {
      // 客户360 档案页：从列表行的「客户360」进入，属详情页，不进菜单树
      path: '/customer/360/:id',
      element: () => import('./profile'),
      permCode: 'cus:customer:view360',
      hideInMenu: true,
      titleKey: 'cus.p360.title',
    },
    {
      // 新建客户：档案录入（`OP-CUS-01`）。独立路由而不是抽屉 ——
      // 三组字段录到一半被别的页面叫走，独立路由有 URL 可回。
      path: '/customer/new',
      element: () => import('./new'),
      permCode: 'cus:customer:create',
      hideInMenu: true,
      titleKey: 'cus.new.title',
    },
    {
      // 导入客户：存量批量入库（`OP-CUS-02`），走四步向导（映射 → 校验 → 确认）。
      // 客户编码有唯一约束，一次性提交再报错拿不到"哪一行错了"，故必须分步。
      path: '/customer/import',
      element: () => import('./import'),
      permCode: 'cus:customer:import',
      hideInMenu: true,
      titleKey: 'cus.imp.title',
    },
  ],
};

export default config;
