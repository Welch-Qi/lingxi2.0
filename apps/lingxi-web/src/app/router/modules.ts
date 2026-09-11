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
