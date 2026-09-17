import { Outlet } from 'react-router';

/** 市场情报 分区 layout：面包屑 + 分区权限守卫（技术规约2.0 §4.2.2）。 */
export default function IntelLayout() {
  return <Outlet />;
}
