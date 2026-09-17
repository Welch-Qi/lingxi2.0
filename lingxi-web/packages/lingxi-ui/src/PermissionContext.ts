import { createContext, useContext } from 'react';

/** 已授予的权限码集合（由应用层在登录后从配置中心拉取并注入）。 */
export const PermissionContext = createContext<readonly string[]>([]);

export function usePermissionContext(): readonly string[] {
  return useContext(PermissionContext);
}
