import type { ReactNode } from 'react';

/**
 * 状态 / 类型标签 LxTag（改造指引 4.6 标签色板）。
 *
 * 为什么用固定枚举而不是自由传色：色彩语义边界是硬约束（禁忌 3），
 * 自由传色必然出现"用绿色做预警"这类语义漂移。
 */
export type LxTagVariant = 'video' | 'graphic' | 'lang' | 'done' | 'review' | 'producing';

export function LxTag({ variant, children }: { variant: LxTagVariant; children: ReactNode }) {
  return <span className={`lx-tag lx-tag--${variant}`}>{children}</span>;
}
