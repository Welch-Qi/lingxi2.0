import type { ReactNode } from 'react';

/**
 * 智能体卡片 LxAgentCard（改造指引 4.4）。
 *
 * 设计意图：让"硅基员工"与人类员工在同一界面里被同样地管理——
 * 名称、职责、等级、当前任务、进度、产出统计一眼可见（产品规划说明书 2.9）。
 *
 * busy 态（有任务在跑）会加主色描边 + 浅青渐变底，让"在线值守"可被感知。
 */
export type LxAgentTone = 'sage' | 'atlas' | 'muse' | 'echo';
export type LxAgentGrade = 'gold' | 'silver' | 'bronze';
export type LxProgressTone = 'default' | 'good' | 'warn';

export interface LxAgentStat {
  label: string;
  value: string;
}

export interface LxAgentCardProps {
  name: string;
  role: string;
  icon: ReactNode;
  tone: LxAgentTone;
  grade: LxAgentGrade;
  gradeLabel: string;
  task: string;
  progress: number;
  progressTone?: LxProgressTone | undefined;
  stats?: readonly LxAgentStat[] | undefined;
  busy?: boolean | undefined;
  /**
   * 智能体形象图。传入后以圆形头像呈现（沿用高保真原型的视觉意图），
   * 不传则退回 tone 渐变方块 + icon——二期未配形象的智能体不应出现空框。
   */
  avatar?: string | undefined;
  onClick?: (() => void) | undefined;
}

export function LxAgentCard({
  name,
  role,
  icon,
  tone,
  grade,
  gradeLabel,
  task,
  progress,
  progressTone = 'default',
  stats,
  busy = false,
  avatar,
  onClick,
}: LxAgentCardProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const barClass =
    progressTone === 'default' ? 'lx-agent__bar' : `lx-agent__bar lx-agent__bar--${progressTone}`;

  return (
    <button
      type="button"
      className={`lx-agent${busy ? ' is-busy' : ''} lx-focusable`}
      onClick={onClick}
      aria-busy={busy}
    >
      <span className="lx-agent__head">
        {avatar ? (
          <span className="lx-agent__avatar">
            <img src={avatar} alt="" loading="lazy" decoding="async" />
          </span>
        ) : (
          <span className={`lx-agent__icon lx-agent__icon--${tone}`}>{icon}</span>
        )}
        <span className="lx-agent__ident">
          <span className="lx-agent__name">{name}</span>
          <span className="lx-agent__role">{role}</span>
        </span>
        <span className={`lx-agent__grade lx-agent__grade--${grade}`}>{gradeLabel}</span>
      </span>
      <span className="lx-agent__task">{task}</span>
      <span className="lx-agent__progress">
        <span className={barClass}>
          <i style={{ width: `${clamped}%` }} />
        </span>
        <span className="lx-agent__pct">{clamped}%</span>
      </span>
      {stats && stats.length > 0 ? (
        <span className="lx-agent__stats">
          {stats.map((stat) => (
            <span key={stat.label}>
              {stat.label} <b>{stat.value}</b>
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
