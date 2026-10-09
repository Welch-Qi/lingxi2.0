import { create } from 'zustand';
import type { DataScope } from '@/app/providers/AuthProvider';
import { wildcardCodes } from '@/app/router/perm-tree';

/**
 * 配置中心演示数据仓库（2026-10-06）。
 *
 * ## 为什么需要它
 *
 * 改造前的现状是「全是死按钮」：`users.tsx` 的「新建用户」跳 `?mode=create`
 * 而全仓无消费该参数的代码，「配置权限」按钮**没有 onClick**；`roles.tsx` 同理。
 * 也就是说用户能在配置中心看到的每一个动作，点下去都没有结果。
 *
 * 这里把用户 / 角色 / 部门三张表变成**可读可写**，并让三处 UI 真正闭环：
 *   用户管理  ←→  角色管理  ←→  侧边栏菜单 + 路由守卫 + 列表行过滤
 *
 * ## 数据形状的三个刻意决定
 *
 * 1. **角色持有权限码数组，用户持有角色 id 数组**（用户→角色→权限码，两跳）。
 *    不把权限码直接摊在用户上：那样两个用户改同一处权限要改两遍，
 *    迟早漂成两套授权，而「角色」这个东西就白设了。
 * 2. **数据范围挂在用户上，不挂角色上**（理由见 AuthProvider 的 DataScope 注释）。
 *    角色侧只留 `defaultScope`，作用是新建用户时的缺省值。
 * 3. **内置角色（builtin）可改数据范围默认值、不可删**。
 *    内置角色被删会让在用它的用户变成"无角色"，其权限归零且不可解释；
 *    这属于会造成不可逆后果的操作，必须拦住而不是靠提示。
 *
 * 持久化：localStorage。一期没有后端（见各页注释），刷新后配置仍在，
 * 评审时不会因为手滑刷新而丢掉刚配好的权限矩阵。
 * 上线前把 `create()` 换成接口调用即可，本文件的读写口只有下面这些函数。
 */

/* ============================ 部门 ============================ */

export interface DeptRow {
  key: string;
  nameKey: string;
  parent: string | null;
}

/** 部门键即 i18n key（`demo.dept.*`），与既有演示数据的口径一致：存 key 不存中文。 */
export const DEPTS: readonly DeptRow[] = [
  { key: 'demo.dept.hq', nameKey: 'demo.dept.hq', parent: null },
  { key: 'demo.dept.sales', nameKey: 'demo.dept.sales', parent: 'demo.dept.hq' },
  { key: 'demo.dept.channel', nameKey: 'demo.dept.channel', parent: 'demo.dept.hq' },
  { key: 'demo.dept.content', nameKey: 'demo.dept.content', parent: 'demo.dept.hq' },
  { key: 'demo.dept.product', nameKey: 'demo.dept.product', parent: 'demo.dept.hq' },
  { key: 'demo.dept.audit', nameKey: 'demo.dept.audit', parent: 'demo.dept.hq' },
  // 销售部下再挂两级：用来演示 DEPT 与 DEPT_AND_SUB 两档的真实差别
  { key: 'demo.dept.sales.east', nameKey: 'demo.dept.sales.east', parent: 'demo.dept.sales' },
  { key: 'demo.dept.sales.north', nameKey: 'demo.dept.sales.north', parent: 'demo.dept.sales' },
];

/** 部门 key → 父部门 key（喂给 dataScope 的 deptMap）。 */
export const DEPT_MAP: Readonly<Record<string, string | null>> = Object.fromEntries(
  DEPTS.map((d) => [d.key, d.parent]),
);

/* ============================ 角色 ============================ */

export interface RoleRow {
  id: string;
  /** 角色名 i18n key；自定义角色用 `cc.role.custom.<id>` */
  nameKey: string;
  /** 说明 i18n key */
  descKey: string;
  /** 授予的权限码（可空数组 = 只读登录） */
  perms: readonly string[];
  /** 数据范围缺省值，新建用户时带出 */
  defaultScope: DataScope;
  /** 内置角色：不可删、权限集不可清空 */
  builtin: boolean;
}

