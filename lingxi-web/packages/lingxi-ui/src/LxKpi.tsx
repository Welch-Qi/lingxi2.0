import type { ReactNode } from 'react';

/**
 * 指标卡 LxKpi（改造指引 4.3）。
 *
 * 为什么数值必须走 .lx-num：不统一等宽数字时，多张卡片的数字宽度不同，
 * 纵向无法对齐，看板会显得廉价且难以扫读。
 *
 * 色条颜色仅允许 青/蓝/黄/绿/紫 五维（禁忌 8：不新增任意色相）。
 */
export type LxKpiColor = 'primary' | 'secondary' | 'accent' | 'success' | 'violet';

/** 色条与 sparkline 的色值取自 CSS 变量，避免在组件内写死颜色（§4.2.5）。 */
const TICK_CLASS: Record<LxKpiColor, string> = {
  primary: 'lx-kpi__tick--primary',
  secondary: 'lx-kpi__tick--secondary',
  accent: 'lx-kpi__tick--accent',
  success: 'lx-kpi__tick--success',
  violet: 'lx-kpi__tick--violet',
};

const SPARK_COLOR: Record<LxKpiColor, string> = {
  primary: 'var(--lx-color-primary)',
  secondary: 'var(--lx-color-secondary)',
  accent: 'var(--lx-color-accent)',
  success: 'var(--lx-color-success)',
  violet: 'var(--lx-color-violet)',
};

export type LxTrend = 'up' | 'dn' | 'fl';

/**
 * 迷你趋势线（无填充，stroke 与色条同色）。
 *
 * 坐标归一到 0~18 的视口高度；preserveAspectRatio=none 让它铺满卡片宽度，
 * 配合 non-scaling-stroke 保证拉伸后线宽不变粗。
 */
export function Sparkline({
  data,
  color = 'primary',
  className,
}: {
  data: readonly number[];
  color?: LxKpiColor | undefined;
  className?: string | undefined;
}) {
  if (data.length < 2) {
    return null;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = 100 / (data.length - 1);
  const points = data
    .map((value, index) => `${(index * step).toFixed(2)},${(16 - ((value - min) / span) * 14).toFixed(2)}`)
    .join(' ');

  return (
    <svg className={className} viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline
        points={points}
        fill="none"
        stroke={SPARK_COLOR[color]}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * 涨跌胶囊：绿涨 / 红跌 / 灰（黄）平。
 *
 * 口径来源：《前端改造指引-AuroraSense1.0》§2 色板把「苔原绿」定义为"成功、正向、在线、涨幅"，
 * 「珊瑚红」定义为"危险、告警、删除、跌幅"，§7 验收清单亦写"涨跌胶囊：绿涨红跌黄平"。
 *
 * ⚠️ 这是**已裁定**的口径，不是遗漏：本口径与证券行情的"红涨绿跌"相反，
 * 2026-09-16 已确认**保留绿涨红跌**（决策记录见项目工作日志 2026-09-16）。
 * 因此：**不要**把这里的配色"修正"成红涨绿跌——那属于指引改版范畴，
 * 应由《AuroraSense》统一改版后再动，不得在单个页面或单个组件局部改色
 * （禁忌：禁止挪用色彩语义）。
 */
export function LxTrendPill({ trend, delta }: { trend: LxTrend; delta: string }) {
  const arrow = trend === 'up' ? '↑' : trend === 'dn' ? '↓' : '→';
  return (
    <span className={`lx-trend lx-trend--${trend}`}>
      {arrow}
      {delta}
    </span>
  );
}

export interface LxKpiProps {
  label: string;
  value: string;
  sub?: string | undefined;
  trend?: LxTrend | undefined;
  delta?: string | undefined;
  color?: LxKpiColor | undefined;
  spark?: readonly number[] | undefined;
  /** sm 用于内容营销等次级指标行（22px），默认 md（24px） */
  size?: 'md' | 'sm' | undefined;
  onClick?: (() => void) | undefined;
}

export function LxKpi({
  label,
  value,
  sub,
  trend,
  delta,
  color = 'primary',
  spark,
  size = 'md',
  onClick,
}: LxKpiProps) {
  const className = `lx-glass lx-kpi lx-hoverable${onClick ? ' lx-focusable' : ''}`;
  const body: ReactNode = (
    <>
      <span className="lx-kpi__label">
        <span className={`lx-kpi__tick ${TICK_CLASS[color]}`} />
        {label}
      </span>
      <span className={`lx-kpi__value lx-num${size === 'sm' ? ' lx-kpi__value--sm' : ''}`}>{value}</span>
      {sub || (trend && delta) ? (
        <span className="lx-kpi__foot">
          {sub ? <span className="lx-kpi__sub">{sub}</span> : null}
          {trend && delta ? <LxTrendPill trend={trend} delta={delta} /> : null}
        </span>
      ) : null}
      {spark && spark.length > 1 ? <Sparkline data={spark} color={color} className="lx-kpi__spark" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
