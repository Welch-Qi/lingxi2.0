import { useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BellOutlined,
  DownOutlined,
  GlobalOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { findModuleByPath } from '@/app/router/modules';
import { useAuth } from '@/app/providers/AuthProvider';
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
  const { user, tenant, logout } = useAuth();
  const toggleTaskDrawer = useUiStore((s) => s.toggleTaskDrawer);
  const pendingTaskCount = useUiStore((s) => s.pendingTaskCount);
  const [keyword, setKeyword] = useState('');

  const current = findModuleByPath(location.pathname);

  return (
    <header className="lx-topbar">
      <div className="lx-topbar__titles">
        <span className="lx-topbar__title">{current ? t(current.titleKey) : t('common.appName')}</span>
        <span className="lx-topbar__sub">
          {current?.subtitleKey ? t(current.subtitleKey) : t('nav.subtitle.default')}
        </span>
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

        <button type="button" className="lx-chip lx-focusable" onClick={() => void logout()}>
          {user?.roles[0] ? t(user.roles[0]) : t('nav.roleFallback')}
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

        <button type="button" className="lx-iconbtn lx-focusable" aria-label={t('nav.switchLanguage')} onClick={() => void i18n.changeLanguage(i18n.language === 'en-US' ? 'zh-CN' : 'en-US')}>
          <SwapOutlined />
        </button>

        <span className="lx-avatar" aria-hidden="true">
          {user?.displayName?.[0] ?? <GlobalOutlined />}
        </span>
      </div>
    </header>
  );
}