/**
 * 种子角色的权限码从 `perm-tree` 派生，不手抄具体串。
 *
 * 取法：`角色管哪些域` 用域级通配表达（如销售总监 `cus:*`），而不是把 30 条码抄一遍 ——
 * 后者一旦新增模块就必然漏，而漏的那一条表现为"配了没生效"，最难查。
 *
 * ⚠️ 超级管理员**不能**写 `'*:*'`：`usePermission.has` 只支持**尾段**通配
 * （逐段向上试 `cus:user:*` → `cus:*`），中段与前缀的通配一律不认。
 * 写 `'*:*'` 的后果是**该角色一条权限都没有** —— 而页面上它仍标着"超级管理员"，
 * 用户会以为是自己哪里配错了。故这里直接取全部域级通配（同样由 perm-tree 派生）。
 */
export const ROLES_SEED: readonly RoleRow[] = [
  {
    id: 'role.admin',
    nameKey: 'cc.role.admin',
    descKey: 'cc.role.adminDesc',
    perms: wildcardCodes(),
    defaultScope: 'ALL',
    builtin: true,
  },
  {
    id: 'role.sales.director',
    nameKey: 'wb.role.salesDirector',
    descKey: 'cc.role.salesDirectorDesc',
    perms: ['cus:*', 'wb:home:view', 'wb:brief:view', 'cc:biz:view'],
    defaultScope: 'DEPT_AND_SUB',
    builtin: false,
  },
  {
    id: 'role.channel.director',
    nameKey: 'wb.role.channelDirector',
    descKey: 'cc.role.channelDirectorDesc',
    perms: ['cus:*', 'mkg:*', 'prd:product:view', 'wb:home:view', 'cc:biz:view'],
    defaultScope: 'DEPT',
    builtin: false,
  },
  {
    id: 'role.content.director',
    nameKey: 'wb.role.contentDirector',
    descKey: 'cc.role.contentDirectorDesc',
    perms: ['mkg:*', 'kc:*', 'wb:home:view', 'cc:biz:view'],
    defaultScope: 'DEPT',
    builtin: false,
  },
  {
    id: 'role.product.director',
    nameKey: 'wb.role.productDirector',
    descKey: 'cc.role.productDirectorDesc',
    perms: ['prd:*', 'mkg:*', 'ord:*', 'wb:home:view', 'cc:biz:view'],
    defaultScope: 'DEPT',
    builtin: false,
  },
  {
    id: 'role.auditor',
    nameKey: 'cc.role.auditor',
    descKey: 'cc.role.auditorDesc',
    // 只读审计与权限变更：刻意不含任何业务域的写权限
    perms: ['cc:audit:view', 'cc:user:view', 'cc:role:view', 'wb:home:view'],
    defaultScope: 'ALL',
    builtin: true,
  },
];

/* ============================ 用户 ============================ */

/**
 * 用户类型：**碳基员工**（人）与**硅基员工**（智能体）。
 *
 * 为什么要在用户表里而不是另开一张表：硅基员工同样占一个登录账号、
 * 同样被授予角色与数据范围、同样出现在"以此身份查看"的候选里。
 * 另开一张表的话，「谁能看什么」的判据就得分两处写 —— 而权限判据分叉
 * 是本项目反复踩过的坑（见 perm-tree / dataScope 的收敛注释）。
 *
 * 为什么**不**做成可配置项：类型决定的是"这是人还是机器"，属系统事实，
 * 不是管理员的偏好。碳基员工的账号由 SSO 同步、硅基员工由智能体注册表生成，
 * 都不是在配置中心点出来的。改这个字段等于伪造事实。
 */
export type UserType = 'carbon' | 'silicon';

