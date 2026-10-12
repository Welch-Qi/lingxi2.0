import type { ModuleConfig } from '@/app/router/types';
import overview from '@/routes/overview/module.config';
import iam from '@/routes/iam/module.config';
import governance from '@/routes/governance/module.config';
import prompts from '@/routes/prompts/module.config';
import metrics from '@/routes/metrics/module.config';

/**
 * 元枢管理台路由分区登记表 —— 唯一注册入口（技术规约2.0 §4.2.2）。
 *
 * 新增模块只需：新建 routes/{分区}/ 并在本文件登记一行（其余由框架承接）。
 * 禁止在别处私挂路由或菜单。
 *
 * 分区口径（归口表「界面归属 = 元枢管理台」）：
 *  - overview   总览（四类能力出口直达）
 *  - iam        多租户会话与权限（CC-05~08 / CC-13~18，自灵犀 config 迁入）
 *  - governance 智能体工厂治理面（AC-01~09、AG-07~09，自灵犀 agent 拆出）
 *  - prompts    提示词资产（KC-16~19 / KC-22，自灵犀 knowledge 拆出）
 *  - metrics    指标口径中心 + 效能看板（DT / GM / OP-BA-02，新增占位分区）
 *
 * 开物（KAIWU）预留：二期只在此登记预留分区名（如 kaiwu-industry-pack 协同视图），
 * 一期不建任何 kaiwu 目录/分区（归口表 §6.4 与三产品规划硬约束）；
 * 开物智能体经 governance 的 AgentRegistrationApi 注册，不另建治理台。
 */
export const moduleConfigs: readonly ModuleConfig[] = [
  overview,
  iam,
  governance,
  prompts,
  metrics,
];

/**
 * 菜单分组：管理台只有一组（平台能力），保留分组机制与灵犀同构，
 * 便于二期开物接入时按「平台 / 协同」扩展。
 */
export interface MenuGroup {
  key: 'ys';
  titleKey: string;
  modules: readonly ModuleConfig[];
}

const GROUP_DEFS = [
  {
    key: 'ys',
    titleKey: 'ys.group.console',
    keys: ['overview', 'iam', 'governance', 'prompts', 'metrics'],
  },
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
 * 分区首页路由的权限码（菜单可见性的判据）。
 * 与 lingxi-web 同一套三级回落语义，细节见该仓 modules.ts 注释。
 */
export function moduleHomePermCode(module: ModuleConfig): string | undefined {
  const home = module.routes.find((r) => r.path === module.basePath)?.permCode;
  if (home) return home;
  return module.routes.find((r) => r.permCode !== undefined)?.permCode;
}

/**
 * 分区是否对当前用户可见（SideNav 的唯一过滤判据）。
 * 与 RequirePerm 同一套语义（尾段通配）；校验一律以元枢后端为准（§4.9.2）。
 */
export function moduleVisibleByPerm(
  has: (code: string | string[]) => boolean,
  module: ModuleConfig,
): boolean {
  const code = moduleHomePermCode(module);
  return code === undefined ? true : has(code);
}
