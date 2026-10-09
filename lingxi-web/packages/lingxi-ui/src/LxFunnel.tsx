import { useEffect, useMemo, useState } from 'react';
import { tint, tokenRgb } from './token-color';

/**
 * 营销转化漏斗 LxFunnel。
 *
 * 场景来自 1.0《经营分析》页：曝光 → 点击 → 潜客 → 订单。
 * 它回答的不是"各环节有多少"，而是**"哪一段在漏"**——所以每两阶之间必须给出
 * 阶段转化率。只看绝对值的漏斗图到处都是，但真正能驱动动作的是那个百分比。
 *
 * 两个实现细节：
 *   · 条形宽度按阶段递减（每阶 -14 个百分点），而不是按数值等比缩放。
 *     曝光 2460 万 与 订单 3280 差 4 个数量级，等比缩放会让后三阶细到看不见。
 *     漏斗的形状表达"逐级收窄"这一事实，数量级差异交给条上的数值。
 *   · 同色系由深到浅（品牌蓝派生），不引入新色相；深浅只表达阶段序号，
 *     与地图"深浅表达销量高低"的用法互不冲突——两处用的都不是同一个组件的色阶。
 */
export interface LxFunnelStep {
  key: string;
  label: string;
  value: number;
}

export interface LxFunnelProps {
  steps: readonly LxFunnelStep[];
  /** 阶段转化率模板，用 {rate} 占位，如 "转化 {rate}%" */
  rateTemplate: string;
  ariaLabel?: string | undefined;
}

/** 超过千/百万改用 K / M 缩写，避免条形上出现 24600000 这种读不出来的数字。 */
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

/** 阶段色：品牌蓝由深到浅，index 0 最深。 */
function stageColors(count: number): readonly string[] {
  const blue = tokenRgb('--lx-color-secondary', '#2e6be6');
  const span = count > 1 ? 0.5 / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => tint(blue, index * span));
}

export function LxFunnel({ steps, rateTemplate, ariaLabel }: LxFunnelProps) {
  // 色阶是运行时从令牌派生的，主题切换需要重算
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lx-theme'] });
    return () => observer.disconnect();
  }, []);

  // 色阶是运行时从令牌派生的，主题切换需要重算。规则看不到 stageColors() 读了
  // :root 令牌，故把 themeTick 判成多余依赖——这里故意保留。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => stageColors(steps.length), [steps.length, themeTick]);

  return (
    <div className="lx-funnel" role="img" aria-label={ariaLabel ?? steps.map((s) => s.label).join(' / ')}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : undefined;
        const rate = previous && previous.value > 0 ? ((step.value / previous.value) * 100).toFixed(1) : null;
        return (
          <div key={step.key} className="lx-funnel__row">
            {rate ? (
              <div className="lx-funnel__rate">
                <i aria-hidden="true" />
                {/* 占位符必须按 i18next 的**双花括号**写法替换。
                   此前这里是 `.replace('{rate}', rate)`（单花括号），
                   而语言包 `ana.funnel.rate` 的值是「转化 {{rate}}%」——
                   于是替换永远匹配不上，漏斗每一档的转化率标签都显示
                   字面的「转化 {{rate}}%」。截图里看着像占位符没填的半成品。
                   顺带兼容单花括号：邮件模板那类字面合并符走的是单花括号，
                   万一将来有别的调用方按那个约定传串，这里不至于渲染出原样符号。 */}
                <span>{rateTemplate.replace(/\{\{?rate\}?\}/g, rate)}</span>
                <i aria-hidden="true" />
              </div>
            ) : null}
            <div
              className="lx-funnel__bar"
              style={{ width: `${100 - index * 14}%`, background: colors[index] ?? '#2e6be6' }}
            >
              <span className="lx-funnel__label">{step.label}</span>
              <span className="lx-funnel__value lx-num">{formatCompact(step.value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
