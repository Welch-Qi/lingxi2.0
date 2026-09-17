import type { ModuleConfig } from '@/app/router/types';

/**
 * 市场情报分区清单（一级菜单「市场情报」）。
 *
 * 功能编号对应《功能清单V2.0》七、市场情报（BO-MKT- / GM-）：
 * 7.1 搜索指数 / 7.2 热词分析 / 7.3 产品机会 / 7.4 贸易与客户大数据。
 *
 * 一期数据策略为"以免费源为主 + 小范围商业数据验证价值"（产品规划说明书 §2.7），
 * 因此界面必须显性标注数据源与覆盖范围，避免把样本数据当成全量结论。
 * 该约束落到实现上：本分区任何图表都不得省略数据源脚注。
 */
const config: ModuleConfig = {
  key: 'intel',
  basePath: '/intel',
  titleKey: 'intel.menu.intel',
  subtitleKey: 'intel.subtitle',
  bizCodes: 'BO-MKT- / GM-',
  permPrefix: 'intel',
  enabled: true,
  icon: 'intel',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/intel',
      element: () => import('./index'),
      permCode: 'intel:trend:view',
      titleKey: 'intel.menu.home',
    },
  ],
};

export default config;
