import type * as echartsLazy from './echarts-lazy';

/**
 * echarts 运行时懒加载（内部模块，不对外导出）。
 *
 * 从 LxChart 里抽出来，供 LxChart 与 LxWorldMap 共用：
 *   · echarts 是**模块级单例**，两个组件各写一遍 import() 虽然最终命中同一份模块缓存，
 *     但"失败后清空记忆"这类恢复逻辑会各存一份状态，一处失败另一处仍以为成功。
 *   · ./echarts-lazy 里的 echarts.use() 是幂等的，合并到一处加载即可。
 *
 * 为什么要挪出首屏（保留原有结论）：
 *   echarts/core + zrender + 折线/柱状 + 网格/提示/图例实测约 524 kB；
 *   12 个一级菜单里只有少数页面用到图表，其余页面不该白付这份体积。
 *
 * 失败时必须清空记忆，否则一次网络抖动会让本会话后续所有图表永久加载不出来。
 */
let echartsModule: Promise<typeof echartsLazy> | null = null;

export function loadECharts(): Promise<typeof echartsLazy> {
  echartsModule ??= import('./echarts-lazy').catch((error: unknown) => {
    echartsModule = null;
    throw error;
  });
  return echartsModule;
}