export interface UserRow {
  id: string;
  /** 姓名 i18n key */
  nameKey: string;
  /** 登录账号（不翻译） */
  account: string;
  email: string;
  /**
   * 用户类型：碳基员工 / 硅基员工。
   *
   * **必填**（2026-10-07 从可选改为必填）：先前它是 `userType?: UserType`，
   * 于是六个碳基种子全是 `undefined`，列表靠 `row.userType ?? 'carbon'` 兜底 ——
   * 而兜底意味着「忘了填」与「碳基」在数据上不可区分，
   * 将来要按类型做批量授权/审计时，那六行会被当成脏数据。
   * 声明为必填后编译器会强制每一个构造点显式表态；
   * 老存档由 `migrateUsers` 补齐，缺口在读档时就填上。
   */
  userType: UserType;
  /** 硅基员工挂载的智能体 key（`sage`/`atlas`/`muse`/`echo`）；碳基员工为空 */
  agentKey?: string;
  /** 部门 i18n key */
  deptKey: string;
  /** 角色 id 数组（可多角色） */
  roleIds: readonly string[];
  /** 数据权限范围 */
  scope: DataScope;
  /** CUSTOM 档下被授权的部门 key */
  scopeDeptKeys: readonly string[];
  enabled: boolean;
}

/**
 * 种子用户。
 *
 * 五个人刻意覆盖五种范围与「停用 + CUSTOM」两个边界：
 * 只给五种范围各摆一个正常样例的话，CUSTOM 的多部门选择器与停用态都没人验过。
 */
export const USERS_SEED: readonly UserRow[] = [
  {
    id: 'u.lin',
    nameKey: 'demo.user.lin',
    account: 'lin.lan',
    email: 'lin.lan@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.sales',
    roleIds: ['role.sales.director'],
    scope: 'DEPT_AND_SUB',
    scopeDeptKeys: [],
    enabled: true,
  },
  {
    id: 'u.zhou',
    nameKey: 'demo.user.zhou',
    account: 'zhou.mu',
    email: 'zhou.mu@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.channel',
    roleIds: ['role.channel.director'],
    scope: 'DEPT',
    scopeDeptKeys: [],
    enabled: true,
  },
  {
    id: 'u.chen',
    nameKey: 'demo.user.chen',
    account: 'chen.yu',
    email: 'chen.yu@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.content',
    roleIds: ['role.content.director'],
    scope: 'SELF',
    scopeDeptKeys: [],
    enabled: true,
  },
  {
    id: 'u.wu',
    nameKey: 'demo.user.wu',
    account: 'wu.han',
    email: 'wu.han@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.product',
    roleIds: ['role.product.director', 'role.admin'],
    scope: 'ALL',
    scopeDeptKeys: [],
    enabled: true,
  },
  {
    id: 'u.guest',
    nameKey: 'demo.user.guest',
    account: 'guest.audit',
    email: 'guest.audit@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.audit',
    roleIds: ['role.auditor'],
    // CUSTOM 配多部门：只有一条 CUSTOM 时那个多选器等于没验过
    scope: 'CUSTOM',
    scopeDeptKeys: ['demo.dept.audit', 'demo.dept.sales'],
    enabled: false,
  },
  // 销售部下的专员：用来验 SELF / DEPT / DEPT_AND_SUB 三档在真实行上的差别
  {
    id: 'u.sun',
    nameKey: 'demo.user.sun',
    account: 'sun.qi',
    email: 'sun.qi@example.com',
    userType: 'carbon',
    deptKey: 'demo.dept.sales.east',
    roleIds: ['role.auditor'],
    scope: 'SELF',
    scopeDeptKeys: [],
    enabled: true,
  },
];

