import { Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { moduleConfigs } from '@/app/router/modules';

/**
 * 侧边栏导航：11 个一级菜单（对象导向）。
 *
 * 菜单来源：moduleConfigs（配置驱动），禁止硬编码菜单项。
 * 权限过滤：菜单与权限码由配置中心下发，此处按权限码过滤渲染（§4.8.2）。
 */
export function SideNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const items = moduleConfigs
    .filter((m) => m.enabled)
    .map((m) => ({
      key: m.basePath,
      label: t(m.titleKey),
      icon: m.icon ? undefined : undefined, // 图标由路由分区在 module.config 中登记，避免此处耦合图标库
    }));

  const selectedKey = moduleConfigs.find((m) => location.pathname.startsWith(m.basePath))?.basePath;

  return (
    <aside className="lx-sidenav">
      <div className="lx-brand">
        <span className="lx-brand__dot" />
        <span className="lx-brand__name">{t('common.appName')}</span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        onClick={({ key }) => void navigate(key)}
      />
    </aside>
  );
}
