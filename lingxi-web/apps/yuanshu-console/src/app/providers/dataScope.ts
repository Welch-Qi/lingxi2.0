import type { DataScope } from '@/app/providers/AuthProvider';

/**
 * 数据权限范围判定（技术规约2.0 §4.8.2）。
 *
 * ## 为什么必须有一层独立判据
 *
 * 「功能权限」决定**看不看得见某个页面**，「数据权限」决定**看得见哪些行**。
 * 后者此前完全不存在：仓里只有一个 `scope` 联合类型和 5 条 i18n 文案，
 * 没有任何字段承载它、也没有任何过滤逻辑 —— 于是「数据权限」在产品上是个空壳。
 *
 * 这里把判据收敛成一个纯函数 `visibleByScope`，所有列表页共用它：
 * 判据只有一处，才谈得上「任意用户对数据范围的差异化管控」是真的。
 *
 * 铁律：这是**行级可见性**，不是安全边界。真正的隔离在后端按租户+部门下推查询条件，
 * 前端过滤只是把不该看见的行不渲染出来（技术规约2.0 §4.9.2）。
 */

/** 组织树：部门 key → 父部门 key；`parent` 为 null 表示根。 */
export type DeptMap = Readonly<Record<string, string | null>>;

/** 行与数据范围的关系：三个键缺一不可（谁建的 / 归属哪个部门 / 自己是不是负责人）。 */
export interface ScopedRow {
  /** 行归属的部门 key */
  deptKey: string;
  /** 行创建人 / 负责人 key */
  ownerKey: string;
}

/** 判定上下文：当前用户 + 组织树。 */
export interface ScopeContext {
  scope: DataScope;
  /** 当前用户的 user id（与行的 ownerKey 比对） */
  userId: string;
  /** 当前用户所属部门 */
  deptKey: string | undefined;
  /** CUSTOM 档下被授权的部门 key 集合 */
  scopeDeptKeys: readonly string[];
  /** 组织树，用于 DEPT_AND_SUB 向下展开 */
  deptMap: DeptMap;
}

/**
 * 取某部门的全部后代（含自身）。
 *
 * 为什么用迭代而不是递归：组织树是外部数据，深度不可控；
 * 递归遇到环（A 的父是 B、B 的父是 A）会直接爆栈，而配置数据出错是常态。
 * 这里用带 visited 的迭代写法，遇环即停并把已访问的节点算进结果。
 */
export function deptSubtree(root: string, deptMap: DeptMap): ReadonlySet<string> {
  const result = new Set<string>([root]);
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const [key, parent] of Object.entries(deptMap)) {
      if (parent !== current || result.has(key)) continue;
      result.add(key);
      queue.push(key);
    }
  }
  return result;
}

/** 把某部门向上到根的所有祖先收集起来（含自身），用于「能看到上级的哪些数据」。 */
export function deptAncestors(root: string, deptMap: DeptMap): ReadonlySet<string> {
  const result = new Set<string>();
  let cursor: string | null | undefined = root;
  while (cursor) {
    if (result.has(cursor)) break;
    result.add(cursor);
    cursor = deptMap[cursor];
  }
  return result;
}

/**
 * 核心判据：这一行对当前用户可见吗。
 *
 * 五档语义（逐档说清，因为「本部门」到底含不含下属是最容易理解错的一处）：
 *  - `SELF`        仅本人创建/负责的行
 *  - `DEPT`        本部门的行（**不含**下级部门）
 *  - `DEPT_AND_SUB` 本部门 + 各级下级部门的行
 *  - `CUSTOM`      显式勾选的部门集合（不自动含本部门，也不自动含下级）
 *  - `ALL`         全部
 */
export function visibleByScope(row: ScopedRow, ctx: ScopeContext): boolean {
  switch (ctx.scope) {
    case 'ALL':
      return true;
    case 'SELF':
      return row.ownerKey === ctx.userId;
    case 'DEPT':
      return row.deptKey === ctx.deptKey;
    case 'DEPT_AND_SUB': {
      if (ctx.deptKey === undefined) return false;
      return deptSubtree(ctx.deptKey, ctx.deptMap).has(row.deptKey);
    }
    case 'CUSTOM':
      return ctx.scopeDeptKeys.includes(row.deptKey);
    default:
      // 未下发的范围（undefined）已被归一为 ALL；走到这里说明出现了新的档位，
      // 按「不可见」处理而不是放行 —— 权限判据里 fail-open 是事故。
      return false;
  }
}

/** 列表过滤的便捷包装。 */
export function filterByScope<T extends ScopedRow>(rows: readonly T[], ctx: ScopeContext): readonly T[] {
  return rows.filter((row) => visibleByScope(row, ctx));
}

/**
 * 「身份不明」时的兜底范围 = 不加任何限制。
 *
 * 什么时候会走到：真实会话已登录但后端未下发 dataScope（历史行为是全都可见），
 * 或者预览态的视角用户被外部改坏。
 *
 * 为什么这里是 fail-open 而 `visibleByScope` 的 default 分支是 fail-closed：
 * 两者回答的是不同问题 —— 「系统不知道要限制什么」应当维持既有行为（全部可见），
 * 而「出现了没定义过的档位」是代码 bug，必须挡住。只在一个方向上放行才自洽。
 */
export const UNRESTRICTED_SCOPE: ScopeContext = {
  scope: 'ALL',
  userId: '',
  deptKey: undefined,
  scopeDeptKeys: [],
  deptMap: {},
};

/** 把「行所覆盖的部门集合」算出来，用于 CUSTOM 档授权时展示影响面。 */
export function scopeCoverage(ctx: ScopeContext): ReadonlySet<string> {
  switch (ctx.scope) {
    case 'ALL':
      return new Set(Object.keys(ctx.deptMap));
    case 'DEPT':
      return ctx.deptKey === undefined ? new Set() : new Set([ctx.deptKey]);
    case 'DEPT_AND_SUB':
      return ctx.deptKey === undefined ? new Set() : deptSubtree(ctx.deptKey, ctx.deptMap);
    case 'CUSTOM':
      return new Set(ctx.scopeDeptKeys);
    case 'SELF':
      // SELF 不是按部门授权，它覆盖的是「本人负责的行」——
      // 仍然给出本人部门，只是为了让 UI 有个可显示的部门名。
      return ctx.deptKey === undefined ? new Set() : new Set([ctx.deptKey]);
    default:
      return new Set();
  }
}

/**
 * 数据范围的可用档位与说明文案。
 *
 * 单独列出来而不是在页面里写死数组：五个档位在「用户编辑」「角色默认值」
 * 「审计记录」三处都要出现且必须同序同措辞，散开写必然漂。
 */
export const DATA_SCOPES: readonly DataScope[] = ['SELF', 'DEPT', 'DEPT_AND_SUB', 'CUSTOM', 'ALL'];

/** 各档的一句话语义（i18n key）。审计日志与角色默认值的说明共用这一份。 */
export const DATA_SCOPE_DESC_KEY: Readonly<Record<DataScope, string>> = {
  SELF: 'cc.scopeDesc.SELF',
  DEPT: 'cc.scopeDesc.DEPT',
  DEPT_AND_SUB: 'cc.scopeDesc.DEPT_AND_SUB',
  CUSTOM: 'cc.scopeDesc.CUSTOM',
  ALL: 'cc.scopeDesc.ALL',
};