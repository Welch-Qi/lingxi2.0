import { create } from 'zustand';
import { DEFAULT_ROLE, isRoleKey, type RoleKey } from '@/app/providers/roles';

/**
 * 工作区状态 —— 目前只有"本次会话里以什么角色在工作"（2026-09-27）。
 *
 * 为什么不用 localStorage：角色是**会话**属性，不是偏好设置。
 * 退出登录后若它还留在本地，重新登录时顶栏会先亮出一个上一次的角色，
 * 用户会以为"角色没退干净"。不持久化 = 退出即失效、刷新即回到未选，语义与会话一致。
 *
 * 接入平台后，角色由会话下发（`AuthUser.roles`）；那时这里退化为"用户显式切换过角色"的
 * 覆盖层，逻辑不变 —— 但**删除本文件前必须确认没有任何页面在消费它**。
 */
interface WorkspaceState {
  /** null = 本次会话还没选角色（直接敲 URL 进入业务页） */
  roleKey: RoleKey | null;
  setRole: (key: RoleKey) => void;
  /** 退出登录时调用：角色随会话一起作废 */
  clearRole: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  roleKey: null,
  setRole: (key) => set({ roleKey: isRoleKey(key) ? key : DEFAULT_ROLE }),
  clearRole: () => set({ roleKey: null }),
}));

/**
 * 当前生效角色（已选则已选、未选则落默认）。
 *
 * 业务页用它而不是直接读 store：直接敲 `/workbench` 进来时 `roleKey` 是 null，
 * 页面不该因此空白 —— 落默认角色，且与「未选角色」的提示由顶栏单独表达。
 */
export function useCurrentRole(): RoleKey {
  return useWorkspaceStore((state) => state.roleKey) ?? DEFAULT_ROLE;
}
