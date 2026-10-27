import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/app/providers/AuthProvider';
import { LoadingBlock } from '@/components/LoadingBlock';

/**
 * 认证守卫（认证是可自动化红线之外的领域，见技术规约2.0 附录E ①）。
 *
 * 说明：登录态校验必须使用平台统一能力（Keycloak OIDC + PKCE），
 * 禁止自行解析 JWT、自建 session、自建登录页（§4.9.1 / §4.8.1）。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingBlock />;
  }
  if (status === 'anonymous') {
    // 保留原目标地址，登录后跳回（不携带业务对象，仅带路径）
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}
