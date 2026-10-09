import { Outlet } from 'react-router';

/** 商机中心 分区 layout：面包屑 + 分区权限守卫（技术规约2.0 §4.2.2）。 */
export default function OpportunityLayout() {
  return <Outlet />;
}