/**
 * 智能体 key —— **与 `routes/agent/index.tsx` 的 ROSTER 同一份取值**（2026-10-07）。
 *
 * 为什么不直接从那边 import：`ROSTER` 里混着头像路径、进度百分比、花名册文案，
 * 那是**展示态**；配置中心只需要"这个智能体存在"这一事实。把展示数据拉进配置域，
 * 会让"改个头像百分比"变成配置中心的编译依赖。
 *
 * 所以这里存 key 枚举，并在注释里点明两处必须同步 ——
 * 新增智能体时两处都要加，否则配置中心会指向一个不存在的智能体。
 */
export const AGENT_KEYS = ['sage', 'atlas', 'muse', 'echo'] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

/**
 * 智能体 → 部门 / 角色 的归属表。
 *
 * 用 `Record<AgentKey, ...>` 而不是「按数组下标配」：下标写法在
 * `noUncheckedIndexedAccess` 下会把取值变成 `string | undefined`，
 * 而更要紧的是它**跑不报错** —— 新增第五个智能体却忘了往数组里补第5 项时，
 * 那个智能体会以 `deptKey: undefined` 建出一个"无部门"账号，
 * 列表里看起来正常（灰色渲染），但数据范围判据永远算不出结果。
 * Record 写法则会在typecheck 阶段直接报"缺 key"，把错误拦在编译期。
 *
 * 部门选职能对应的那个而不是全塞进某个"AI 部"：数据范围按部门判据
 * （SELF / DEPT / DEPT_AND_SUB）才有意义，部门挂错会让可见范围与业务归属不符。
 * 角色沿用碳基同事的同名岗位 —— 智能体顶的是岗位，不是"AI 角色"。
 */
const AGENT_PLACEMENT: Record<AgentKey, { deptKey: string; roleId: string }> = {
  sage: { deptKey: 'demo.dept.content', roleId: 'role.content.director' },
  atlas: { deptKey: 'demo.dept.channel', roleId: 'role.channel.director' },
  muse: { deptKey: 'demo.dept.product', roleId: 'role.product.director' },
  echo: { deptKey: 'demo.dept.sales', roleId: 'role.sales.director' },
};

/**
 * 硅基员工（智能体）账号。
 *
 * 为什么它们该出现在**用户管理**而不是只待在智能体中心：
 * 智能体中心管的是"能力与任务"（技能、模型、编排），用户管理管的是
 * **"它能看什么、能做什么操作"** —— 后者正是权限模型要回答的问题。
 * 一个智能体若不在用户表里，就拿不到角色与数据范围，只能全量通行或全量不可见，
 * 两个都是错的。
 *
 * 账号命名 `agent.<key>`（而非人名的拼音）：一眼看出不是 SSO 同步来的账号，
 * 也就不会有人试图去「找回密码」。邮箱用 `.invalid` 顶级域（RFC 2606 保留）——
 * 硅基员工不该能收信，用 `example.com` 会让人以为真有人在接。
 */
export const SILICON_USERS: readonly UserRow[] = AGENT_KEYS.map((key) => ({
  id: `u.agent.${key}`,
  nameKey: `wb.agent.${key}.name`,
  account: `agent.${key}`,
  email: `agent.${key}@agents.invalid`,
  userType: 'silicon',
  agentKey: key,
  deptKey: AGENT_PLACEMENT[key].deptKey,
  roleIds: [AGENT_PLACEMENT[key].roleId],
  // SELF 档：智能体只该看到与自己相关的行。给 ALL 等于让 AI 看见全库数据 ——
  // 这是真实系统里最常见的越权来源，且默认没人会去查。
  scope: 'SELF',
  scopeDeptKeys: [],
  enabled: true,
}));

/* ============================ store ============================ */

const LS_KEY = 'lx.cc.config.v1';

interface PersistedState {
  users: readonly UserRow[];
  roles: readonly RoleRow[];
  /** 当前「视角身份」：以哪个用户 id 看这个系统（演示差异化管控用） */
  viewingUserId: string;
}

