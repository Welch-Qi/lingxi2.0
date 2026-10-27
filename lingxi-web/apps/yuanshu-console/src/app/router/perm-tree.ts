import { moduleConfigs } from '@/app/router/modules';

/**
 * 权限资源树 —— 全仓唯一权威派生点（2026-10-06 接线）。
 *
 * ## 为什么必须派生而不是手抄
 *
 * 各分区 `module.config.ts` 里的 `permCode` 一直是**声明式摆设**：
 * `router/index.tsx` 的 `toChildRoute` 只取 `path` 与 `element`，把 `permCode` 丢了；
 * `SideNav` 只按 `enabled` 过滤；`usePermission` / `LxPermission` 导出了却零消费点。
 * 于是「权限管理」页改的每一处都不会影响任何真实行为 —— 配了等于没配。
 *
 * 这里把 `permCode` 从摆设变成**唯一事实源**：模块 → 资源 → 动作三层结构，
 * 全部由 13 个分区 manifest 里已声明的权限码切段得出，不新增、不手抄。
 * 路由守卫、侧边栏过滤、角色权限授予矩阵三处都从这里取，同一份数据不会走散。
 *
 * ## 三段式权限码 `{prefix}:{resource}:{action}`
 *
 * 这是仓内既有格式（技术规约2.0 §4.9.2）。切段规则：
 *  - `prefix`（域）：分组的聚合单位。**注意 customer / opportunity / lead 三分区
 *    共用 `cus` 前缀** —— 它们是同一个数据域（线索→客户→商机），权限按域授权而不是按菜单授权。
 *  - `resource`（资源）：功能模块，第二段。
 *  - `action`（动作）：view / create / edit / delete / export 等，末段。
 *
 * 少数历史资源用复合动作（`view360` / `viewDetail` / `viewFollow` / `urge` / `record`），
 * 它们是**该资源的专属动作而非通用 CRUD**，故与 `view` 并列而不是被它吸收。
 */

export interface PermResource {
  /** 第二段，如 `customer` / `opp` / `lead` */
  resource: string;
  /** 该资源在本树里出现过的全部动作（去重、有序） */
  actions: readonly string[];
  /** 完整权限码，如 `cus:customer:view` */
  codes: readonly string[];
  /** 声明了该资源的路由（全路径），用于「哪些页面受这条权限管」的追溯 */
  paths: readonly string[];
}

export interface PermDomain {
  /** 域前缀，如 `cus` / `mkg` / `cc` */
  prefix: string;
  /** 域名 i18n key（`cc.perm.domain.<prefix>`） */
  titleKey: string;
  /** 该域覆盖的一级菜单（一个域可能对应多个分区，如 cus → 客户/商机/线索） */
  moduleKeys: readonly string[];
  /** 该域的一级菜单名 i18n key，与 moduleConfigs 的 titleKey 同源 */
  moduleTitleKeys: readonly string[];
  resources: readonly PermResource[];
}

/**
 * 通用动作的规范顺序。
 *
 * 为什么要定序：矩阵里动作是列，列序必须稳定 —— 否则新增一个动作后
 * 整张表的列都挪位，评审时"上次看的那一列"变成了另一个含义。
 * 复合动作排在通用动作之后，各自保持 manifest 里首次出现的次序。
 */
const GENERIC_ACTION_ORDER: readonly string[] = [
  'view',
  'create',
  'edit',
  'delete',
  'import',
  'export',
  'assign',
  'review',
];

function sortActions(actions: readonly string[]): readonly string[] {
  return [...actions].sort((a, b) => {
    const ia = GENERIC_ACTION_ORDER.indexOf(a);
    const ib = GENERIC_ACTION_ORDER.indexOf(b);
    // 通用动作按规范序在前；复合/专属动作在后，各自按字典序（稳定、可预期）
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

/** 一条 permCode 的切段结果；非三段式返回 null（不静默塞进某个域，那会造出假权限码）。 */
function split(code: string): { prefix: string; resource: string; action: string } | null {
  const parts = code.split(':');
  if (parts.length !== 3) return null;
  const [prefix, resource, action] = parts;
  if (!prefix || !resource || !action) return null;
  return { prefix, resource, action };
}

function buildDomains(): readonly PermDomain[] {
  // prefix → 累积桶。用 Map 而非对象字面量：键是运行期字符串，Object 会被原型键污染。
  const buckets = new Map<string, {
    moduleKeys: Set<string>;
    moduleTitleKeys: Set<string>;
    /** resource → { actions:Set, codes:Set, paths:Set } */
    resources: Map<string, { actions: Set<string>; codes: Set<string>; paths: Set<string> }>;
  }>();

  for (const mod of moduleConfigs) {
    for (const route of mod.routes) {
      if (!route.permCode) continue;
      const seg = split(route.permCode);
      if (!seg) continue;
      let bucket = buckets.get(seg.prefix);
      if (!bucket) {
        bucket = { moduleKeys: new Set(), moduleTitleKeys: new Set(), resources: new Map() };
        buckets.set(seg.prefix, bucket);
      }
      bucket.moduleKeys.add(mod.key);
      bucket.moduleTitleKeys.add(mod.titleKey);
      let res = bucket.resources.get(seg.resource);
      if (!res) {
        res = { actions: new Set(), codes: new Set(), paths: new Set() };
        bucket.resources.set(seg.resource, res);
      }
      res.actions.add(seg.action);
      res.codes.add(route.permCode);
      res.paths.add(route.path);
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, bucket]) => ({
      prefix,
      titleKey: `cc.perm.domain.${prefix}`,
      moduleKeys: [...bucket.moduleKeys].sort(),
      moduleTitleKeys: [...bucket.moduleTitleKeys].sort(),
      resources: [...bucket.resources.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([resource, res]) => ({
          resource,
          actions: sortActions([...res.actions]),
          codes: [...res.codes].sort(),
          paths: [...res.paths].sort(),
        })),
    }));
}

/** 全量权限域（按 prefix 字典序）。 */
export const PERM_DOMAINS: readonly PermDomain[] = buildDomains();

/** 全量权限码（展平去重后按字典序）—— 授予矩阵的「全部勾选」就是这一份。 */
export const ALL_PERM_CODES: readonly string[] = [
  ...new Set(PERM_DOMAINS.flatMap((d) => d.resources.flatMap((r) => r.codes))),
].sort();

/** 权限码 → 它守护的路由路径（反查表，供路由守卫与「权限点」列展示）。 */
export const PERM_CODE_PATHS: ReadonlyMap<string, readonly string[]> = new Map(
  PERM_DOMAINS.flatMap((d) =>
    d.resources.flatMap((r) => r.codes.map((code) => [code, r.paths] as const)),
  ).filter((pair, index, all) => all.findIndex((p) => p[0] === pair[0]) === index),
);

/**
 * 演示态超级管理员权限：`{prefix}:*` 域级通配。
 *
 * 为什么预览会话要给全量而不是 15 条演示码：SideNav 接上权限过滤后，
 * 给一份不完整的码表会让**一级菜单整片消失**，演示站点自己都点不开。
 * 而 `usePermission.has` 支持域级通配（`cus:*` 覆盖 `cus:opp:view`），
 * 故按前缀给 `*` 既能让 13 个菜单全开，又保留了"少一个域就少一个菜单"的演示能力。
 *
 * ⚠️ 这不是真实授权：真实会话的权限由后端 Casbin 下发，见 previewSession.ts 的安全边界。
 */
export function wildcardCodes(): readonly string[] {
  return PERM_DOMAINS.map((d) => `${d.prefix}:*`);
}