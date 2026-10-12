import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ClusterOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { LxActionBar, LxNavGrid, LxSectionHeader } from '@lingxi/ui';
import type { LxNavItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 配置中心首页（/config）—— 三产品升级（元枢归口）后收窄。
 *
 * 本分区只保留"能力在元枢、界面在灵犀"里的**业务配置**：
 *   - 业务字典与配置（CC-09~12）→ /config/business
 *   - 企业公约（CC-01~04，AI 生成内容约束注入源）→ /config/charter
 *
 * ⚠️ 已迁出（不留死链）：用户 / 角色权限 / 审计 / 全球化配置 / 视角切换
 *   属元枢管理台（CC-13~18、CC-05~08），已 git mv 迁至 apps/yuanshu-console/routes/iam；
 *   对应的 cc-store / role-identity / useSyncViewingUser 作为横切基础设施仍留在本 app
 *   供 TopBar / 登录 / AuthProvider 复用，但首页不再直接消费它们。
 *
 * 文案一律走 i18n key（附录D 规则10）。
 */
export default function ConfigHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /** 灵犀侧保留的两项配置直达：业务字典 + 企业公约。 */
  const items: readonly LxNavItem[] = [
    {
      key: 'business',
      title: t('cc.business.title'),
      desc: t('cc.business.sub'),
      icon: <SettingOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/config/business'),
    },
    {
      key: 'charter',
      title: t('cc.nav.charter.title'),
      desc: t('cc.nav.charter.desc'),
      icon: <ClusterOutlined />,
      tone: 'success',
      onClick: () => void navigate('/config/charter'),
    },
  ];

  return (
    <PageContainer titleKey="cc.page.home" hideTitle>
      <LxActionBar
        primary={{
          key: 'dict',
          label: t('cc.dict.title'),
          icon: <TagsOutlined />,
          onClick: () => void navigate('/config/business'),
        }}
      />

      <section className="lx-section">
        <LxSectionHeader title={t('cc.legacy.title')} sub={t('cc.legacy.sub')} />
        <LxNavGrid items={items} />
      </section>
    </PageContainer>
  );
}
