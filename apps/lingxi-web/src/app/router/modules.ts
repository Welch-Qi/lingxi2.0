import type { ModuleConfig } from '@/app/router/types';
import workbench from '@/routes/workbench/module.config';
import customer from '@/routes/customer/module.config';
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
 * 分区与 11 个一级菜单一一对应，顺序即侧边栏顺序。
 */
export const moduleConfigs: readonly ModuleConfig[] = [
  workbench,
  customer,
  product,
  order,
  service,
  marketing,
  intel,
  analytics,
  agent,
  knowledge,
  config,
];

/**
 * 菜单分组（产品规划说明书2.0 §5.1：菜单分组为「业务」「分析」「平台」三组）。
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
    keys: ['workbench', 'customer', 'product', 'order', 'service', 'marketing'],
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
