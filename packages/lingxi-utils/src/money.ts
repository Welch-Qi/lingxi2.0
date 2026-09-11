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
