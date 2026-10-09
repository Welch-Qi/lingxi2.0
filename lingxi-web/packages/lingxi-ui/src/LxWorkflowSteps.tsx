import type { ReactNode } from 'react';

/**
 * 工作流步骤条 LxWorkflowSteps。
 *
 * 场景来自灵犀 1.0《产品开发》页：市场趋势 → 产品开发 → 产品创意。
 * 它与常见的"线性流程步骤条"（LxStepper，表示一条流程走到第几步）不是一回事——
 * 这里每一步都是一块**可点击切换的视图**（同一批市场的不同切面），
 * 箭头表达的是三段之间的递进关系，而不是"当前进度"。
 *
 * 因此实现上刻意不复用 LxStepper：把两种语义塞进一个组件，
 * 后面就再没人分得清哪一处是"进度"、哪一处是"切换"了。
 */
export interface LxWorkflowStep {
  key: string;
  /** 步骤序号，如 "01"。属于编码而非文案，语言中立，不进 i18n。 */
  index: string;
  label: string;
  icon: ReactNode;
}

export interface LxWorkflowStepsProps {
  title: string;
  sub: string;
  icon: ReactNode;
  steps: readonly LxWorkflowStep[];
  /** 当前激活步骤的 key */
  active: string;
  onChange: (key: string) => void;
}

/** 段间箭头。内联 SVG 而非引图标库：这是组件自身的结构件，不该多一个运行时依赖。 */
function StepArrow() {
  return (
    <svg className="lx-workflow__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LxWorkflowSteps({ title, sub, icon, steps, active, onChange }: LxWorkflowStepsProps) {
  return (
    <div className="lx-glass lx-workflow">
      <div className="lx-workflow__brand">
        <span className="lx-workflow__mark">{icon}</span>
        <span className="lx-workflow__ident">
          <span className="lx-workflow__title">{title}</span>
          <span className="lx-workflow__sub">{sub}</span>
        </span>
      </div>

      <div className="lx-workflow__steps" role="tablist" aria-label={title}>
        {steps.map((step, index) => {
          const isActive = step.key === active;
          return (
            <span key={step.key} className="lx-workflow__slot">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`lx-workflow__step${isActive ? ' is-active' : ''} lx-focusable`}
                onClick={() => onChange(step.key)}
              >
                {step.icon}
                <span>
                  {step.index} {step.label}
                </span>
              </button>
              {index < steps.length - 1 ? <StepArrow /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
