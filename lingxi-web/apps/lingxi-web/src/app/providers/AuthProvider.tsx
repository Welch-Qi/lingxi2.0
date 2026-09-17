import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { configureHttp, get } from '@lingxi/request';
import { PermissionContext } from '@lingxi/ui';
import { PREVIEW_PERMISSIONS, PREVIEW_TENANT, PREVIEW_USER, isStaticPreview } from '@/app/providers/previewSession';

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
  // 访问令牌缓存：请求拦截器是同步 API（§4.3.3），而 oidc-client-ts 的 getUser()
  // 返回 Promise，故在认证态这里统一缓存令牌，供请求层同步读取。
  // 令牌只存在于内存（不落 localStorage），刷新页面即失效，由静默续期重建。
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [permissions, setPermissions] = useState<readonly string[]>([]);

  if (managerRef.current === null) {
    managerRef.current = createUserManager();
  }
  const manager = managerRef.current;

  const clearSession = useCallback(() => {
    tokenRef.current = null;
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
      getAccessToken: () => tokenRef.current,
      getTenantId: () => tenant?.id ?? null,
      onUnauthenticated: clearSession,
    });
  }, [tenant, clearSession]);

  // 启动流程：处理 OIDC 回调 → 拉取会话；无 token 则判定匿名
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // 静态骨架预览：后端与 Keycloak 就绪前放开闸门，仅供本地自检页面（DEV 专有，见 previewSession.ts）
        if (isStaticPreview()) {
          setUser(PREVIEW_USER);
          setTenant(PREVIEW_TENANT);
          setPermissions(PREVIEW_PERMISSIONS);
          setStatus('authenticated');
          return;
        }
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
        tokenRef.current = current.access_token;
        await loadSession();
      } catch {
        // 会话获取失败一律视为未登录；错误详情由错误边界与 traceId 承载
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void bootstrap();

    const onUserLoaded = (loaded: User) => {
      tokenRef.current = loaded.access_token;
      void loadSession().catch(() => clearSession());
    };
    const onUserUnloaded = () => {
      tokenRef.current = null;
      clearSession();
    };
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
    // 面向开发者的不变式报错，不是用户可见文案：用英文，避免污染语言包（附录D 规则10）
    throw new Error('useAuth must be used inside <AuthProvider>');
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
