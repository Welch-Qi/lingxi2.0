import type { ReactNode } from 'react';

/**
 * 业务操作入口条 LxActionBar。
 *
 * 为什么每个业务分区首页都要有它：产品规划说明书 V2.1 §5.2「入口铁律」要求
 * 人工功能必须在一级菜单可达（≤2 次点击），且"任何能力都有不经过智能体的直达入口"。
 * 之前的模块首页把"新建/导入"这类动作混在快捷卡里、位置随内容浮动，
 * 用户每进一个模块都要重新找一遍入口。抽成固定位置的操作条后，
 * **主操作永远在左上角第一个**，次要操作横向排开，符合"工作区"的肌肉记忆。
 *
 * 与 LxQuickAction 的分工：LxQuickAction 是"卡片式的功能导览"（用于工作台这类
 * 需要引导的场景）；LxActionBar 是"工具条式的执行入口"（用于业务分区，
 * 用户已经知道要干什么，只是要快速动手）。
 */
export interface LxActionItem {
  key: string;
  label: string;
  icon?: ReactNode | undefined;
  onClick?: (() => void) | undefined;
}

export interface LxActionBarProps {
  /** 主操作：每屏只允许一个，代表这个模块最高频的那个动作 */
  primary: LxActionItem;
  /** 次要操作：按使用频次从左到右排列 */
  items?: readonly LxActionItem[] | undefined;
  /**
   * 右侧成果说明。用于承载"智能体已经做了什么"——
   * 按产品原则，智能体的价值体现在成果数字上，而不是独立的建议卡里。
   * 文案允许内嵌 <b> 高亮数字（样式由 .lx-actionbar__note b 提供）。
   */
  note?: ReactNode | undefined;
}

export function LxActionBar({ primary, items, note }: LxActionBarProps) {
  return (
    <section className="lx-glass lx-actionbar">
      <button type="button" className="lx-actionbar__primary lx-focusable" onClick={primary.onClick}>
        {primary.icon}
        {primary.label}
      </button>

      {items && items.length > 0 ? (
        <div className="lx-actionbar__items">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="lx-actionbar__item lx-focusable"
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {note ? <span className="lx-actionbar__note">{note}</span> : null}
    </section>
  );
}
