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
}

export interface ModuleConfig {
  /** 分区键，与目录名一致 */
  key: string;
  /** 路由前缀，如 '/customer' */
  basePath: string;
  /** 菜单标题 i18n key */
  titleKey: string;
  /** 对应功能编号（便于与功能清单 V2.0 对照） */
  bizCodes: string;
  /** 权限码前缀，如 'cus' */
  permPrefix: string;
  /** 功能开关；关闭时分区返回 404（开关由配置中心下发） */
  enabled: boolean;
  /** 菜单图标（AntD 图标名） */
  icon?: string;
  routes: ModuleRoute[];
}
