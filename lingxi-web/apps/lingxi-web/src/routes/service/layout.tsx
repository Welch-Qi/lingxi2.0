import { Outlet } from 'react-router';

/** 售后服务 分区 layout：面包屑 + 分区权限守卫（技术规约2.0 §4.2.2）。 */
export default function ServiceLayout() {
  return <Outlet />;
}
