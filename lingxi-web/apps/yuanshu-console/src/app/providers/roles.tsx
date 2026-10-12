import type { ReactElement } from 'react';
import {
  AppstoreOutlined,
  CrownOutlined,
  GlobalOutlined,
  NotificationOutlined,
  TeamOutlined,
} from '@ant-design/icons';

/**
 * 工作角色清单 —— 全仓唯一事实源（2026-09-27）。
 *
 * 为什么必须收敛成一处：角色清单原先在 `/login` 与 `/workspace-select` 两个页面各写一份
 * （`RoleKey` 类型、`ROLES` 数组、图标映射都重复），两份定义一旦走散，
 * 「在登录页选的角色」与「顶栏显示的角色」就会各说各话 —— 而这正是本轮要修掉的缺口。
 *
 * 角色口径按《产品规划说明书 V2.1》§6.3：总经理 + 四大总监。
 * 1.0 的"智能体架构师"属原型阶段角色，未进入 2.0 产品基线，不采用。
 *
 * 接入真实平台后，角色应由平台会话下发（`AuthUser.roles`），
 * 本文件的清单退化为「演示期供角色切换页挑选」—— 因此**不要在业务代码里把这里当权威**，
 * 要显示角色就去读会话与工作区状态（见 `stores/workspaceStore.ts`）。
 */

export type RoleKey = 'ceo' | 'product' | 'channel' | 'content' | 'sales';

export interface RoleSpec {
  key: RoleKey;
  /** 走 i18n key（附录D 规则10），组件里只传 key 不传中文 */
  titleKey: string;
  descKey: string;
  icon: ReactElement;
  tone: 'primary' | 'secondary' | 'accent' | 'success' | 'violet';
}

export const ROLES: readonly RoleSpec[] = [
  { key: 'ceo', titleKey: 'ws.role.ceo', descKey: 'ws.role.ceoDesc', icon: <CrownOutlined />, tone: 'primary' },
  { key: 'product', titleKey: 'ws.role.product', descKey: 'ws.role.productDesc', icon: <AppstoreOutlined />, tone: 'secondary' },
  { key: 'channel', titleKey: 'ws.role.channel', descKey: 'ws.role.channelDesc', icon: <GlobalOutlined />, tone: 'accent' },
  { key: 'content', titleKey: 'ws.role.content', descKey: 'ws.role.contentDesc', icon: <NotificationOutlined />, tone: 'success' },
  { key: 'sales', titleKey: 'ws.role.sales', descKey: 'ws.role.salesDesc', icon: <TeamOutlined />, tone: 'violet' },
];

const ROLE_KEYS: readonly string[] = ROLES.map((item) => item.key);

/** 未选择角色时的落点（直接敲 URL 进工作台、也没有平台会话下发角色时） */
export const DEFAULT_ROLE: RoleKey = 'ceo';

export function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === 'string' && ROLE_KEYS.includes(value);
}

export function roleTitleKey(roleKey: RoleKey): string {
  return ROLES.find((item) => item.key === roleKey)?.titleKey ?? 'ws.role.ceo';
}
