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
}

export function LxTable<T extends object>({
  total = 0,
  pageNo = 1,
  pageSize = 20,
  onPageChange,
  loading,
  ...rest
}: LxTableProps<T>) {
  const { t } = useTranslation();
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
      scroll={{ x: 'max-content' }}
      {...rest}
    />
  );
}
