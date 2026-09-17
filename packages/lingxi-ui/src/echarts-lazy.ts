/**
 * echarts 的按需引入层（内部模块，不从 @lingxi/ui 对外导出）。
 *
 * 为什么要有这个文件，而不是在 LxChart 里直接 `await import('echarts/charts')`：
 *   动态 import 拿到的是**命名空间对象**，Rollup 无法对它做 tree-shaking，
 *   会保守地把整个模块打进来。实测后果：`import('echarts/charts')` +
 *   `import('echarts/components')` 会让 chunk 从 524 kB 膨胀到 1092 kB，
 *   正好等于 echarts 全量（1096 kB）——按需引入彻底失效。
 *
 *   本文件用**静态命名导入**（Rollup 能精确分析并摇树），再被 LxChart **动态 import**。
 *   于是两件事同时成立：① 只打包用到的图表与组件；② echarts 不进首屏。
 *
 * 所以：新增图表类型时改这里（加静态 import + 加进 use 数组），不要在 LxChart 里
 * 改成 `import('echarts/charts')`——那会把体积打回全量。
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 刻意不注册 DatasetComponent：LxChart 的 option 用 series.data 直接喂数，不走 dataset。
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export { echarts };
export type { ECharts, EChartsCoreOption } from 'echarts/core';