interface CcState extends PersistedState {
  /* 用户 */
  addUser: (row: UserRow) => void;
  updateUser: (id: string, patch: Partial<Omit<UserRow, 'id'>>) => void;
  removeUser: (id: string) => void;
  /* 角色 */
  addRole: (row: RoleRow) => void;
  updateRole: (id: string, patch: Partial<Omit<RoleRow, 'id'>>) => void;
  removeRole: (id: string) => void;
  /* 视角 */
  setViewingUser: (id: string) => void;
  /** 回到默认视角（退出登录时必须调，否则视角身份会被下一次登录继承） */
  resetViewingUser: () => void;
  /* 复位 */
  reset: () => void;
}

/**
 * 默认视角用户：超级管理员。
 *
 * 单一取值来源 —— 退出登录 / 存档缺省 / 首次进入都回到这里，
 * 不要再写第二处 `'u.wu'`，否则改种子数据时漏一处就成了"有人能看全部、有人看不了"。
 */
export const DEFAULT_VIEWING_USER_ID = 'u.wu';

/**
 * 全量种子 = 碳基员工 + 硅基员工。
 *
 * 单一取值源：初始值、存档迁移、`reset()` 三处都从这里取，
 * 免得"新增一个智能体要改三个地方、漏一处就前后不一致"。
 */
function seedUsers(): readonly UserRow[] {
  return [...USERS_SEED, ...SILICON_USERS];
}

/**
 * 存档迁移（2026-10-07 加硅基员工与 `userType` 时引入）。
 *
 * 两个坑：
 * 1. **老存档里没有硅基员工**。直接返回 `parsed.users` 的话，刷新后这四行永远消失，
 *    而用户会以为"我建的智能体账号被系统删了"。故按 `id` 比对补齐缺失项。
 * 2. **老存档没有 `userType` 字段**。不补的话 `row.userType` 为 undefined，
 *    列表的类型列会显示成空白 —— 而"碳基/硅基"是必填语义，不是可空。
 *
 * 迁移只**增不改**：已被用户改过的字段（角色、范围、顺序）一律保留，
 * 只补结构性缺失。不做"以种子为准"的覆盖 —— 那会把用户的配置全冲掉。
 */
function migrateUsers(raw: readonly UserRow[]): readonly UserRow[] {
  const known = new Set(raw.map((u) => u.id));
  const filled = raw.map((u) => ({ ...u, userType: u.userType ?? 'carbon' }));
  const missing = seedUsers().filter((u) => !known.has(u.id));
  return missing.length === 0 ? filled : [...filled, ...missing];
}

function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.roles)) return null;
    return {
      users: migrateUsers(parsed.users),
      roles: parsed.roles,
      viewingUserId: typeof parsed.viewingUserId === 'string' ? parsed.viewingUserId : DEFAULT_VIEWING_USER_ID,
    };
  } catch {
    // 存档坏了（手改过 / 版本升级后形状变了）不该让整个应用白屏 —— 退回种子数据
    return null;
  }
}

const initial = loadPersisted();

function persist(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify({ users: state.users, roles: state.roles, viewingUserId: state.viewingUserId }),
    );
  } catch {
    // 隐私模式下 localStorage 会抛；配置态丢了不该阻断页面，故静默降级为「仅内存」
  }
}

/**
 * 冷启动时立刻把初始态落盘（2026-10-07）。
 *
 * 为什么必须在这里写一次：此前只有各action 才persist，于是**首次进入（无存档）时
 * localStorage 里没有这个 key**，而内存里的 `viewingUserId` 已是默认值。
 * 内存与落盘从此是两个可能不一致的源 ——
 *   · 换个标签页打开（不共享内存，只共享 localStorage）读到的就是「没有存档」；
 *   · 探针只能读 localStorage，于是会误判"默认身份缺失"。
 *
 * 写这一次之后，「localStorage 是当前视角的真相」这条不变量在任何时刻都成立。
 */
persist({
  users: initial?.users ?? seedUsers(),
  roles: initial?.roles ?? ROLES_SEED,
  viewingUserId: initial?.viewingUserId ?? DEFAULT_VIEWING_USER_ID,
});

