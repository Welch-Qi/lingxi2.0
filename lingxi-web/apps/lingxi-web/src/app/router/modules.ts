import type { ModuleConfig } from '@/app/router/types';
import workbench from '@/routes/workbench/module.config';
import customer from '@/routes/customer/module.config';
import opportunity from '@/routes/opportunity/module.config';
import lead from '@/routes/lead/module.config';
import product from '@/routes/product/module.config';
import order from '@/routes/order/module.config';
import service from '@/routes/service/module.config';
import marketing from '@/routes/marketing/module.config';
import intel from '@/routes/intel/module.config';
import analytics from '@/routes/analytics/module.config';
import agent from '@/routes/agent/module.config';
import knowledge from '@/routes/knowledge/module.config';
import config from '@/routes/config/module.config';

/**
 * 全部路由分区登记表 —— 唯一注册入口。
 *
 * 新增模块只需：新建 routes/{分区}/ 并在本文件登记一行（其余由框架承接）。
 * 禁止在别处私挂路由或菜单（技术规约2.0 §4.2.2）。
 *
 * moduleConfigs 共 13 个分区（含 lead）；但一级菜单现 12 项——
 * 线索中心（lead）已从 `GROUP_DEFS.biz.keys` 摘出，入口收口到商机中心「线索池」按钮（直达 /lead）。
 * 其余 12 个分区与一级菜单一一对应，顺序即侧边栏顺序。
 *
 * 客户域三菜单（客户中心 / 商机中心 / 线索中心）**仍然相邻**：三层对象（线索 Lead →
 * 客户 Account + 商机 Opportunity）同属 `cus_` 数据域，不该被别的分区切开。
 * 但它们的**位置**在 2026-09-27 由业务方裁决后前移一位——现在排在商品中心与营销中心之后：
 * 「商品 → 营销 → 客户」是一条内容与投放链路，用户做完投放要立刻回客户域看结果，
 * 中间不该隔着订单/售后；而交付顺序（一期先交付客户与商机）不再是摆菜单的依据。
 *
 * **两种顺序刻意不同，引用勿混**：菜单序是「客户 → 商机 → 线索」（2026-09-24 定，
 * 一期先交付客户与商机），对象流转序则是「线索 → 客户 + 商机」。
 */
export const moduleConfigs: readonly ModuleConfig[] = [
  workbench,
  product,
  marketing,
  customer,
  opportunity,
  lead,
  order,
  service,
  intel,
  analytics,
  agent,
  knowledge,
  config,
];

/**
 * 菜单分组（产品规划说明书 V2.1 §6.1：菜单分组为「业务」「分析」「平台」三组）。
 *
 * 分组只描述"导航怎么摆"，分区清单仍是 moduleConfigs 单一来源；
 * 因此此处只登记分组与包含的分区键，不重复定义分区属性。
 */
export interface MenuGroup {
  key: 'biz' | 'ana' | 'plt';
  titleKey: string;
  modules: readonly ModuleConfig[];
}

const GROUP_DEFS = [
  {
    key: 'biz',
    titleKey: 'nav.group.biz',
    // 顺序即侧边栏顺序：工作台 → 商品中心 → 营销中心 → 客户域（客户/商机）→ 订单交付 → 售后服务
    // （2026-09-27 业务方裁决；moduleConfigs 同步同序，避免两处出现不同顺序）
    // 2026-09-29：线索中心从一级菜单移除（入口收口到商机中心「线索池」按钮，直达 /lead）；
    // 路由与 findModuleByPath 仍依赖 moduleConfigs 中的 lead 条目，故只从分组里摘掉，不删分区条目。
    keys: ['workbench', 'product', 'marketing', 'customer', 'opportunity', 'order', 'service'],
  },
  { key: 'ana', titleKey: 'nav.group.ana', keys: ['intel', 'analytics'] },
  { key: 'plt', titleKey: 'nav.group.plt', keys: ['agent', 'knowledge', 'config'] },
] as const;

const byKey = new Map(moduleConfigs.map((m) => [m.key, m]));

export const menuGroups: readonly MenuGroup[] = GROUP_DEFS.map((def) => ({
  key: def.key,
  titleKey: def.titleKey,
  modules: def.keys
    .map((key) => byKey.get(key))
    .filter((m): m is ModuleConfig => m !== undefined),
}));

/** 按当前路径匹配所属分区（用于侧边栏选中态与顶栏标题）。 */
export function findModuleByPath(pathname: string): ModuleConfig | undefined {
  return moduleConfigs.find((m) => pathname === m.basePath || pathname.startsWith(`${m.basePath}/`));
}

/**
 * 分区首页路由的权限码（菜单可见性的判据，2026-10-06 接线）。
 *
 * 取 `path === basePath` 那条路由的 permCode；没有则回落该分区**任一**路由的 permCode，
 * 再没有则返回 undefined（= 登录即可见）。三级回落是为了兼容两类历史写法：
 * ① 首页写成独立路由但 permCode 漏填；② 分区首页不带 permCode 而子页才带。
 * 仍取不到就视为公开，不凭空拒绝一个分区。
 */
export function moduleHomePermCode(module: ModuleConfig): string | undefined {
  const home = module.routes.find((r) => r.path === module.basePath)?.permCode;
  if (home) return home;
  return module.routes.find((r) => r.permCode !== undefined)?.permCode;
}

/**
 * 分区是否对当前用户可见（SideNav 的唯一过滤判据）。
 *
 * 刻意与 `RequirePerm` 用同一套语义 —— 都走 `usePermission().has` 的尾段通配规则
 * （`cus:*` 覆盖 `cus:opp:view`）。若两处各写一套，"菜单能看见但点进去 403"、
 * 或者"菜单不见了但直敲 URL 能进"这类不一致必然出现。
 */
export function moduleVisibleByPerm(
  has: (code: string | string[]) => boolean,
  module: ModuleConfig,
): boolean {
  const code = moduleHomePermCode(module);
  return code === undefined ? true : has(code);
}
