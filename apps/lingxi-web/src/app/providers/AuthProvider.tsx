import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { configureHttp, get } from '@lingxi/request';
import { PermissionContext } from '@lingxi/ui';

/**
 * 认证与租户上下文（技术规约2.0 §4.8.1 / §4.9.1）。
 *
 * 红线说明：认证会话属「不可自动合并」三红线之一（附录E ①），
 * 本文件任何改动必须人工 Review，禁止 AI 自主合并。
 *
 * 铁律：
 *  - 登录一律走平台统一 OIDC（Keycloak + 授权码 + PKCE），禁止自建登录接口、
 *    禁止自行解析 JWT 取权限、禁止把 token 落到 localStorage 之外的第三方存储；
 *  - 租户上下文只在此处解析并注入请求层，业务代码不得从 URL/参数取租户；
 *  - 权限码由后端接口下发（配置中心 + Casbin 决策），前端只做渲染控制。
 */

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  roles: readonly string[];
}

export interface AuthTenant {
  id: string;
  code: string;
  name: string;
  timezone: string;
  locale: string;
}

/** 登录后从平台拉取的当前会话上下文（与后端 /api/v1/platform/session 对齐） */
interface SessionPayload {
  user: AuthUser;
  tenant: AuthTenant;
  permissions: readonly string[];
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  permissions: readonly string[];
  login: (redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const OIDC_AUTHORITY = import.meta.env.VITE_OIDC_AUTHORITY ?? '';
const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID ?? 'lingxi-web';
const AFTER_LOGIN_KEY = 'lx.auth.redirect';

function createUserManager(): UserManager {
  return new UserManager({
    authority: OIDC_AUTHORITY,
    client_id: OIDC_CLIENT_ID,
    redirect_uri: `${window.location.origin}/login`,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    response_type: 'code',
    // PKCE：公共客户端不持有 secret，必须用 S256 挑战（§4.8.1）
    scope: 'openid profile email',
    automaticSilentRenew: true,
    // 会话存于 sessionStorage：关闭标签页即失效，降低共用终端泄密面
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<UserManager | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [permissions, setPermissions] = useState<readonly string[]>([]);

  if (managerRef.current === null) {
    managerRef.current = createUserManager();
  }
  const manager = managerRef.current;

  const clearSession = useCallback(() => {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    setStatus('anonymous');
  }, []);

  /** 用 OIDC token 换取平台会话上下文（用户 / 租户 / 权限码） */
  const loadSession = useCallback(async () => {
    const session = await get<SessionPayload>('/api/v1/platform/session');
    setUser(session.user);
    setTenant(session.tenant);
    setPermissions(session.permissions);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (redirectPath?: string) => {
      if (redirectPath) {
        window.sessionStorage.setItem(AFTER_LOGIN_KEY, redirectPath);
      }
      await manager.signinRedirect();
    },
    [manager],
  );

  const logout = useCallback(async () => {
    try {
      await manager.signoutRedirect();
    } finally {
      clearSession();
    }
  }, [manager, clearSession]);

  // 请求层注入：token 与租户上下文由认证态统一提供，业务代码不得自行读取
  useEffect(() => {
    configureHttp({
      getAccessToken: () => manager.getUser()?.access_token ?? null,
      getTenantId: () => tenant?.id ?? null,
      onUnauthenticated: clearSession,
    });
  }, [manager, tenant, clearSession]);

  // 启动流程：处理 OIDC 回调 → 拉取会话；无 token 则判定匿名
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
          // 回调地址即 /login，交换 token 后清掉地址栏参数（防 code 泄漏进历史记录）
          await manager.signinRedirectCallback();
          window.history.replaceState({}, document.title, '/login');
        }
        const current: User | null = await manager.getUser();
        if (cancelled) {
          return;
        }
        if (!current || current.expired) {
          clearSession();
          return;
        }
        await loadSession();
      } catch {
        // 会话获取失败一律视为未登录；错误详情由错误边界与 traceId 承载
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void bootstrap();

    const onUserLoaded = () => {
      void loadSession().catch(() => clearSession());
    };
    const onUserUnloaded = () => clearSession();
    manager.events.addUserLoaded(onUserLoaded);
    manager.events.addUserUnloaded(onUserUnloaded);
    manager.events.addAccessTokenExpired(onUserUnloaded);

    return () => {
      cancelled = true;
      manager.events.removeUserLoaded(onUserLoaded);
      manager.events.removeUserUnloaded(onUserUnloaded);
      manager.events.removeAccessTokenExpired(onUserUnloaded);
    };
  }, [manager, loadSession, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, tenant, permissions, login, logout }),
    [status, user, tenant, permissions, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  }
  return ctx;
}

/** 取登录前保存的目标地址（登录后跳回，只带路径不带业务对象） */
export function consumeRedirectPath(): string | null {
  const path = window.sessionStorage.getItem(AFTER_LOGIN_KEY);
  if (path) {
    window.sessionStorage.removeItem(AFTER_LOGIN_KEY);
  }
  return path;
}
