import type { ReactNode } from 'react';

/**
 * 阶段看板 LxStageBoard —— 业务对象在流程上的分布。
 *
 * 用途与适用模块：商机阶段（商机中心）、OTD 交付节点（订单交付）。
 * 这两个模块的典型用户（客户销售服务总监 / 渠道运营总监）打开页面的第一问
 * 都是"卡在哪一段"，而不是"总量是多少"——阶段分布是唯一能直接回答这个问题的视图。
 *
 * 为什么不用普通柱状图：阶段是有序的且各段口径相同（同一批对象的相邻状态），
 * 横向分段比柱状图更能表达"流转"语义；且分段卡内可以直接放金额/占比，
 * 柱状图放不下这些文字信息。
 *
 * 色彩边界：段底色只用主色系浅底 + 中性底色，不用红绿——因为"某一阶段数量多"
 * 本身不是好坏，只有配合业务口径（如"延期"）才有褒贬；需要表达异常时由
 * 调用方把该段 tone 设为 danger。
 *
 * 2026-09-24 起支持**可点筛选**（传 `onSelect`）：原来看板回答"每段多少"、
 * 下方另有一条分段条回答"看哪一段"，同一件事两个控件，改完只剩一处 ——
 * 卡片本身就是分段控件，点一下即筛下方列表。
 */
export type LxStageTone = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'danger';

export interface LxStage {
  key: string;
  label: string;
  /** 主数值：该阶段的对象数 */
  count: number;
  /** 附加口径：金额、占比、平均停留天数 */
  value?: string | undefined;
  tone?: LxStageTone | undefined;
}

export interface LxStageBoardProps {
  stages: readonly LxStage[];
  /**
   * 底部口径说明。阶段定义是租户可配置的，写不清口径数字就会被当成算错；
   * 但口径已经稳定、或调用方在别处交代过的，可以不传 —— 此时整条 footer 不渲染。
   */
  caption?: string | undefined;
  /** 底部口径行里的附加动作（与 `caption` 同排） */
  action?: ReactNode | undefined;
  /**
   * 与阶段卡**同一行、最右侧**的附加动作（商机中心 2026-09-25：高级筛选开关）。
   *
   * 和 `action` 的分工：`action` 落在底部口径行，适合与 `caption` 成对出现；
   * `inlineAction` 与卡片同排 —— 用在"这条阶段线上还有别的维度要筛"的场合，
   * 它必须与卡片在视觉上属于**同一根线**，掉到下面一行就会被读成独立的一段。
   */
  inlineAction?: ReactNode | undefined;
  /** 当前选中的段键（配合 `onSelect` 只作选中态；不传表示无选中） */
  activeKey?: string | undefined;
  /** 传了即为**可点筛选**：卡片渲染成 button，点击回调该段 key */
  onSelect?: ((key: string) => void) | undefined;
}

export function LxStageBoard({
  stages,
  caption,
  action,
  inlineAction,
  activeKey,
  onSelect,
}: LxStageBoardProps) {
  return (
    <section className="lx-glass lx-stageboard">
      {/* 卡片行与行尾动作包一层：`inlineAction` 需要与卡片同排，
          而卡片本身是 `grid + overflow-x: auto`（窄容器里横滚），
          两者只能靠外层 flex 并列，不能塞进同一个 grid。 */}
      <div className="lx-stageboard__row">
        <div className="lx-stageboard__flow">
          {stages.map((stage) => {
            const toneClass = stage.tone && stage.tone !== 'default' ? ` lx-stage--${stage.tone}` : '';
            const body = (
              <>
                {/* 标签在窄容器里会被省略号截断（英文态尤其明显）。卡片是可点筛选控件，
                    名字被截就等于控件没名字，故用 title 兜一个完整读法。 */}
                <span className="lx-stage__label" title={stage.label}>{stage.label}</span>
                <span className="lx-stage__count">{stage.count}</span>
                {stage.value ? <span className="lx-stage__value">{stage.value}</span> : null}
              </>
            );

            if (!onSelect) {
              return (
                <div key={stage.key} className={`lx-stage${toneClass}`}>
                  {body}
                </div>
              );
            }

            // 可点时才染选中态：不可点的看板上传 activeKey 是没有意义的
            const active = stage.key === activeKey;
            return (
              <button
                key={stage.key}
                type="button"
                className={`lx-stage lx-stage--button${toneClass}${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => onSelect(stage.key)}
              >
                {body}
              </button>
            );
          })}
        </div>
        {inlineAction ? <div className="lx-stageboard__aside">{inlineAction}</div> : null}
      </div>
      {caption || action ? (
        <footer className="lx-stageboard__foot">
          {caption ? <span className="lx-stageboard__caption">{caption}</span> : null}
          {action}
        </footer>
      ) : null}
    </section>
  );
}