export const useCcStore = create<CcState>((set) => ({
  users: initial?.users ?? seedUsers(),
  roles: initial?.roles ?? ROLES_SEED,
  viewingUserId: initial?.viewingUserId ?? DEFAULT_VIEWING_USER_ID,

  addUser: (row) =>
    set((s) => {
      const next = { ...s, users: [...s.users, row] };
      persist(next);
      return next;
    }),

  updateUser: (id, patch) =>
    set((s) => {
      const next = { ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) };
      persist(next);
      return next;
    }),

  /**
   * 删用户时连带复位视角。
   *
   * 否则会留下一条指向已删 id 的 `viewingUserId`：派生层要靠兜底才能不崩，
   * 而用户看到的是"我删了这个人，系统却还以他身份运行"。
   * 顺手复位即可 —— 本地操作没有并发表情，不存在"删一半"的中间态需要保留。
   */
  removeUser: (id) =>
    set((s) => {
      const next = {
        ...s,
        users: s.users.filter((u) => u.id !== id),
        viewingUserId: s.viewingUserId === id ? DEFAULT_VIEWING_USER_ID : s.viewingUserId,
      };
      persist(next);
      return next;
    }),

  addRole: (row) =>
    set((s) => {
      const next = { ...s, roles: [...s.roles, row] };
      persist(next);
      return next;
    }),

  updateRole: (id, patch) =>
    set((s) => {
      const next = { ...s, roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
      persist(next);
      return next;
    }),

  /**
   * 删角色时同步摘掉各用户身上的 roleIds。
   *
   * 不摘的话会留下一条悬空 roleId，`effectivePerms` 里`roles.find(...)` 返回undefined
   * 被静默过滤 —— 表现是「角色列表里已经没有这个角色了，那个人却还是少了权限，
   * 找不出是谁删的」。删干净的语义应当是"这个角色没了，持有人回到无此角色"。
   */
  removeRole: (id) =>
    set((s) => {
      const next = {
        ...s,
        roles: s.roles.filter((r) => r.id !== id),
        users: s.users.map((u) =>
          u.roleIds.includes(id) ? { ...u, roleIds: u.roleIds.filter((rid) => rid !== id) } : u,
        ),
      };
      persist(next);
      return next;
    }),

  setViewingUser: (id) =>
    set((s) => {
      const next = { ...s, viewingUserId: id };
      persist(next);
      return next;
    }),

  resetViewingUser: () =>
    set((s) => {
      const next = { ...s, viewingUserId: DEFAULT_VIEWING_USER_ID };
      persist(next);
      return next;
    }),

  reset: () =>
    set(() => {
      persist({ users: seedUsers(), roles: ROLES_SEED, viewingUserId: DEFAULT_VIEWING_USER_ID });
      return { users: seedUsers(), roles: ROLES_SEED, viewingUserId: DEFAULT_VIEWING_USER_ID };
    }),
}));

/* ============================ 派生查询 ============================ */

/** 用户最终生效的权限码（多角色取并集）。 */
export function effectivePerms(user: UserRow, roles: readonly RoleRow[]): readonly string[] {
  return [...new Set(roles.filter((r) => user.roleIds.includes(r.id)).flatMap((r) => r.perms))];
}

/** 角色的成员数（由用户反查，不存冗余计数 —— 存了就必然与用户表不同步）。 */
export function roleMemberCount(roleId: string, users: readonly UserRow[]): number {
  return users.filter((u) => u.roleIds.includes(roleId)).length;
}

/** 生成新 id：演示数据足够，用自增即可；接入后端后由服务端下发。 */
export function nextId(prefix: string, existing: readonly { id: string }[]): string {
  let n = existing.length + 1;
  while (existing.some((item) => item.id === `${prefix}.${n}`)) n += 1;
  return `${prefix}.${n}`;
}