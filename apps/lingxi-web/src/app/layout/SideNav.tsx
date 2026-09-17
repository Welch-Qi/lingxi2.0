import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  LogoutOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { menuGroups } from '@/app/router/modules';
import { renderMenuIcon } from '@/app/layout/menuIcons';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUiStore } from '@/stores/uiStore';

/**
 * 侧边栏导航（改造指引 4.1）：玻璃质感 + 三分组 + 激活态主色浅底。
 *
 * 菜单来源：menuGroups（配置驱动），禁止硬编码菜单项。
 * 分组为「业务 / 分析 / 平台」三组（产品规划说明书2.0 §5.1）。
 *
 * 铁律：菜单与权限码由配置中心下发，此处按权限码过滤渲染（§4.8.2）；
 * 无权限的菜单项不渲染，而不是渲染后置灰。
 */
export function SideNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const pendingTaskCount = useUiStore((s) => s.pendingTaskCount);

  return (
    <aside className="lx-sidenav">
      <div className="lx-sidenav__logo">
        <span className="lx-sidenav__logomark">
          <ThunderboltFilled />
        </span>
        <span>
          <span className="lx-sidenav__name">{t('common.appName')}</span>
          <span className="lx-sidenav__tagline">{t('common.appTagline')}</span>
        </span>
      </div>

      <nav aria-label={t('common.appName')}>
        {menuGroups.map((group) => (
          <div key={group.key}>
            <div className="lx-sidenav__group">{t(group.titleKey)}</div>
            {group.modules
              .filter((m) => m.enabled)
              .map((m) => {
                const active = location.pathname === m.basePath || location.pathname.startsWith(`${m.basePath}/`);
                const badge = m.badgeSource === 'pendingAgentTasks' && pendingTaskCount > 0 ? pendingTaskCount : null;
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`lx-sidenav__item lx-focusable${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => void navigate(m.basePath)}
                  >
                    <span className="lx-sidenav__icon">{renderMenuIcon(m.icon)}</span>
                    <span className="lx-sidenav__label">{t(m.titleKey)}</span>
                    {badge !== null ? <span className="lx-sidenav__badge lx-num">{badge}</span> : null}
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="lx-sidenav__foot">
        <button type="button" className="lx-sidenav__logout lx-focusable" onClick={() => void logout()}>
          <LogoutOutlined />
          {t('common.logout')}
        </button>
      </div>
    </aside>
  );
}
