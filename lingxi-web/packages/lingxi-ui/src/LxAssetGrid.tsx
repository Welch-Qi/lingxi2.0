import type { ReactNode } from 'react';
import type { LxTagVariant } from './LxTag';
import { LxTag } from './LxTag';

/**
 * 资产网格 LxAssetGrid —— 以"可看"的方式陈列素材与知识资产。
 *
 * 适用模块：商品中心（产品素材库）、知识中心（模板/话术/QA/提示词分类）、
 * 营销中心（内容预览）。
 *
 * 为什么这些模块需要网格而不是列表：这三类对象的判断依据是"长什么样"
 * （商品图、内容封面）或"归在哪一类"（知识资产分类），
 * 纯表格只能给出名称与字段，用户必须先点进去才能确认是不是自己要找的那个。
 * 商品开发总监挑素材、内容创意总监看内容，眼睛比字段快。
 *
 * 缺图时降级为图标色块（复用 LxThumb 的降级策略），不允许出现空白格子——
 * 空白会被误读为"加载失败"（改造指引禁忌 9 的同源问题）。
 */
export interface LxAssetItem {
  key: string;
  title: string;
  sub?: string | undefined;
  /** 图片地址（public/images 下的资产）；缺省降级为图标 */
  image?: string | undefined;
  icon?: ReactNode | undefined;
  tag?: { label: string; variant: LxTagVariant } | undefined;
  /** 右上角角标数字，如"待补全 12""新增 3" */
  badge?: string | undefined;
  onClick?: (() => void) | undefined;
}

export interface LxAssetGridProps {
  items: readonly LxAssetItem[];
  columns?: 3 | 4 | 5 | undefined;
}

export function LxAssetGrid({ items, columns = 4 }: LxAssetGridProps) {
  return (
    <div className={`lx-assetgrid lx-assetgrid--${columns}`}>
      {items.map((item) => (
        <button key={item.key} type="button" className="lx-asset lx-focusable" onClick={item.onClick}>
          <span className="lx-asset__media">
            {item.image ? (
              <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
            ) : (
              <span className="lx-asset__icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.badge ? <span className="lx-asset__badge">{item.badge}</span> : null}
          </span>
          <span className="lx-asset__body">
            <span>
              <span className="lx-asset__title">{item.title}</span>
              {item.sub ? <span className="lx-asset__sub">{item.sub}</span> : null}
            </span>
            {item.tag ? <LxTag variant={item.tag.variant}>{item.tag.label}</LxTag> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
