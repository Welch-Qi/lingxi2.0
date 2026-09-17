import type { ReactNode } from 'react';
import { usePermission } from './usePermission';

/**
 * 权限包裹组件（技术规约2.0 §4.2.3）。
 *
 * 语义：<b>无权限不渲染</b>，而不是"渲染后禁用并报错"——
 * 后者会泄露功能存在性并造成误操作预期。
 */
export function LxPermission({
  code,
  fallback = null,
  children,
}: {
  code: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { has } = usePermission();
  return has(code) ? <>{children}</> : <>{fallback}</>;
}
