import { useEffect, useRef, useState } from 'react';
// 类型专用导入：运行时会被完全擦除，因此不会把 echarts 拉回静态依赖图（首屏）。
// 不用 Promise<typeof import('./echarts-lazy')> 这种内联写法——那会触发
// @typescript-eslint/consistent-type-imports（`import()` 类型注解被禁止）。
import type { ECharts, EChartsCoreOption } from './echarts-lazy';
import { loadECharts } from './echarts-loader';

/**
 * 图表组件 LxChart（技术规约2.0 §4.6 指定的 lingxi-ui 业务组件之一）。
 *
 * 为什么用 ECharts 而不是 AntD 自带图表：选型方案 §3.2 明确业务图表用 AntV G2、
 * 地图/热力/大屏用 ECharts。此处封装的是 ECharts，供看板类折线/柱状图使用。
 *
 * ⚠️ 关键实现约束：ECharts 默认渲染到 <canvas>，而 canvas 不认识 CSS 变量
 * （'var(--lx-color-primary)' 会被判为非法颜色，整条线退回黑色）。
 * 因此所有颜色必须先用 getComputedStyle 把令牌解析成具体色值再传给 ECharts。
 * 不要图省事在 option 里直接写 var(...)——这个坑很隐蔽：图表能画出来，但颜色全黑。
 *
 * 配色只用五维品牌色（禁忌 8：不新增任意色相）。
 */

/**
 * echarts 由 ./echarts-loader 统一懒加载并记忆化（见该文件注释：
 * 为什么走 ./echarts-lazy 中间模块、为什么必须挪出首屏）。此处只负责消费。
 */

/** 令牌名 → 兜底色值。兜底色与 design-tokens.css 保持一致，防止令牌缺失时图表失效。 */
const TOKENS = {
  primary: ['--lx-color-primary', '#0e7c86'],
  secondary: ['--lx-color-secondary', '#2e6be6'],
  accent: ['--lx-color-accent', '#f0a91a'],
  success: ['--lx-color-success', '#3d9a6e'],
  violet: ['--lx-color-violet', '#7a5ac0'],
  slate: ['--lx-color-slate', '#475569'],
  muted: ['--lx-color-muted', '#94a3b8'],
  border: ['--lx-color-border', 'rgba(30,41,59,0.08)'],
} as const;

type TokenKey = keyof typeof TOKENS;

/** 把 CSS 变量解析成 canvas 可用的具体色值。 */
function token(key: TokenKey): string {
  const [name, fallback] = TOKENS[key];
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

const SERIES_ORDER: readonly TokenKey[] = ['primary', 'secondary', 'accent', 'success', 'violet'];

export interface LxChartSeries {
  /** 图例名（已翻译的文案，组件不再二次 t()，避免把 i18n key 传进来） */
  name: string;
  data: readonly number[];
  /** 覆盖默认色（具体色值，不要传 CSS 变量）；缺省按五维品牌色顺序取 */
  color?: string | undefined;
}

export interface LxChartProps {
  type?: 'line' | 'bar' | undefined;
  /** X 轴类目 */
  categories: readonly string[];
  series: readonly LxChartSeries[];
  /** 图高（px），默认 224 */
  height?: number | undefined;
  /** 折线是否平滑，默认 true */
  smooth?: boolean | undefined;
  /** 数值后缀，如 '%'、'万' */
  valueSuffix?: string | undefined;
  /** 无障碍描述：图表必须能被读屏器理解 */
  ariaLabel?: string | undefined;
}

export function LxChart({
  type = 'line',
  categories,
  series,
  height = 224,
  smooth = true,
  valueSuffix = '',
  ariaLabel,
}: LxChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  // 主题切换（:root[data-lx-theme]）时令牌色值变化，需要重新解析并重绘
  const [themeTick, setThemeTick] = useState(0);
  // echarts 是异步加载的，实例就绪后要触发一次绘制；失败也要把状态落下来
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lx-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    // 组件可能在 echarts 还没加载完就被卸载（例如切换路由），
    // 此时必须丢弃这次结果，否则会把实例挂到已移除的 DOM 上并泄漏。
    let disposed = false;
    let chart: ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    loadECharts()
      .then(({ echarts }) => {
        if (disposed) {
          return;
        }
        chart = echarts.init(host, undefined, { renderer: 'canvas' });
        chartRef.current = chart;
        // 容器尺寸变化（侧栏折叠、窗口缩放）时重算，否则图表会留白
        resizeObserver = new ResizeObserver(() => chart?.resize());
        resizeObserver.observe(host);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true);
        }
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) {
      return;
    }
    const option: EChartsCoreOption = {
      color: SERIES_ORDER.map((key) => token(key)),
      grid: { left: 4, right: 8, top: 30, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: type === 'bar' ? 'shadow' : 'line' },
        valueFormatter: (value: number | string) => `${String(value)}${valueSuffix}`,
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 14,
        textStyle: { fontSize: 11, color: token('slate') },
      },
      xAxis: {
        type: 'category',
        data: [...categories],
        boundaryGap: type === 'bar',
        axisLine: { lineStyle: { color: token('border') } },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: token('muted') },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: token('border'), type: 'dashed' } },
        axisLabel: { fontSize: 10, color: token('muted') },
      },
      series: series.map((item, index) => {
        const color = item.color ?? token(SERIES_ORDER[index % SERIES_ORDER.length] ?? 'primary');
        return {
          name: item.name,
          type,
          smooth: type === 'line' ? smooth : undefined,
          showSymbol: false,
          symbolSize: 6,
          lineStyle: { width: 2.5, color },
          barMaxWidth: 18,
          itemStyle: {
            color,
            borderRadius: type === 'bar' ? [4, 4, 0, 0] : 0,
          },
          emphasis: { focus: 'series' },
          data: [...item.data],
        };
      }),
    };
    chart.setOption(option, true);
  }, [type, categories, series, smooth, valueSuffix, themeTick, ready]);

  return (
    <div
      ref={hostRef}
      className="lx-chart"
      style={{ height }}
      role="img"
      // 加载完成前 aria-busy 让读屏器知道图表还在准备，而不是"空白图表"
      aria-busy={!ready}
      aria-label={ariaLabel ?? series.map((item) => item.name).join(' / ')}
      data-state={failed ? 'failed' : ready ? 'ready' : 'loading'}
    />
  );
}
