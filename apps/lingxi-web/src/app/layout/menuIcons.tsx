import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  GlobalOutlined,
  NotificationOutlined,
  RobotOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';

/**
 * 菜单图标注册表。
 *
 * 为什么单独放这里：module.config 只登记"图标键"，不 import 图标组件，
 * 从而使 manifest 保持纯数据（可在非 React 环境被工具读取）；
 * 图标库唯一（lucide 在原型中使用，本工程按技术规约2.0 §4.2.1 统一 AntD 图标，禁止混装）。
 */
export const MENU_ICONS: Record<string, ReactNode> = {
  workbench: <DashboardOutlined />,
  customer: <TeamOutlined />,
  product: <AppstoreOutlined />,
  order: <ShoppingOutlined />,
  service: <CustomerServiceOutlined />,
  marketing: <NotificationOutlined />,
  intel: <GlobalOutlined />,
  analytics: <BarChartOutlined />,
  agent: <RobotOutlined />,
  knowledge: <BookOutlined />,
  config: <SettingOutlined />,
};

/** 未登记的图标键回退为工作台图标，避免菜单出现空洞。 */
export function renderMenuIcon(key: string | undefined): ReactNode {
  if (!key) {
    return MENU_ICONS['workbench'];
  }
  return MENU_ICONS[key] ?? MENU_ICONS['workbench'];
}
