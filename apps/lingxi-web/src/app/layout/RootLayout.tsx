import { Outlet } from 'react-router';
import { SideNav } from '@/app/layout/SideNav';
import { TopBar } from '@/app/layout/TopBar';
import { StatusBar } from '@/app/layout/StatusBar';
import { AgentTaskDrawer } from '@/features/agent-task/AgentTaskDrawer';

/**
 * 全局页面骨架：侧边栏 + 顶栏 + 内容区 + 底部状态栏（技术规约2.0 §4.2.2）。
 *
 * 交互约定（产品规划说明书2.0 交互逻辑章）：
 *  - 双通道：任何业务对象都可在界面直接操作，不被藏在对话流里
 *  - 入口铁律：任一功能入口不超过 2 次点击
 *  - 接管铁律：智能体任务随时可人工接管（右下角任务抽屉常驻）
 */
export function RootLayout() {
  return (
    <div className="lx-shell">
      <SideNav />
      <div className="lx-main">
        <TopBar />
        <main className="lx-content">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <AgentTaskDrawer />
    </div>
  );
}
