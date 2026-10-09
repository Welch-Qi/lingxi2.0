import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  BankOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { consumeRedirectPath, useAuth } from '@/app/providers/AuthProvider';
import { DEFAULT_ROLE, ROLES, type RoleKey } from '@/app/providers/roles';
import { isStaticPreview } from '@/app/providers/previewSession';
import { useSyncViewingUser } from '@/routes/config/useSyncViewingUser';
import { useCcStore } from '@/routes/config/cc-store';
import { roleKeyForUser, userForRole } from '@/routes/config/role-identity';
import '@/styles/login.css';

/**
 * 登录分区（/login）—— 复刻 1.0 登录页（2026-09-27）。
 *
 * 布局与交互来自 1.0 的 login-page.tsx：左侧品牌区（标语 + 三个业务信号数据点）、
 * 右侧登录卡（安全工作区徽章 + 企业空间 + 角色选择 + 一键进入）。
 * 视觉体系复用工作区选择页的 `.lx-select__*`（两页本就同构）。
 *
 * 角色清单沿用 2.0 产品基线（CEO + 四大总监，见 workspace-select），
 * 不采用 1.0 的"智能体架构师"——该角色未进入 V2.1 基线。
 *
 * 「进入工作台」在两种形态下**落地的位置不同**，因为「登录完成」与「选定角色」是两件事：
 *  - 真实 OIDC：认证由平台完成，登录后跳回 `target`（登录前想去的那一页）；
 *  - 静态预览（VITE_LX_STATIC_PREVIEW=true，DEV 专有）：本页是演示入口，
 *    先把所选岗位同步到视角身份，再跳 `target`。
 *
 * **本页自己就渲染了全套角色卡**（`ROLES` 的 `lx-select__roles`），所以登录 + 选岗在
 * 这一屏内一次完成。曾有一版这里再跳一层 `/workspace-select`，理由是"角色选择是登录后
 * 第一屏"，但那会让**两个都叫「进入工作台」的按钮前后相连** —— 用户报"要点两次才生效"。
 * 那不是按钮失灵，是按钮名撒谎：`/workspace-select` 现在只是顶栏「切换角色」的落点。
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, login } = useAuth();
  const users = useCcStore((state) => state.users);
  const syncViewingUser = useSyncViewingUser();
  const [params] = useSearchParams();
  const [ssoFailed, setSsoFailed] = useState(false);
  /* 默认选中项跟随**当前视角身份**，而不是恒为DEFAULT_ROLE。
   *
   * 否则会出现「进登录页看到勾着 CEO，但系统正以周瑜视角运行」的自相矛盾状态 ——
   * 而用户正是被这类不一致绕晕的（他看到的角色与实际身份对不上）。
   * 视角用户持多角色时 roleKeyForUser 返回首个命中，仍匹配不上则落回 DEFAULT_ROLE。 */
  const [role, setRoleKey] = useState<RoleKey>(
    () => roleKeyForUser(users.find((u) => u.id === useCcStore.getState().viewingUserId)) ?? DEFAULT_ROLE,
  );
  // 惰性初始化：consumeRedirectPath 有副作用（读取即清除），不能放在渲染表达式中
  const [fallbackTarget] = useState(() => consumeRedirectPath() ?? '/workbench');

  const preview = isStaticPreview();
  const redirectFromQuery = params.get('redirect');
  const target = redirectFromQuery ? decodeURIComponent(redirectFromQuery) : fallbackTarget;

  const enter = () => {
    if (preview) {
      /* 选岗位 → 落到持有该岗位角色的账号上（2026-10-07）。
       *
       * 不做这一步的话，选角色对实际身份毫无影响：顶栏用户 / 侧边栏菜单 / 路由守卫 /
       * 数据范围全都读 cc-store 的 `viewingUserId`，而它此刻还留着上一次「以此身份查看」
       * 或上一次登录选的值 —— 于是「切换角色还是这个用户」。
       *
       * 走共享 hook 而不是裸 setViewingUser：它会一并同步顶栏角色胶囊，
       * 否则会出现「用户名换了、角色还是上一个」的分裂状态。
       * 匹配不到（自定义了角色、或该岗位无人启用）时**不切**：保留当前视角，
       * 好过悄悄换成列表第一个人 —— 那是"配错"表现为"莫名成了别人"。 */
      const actingUser = userForRole(role, users);
      if (actingUser) syncViewingUser(actingUser.id);
      /* 直接进工作台，**不经过 `/workspace-select`**（2026-10-07 第十九轮修正）。
       *
       * 此前这里跳 `/workspace-select`，理由是"角色选择是登录之后的第一屏"。
       * 那是个错误判断：**本页自己就渲染了 `ROLES` 全套角色卡**（上面 `lx-select__roles`），
       * 岗位已经选完并写进 store 了，再让用户去第二屏点一次同样的按钮毫无信息增量。
       *
       * 症状就是用户报的"要点两次"：两个按钮都叫「进入工作台」，
       * 第一个点完落到一个长得几乎一样的页面上，用户合理地以为没点上、于是再点一次。
       * 按钮名承诺"进工作台"就必须真进工作台 —— 标签撒谎比多点一次更糟。
       *
       * `/workspace-select` 并未删除：它仍是顶栏「切换角色」的落点（`TopBar.tsx`），
       * 那条路径上确实需要一屏来重选。 */
      void navigate(target);
      return;
    }
    void login(target).catch(() => setSsoFailed(true));
  };

  // 真实 OIDC 模式下已登录 → 直接跳回目标页。
  // 静态预览的会话是演示假会话，本页就是演示入口，不跳转。
  if (status === 'authenticated' && !preview) {
    return <Navigate to={target} replace />;
  }

  if (status === 'loading' && !preview) {
    return (
      <div className="lx-login">
        <Spin size="large" tip={t('login.verifying')} />
      </div>
    );
  }

  if (ssoFailed) {
    return (
      <div className="lx-login">
        <Result
          status="warning"
          title={t('login.ssoUnavailableTitle')}
          subTitle={t('login.ssoUnavailableHint')}
          extra={
            <Button type="primary" onClick={() => void login(target)}>
              {t('login.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="lx-aurora" aria-hidden="true" />
      <div className="lx-select">
        <section className="lx-select__brand">
          <div className="lx-select__brand-inner">
            <div className="lx-select__logo">
              <span className="lx-select__logo-mark">
                <ThunderboltFilled />
              </span>
              <span className="lx-select__logo-text">{t('common.appName')}</span>
            </div>

            <div className="lx-select__eyebrow">{t('login.brand.badge')}</div>
            <h1 className="lx-select__h1">
              {t('login.brand.headlineLine1')}
              <br />
              <em>{t('login.brand.headlineEm')}</em>
              {t('login.brand.headlineLine2')}
            </h1>
            <p className="lx-select__lead">{t('login.brand.lead')}</p>

            <div className="lx-select__stats">
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">24/7</div>
                <div className="lx-select__stat-label">{t('login.brand.stat1')}</div>
              </div>
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">36</div>
                <div className="lx-select__stat-label">{t('login.brand.stat2')}</div>
              </div>
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">1,284</div>
                <div className="lx-select__stat-label">{t('login.brand.stat3')}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="lx-select__panel">
          <div className="lx-select__card">
            <span className="lx-select__badge">
              <SafetyCertificateOutlined />
              {t('ws.secureWorkspace')}
            </span>

            <div>
              <div className="lx-select__heading">{t('login.welcomeTitle')}</div>
              <div className="lx-select__sub">{t('login.welcomeSub')}</div>
            </div>

            <div className="lx-select__fieldlabel">{t('ws.tenantLabel')}</div>
            <div className="lx-select__tenant is-selected">
              <span className="lx-select__tenant-icon">
                <BankOutlined />
              </span>
              <span>
                <span className="lx-select__tenant-name">{t('ws.tenantName')}</span>
                <span className="lx-select__tenant-meta lx-num">{t('ws.tenantMeta')}</span>
              </span>
              <span className="lx-select__check" aria-hidden="true">
                <CheckOutlined />
              </span>
            </div>

            <div className="lx-select__fieldlabel">{t('ws.roleLabel')}</div>
            <div className="lx-select__roles" role="radiogroup" aria-label={t('ws.roleLabel')}>
              {ROLES.map((item, index) => {
                const selected = role === item.key;
                const wide = index === ROLES.length - 1;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`lx-select__role lx-focusable${wide ? ' lx-select__role--wide' : ''}${selected ? ' is-selected' : ''}`}
                    onClick={() => setRoleKey(item.key)}
                  >
                    {selected ? (
                      <span className="lx-select__check" aria-hidden="true">
                        <CheckOutlined />
                      </span>
                    ) : null}
                    <span className={`lx-select__role-icon lx-select__role-icon--${item.tone}`}>
                      {item.icon}
                    </span>
                    <span>
                      <span className="lx-select__role-name">{t(item.titleKey)}</span>
                      <span className="lx-select__role-desc">{t(item.descKey)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="lx-select__actions">
              <button type="button" className="lx-select__btn lx-focusable" onClick={enter}>
                {t('ws.enterAction')}
              </button>
            </div>

            <div className="lx-select__sub">{t('ws.footNote')}</div>
          </div>
        </section>
      </div>
    </>
  );
}
