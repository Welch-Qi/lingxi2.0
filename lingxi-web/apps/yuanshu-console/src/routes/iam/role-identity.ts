/**
 * ⚠️ 本文件自 lingxi-web `routes/config/role-identity.ts` 复制（登录页角色→账号映射，两 app 各自持有）。
 */
import type { RoleKey } from '@/app/providers/roles';
import type { UserRow } from '@/routes/iam/cc-store';

/**
 * 登录页角色 → 配置中心用户 的映射（2026-10-07）。
 *
 * ## 为什么需要这张表（用户报的现象二）
 *
 * 用户反馈：「退出登录后切换角色，还是这个用户」。
 *
 * 根因是**两套身份系统完全脱钩**：
 *   · `/login` 的角色来自 `app/providers/roles.tsx` 的 `RoleKey`
 *     （ceo / product / channel / content / sales），存进 `workspaceStore.roleKey`；
 *   · 而顶栏显示的用户、侧边栏菜单、路由守卫、数据范围过滤，读的都是
 *     cc-store 的 `viewingUserId`（经 `useActingIdentity` 派生）。
 *
 * 于是「在登录页选角色」这件事对实际身份**毫无影响** —— 选谁都还是 `viewingUserId`
 * 指向的那个人。两套系统各自自洽，接不上。
 *
 * ## 为什么用「派生」而不是直接改 RoleKey
 *
 * `RoleKey` 是 2.0 产品基线的**岗位口径**（CEO + 四大总监，见《产品规划说明书 V2.1》§6.3），
 * 登录页与工作区选择页都在用它；cc-store 的 `UserRow` 是**账号口径**。
 * 强行合并会让「岗位」这个概念消失，工作台按角色过滤决策项的逻辑（`dashboard.tsx`
 * 的 `roleDecisions`）也要跟着重写。
 *
 * 所以保留两套口径，但**明确桥接**：静态预览下选岗位 → 落到持有该岗位角色的账号上。
 * 真实 OIDC 接入后平台会话直接下发 user + permissions，本表整段作废。
 *
 * ## 匹配规则
 *
 * 按 `roleIds` 精确匹配岗位对应的**角色 id**，而不是按名字/顺序猜：
 *   ceo      → role.admin（超管，演示数据里唯一持全域的角色）
 *   product  → role.product.director
 *   channel  → role.channel.director
 *   content  → role.content.director
 *   sales    → role.sales.director
 *
 * 取**第一个命中且启用**的用户。命中不到时返回 null（调用方据此不切视角），
 * 绝不静默回落到列表第一个人 —— 那会让"没匹配上"表现为"莫名其妙成了某某"。
 */
const ROLE_TO_USER: Readonly<Record<RoleKey, string>> = {
  ceo: 'role.admin',
  product: 'role.product.director',
  channel: 'role.channel.director',
  content: 'role.content.director',
  sales: 'role.sales.director',
};

/** 按登录页选定的岗位，找一个持有对应角色的启用账号。 */
export function userForRole(roleKey: RoleKey, users: readonly UserRow[]): UserRow | null {
  const roleId = ROLE_TO_USER[roleKey];
  if (!roleId) return null;
  return users.find((u) => u.enabled && u.roleIds.includes(roleId)) ?? null;
}

/**
 * 顶栏胶囊专用：按**用户 id** 反推岗位。
 *
 * 为什么单独开一个而不是让调用方先查出UserRow 再传进 `roleKeyForUser`：
 * 顶栏只需要一个岗位标签，为此把整张用户表拉进渲染路径没有必要；
 * 且多开一个函数的成本远低于让每个调用点都写一遍
 * `users.find(u => u.id === id)`（找不到时的undefined 还得各自处理）。
 */
export function roleKeyForUserById(userId: string | null | undefined, users: readonly UserRow[]): RoleKey | null {
  if (!userId) return null;
  return roleKeyForUser(users.find((u) => u.id === userId));
}

/**
 * 岗位 → 角色 id 的反向查询，用于「从当前视角用户反推他是什么岗位」。
 * 找不到返回 null（不回落 DEFAULT_ROLE）—— 一个视角用户可能持多个角色，
 * 猜一个会让顶栏显示错误的岗位。
 *
 * 参数宽成 `UserRow | null | undefined`：`Array.prototype.find` 返回 `undefined`
 * 而非 `null`，签名只收 `null` 会让每个调用点都得补 `?? null` —— 多一处转换
 * 就多一处能忘的地方，不如在边界一次收下两种空值。
 */
export function roleKeyForUser(user: UserRow | null | undefined): RoleKey | null {
  if (!user) return null;
  const hit = Object.entries(ROLE_TO_USER).find(([, roleId]) => user.roleIds.includes(roleId));
  return (hit?.[0] as RoleKey | undefined) ?? null;
}