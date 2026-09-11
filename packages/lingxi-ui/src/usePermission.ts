import { useCallback, useMemo } from 'react';
import { usePermissionContext } from './PermissionContext';

/**
 * 权限判断 Hook：权限码来自后端 Casbin 决策结果（上下文由应用层注入）。
 *
 * 铁律（技术规约2.0 §4.9.2）：前端权限只用于"渲染控制"，
 * 真正的权限判定在后端；前端不得据此认为操作一定成功。
 */
export function usePermission() {
  const granted = usePermissionContext();
  const set = useMemo(() => new Set(granted), [granted]);

  const has = useCallback(
    (code: string | string[]): boolean => {
      if (Array.isArray(code)) {
        return code.every((c) => set.has(c));
      }
      // 支持域级通配：拥有 'cus:*' 即视为拥有 'cus:lead:assign'
      if (set.has(code)) {
        return true;
      }
      const segments = code.split(':');
      for (let i = segments.length - 1; i > 0; i -= 1) {
        if (set.has([...segments.slice(0, i), '*'].join(':'))) {
          return true;
        }
      }
      return false;
    },
    [set],
  );

  return { has };
}
