import { useEffect, useMemo, useRef, useState } from 'react';
import type { ECharts, EChartsCoreOption } from './echarts-lazy';
import { loadECharts } from './echarts-loader';
import { readToken, tintToCard, tokenRgb } from './token-color';

/**
 * 全球销量热度地图 LxWorldMap。
 *
 * 场景来自灵犀 1.0《经营分析》页：把各国订单量摊到世界地图上着色，
 * 回答"货卖到哪去了、哪个市场还没打开"——这类问题用排行榜答不全，
 * 因为排名只给前 10 名，看不到"完全没有销量"的区域（那往往才是机会所在）。
 *
 * 三个刻意的实现决定：
 *
 * ① **地图数据不进 JS bundle，也不依赖 CDN**。1.0 用 react-simple-maps 从
 *    cdn.jsdelivr.net 现拉 world-atlas —— 内网/离线环境直接白屏，且首屏多一次
 *    跨域请求。这里改为 fetch 同源的 `/geo/world.json`（精简后的 GeoJSON，约 390 kB，
 *    坐标压到 2 位小数），由调用方通过 geoUrl 指定，组件本身不假设部署路径。
 *
 * ② **色阶由品牌令牌派生，不写死色值**。canvas 不认 CSS 变量，所以先读到
 *    --lx-color-secondary 的 RGB，再按明度朝白色靠拢得到 5 档。这样暗色主题切换时
 *    地图整体随之变化，且不会引入第六个色相（禁忌 8）。
 *    "未销售"单独用中性灰，是为了和"低销量浅蓝"区分开——这两者混在一起，
 *    地图就失去了指出空白市场的能力。
 *
 * ③ **tooltip 走 ECharts 自带浮层**，用 className 挂样式，而不是像 1.0 那样
 *    自绘 React 浮层。自绘需要监听 mousemove + 手动定位 + 处理视口边界，
 *    而 ECharts 已经把这几件事做完了。
 */
const MAP_NAME = 'lx-world';

export interface LxWorldMapDetail {
  label: string;
  value: string;
  /** 行首圆点色（具体色值） */
  color: string;
}

export interface LxWorldMapDatum {
  /**
   * GeoJSON 区域名，必须与 /geo/world.json 里的 properties.name 完全一致
   * （如 "Germany"、"United States"），否则该国会落回"未销售"色。
   */
  name: string;
  /** 0~100 的热度值，仅用于分档着色 */
  value: number;
  /** 探针里的明细行（文案由调用方本地化） */
  details?: readonly LxWorldMapDetail[] | undefined;
}

export interface LxWorldMapProps {
  /** GeoJSON 地址，通常为 `${import.meta.env.BASE_URL}geo/world.json` */
  geoUrl: string;
  data: readonly LxWorldMapDatum[];
  /** 图例标签（已本地化）：noData 对应"未销售"，levels 由浅到深对应 5 个档位 */
  legend: { noData: string; levels: readonly string[] };
  /** 区域名 → 本地化显示名；未命中时回退原名 */
  formatName?: ((name: string) => string) | undefined;
  /** 地图高度（px），默认 420 */
  height?: number | undefined;
  ariaLabel?: string | undefined;
}

/** 令牌名 → 兜底色值，与 design-tokens.css 一致，防止令牌缺失时地图失效。 */
const TOKENS = {
  secondary: ['--lx-color-secondary', '#2e6be6'],
  accent: ['--lx-color-accent', '#f0a91a'],
  muted: ['--lx-color-muted', '#94a3b8'],
} as const;

/** 档位色：index 0 为"未销售"（中性灰），1~5 为品牌蓝由浅到深。 */
function levelColors(): readonly string[] {
  const blue = tokenRgb(TOKENS.secondary[0], TOKENS.secondary[1]);
  const muted = tokenRgb(TOKENS.muted[0], TOKENS.muted[1]);
  // 两处刻意的取值：
  // ① "未销售"用 0.45 的浅灰而不是更浅的 0.62——初版取 0.62 时它与最低档蓝
  //    （0.86 的浅蓝）亮度几乎相同、只差一点色相，地图上根本分不出来，
  //    而"哪块地完全没卖过"恰恰是这张图要回答的问题。
  // ② 品牌蓝的档距从 0.86~0 收成 0.80~0——初版低两档挤在近白区，
  //    1~9 单与 10~24 单看起来是一样的颜色。
  //
  // 靠拢的目标是**卡片底色**而不是纯白（tintToCard）：亮色主题下卡片是白的，
  // 结果与朝白提亮完全一致；暗色主题下卡片是深底，同一张色阶表自动变成朝深压暗，
  // 于是"未销售"在深色界面上不再是最亮的一块。
  return [
    tintToCard(muted, 0.45),
    tintToCard(blue, 0.8),
    tintToCard(blue, 0.62),
    tintToCard(blue, 0.44),
    tintToCard(blue, 0.24),
    tintToCard(blue, 0),
  ];
}

/** 与 levelColors 的档位一一对应。阈值沿用 1.0 口径。 */
function levelIndex(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 80) {
    return 5;
  }
  if (value >= 50) {
    return 4;
  }
  if (value >= 25) {
    return 3;
  }
  if (value >= 10) {
    return 2;
  }
  return 1;
}

/**
 * GeoJSON 按 URL 记忆化。
 * 多个地图实例并发挂载时只请求一次；失败时清空记忆，避免一次抖动导致永久加载不出。
 */
const geoCache = new Map<string, Promise<unknown>>();

