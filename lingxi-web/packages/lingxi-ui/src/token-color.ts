/**
 * 令牌取色工具（内部模块，不对外导出）。
 *
 * 存在的理由：ECharts 与 SVG 都不认 CSS 变量——把它们画在 canvas 上的时候，
 * 传 `var(--lx-color-primary)` 不会报错，只会静默变成黑色。所以凡是"把品牌色
 * 交给 canvas"的地方，都必须先在这里把令牌解析成具体色值。
 *
 * 而 2.0 的色板只有五维（青/蓝/黄/绿/紫，禁忌 8：不新增任意色相）。
 * 需要"同色系的深浅阶梯"时（地图销量热力、漏斗阶段、名次色阶），
 * 做法是取品牌色的 RGB 后朝另一个颜色靠拢，只改明度、不引入新色相。
 * 朝谁靠拢由调用方决定，见下面对 mix / tint 的说明。
 */

/** 令牌名 → 兜底色值。兜底色与 design-tokens.css 一致，防止令牌缺失时画面失效。 */
export function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

/** 把任意 CSS 颜色（#rgb / #rrggbb / rgb() / rgba()）解析为 RGB 三元组。 */
export function toRgb(color: string): readonly [number, number, number] {
  const text = color.trim();
  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => char + char)
            .join('')
        : hex;
    return [
      Number.parseInt(full.slice(0, 2), 16) || 0,
      Number.parseInt(full.slice(2, 4), 16) || 0,
      Number.parseInt(full.slice(4, 6), 16) || 0,
    ];
  }
  const matched = /rgba?\(([^)]+)\)/.exec(text);
  if (matched?.[1]) {
    const parts = matched[1].split(',').map((piece) => Number.parseFloat(piece));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  }
  return [46, 107, 230];
}

/** 把 base 朝 target 混合 t（0 = 原色，1 = 完全等于 target）。只改明度、不动色相。 */
export function mix(
  base: readonly [number, number, number],
  target: readonly [number, number, number],
  t: number,
): string {
  const channel = (index: 0 | 1 | 2) =>
    Math.round((base[index] ?? 0) + ((target[index] ?? 0) - (base[index] ?? 0)) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/**
 * 朝白色靠拢 t（0 = 原色，1 = 纯白）。
 *
 * 适用场景：**层级色阶**——名次条、漏斗阶段。这里"越浅越次要"，
 * 两个主题下方向都对，所以固定朝白。
 */
export function tint(rgb: readonly [number, number, number], t: number): string {
  return mix(rgb, [255, 255, 255], t);
}

/**
 * 朝**卡片底色**靠拢 t。
 *
 * 适用场景：**热力色阶**——地图销量热度。这类图上"无数据"必须是最不抢眼的一档，
 * 否则整张图的主次就反了。亮色主题下卡片是白的，与 tint 等价；
 * 暗色主题下卡片是深底，于是同一张色阶表自动变成"朝深压暗"，
 * 不会出现"深色界面上未销售地块反而最亮"这种反直觉的画法。
 */
export function tintToCard(rgb: readonly [number, number, number], t: number): string {
  return mix(rgb, tokenRgb('--lx-color-card-solid', '#ffffff'), t);
}

/** 直接取某个令牌的 RGB，省去调用方两步（readToken + toRgb）。 */
export function tokenRgb(name: string, fallback: string): readonly [number, number, number] {
  return toRgb(readToken(name, fallback));
}
