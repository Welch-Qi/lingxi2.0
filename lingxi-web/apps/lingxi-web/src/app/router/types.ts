import type { ComponentType } from 'react';

/**
 * 路由分区清单契约（技术规约2.0 §4.2.2 强制）。
 *
 * 为什么要求每个分区登记：新增模块 = 新增路由分区 + 注册 manifest + 登记权限资源；
 * 禁止私挂路由与菜单，否则权限码与菜单会失控。
 */
export interface ModuleRoute {
  /** 分区内相对路径，如 '/customer/leads' */
  path: string;
  /** 懒加载组件 */
  element: () => Promise<{ default: ComponentType }>;
  /** 访问所需权限码，缺省表示登录即可访问 */
  permCode?: string;
  /** 菜单是否隐藏（详情页等不应出现在菜单树中） */
  hideInMenu?: boolean;
  /** 二级菜单标题 i18n key；缺省表示该路由不作为菜单项展示 */
  titleKey?: string;
}

/** 菜单角标来源：把"要显示什么数"声明在 manifest 里，避免在导航组件里写死模块名。 */
export type MenuBadgeSource = 'pendingAgentTasks';

export interface ModuleConfig {
  /** 分区键，与目录名一致 */
  key: string;
  /** 路由前缀，如 '/customer' */
  basePath: string;
  /** 菜单标题 i18n key */
  titleKey: string;
  /** 顶栏副标题 i18n key（说明"这个分区管什么"） */
  subtitleKey?: string;
  /** 对应功能编号（便于与功能清单 V2.1 对照） */
  bizCodes: string;
  /** 权限码前缀，如 'cus' */
  permPrefix: string;
  /** 功能开关；关闭时分区返回 404（开关由配置中心下发） */
  enabled: boolean;
  /** 菜单图标键，取值见 app/layout/menuIcons（图标库只在此处解析，manifest 不依赖具体图标组件） */
  icon?: string;
  /** 菜单角标来源；缺省不显示角标 */
  badgeSource?: MenuBadgeSource;
  /**
   * 分区外壳组件（面包屑、分区级权限守卫的挂载点）。
   *
   * 为什么放在 manifest 里而不是由路由层拼字符串：动态 import 的路径只要出现
   * 字符串拼接（'@/routes/' + key + '/layout'），打包器就无法做静态分析，
   * 生产构建会产出不可靠的产物。由分区自己声明，既保住静态分析，
   * 也让「新增模块」仍需修改的地方只有 manifest 与 modules.ts 两处。
   */
  layout: () => Promise<{ default: ComponentType }>;
  routes: ModuleRoute[];
}
