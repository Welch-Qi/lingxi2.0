import type { ReactNode } from 'react';

/**
 * 列表卡容器 LxTableCard（改造指引 4.6）。
 *
 * 为什么把"工具条 + 表格"包成一体：全站列表页的搜索、筛选、分页若各写一套，
 * 会出现十几种列表体验（技术规约2.0 §4.2.3）；统一容器后，
 * 搜索/筛选/空态的外观与行为只需维护一处。
 */
export function LxTableCard({
  tools,
  children,
}: {
  tools?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section className="lx-glass lx-tablecard">
      {tools ? <div className="lx-tablecard__tools">{tools}</div> : null}
      {children}
    </section>
  );
}

/** 工具条搜索框：与顶栏搜索同款胶囊样式，聚焦时主色描边。 */
export function LxSearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label className="lx-tablecard__search">
      <input
        type="search"
        value={value}
        placeholder={placeholder ?? ''}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/** 工具条筛选胶囊。 */
export function LxFilterButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: (() => void) | undefined;
}) {
  return (
    <button type="button" className="lx-filter lx-focusable" onClick={onClick}>
      {label}
      <span aria-hidden="true">▾</span>
    </button>
  );
}
