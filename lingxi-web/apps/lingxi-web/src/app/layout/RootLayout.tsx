import { Outlet } from 'react-router';
import { SideNav } from '@/app/layout/SideNav';
import { TopBar } from '@/app/layout/TopBar';
import { StatusBar } from '@/app/layout/StatusBar';
import { AgentTaskDrawer } from '@/features/agent-task/AgentTaskDrawer';

/**
 * 全局页面骨架（改造指引 3.2）：极光色带 + 侧边栏 + 顶栏 + 内容区 + 状态栏。
 *
 * 极光色带是全站签名元素，必须是根 layout 的第一个子元素，
 * 且任何滚动位置都可见（fixed + z-index 100）；
 * 侧边栏与顶栏的 sticky 偏移同为其高度，否则色带会被遮住。
 *
 * 交互约定（产品规划说明书2.0 交互逻辑章）：
 *  - 双通道：任何业务对象都可在界面直接操作，不被藏在对话流里
 *  - 入口铁律：任一功能入口不超过 2 次点击
 *  - 接管铁律：智能体任务随时可人工接管（右下角任务抽屉常驻）
 */
export function RootLayout() {
  return (
    <>
      <div className="lx-aurora" aria-hidden="true" />
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
    </>
  );
}
