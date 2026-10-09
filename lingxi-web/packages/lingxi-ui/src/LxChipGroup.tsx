/**
 * 胶囊筛选组 LxChipGroup。
 *
 * 场景来自 1.0《产品开发》页的商品类别筛选。与 AntD 的 Segmented / Radio.Group 的差别：
 *   · 选项数量不固定（这里是 5 个品类，后端可配），需要能自动换行；
 *   · 它是**筛选器**而不是表单控件——不参与表单校验、不需要 name/value 语义，
 *     选中的意义是"立即改变下方内容"，故不引入受控表单的那套 props。
 * 这类"一排可换行的轻量切换"在 2.0 里还有多处（时间范围、市场范围），
 * 做成共用组件避免每页各写一遍按钮组。
 */
export interface LxChipOption {
  key: string;
  label: string;
}

export interface LxChipGroupProps {
  /** 组标签，如"商品类别"；不传则只渲染胶囊 */
  label?: string | undefined;
  options: readonly LxChipOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string | undefined;
}

export function LxChipGroup({ label, options, value, onChange, ariaLabel }: LxChipGroupProps) {
  return (
    <div className="lx-chips" role="group" aria-label={ariaLabel ?? label}>
      {label ? <span className="lx-chips__label">{label}</span> : null}
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={isActive}
            className={`lx-chip${isActive ? ' is-active' : ''} lx-focusable`}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
