import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 时间工具（技术规约2.0 §4.10）。
 *
 * 铁律：
 *  - 存储与传输一律 UTC（后端返回 ISO8601 带 Z）；
 *  - 展示按"用户时区"格式化；客户相关时间轴按"客户时区"展示并标注时区。
 */

/** 按目标时区格式化 UTC 时间。 */
export function formatInTimezone(
  isoUtc: string | null | undefined,
  tz = 'Asia/Shanghai',
  pattern = 'YYYY-MM-DD HH:mm',
): string {
  if (!isoUtc) {
    return '-';
  }
  return dayjs.utc(isoUtc).tz(tz).format(pattern);
}

/**
 * 客户相关时间轴：必须带时区标注，避免跨时区误判跟进时效。
 *
 * 说明：输出固定用 ISO 风格（`YYYY-MM-DD HH:mm`）+ 时区偏移，不随 UI 语言变化——
 * 客户沟通记录属凭证类信息，数字序日期在 zh-CN / en-US 下都必须无歧义，
 * 故此处不接受 locale 参数（文案本地化由调用方的 i18n 承担）。
 */
export function formatForCustomer(isoUtc: string | null | undefined, customerTimezone: string): string {
  if (!isoUtc) {
    return '-';
  }
  const local = dayjs.utc(isoUtc).tz(customerTimezone);
  return `${local.format('YYYY-MM-DD HH:mm')} (${local.format('ZZ')} ${customerTimezone})`;
}

/** 相对时间（用于跟进提醒、任务超时提示）。 */
export function fromNow(isoUtc: string | null | undefined): string {
  if (!isoUtc) {
    return '-';
  }
  const diffMs = Date.now() - dayjs.utc(isoUtc).valueOf();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) {
    return `${Math.max(1, Math.floor(diffMs / 60_000))}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}
