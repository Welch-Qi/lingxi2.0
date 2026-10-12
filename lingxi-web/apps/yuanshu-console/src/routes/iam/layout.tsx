import { Outlet } from 'react-router';

/** IAM 分区 layout（技术规约2.0 §4.2.2：分区外壳，守卫挂在路由级）。 */
export default function IamLayout() {
  return <Outlet />;
}
