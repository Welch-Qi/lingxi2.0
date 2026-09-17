/**
 * 步骤条 LxStepper（改造指引 4.9）。
 *
 * 用于"内容生产 → 内容分发 → 投放管理"这类同一业务对象的多阶段视图；
 * 与分区路由解耦，步骤切换由调用方决定（可切路由，也可只切视图）。
 */
export function LxStepper({
  steps,
  active,
  onChange,
}: {
  steps: readonly string[];
  active: number;
  onChange?: ((index: number) => void) | undefined;
}) {
  return (
    <nav className="lx-glass lx-stepper" aria-label="view-steps">
      {steps.map((step, index) => (
        <button
          key={step}
          type="button"
          className={`lx-stepper__item lx-focusable${index === active ? ' is-active' : ''}`}
          aria-current={index === active ? 'step' : undefined}
          onClick={() => onChange?.(index)}
        >
          <span className="lx-stepper__num">{String(index + 1).padStart(2, '0')}</span>
          <span>{step}</span>
          {index < steps.length - 1 ? (
            <span className="lx-stepper__arrow" aria-hidden="true">
              ›
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
