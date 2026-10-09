import { Table } from 'antd';
import type { TableProps } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * 全站列表页强制使用的表格组件（技术规约2.0 §4.2.3）。
 *
 * 为什么强制统一：分页、空态、错误态、权限列渲染若各写一套，
 * 会出现 20 种列表体验；统一后可一次性满足可访问性、i18n 与性能优化。
 *
 * 约定：
 *  - 分页参数使用 pageNo（从 1 起）/ pageSize（默认 20，最大 200）
 *  - 金额列必须用 render 走 formatMoney（禁止直接展示浮点）
 */
export interface LxTableProps<T> extends Omit<TableProps<T>, 'pagination'> {
  total?: number;
  pageNo?: number;
  pageSize?: number;
  onPageChange?: (pageNo: number, pageSize: number) => void;
  loading?: boolean;
  /**
   * 固定列宽 + 永不横滚（2026-09-24 新增）。
   *
   * 为什么需要它：默认的 `scroll={{ x: 'max-content' }}` 让**表格宽 = max(容器, 内容自然宽)**
   * —— 只要某一列的内容比声明宽，整表就超出容器、出现横向滚动条，而用户已多次要求
   * "不要横向滚动条"。实测（zh-CN）：商机中心十列自然宽 1123px、线索中心九列 1092px，
   * 而 1280 视口的内容区只有 998px → 两页在 ≤1366 的视口**必滚**（1440 恰好是临界点、
   * 余量为 0，侧栏一展开或浏览器缩放 >100% 就滚）。
   *
   * 开了 `fit` 之后：
   *  ① `scroll.x` 由 `'max-content'` 改成 `'100%'` —— 表格宽恒等于容器宽，**结构上不可能横向溢出**；
   *  ② `tableLayout: 'fixed'` —— 列宽只认列定义里声明的 `width`（用百分比，合计 100%），
   *     内容反过来不能再把列撑宽（这才是用户说的"每列固定宽度"）；
   *  ③ 超出列宽的内容按"截断 + 悬停看全"处理：截断由 CSS 做
   *     （见 styles/lingxi-ui.css 的 `.lx-table--fit` 块），**每个会被截断的单元格
   *     必须自己带 `title`**（AntD 的 `ellipsis.showTitle` 取的是 dataIndex 原值，
   *     对走了 render 的列会给出 key 而不是译文，故一律手写 title）。
   *
   * 代价：列宽不再是"内容要多宽就多宽"，长文本会被截断 —— 这是"不横滚"的必然交换，
   * 故调用方要把列定义里的 `width` 从 px 改成百分比（合计 100%），
   * 并把"哪些列该被截断"当成一次显式取舍来做，而不是交给内容决定。
   */
  fit?: boolean;
}

export function LxTable<T extends object>({
  total = 0,
  pageNo = 1,
  pageSize = 20,
  onPageChange,
  loading = false,
  fit = false,
  className,
  scroll,
  tableLayout,
  ...rest
}: LxTableProps<T>) {
  const { t } = useTranslation();

  /* 本仓开了 `exactOptionalPropertyTypes`，把 `undefined` **显式**赋给可选属性是类型错误
     （`className: string | undefined` 不满足 `className?: string`）。故一律用条件展开
     来"有才传"，而不是写成 `prop={a ?? undefined}`。 */
  const mergedClassName = fit ? (className ? `lx-table--fit ${className}` : 'lx-table--fit') : className;
  const layoutProps = fit
    ? { tableLayout: 'fixed' as const, scroll: { x: '100%' } }
    : { ...(tableLayout !== undefined ? { tableLayout } : {}), scroll: scroll ?? { x: 'max-content' } };

  return (
    <Table<T>
      rowKey={(record) => String((record as { id?: string | number }).id ?? '')}
      size="middle"
      loading={loading}
      locale={{ emptyText: t('common.empty') }}
      pagination={{
        current: pageNo,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100, 200],
        showTotal: (count) => t('common.totalRecords', { count }),
        onChange: (nextPage, nextSize) => onPageChange?.(nextPage, nextSize),
      }}
      /* rest 先展开，className / 布局两项随后覆盖 —— 顺序不能反，
         否则调用方传进来的 scroll / tableLayout 会把 fit 的设定盖掉。 */
      {...rest}
      {...(mergedClassName !== undefined ? { className: mergedClassName } : {})}
      {...layoutProps}
    />
  );
}
