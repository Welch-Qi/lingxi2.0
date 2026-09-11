import { Avatar, Badge, Dropdown, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUiStore } from '@/stores/uiStore';

/**
 * 顶部栏：全局搜索、智能体任务入口、语言切换、用户菜单。
 *
 * 说明：搜索框一次检索客户/企业/商品/订单/知识（跨域检索走平台统一检索服务，§4.8.1）。
 */
export function TopBar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { toggleTaskDrawer, pendingTaskCount } = useUiStore();

  return (
    <header className="lx-topbar">
      <Space size="middle">
        <Badge count={pendingTaskCount} size="small">
          <button type="button" className="lx-icon-btn" onClick={toggleTaskDrawer}>
            {t('agent.taskCenter')}
          </button>
        </Badge>
      </Space>
      <Space size="middle">
        <button
          type="button"
          className="lx-icon-btn"
          onClick={() => void i18n.changeLanguage(i18n.language === 'en-US' ? 'zh-CN' : 'en-US')}
        >
          {i18n.language === 'en-US' ? '中' : 'EN'}
        </button>
        <Dropdown
          menu={{
            items: [
              { key: 'profile', label: t('common.profile') },
              { key: 'logout', label: t('common.logout'), onClick: () => void logout() },
            ],
          }}
        >
          <Avatar size="small">{user?.displayName?.[0] ?? 'L'}</Avatar>
        </Dropdown>
      </Space>
    </header>
  );
}
