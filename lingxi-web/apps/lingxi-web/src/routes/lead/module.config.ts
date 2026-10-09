import type { ModuleConfig } from '@/app/router/types';

/**
 * 线索中心分区清单。
 *
 * **2026-09-29 变更**：线索中心已从一级侧边栏菜单移除（入口收口到商机中心「线索池」按钮，
 * 直达 `/lead`）。本条目仍保留在 `app/router/modules.ts` 的 `moduleConfigs` 中 ——
 * 路由注册与 `findModuleByPath`（顶栏标题）依赖它，删了 `/lead` 就访问不到。
 * 一级菜单的"出现与否"由 `GROUP_DEFS.biz.keys` 决定，线索已从中摘除。
 *
 * `titleKey` 改为 `lead.menu.home`（=「线索池」）：本页用 `PageContainer hideTitle`，
 * 视觉标题藏在 DOM 的 h1 里，用户实际看到的"页面标题"是顶栏（TopBar 取
 * `module.titleKey`）—— 故这里与页内清单标题、商机中心入口按钮保持同一词「线索池」。
 *
 * 功能编号对应《功能清单V2.1》三、线索中心（OP-LEAD- / OP-CUS- / BO-SAL-）：
 * 3.1 线索归集与登记 / 3.2 线索评分与分级 / 3.3 线索转化。
 *
 * 权限前缀仍用 `cus`：三层对象（线索 / 客户 / 商机）共用 `cus_` 数据域、不拆域，
 * 权限码也跟着域走。
 */
const config: ModuleConfig = {
  key: 'lead',
  basePath: '/lead',
  titleKey: 'lead.menu.home',
  subtitleKey: 'lead.subtitle',
  bizCodes: 'OP-LEAD- / OP-CUS- / BO-SAL-',
  permPrefix: 'cus',
  enabled: true,
  icon: 'lead',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/lead',
      element: () => import('./index'),
      permCode: 'cus:lead:view',
      titleKey: 'lead.menu.home',
    },
    {
      // 登记线索（`OP-LEAD-01`）：必填项刻意比「新建客户」少两样
      // —— 价值分层与客户类型要等跟进过才知道，现在填只能靠猜（见 new.tsx 文件头）。
      path: '/lead/new',
      element: () => import('./new'),
      permCode: 'cus:lead:create',
      hideInMenu: true,
      titleKey: 'lead.new.title',
    },
    {
      // 导入线索（`OP-LEAD-01`）：展会名单 / 海关数据 / 官网留资，表头每次都不一样，
      // 故字段映射这一步在本页比在客户导入页更是必需的。
      path: '/lead/import',
      element: () => import('./import'),
      permCode: 'cus:lead:import',
      hideInMenu: true,
      titleKey: 'lead.imp.title',
    },
  ],
};

export default config;