function loadGeo(url: string): Promise<unknown> {
  const cached = geoCache.get(url);
  if (cached) {
    return cached;
  }
  const pending = fetch(url, { credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`geo ${response.status}`);
      }
      return response.json() as Promise<unknown>;
    })
    .catch((error: unknown) => {
      geoCache.delete(url);
      throw error;
    });
  geoCache.set(url, pending);
  return pending;
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);
}

export function LxWorldMap({
  geoUrl,
  data,
  legend,
  formatName,
  height = 420,
  ariaLabel,
}: LxWorldMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 主题切换（:root[data-lx-theme]）时令牌色值变化，色阶需要重算并重绘
  const [themeTick, setThemeTick] = useState(0);
  /**
   * 容器实测宽度，用来给 layoutSize 定像素值。
   *
   * 为什么不用 `layoutSize: '98%'`：ECharts 的百分比是相对 min(容器宽, 容器高) 解析的，
   * 而这里容器是"够宽、不高"（720×420），于是 min 取到高度 420，地图的**宽**被定成 412，
   * 高只有 ~185——整张图缩在卡片中间，上下各留一百多像素空白。
   * 改成按宽度算，地图宽度直接吃满卡片（约 709），高度随之涨到 ~320，空白基本消失。
   * 宽度变化必须触发重算，所以这里进 state 而不是读一次留着。
   */
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lx-theme'] });
    return () => observer.disconnect();
  }, []);

  // react-hooks 规则的静态分析看不到 levelColors() 内部读了 :root 上的令牌，
  // 于是把 themeTick 判成多余依赖。但 canvas 不认 CSS 变量、色阶是运行时算出来的，
  // 主题一变就必须重算，否则暗色下地图仍是亮色版。故意保留该依赖。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => levelColors(), [themeTick]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    // 组件可能在 echarts / GeoJSON 还没就绪时就被卸载（例如切换路由），
    // 此时必须丢弃这次结果，否则会把实例挂到已移除的 DOM 上并泄漏。
    let disposed = false;
    let chart: ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    Promise.all([loadECharts(), loadGeo(geoUrl)])
      .then(([module, geo]) => {
        if (disposed) {
          return;
        }
        module.echarts.registerMap(MAP_NAME, geo as Parameters<typeof module.echarts.registerMap>[1]);
        chart = module.echarts.init(host, undefined, { renderer: 'canvas' });
        chartRef.current = chart;
        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
          setBoxWidth(host.clientWidth);
        });
        resizeObserver.observe(host);
        setBoxWidth(host.clientWidth);
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
  }, [geoUrl]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) {
      return;
    }
    const highlight = readToken(TOKENS.accent[0], TOKENS.accent[1]);
    const datumOf = new Map(data.map((datum) => [datum.name, datum]));

    const option: EChartsCoreOption = {
      tooltip: {
        trigger: 'item',
        className: 'lx-worldmap__tip',
        // ECharts 会把背景/边框/内边距直接写成 inline style，优先级高于类名样式，
        // 因此这几个属性只能通过 extraCssText 覆盖。好在 inline style 认 CSS 变量，
        // 所以这里仍能吃到主题令牌，不必写死色值。
        extraCssText:
          'padding:10px 12px;border-radius:var(--lx-radius);' +
          'background:var(--lx-color-card-solid);border:1px solid var(--lx-color-border-strong);' +
          'box-shadow:var(--lx-shadow-pop);color:var(--lx-color-ink);',
        formatter: (params: unknown) => {
          const name = (params as { name?: string }).name ?? '';
          const title = `<span class="lx-worldmap__tip-name">${escapeHtml(formatName ? formatName(name) : name)}</span>`;
          const datum = datumOf.get(name);
          if (!datum?.details?.length) {
            return title;
          }
          const rows = datum.details
            .map(
              (detail) =>
                `<span class="lx-worldmap__tip-row"><i style="background:${detail.color}"></i>` +
                `<span>${escapeHtml(detail.label)}</span><b>${escapeHtml(detail.value)}</b></span>`,
            )
            .join('');
          return `${title}${rows}`;
        },
      },
      series: [
        {
          type: 'map',
          map: MAP_NAME,
          roam: false,
          zoom: 1,
          layoutCenter: ['50%', '50%'],
          // 未测到宽度时（首帧）回退到百分比，避免传 0 导致地图不可见
          layoutSize: boxWidth > 0 ? Math.round(boxWidth * 0.98) : '98%',
          selectedMode: false,
          label: { show: false },
          itemStyle: {
            areaColor: colors[0] ?? '#e2e8f0',
            borderColor: '#ffffff',
            borderWidth: 0.6,
          },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: highlight, borderColor: '#ffffff', borderWidth: 0.8 },
          },
          data: data.map((datum) => ({
            name: datum.name,
            value: datum.value,
            itemStyle: { areaColor: colors[levelIndex(datum.value)] ?? '#e2e8f0' },
          })),
        },
      ],
    };
    chart.setOption(option, true);
  }, [data, formatName, ready, themeTick, colors, boxWidth]);

  return (
    <div className="lx-worldmap">
      <div
        ref={hostRef}
        className="lx-worldmap__canvas"
        style={{ height }}
        role="img"
        // 加载完成前 aria-busy 让读屏器知道地图还在准备，而不是"空白地图"
        aria-busy={!ready}
        aria-label={ariaLabel ?? legend.levels.join(' / ')}
        data-state={failed ? 'failed' : ready ? 'ready' : 'loading'}
      />
      <div className="lx-worldmap__legend">
        {[legend.noData, ...legend.levels].map((label, index) => (
          <span key={label} className="lx-worldmap__legend-item">
            <i style={{ background: colors[index] ?? '#e2e8f0' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
