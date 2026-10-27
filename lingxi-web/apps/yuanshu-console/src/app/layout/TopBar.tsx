import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BellOutlined,
  DownOutlined,
  GlobalOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { findModuleByPath } from '@/app/router/modules';
import { roleTitleKey } from '@/app/providers/roles';
import { useAuth } from '@/app/providers/AuthProvider';
import { useActingIdentity } from '@/app/providers/useActingIdentity';
import { useCcStore } from '@/routes/iam/cc-store';
import { roleKeyForUserById } from '@/routes/iam/role-identity';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * 顶栏（改造指引 4.2）：页面标题 + 副标题 · 全局搜索胶囊 · 租户/角色胶囊 · 通知 · 头像。
 *
 * 说明：搜索框一次检索客户/企业/商品/订单/知识（跨域检索走平台统一检索服务，§4.8.1）。
 * 当前为静态骨架，接入检索服务后由 lingxi-request 调用，禁止在组件内直调 axios。
 *
 * 顶栏 sticky 偏移必须与极光色带同高（3px），否则色带会被顶栏遮住（签名元素不可丢失）。
 */
export function TopBar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant } = useAuth();
  const roleKey = useWorkspaceStore((state) => state.roleKey);
  const acting = useActingIdentity();
  const users = useCcStore((s) => s.users);
  const toggleTaskDrawer = useUiStore((s) => s.toggleTaskDrawer);
  const pendingTaskCount = useUiStore((s) => s.pendingTaskCount);
  const [keyword, setKeyword] = useState('');

  /**
   * 角色胶囊显示的是"这次以什么角色在工作"。
   *
   * 原先这里显示 `t(user.roles[0])` —— 那是**平台会话里的角色**，与用户在
   * 「选择企业空间与角色」页选的那一个**完全无关**：演示会话下 `roles[0]` 是
   * `demo.role.owner`，界面上就一直亮着「企业负责人」，而用户明明选的是「总经理」。
   * 更糟的是这个胶囊点一下直接 logout —— 一个角色标识长得像登出入口。
   * 现在：显示工作区状态里选中的角色，点击是「切换角色」（回到 `/workspace-select`），
   * 退出登录走专门的 `useSignOut()`（侧栏底部那个「退出登录」）。
   *
   * 胶囊的岗位：会话里选过的优先，否则**从当前视角身份反推**（2026-10-07）。
   *
   * `workspaceStore.roleKey` 是**会话属性、刻意不持久化**（刷新即回到未选，
   * 这样退出登录后不会亮出上一次的角色）。但视角身份（`viewingUserId`）是持久化的，
   * 于是刷新后两者会脱节：用户名还在（视角身份），岗位却变成「未分配」。
   * 实测（截图复核）：切到渠道总监后按 F5，胶囊从「渠道总监」变回「未分配角色」。
   *
   * 两者本就该一致 —— 视角身份决定用户是谁，岗位就是这个身份的岗位。
   * 反推不出（如审计员/访客持的角色不属于任何岗位）时仍显示「未分配」，
   * 不塞回 DEFAULT_ROLE：那会显示一个假的岗位，比"未分配"危险得多。
   */
  const effectiveRoleKey = roleKey ?? roleKeyForUserById(acting?.userId ?? null, users);
  const roleLabel = effectiveRoleKey ? t(roleTitleKey(effectiveRoleKey)) : t('nav.roleFallback');

  const current = findModuleByPath(location.pathname);

  return (
    <header className="lx-topbar">
      <div className="lx-topbar__titles">
        <span className="lx-topbar__title">{current ? t(current.titleKey) : t('common.appName')}</span>
      </div>

      <label className="lx-search">
        <span className="lx-search__icon">
          <SearchOutlined />
        </span>
        <input
          className="lx-search__input"
          type="search"
          value={keyword}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </label>

      <div className="lx-topbar__tools">
        <button type="button" className="lx-chip lx-focusable" title={t('nav.tenantTitle')}>
          <span className="lx-pulse-dot" aria-hidden="true" />
          <span className="lx-num">{tenant?.name ?? t('nav.tenantFallback')}</span>
        </button>

        <button
          type="button"
          className="lx-chip lx-focusable"
          title={t('nav.switchRole')}
          aria-label={t('nav.switchRole')}
          onClick={() => void navigate('/workspace-select')}
        >
          {roleLabel}
          <DownOutlined className="lx-chip__caret" />
        </button>

        <button
          type="button"
          className="lx-iconbtn lx-focusable"
          aria-label={t('agent.taskCenter')}
          onClick={toggleTaskDrawer}
        >
          <BellOutlined />
          {pendingTaskCount > 0 ? <span className="lx-iconbtn__dot" aria-hidden="true" /> : null}
        </button>

        {/*
          语言切换：必须**一眼可辨**。
          原来是一个 SwapOutlined（左右箭头）纯图标按钮——语义与语言无关、没有 tooltip、
          没有当前语言标识，和旁边的铃铛/头像长得一模一样。后果不是"不好看"：
          用户一旦点中它，偏好就写进 localStorage 并被 detectLocale 永久优先，
          而他在界面上找不到任何能切回来的入口，只能认定"系统变成英文且改不回去"。
          现在用地球图标（语言/地区通用标识）+ 当前语言自称，并把解释放进 title。
          自称走 i18n（zh 显示「中文」、en 显示「English」），不硬编码——规则 10。
        */}
        <button
          type="button"
          className="lx-chip lx-chip--lang lx-focusable"
          title={t('nav.switchLanguage')}
          aria-label={t('nav.switchLanguage')}
          onClick={() =>
            void i18n.changeLanguage(i18n.language === 'en-US' ? 'zh-CN' : 'en-US')
          }
        >
          <GlobalOutlined />
          {t('nav.lang.name')}
        </button>

        <span className="lx-avatar" aria-hidden="true">
          {user?.displayName?.[0] ?? <GlobalOutlined />}
        </span>
      </div>
    </header>
  );
}
