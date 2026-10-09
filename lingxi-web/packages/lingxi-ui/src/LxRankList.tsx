import { useEffect, useMemo, useState } from 'react';
import { tint, tokenRgb } from './token-color';

/**
 * 排行榜 LxRankList。
 *
 * 场景来自 1.0《经营分析》页的"订单 Top10 · 国家 / 产品"。
 * 与 LxTable 的分工：表格用于"要找某一行"，排行榜用于"一眼看出头部格局"——
 * 后者的信息主体是**相对长度的比较**，所以条形的长度必须是第一视觉元素，
 * 表格的行高与分隔线反而会干扰这件事。
 *
 * 条形长度按榜首归一（榜首满格）。色阶按名次分三档（前三 / 四到六 / 其余），
 * 用品牌蓝的深浅表达，不新增色相。
 */
export interface LxRankItem {
  key: string;
  label: string;
  value: number;
}

export interface LxRankListProps {
  items: readonly LxRankItem[];
  /** 数值单位后缀（已本地化），如 " 单" */
  valueSuffix?: string | undefined;
  ariaLabel?: string | undefined;
}

/** 名次色阶：前三最深、四到六居中、其余最浅。 */
function rankColors(): readonly string[] {
  const blue = tokenRgb('--lx-color-secondary', '#2e6be6');
  return [tint(blue, 0), tint(blue, 0.3), tint(blue, 0.55)];
}

function colorOf(colors: readonly string[], index: number): string {
  if (index < 3) {
    return colors[0] ?? '#2e6be6';
  }
  return index < 6 ? (colors[1] ?? '#2e6be6') : (colors[2] ?? '#2e6be6');
}

export function LxRankList({ items, valueSuffix = '', ariaLabel }: LxRankListProps) {
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lx-theme'] });
    return () => observer.disconnect();
  }, []);

  // 同理：名次色阶读的是 :root 令牌，主题切换必须重算，themeTick 是故意留的依赖。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => rankColors(), [themeTick]);
  const max = items.reduce((peak, item) => Math.max(peak, item.value), 0) || 1;

  return (
    <ol className="lx-rank" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={item.key} className="lx-rank__row">
          <span className={`lx-rank__no${index < 3 ? ' is-top' : ''}`}>{index + 1}</span>
          <span className="lx-rank__label">{item.label}</span>
          <span className="lx-rank__track">
            <i
              style={{
                width: `${Math.max(4, (item.value / max) * 100)}%`,
                background: colorOf(colors, index),
              }}
            />
          </span>
          <span className="lx-rank__value lx-num">
            {item.value}
            {valueSuffix}
          </span>
        </li>
      ))}
    </ol>
  );
}
