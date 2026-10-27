import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  LogoutOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { usePermission } from '@lingxi/ui';
import { menuGroups, moduleVisibleByPerm } from '@/app/router/modules';
import { renderMenuIcon } from '@/app/layout/menuIcons';
import { useSignOut } from '@/app/providers/useSignOut';
import { useUiStore } from '@/stores/uiStore';

/**
 * 侧边栏导航（改造指引 4.1）：玻璃质感 + 三分组 + 激活态主色浅底。
 *
 * 菜单来源：menuGroups（配置驱动），禁止硬编码菜单项。
 * 分组为「业务 / 分析 / 平台」三组（产品规划说明书 V2.1 §6.1）。
 *
 * 铁律：菜单与权限码由配置中心下发，此处按权限码过滤渲染（§4.8.2）；
 * 无权限的菜单项不渲染，而不是渲染后置灰。
 *
 * 2026-10-06 接线：此前本文件只按 `enabled` 过滤，`permCode` 从未参与，
 * 于是「权限管理」页勾掉一个域，侧边栏纹丝不动。现改为按**分区首页路由的 permCode** 过滤
 * （与 `moduleVisibleByPerm` 同源，判断逻辑只有一处）。
 *
 * 为什么用「首页 permCode」而不是「该分区任意一条路由有权限」：
 * 菜单是一级入口，用户点它必然落在分区首页。若按「任一子路由有权限」判定，
 * 一个只被授予 `/customer/lead` 子页权限的人会看到「客户中心」菜单，
 * 点进去却撞 403 —— 那比不显示这个菜单更糟。
 *
 * 分组整体为空时（一个域都没授权）**保留分组标题**：
 * 直接留一个孤零零的标题会让用户以为导航坏了，给一条空态说明更有用。
 */
export function SideNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = useSignOut();
  const { has } = usePermission();
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
        {menuGroups.map((group) => {
          const visible = group.modules.filter((m) => m.enabled && moduleVisibleByPerm(has, m));
          if (visible.length === 0) return null;
          return (
            <div key={group.key}>
              <div className="lx-sidenav__group">{t(group.titleKey)}</div>
              {visible.map((m) => {
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
          );
        })}
      </nav>

      <div className="lx-sidenav__foot">
        <button type="button" className="lx-sidenav__logout lx-focusable" onClick={signOut}>
          <LogoutOutlined />
          {t('common.logout')}
        </button>
      </div>
    </aside>
  );
}
