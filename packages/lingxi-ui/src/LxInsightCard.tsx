import type { ReactNode } from 'react';
import type { LxAgentTone } from './LxAgentCard';

/**
 * 决策卡 / 今日要点 LxInsightCard（改造指引 4.5）。
 *
 * 设计意图：智能体的产出必须"送达"而不是留在对话流里等人去问。
 * 每张卡都标注类型与来源（哪个智能体、什么时候发现），
 * 让用户能判断这条洞察该不该信、要不要立刻行动。
 */
export type LxInsightAccent = 'accent' | 'success' | 'primary';

export interface LxInsightCardProps {
  /** 类型标签，如"市场预警 · 德国" */
  type: string;
  /** 洞察正文 */
  text: string;
  accent?: LxInsightAccent | undefined;
  /** 来源图标（通常取智能体首字母或图标） */
  icon?: ReactNode | undefined;
  tone?: LxAgentTone | undefined;
  /** 来源标注，如"Atlas 于 2 小时前发现" */
  source: string;
  onClick?: (() => void) | undefined;
}

export function LxInsightCard({
  type,
  text,
  accent = 'accent',
  icon,
  tone = 'atlas',
  source,
  onClick,
}: LxInsightCardProps) {
  return (
    <button
      type="button"
      className={`lx-glass lx-insight lx-insight--${accent} lx-hoverable lx-focusable`}
      onClick={onClick}
    >
      <span className="lx-insight__type">{type}</span>
      <span className="lx-insight__text">{text}</span>
      <span className="lx-insight__foot">
        <span className={`lx-insight__avatar lx-insight__avatar--${tone}`}>{icon}</span>
        <span className="lx-insight__source">{source}</span>
      </span>
    </button>
  );
}
