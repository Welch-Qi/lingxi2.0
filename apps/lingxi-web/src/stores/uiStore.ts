import { create } from 'zustand';

/**
 * 客户端 UI 状态（Zustand）。
 *
 * 铁律（技术规约2.0 §4.2.1）：只存 UI 状态；禁止把接口数据存进这里——
 * 接口数据一律由 TanStack Query 管理，避免出现第二份真相。
 */
interface UiState {
  /** 智能体任务抽屉是否展开 */
  taskDrawerOpen: boolean;
  /** 待人工处理的智能体任务数（NEEDS_HUMAN + 待审批） */
  pendingTaskCount: number;
  toggleTaskDrawer: () => void;
  setPendingTaskCount: (count: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  taskDrawerOpen: false,
  pendingTaskCount: 0,
  toggleTaskDrawer: () => set((s) => ({ taskDrawerOpen: !s.taskDrawerOpen })),
  setPendingTaskCount: (count) => set({ pendingTaskCount: count }),
}));
