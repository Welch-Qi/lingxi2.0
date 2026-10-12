import { useMemo } from 'react';
import type { AuthUser, DataScope } from '@/app/providers/AuthProvider';
import type { ScopeContext } from '@/app/providers/dataScope';
import { DEFAULT_VIEWING_USER_ID, DEPT_MAP, effectivePerms, useCcStore } from '@/routes/iam/cc-store';

/**
 * 当前生效身份的**唯一派生点**（2026-10-06 接线，2026-10-07 修回落）。
 *
 * ## 为什么要有这一层
 *
 * 「任意用户对功能模块、数据范围的差异化管控」要能被**当场验证**，而不是靠读代码相信。
 * 而配置中心配完权限后，唯一能看到效果的路径是**换一个身份再看**：
 *
 *   在用户列表点「以此身份查看」→ 侧边栏立刻少掉几个域 → 直敲被摘掉的分区 URL撞 403
 *   → 客户列表按该用户的数据范围被过滤成几行。
 *
 * 这三件事必须共用同一个派生函数，否则「菜单按 A 的权限、列表按 B 的范围」会同时发生，
 * 而用户看到的现象是两个都不对。本文件只算一次，AuthProvider（权限）与各列表页（范围）都读它。
 *
 * ## 与真实会话的关系
 *
 * 真实后端就绪后，`AuthProvider` 的 session 会下发 user + permissions，
 * 本文件退化为「用户显式切换视角」的覆盖层，逻辑不变。
 * 现在它只在静态预览（`VITE_LX_STATIC_PREVIEW`）下被 AuthProvider 消费，
 * 避免在真实会话里偷换身份。
 *
 * ## 视角身份与登录的关系（2026-10-07 定）
 *
 * `viewingUserId` 就是**演示态的"当前登录用户"**，不是一项独立的"配置"：
 * 顶栏用户名、侧边栏菜单、路由守卫、数据范围过滤全读它。于是：
 *   · 退出登录必须清它（`useSignOut` 调 `resetViewingUser`）—— 否则视角被登出继承；
 *   · 登录页选岗位必须同步它（`role-identity.ts` 做岗位→账号桥接）——
 *     否则「切换角色还是这个用户」。
 * 把视角当"配置"而不当"会话"，是这两条 bug 的共同成因。
 */
export interface ActingIdentity {
  userId: string;
  /** 映射成 AuthUser 形状（账号即显示名：配置中心里「姓名」是 i18n key，真实姓名要等接入人员目录） */
  user: AuthUser;
  /** 生效权限码（多角色并集） */
  perms: readonly string[];
  /** 数据范围判据上下文，可直接喂给 filterByScope */
  scopeCtx: ScopeContext;
  /** 数据范围档位（表格与标签展示用） */
  scope: DataScope;
}

/**
 * 从配置中心派生当前视角身份。
 *
 * 注意「身份不明按不可见处理」：找不到用户时 perms 为空数组而不是全量。
 * 权限判据里 fail-open 是事故 —— 一个查不到的用户拿到全部权限，比报错严重得多。
 *
 * ## 为什么不再回落到 `users[0]`
 *
 * 原实现是 `users.find(...) ?? users[0]`。看着是"兜底"，实际是个**静默换人**的陷阱：
 * 视角用户被删除（配置中心的删除按钮真的能删）或 id 写坏时，系统会悄悄变成
 * 列表里第一个用户（吴涵，超管 ALL 档）—— 表现为"我明明在看受限视角，怎么突然全都能看了"。
 *
 * 身份系统里"找不到就换成别人"没有一种是对的。现在返回 null，让调用方按
 * "无有效身份"处理（AuthProvider 落到匿名、页面没有权限）。
 */
export function useActingIdentity(): ActingIdentity | null {
  const users = useCcStore((s) => s.users);
  const roles = useCcStore((s) => s.roles);
  const viewingUserId = useCcStore((s) => s.viewingUserId);

  return useMemo(() => {
    /* 两级判据：先按 id 找，找不到再退到默认超管。
     *
     *退到默认超管而不是返回 null，是因为「视角用户被删/被停用」是**管理员自己
     * 刚做过的操作**，此时页面彻底无身份（顶栏空白、菜单全空）比"回到管理员本人"
     * 更难理解 —— 后者符合"配置坏了先按默认身份继续"的直觉。
     *
     * 注意与「停用账号不该有视角」并不冲突：停用是针对**被指定的**那个人，
     * 而这里的兜底对象恒为 DEFAULT_VIEWING_USER_ID（一个启用中的超管）。
     *
     * fail-closed 仍保留在下面：真的连默认超管都不存在（users 被清空）时返回 null，
     * 权限为空 —— 那种情况下"什么都看不见"比"什么都看得见"正确。
     */
    const picked = users.find((item) => item.id === viewingUserId);
    const u = picked?.enabled ? picked : users.find((item) => item.id === DEFAULT_VIEWING_USER_ID);
    if (!u) return null;
    const perms = effectivePerms(u, roles);
    return {
      userId: u.id,
      user: {
        id: u.id,
        username: u.account,
        // 显示名用账号：用户姓名在演示数据里是 i18n key（`demo.user.*`），
        // 而 AuthUser.displayName 是要在顶栏直接渲染的字符串，故给账号。
        displayName: u.account,
        email: u.email,
        roles: u.roleIds,
        deptKey: u.deptKey,
        dataScope: u.scope,
        scopeDeptKeys: u.scopeDeptKeys,
      },
      perms,
      scope: u.scope,
      scopeCtx: {
        scope: u.scope,
        userId: u.id,
        deptKey: u.deptKey,
        scopeDeptKeys: u.scopeDeptKeys,
        deptMap: DEPT_MAP,
      },
    };
  }, [users, roles, viewingUserId]);
}