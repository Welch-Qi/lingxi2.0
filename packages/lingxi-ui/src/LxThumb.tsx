import type { ReactNode } from 'react';

/**
 * 缩略图 LxThumb（改造指引 4.5 素材列）。
 *
 * 列表里的素材缩略图有两种形态：有图用图，无图退化为色块 + 图标。
 * 抽成组件是因为"无图时降级"这条规则若散落在各页面，会出现有的页面空白、
 * 有的页面显示碎图标，视觉上看起来像加载失败。
 *
 * 色系仍限定在五维品牌色内（禁忌 8）。
 */
export type LxThumbKind = 'video' | 'graphic' | 'stored';

const KIND_FALLBACK: Record<LxThumbKind, string> = {
  video: 'linear-gradient(135deg,#2E6BE6,#7A5AC0)',
  graphic: 'linear-gradient(135deg,#0E7C86,#2E6BE6)',
  stored: 'linear-gradient(135deg,#3D9A6E,#0E7C86)',
};

export interface LxThumbProps {
  /** 图片地址（来自 public/images）；不传则降级为图标色块 */
  src?: string | undefined;
  /** 无障碍替代文本；有图时必填，否则读屏器只会念出文件名 */
  alt?: string | undefined;
  kind?: LxThumbKind | undefined;
  /** 无图时的占位图标 */
  icon?: ReactNode | undefined;
  /** 宽高：默认 44×32 列表缩略图；card 用于详情/卡片大图 */
  size?: 'sm' | 'card' | undefined;
}

export function LxThumb({ src, alt = '', kind = 'graphic', icon, size = 'sm' }: LxThumbProps) {
  const className = `lx-thumb lx-thumb--${kind}${size === 'card' ? ' lx-thumb--card' : ''}`;

  if (src) {
    return (
      <span className={className}>
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </span>
    );
  }

  return (
    <span className={className} style={{ background: KIND_FALLBACK[kind] }} aria-hidden="true">
      {icon}
    </span>
  );
}
