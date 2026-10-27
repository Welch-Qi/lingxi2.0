import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { configureHttp, get } from '@lingxi/request';
import { PermissionContext } from '@lingxi/ui';
import { PREVIEW_TENANT, isStaticPreview } from '@/app/providers/previewSession';
import { useActingIdentity } from '@/app/providers/useActingIdentity';

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

/**
 * 数据权限范围（技术规约2.0 §4.8.2）。
 *
 * 五档由平台统一定义，**各模块不得自定义** —— 口径一旦分叉，
 * 「这个角色能看到哪些行」就没法跨模块比较，审计也失去统一口径。
 *
 * 为什么范围是「用户级」而不是「角色级」：
 * 同部门的两个人看得到的东西通常不同（主管看全组、专员只看自己跟进的），
 * 把范围写死在角色上，就只能按角色切人，组织一动就得重配角色。
 * 角色侧保留一个**默认值**（新建用户时的缺省范围），最终值以用户上的为准。
 */
export type DataScope = 'SELF' | 'DEPT' | 'DEPT_AND_SUB' | 'CUSTOM' | 'ALL';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  roles: readonly string[];
  /** 所属部门 key（SELF / DEPT / DEPT_AND_SUB 三档的判据） */
  deptKey?: string;
  /** 数据权限范围；缺省视为 ALL（登录即可看全部，与后端未下发范围时的历史行为一致） */
  dataScope?: DataScope;
  /** CUSTOM 档下被授权的部门 key 集合；其余档为空数组 */
  scopeDeptKeys?: readonly string[];
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

  /* ------------------------------------------------------------------
   * 静态预览态：身份与权限改为**从配置中心派生**（2026-10-06）。
   *
   * 此前这里是一组写死的 PREVIEW_* 常量，与配置中心毫无关系 —— 于是
   * 「权限管理」页勾掉任何一条权限，侧边栏与路由守卫都不会有反应。
   * 现在预览身份取自 useActingIdentity（cc-store 派生），
   * 于是「在用户列表切视角身份」时权限与数据范围会实时跟着变。
   *
   * 为什么放在渲染期派生而不是 effect 里 setState：
   * effect 改会话 state 会多一帧延迟，且 StrictMode 下会触发两次 setState；
   * 而这里只是"用哪一份"的判据，直接在渲染期选即可，无副作用。
   *
   * ⚠️ 仅在 isStaticPreview()（DEV + 显式开关）下生效；真实会话一律走后端下发。
   * 接入后端后本段整段删除（连同 useActingIdentity 对 cc-store 的依赖一起）。
   * ------------------------------------------------------------------ */
  const acting = useActingIdentity();
  const previewIdentity = isStaticPreview() ? acting : null;

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
        // 身份与权限不在这里写死 —— 走 previewIdentity（由配置中心派生，见上方注释），
        // 这样在用户列表切「视角身份」时无需重挂会话就能看到权限实时变化。
        if (isStaticPreview()) {
          setUser(previewIdentity?.user ?? null);
          setTenant(PREVIEW_TENANT);
          setPermissions(previewIdentity?.perms ?? []);
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
    /* previewIdentity 在依赖里：切「视角身份」时 bootstrap 不重跑（它只在挂载时跑一次），
       但下面的 activePermissions / activeUser 会立刻跟着变，效果与重跑等价。 */
  }, [manager, loadSession, clearSession, previewIdentity]);

  /* 生效身份与权限：预览态取配置中心派生值，真实会话取后端下发值。 */
  const activeUser = previewIdentity?.user ?? user;
  const activePermissions = previewIdentity?.perms ?? permissions;

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: activeUser, tenant, permissions: activePermissions, login, logout }),
    [status, activeUser, tenant, activePermissions, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      <PermissionContext.Provider value={activePermissions}>{children}</PermissionContext.Provider>
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
