/**
 * 金额工具（技术规约2.0 §3.3 D5 / §4.10）。
 *
 * 铁律：金额一律"最小货币单位整数 + 币种 ISO4217 + 汇率快照"存储与运算，
 * <b>禁止浮点运算</b>——0.1 + 0.2 !== 0.3 这类误差在财务场景是不可接受的。
 */

/** 各币种的最小单位位数（ISO 4217 主要币种）。 */
const MINOR_UNIT_DIGITS: Record<string, number> = {
  CNY: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0, // 日元无小数位
  KRW: 0,
  VND: 0,
  INR: 2,
  RUB: 2,
  BRL: 2,
};

export function minorUnitDigits(currency: string): number {
  return MINOR_UNIT_DIGITS[currency.toUpperCase()] ?? 2;
}

/** 最小单位整数 -> 展示字符串（不参与再运算）。 */
export function formatMoney(
  amountMinor: number | null | undefined,
  currency = 'CNY',
  locale = 'zh-CN',
): string {
  if (amountMinor === null || amountMinor === undefined) {
    return '-';
  }
  const digits = minorUnitDigits(currency);
  const value = amountMinor / 10 ** digits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * 最小单位整数 -> 紧凑展示字符串（表格窄列用：zh「¥156万」/ en「¥1.6M」）。
 *
 * 为什么不复用 formatMoney：表格里金额列的可用宽度只有 ~90px，全量记法
 * （¥1,560,000.00）会把列撑到横向滚动、把最右的操作列推出视野。
 *
 * 紧凑记法交给 Intl 的 notation:'compact' 输出，**关键是 locale 必须显式传**：
 * 「万 / 亿」是中文数量级，若用 `Intl.NumberFormat(undefined, …)` 就等于取运行时
 * 默认语言，英文界面里会照样出现「¥156.0万」——那不是本地化，只是碰巧中文。
 */
export function formatMoneyCompact(
  amountMinor: number | null | undefined,
  currency = 'CNY',
  locale = 'zh-CN',
): string {
  if (amountMinor === null || amountMinor === undefined) {
    return '-';
  }
  const digits = minorUnitDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amountMinor / 10 ** digits);
}

/**
 * 汇率换算（返回最小单位整数）。
 *
 * 注意：换算结果用于展示与预估；单据金额必须使用成交时的汇率快照，
 * 不允许用当前汇率重算历史单据（§4.10）。
 */
export function convertMinor(
  amountMinor: number,
  rateSnapshot: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const fromDigits = minorUnitDigits(fromCurrency);
  const toDigits = minorUnitDigits(toCurrency);
  return Math.round((amountMinor * rateSnapshot * 10 ** toDigits) / 10 ** fromDigits);
}
