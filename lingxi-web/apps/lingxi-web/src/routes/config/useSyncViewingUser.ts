import { useCallback } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCcStore } from './cc-store';
import { roleKeyForUser } from './role-identity';

/**
 * 切换「视角身份」的**唯一入口**（2026-10-07）。
 *
 * ## 为什么不能只调 setViewingUser
 *
 * 演示态有两处状态共同决定顶栏，且它们是配套的：
 *
 *   cc-store 的 `viewingUserId`→ 顶栏**用户名** + 全部权限 + 数据范围
 *   workspaceStore.roleKey      → 顶栏**角色胶囊**
 *
 * 只改前者，胶囊会停留在上一个身份的角色，与旁边的用户名对不上
 * （实测：切到渠道总监后胶囊显示「未分配角色」，因为没人同步过 roleKey）。
 * 三处切视角入口（用户列表行内、配置中心首页胶囊、回到超管）曾经各写一遍
 * `setViewingUser`，于是**每一处都可能漏**同步 —— 故收敛成本文件。
 *
 * ## 为什么 roleKey 为空时是 clear 而不是 DEFAULT_ROLE
 *
 * 审计员/访客这类账号持的角色不属于任何岗位，岗位映射表里查不到。
 * 此时塞回 DEFAULT_ROLE 会让顶栏显示「总经理」—— 一个**假的岗位**，
 * 比老老实实显示「未分配」危险得多：用户会以为系统把访客当成了最高权限。
 */
export function useSyncViewingUser(): (userId: string) => void {
  const setViewingUser = useCcStore((s) => s.setViewingUser);
  const users = useCcStore((s) => s.users);
  const setRole = useWorkspaceStore((s) => s.setRole);
  const clearRole = useWorkspaceStore((s) => s.clearRole);

  return useCallback(
    (userId: string) => {
      setViewingUser(userId);
      const key = roleKeyForUser(users.find((item) => item.id === userId));
      if (key) setRole(key);
      else clearRole();
    },
    [setViewingUser, users, setRole, clearRole],
  );
}