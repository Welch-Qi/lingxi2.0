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
  /**
   * 数值的时点标签（如「今日」），显示在**数值行右端**。
   *
   * 为什么需要：同一张卡里同时有「本日」与「本月」两个口径时，大字究竟是哪个口径
   * 必须被写明——只靠 sub 里带个「本月」前缀，扫读时仍会先把大字认成月累计。
   *
   * 为什么放在数值行而不是标签行（2026-09-23 改）：挂在标签行右端时，
   * 指标名能用的宽度被它切掉一大块（窄卡里约 1/4），「高意向客户数」这种
   * 6 字指标名会被折行。挪到数值行后整行标签归指标名，而数值行本就宽裕。
   * 语义上也更顺：它说明的就是它旁边那个大字。
   * 不传时不渲染，保持既有页面的版式不变。
   */
  valueLabel?: string | undefined;
  onClick?: (() => void) | undefined;
  /**
   * 选中态：指标卡作为"筛选/切换列表"的入口时，高亮当前生效的那张卡。
   * 仅当传了 onClick 才有意义（纯展示卡不需要选中态）。
   */
  active?: boolean | undefined;
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
  valueLabel,
  onClick,
  active = false,
}: LxKpiProps) {
  const className = `lx-glass lx-kpi lx-hoverable${onClick ? ' lx-focusable' : ''}${active ? ' lx-kpi--active' : ''}`;
  const body: ReactNode = (
    <>
      <span className="lx-kpi__label">
        <span className={`lx-kpi__tick ${TICK_CLASS[color]}`} />
        {/* 指标名单独成 span 而不是裸文本：flex 容器里的裸文本会变成匿名项，
            既加不了 min-width:0 也截不断，nowrap 之后只会直接溢出卡片。 */}
        <span className="lx-kpi__name">{label}</span>
      </span>
      <span className="lx-kpi__valuerow">
        <span className={`lx-kpi__value lx-num${size === 'sm' ? ' lx-kpi__value--sm' : ''}`}>{value}</span>
        {valueLabel ? <span className="lx-kpi__badge">{valueLabel}</span> : null}
      </span>
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
