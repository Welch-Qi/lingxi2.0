import type { ReactNode } from 'react';

/**
 * 分类导航 LxNavGrid —— 以"去哪儿找 / 去哪儿配"组织的模块入口。
 *
 * 适用模块：知识中心（四类知识资产）、配置中心（四类治理配置）。
 *
 * 为什么这两个模块不用工作队列当首屏：客户中心、售后服务这类模块的对象是
 * "一条条待处理的事项"，适合队列；而知识资产与治理配置是**分类**——
 * 用户进来时心里已经知道"我要找话术"或"我要改权限"，需要的是分类直达，
 * 把他不需要的分类收起来。用队列反而要凭空造出一堆"待办"。
 *
 * 因此这里刻意不做通用组件：它只在"模块 = 分类集合"这一种场景成立，
 * 扩散到队列型模块会破坏那些模块的动线（见 LxWorkList 的注释）。
 */
export type LxNavTone = 'primary' | 'secondary' | 'accent' | 'success' | 'violet';

export interface LxNavItem {
  key: string;
  title: string;
  /** 一句话说明这类资产/配置的用途与消费者，避免"写完没人用" */
  desc?: string | undefined;
  icon: ReactNode;
  tone?: LxNavTone | undefined;
  /** 右上角计数或状态，如"86 个模板""3 项待处理" */
  badge?: string | undefined;
  onClick?: (() => void) | undefined;
}

export function LxNavGrid({ items }: { items: readonly LxNavItem[] }) {
  return (
    <div className="lx-navgrid">
      {items.map((item) => (
        <button key={item.key} type="button" className="lx-navgrid__item lx-focusable" onClick={item.onClick}>
          <span
            className={`lx-navgrid__icon${item.tone && item.tone !== 'primary' ? ` lx-navgrid__icon--${item.tone}` : ''}`}
            aria-hidden="true"
          >
            {item.icon}
          </span>
          <span>
            <span className="lx-navgrid__title">{item.title}</span>
            {item.desc ? <span className="lx-navgrid__desc">{item.desc}</span> : null}
          </span>
          {item.badge ? <span className="lx-navgrid__badge">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
