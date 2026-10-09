import type { LxTagVariant } from './LxTag';
import { LxTag } from './LxTag';

/**
 * 工作队列 LxWorkList —— 业务分区首页的"今日该做的事"。
 *
 * 设计依据：产品规划说明书 §1.4「Human Native」——界面按角色工作习惯设计，
 * 默认页即当日该做的事；§5.3 要求待办类卡片"支持直接处理（如审核、分配、关闭），
 * 无需跳转"。
 *
 * 因此本组件与普通表格的区别在于：
 *  ① 每一行**必须带一个动作按钮**（分配 / 记跟进 / 审 / 建单），行内即可完成；
 *  ② 左侧 3px 紧急度色条让"先处理哪个"一眼可判，不依赖用户读完全部字段；
 *  ③ 智能体产出以**行内标记**（agentLabel）呈现，与人工数据同一行同一列——
 *     产品原则：智能体与人的操作融在一起，界面体现的是工作成果而非智能体本身。
 *
 * 行内按钮的自主度提示：当某行是"AI 只给了草稿、必须人过一下"时，
 * 由调用方把 actionLabel 写成"审核/确认"并用 urgency='high' 置顶，
 * 而不需要在界面上标注 A0~A3 这类内部术语（用户只关心要不要他动手）。
 */
export interface LxWorkItem {
  key: string;
  /** 主标题：对象名（客户名 / 订单号 / 关键词） */
  title: string;
  /** 副行说明：编号、来源、条件等 */
  sub?: string | undefined;
  /** 右侧数值：金额 / 倒计时 / 环比，等宽数字 */
  value?: string | undefined;
  valueTone?: 'default' | 'danger' | 'accent' | 'success' | undefined;
  /** 状态 / 分类标签，建议不超过 2 个以免行高失控 */
  tags?: readonly { label: string; variant: LxTagVariant }[] | undefined;
  /**
   * 智能体产出标记，如「AI 初筛 92 分」「AI 已生成草稿」「AI 已建议方案」。
   * 这一栏存在的意义是让用户知道"这条不是我干的"，用于决定是否复核；
   * 用统一的小尺寸标记呈现，不与人的操作抢视觉焦点。
   */
  agentLabel?: string | undefined;
  /** 行内动作文案（必填：队列行没有动作就不是队列） */
  actionLabel: string;
  actionPrimary?: boolean | undefined;
  onAction?: (() => void) | undefined;
}

export interface LxWorkListProps {
  title: string;
  sub?: string | undefined;
  /** 队列条数，与 title 同行显示 */
  count?: number | undefined;
  /** 标题左侧色点语义：danger 需立刻处理 / accent 今日待办 / primary 常规 / success 正向 */
  tone?: 'danger' | 'accent' | 'primary' | 'success' | undefined;
  moreLabel?: string | undefined;
  onMore?: (() => void) | undefined;
  items: readonly LxWorkItem[];
  emptyText: string;
}

const URGENCY_BY_TONE = {
  danger: 'high',
  accent: 'mid',
  primary: 'low',
  success: 'low',
} as const;

export function LxWorkList({
  title,
  sub,
  count,
  tone = 'primary',
  moreLabel,
  onMore,
  items,
  emptyText,
}: LxWorkListProps) {
  return (
    <section className="lx-glass lx-worklist">
      <header className="lx-worklist__head">
        <span className={`lx-worklist__dot lx-worklist__dot--${tone}`} aria-hidden="true" />
        <span className="lx-worklist__title">{title}</span>
        {typeof count === 'number' ? <span className="lx-worklist__count">{count}</span> : null}
        {sub ? <span className="lx-worklist__sub">{sub}</span> : null}
        {moreLabel ? (
          <button type="button" className="lx-worklist__more lx-focusable" onClick={onMore}>
            {moreLabel}
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="lx-worklist__empty">{emptyText}</p>
      ) : (
        <div className="lx-worklist__items">
          {items.map((item) => (
            <div key={item.key} className="lx-worklist__row">
              <span
                className={`lx-worklist__bar lx-worklist__bar--${URGENCY_BY_TONE[tone]}`}
                aria-hidden="true"
              />

              <span className="lx-worklist__main">
                <span className="lx-worklist__name">{item.title}</span>
                <span className="lx-worklist__meta2">
                  {item.sub ? <span>{item.sub}</span> : null}
                  {item.tags?.map((tag) => (
                    <LxTag key={tag.label} variant={tag.variant}>
                      {tag.label}
                    </LxTag>
                  ))}
                  {item.agentLabel ? (
                    <span className="lx-worklist__agent">{item.agentLabel}</span>
                  ) : null}
                </span>
              </span>

              {item.value ? (
                <span
                  className={`lx-worklist__value${
                    item.valueTone && item.valueTone !== 'default'
                      ? ` lx-worklist__value--${item.valueTone}`
                      : ''
                  }`}
                >
                  {item.value}
                </span>
              ) : null}

              <button
                type="button"
                className={`lx-worklist__action${item.actionPrimary ? ' lx-worklist__action--primary' : ''} lx-focusable`}
                onClick={item.onAction}
              >
                {item.actionLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
