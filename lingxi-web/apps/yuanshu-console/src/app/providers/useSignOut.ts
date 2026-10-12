import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/providers/AuthProvider';
import { isStaticPreview } from '@/app/providers/previewSession';
import { useCcStore } from '@/routes/iam/cc-store';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * 统一退出出口（2026-09-27）。顶栏与侧栏都走这里，避免两处各写一份、
 * 退出后行为还不一样。
 *
 * 预览模式为什么要整页跳：预览会话（`previewSession.ts`）是在 **AuthProvider 的
 * 启动流程里**建立的，而那段流程只在组件挂载时跑一次。退出把状态清成 anonymous 之后，
 * 页面不重载就再没有任何入口能把它设回 authenticated —— 实测（2026-09-27 登录闭环探针）：
 * 退出后点「进入工作台」会被 `RequireAuth` 拦回来，URL 停在
 * `/login?redirect=%2Fworkbench`，**重进这一步死循环**。
 * 预览会话的本质就是"每次页面加载重建的假会话"，重建它只能是重新加载页面。
 *
 * 真实 OIDC 模式：走平台侧登出（`manager.signoutRedirect()`），成功后由平台回跳登录页。
 * 这里多出来的 `navigate('/login')` 只覆盖"平台侧登出失败/无跳转"的分支 ——
 * 那时本地已清干净，不把用户送回登录页，他就停在业务页里看着一个空的登录态。
 * 平台侧失败**不往上抛**：把"后端没登出成功"变成用户卡在当前页，比让他重新登录更糟。
 *
 * ## 必须同时清「视角身份」（2026-10-07 补）
 *
 * 此前只清了 `roleKey`，漏了 cc-store 的 `viewingUserId`，而后者**持久化在
 * localStorage**（`lx.cc.config.v1`）。于是：在配置中心「以此身份查看」切到某人
 * → 退出 → 重新登录，还是那个人（用户报的现象）。
 *
 * 漏掉的理由很朴素：视角身份看起来像"配置"，而退出登录看起来像"会话"，两者分属不同模块。
 * 但视角身份**决定的是谁在用这个系统**，它比 roleKey 更靠近会话 ——
 * `AuthProvider` 的 `activeUser` 读的就是它，不清等于"登出后仍以他人身份在线"。
 * 这也正是权限判据里 fail-open 的形态：不是多给了权限，而是压根没退出。
 */
export function useSignOut() {
  const { logout } = useAuth();
  const clearRole = useWorkspaceStore((state) => state.clearRole);
  const resetViewingUser = useCcStore((state) => state.resetViewingUser);
  const navigate = useNavigate();

  return useCallback(() => {
    clearRole();
    // 必须清，且必须在整页跳转之前 —— 预览分支走 window.location.assign，
    // 那之后的代码都不会执行，漏了就等于没清（localStorage 带着旧视角进下一页）。
    resetViewingUser();
    if (isStaticPreview()) {
      window.location.assign('/login');
      return;
    }
    void logout().catch(() => {
      /* 平台侧会话销毁失败不阻断本地退出，理由见文件头 */
    });
    // navigate 在 react-router v7 的类型里返回 Promise；这里要的是「发起跳转」，
    // 不是等它落地后再收尾，故显式标为已处理。
    void navigate('/login', { replace: true });
  }, [clearRole, resetViewingUser, logout, navigate]);
}
