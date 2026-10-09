import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import {
  AuditOutlined,
  ClusterOutlined,
  GlobalOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { LxActionBar, LxNavGrid, LxSectionHeader } from '@lingxi/ui';
import type { LxNavItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { PERM_DOMAINS } from '@/app/router/perm-tree';
import { useCcStore } from './cc-store';
import { useSyncViewingUser } from './useSyncViewingUser';
import { useDictStore } from './dict-data';

/**
 * 配置中心首页（/config）—— 重构于 2026-09-29，数据感知改造于 2026-10-06。
 *
 * 四大核心功能（产品规划说明书 V2.1 §2.13）：用户管理 / 权限管理 / 业务配置 / 审计日志。
 * 首页只做「分类直达」：管理员心里已经知道要配什么，需要四类配置一键直达，
 * 而不是被统计数字、待办队列占据首屏。
 *
 * 因此移除旧版：KPI 统计网格、待处理变更队列、智能体建议、用户清单表。
 * 用户列表 / 角色权限等基础功能下放到对应子页（/config/users、/config/roles），
 * 首页只保留「新建用户 / 新建角色」两个高频动作的直达入口。
 *
 * 企业公约与全球化配置作为「其他配置」保留（旧版治理能力的延续），
 * 其余旧版模块按重构要求移除。
 *
 * ## 2026-10-06 新增：视角切换 + 真实计数
 *
 * 此前首页的两个「新建」按钮分别跳 `/config/users` 与 `/config/roles` —— 跳到的是**列表页**，
 * 不做任何新建动作，点了等于没点（列表页的「新建」按钮才是真的入口）。
 * 现在两者分别跳到**新建态**并打开编辑抽屉。
 *
 * 「切换视角」是本轮新增的核心：权限配完之后，**唯一能验证它是否真生效的办法
 * 就是换一个身份再看**。以受限身份浏览时侧边栏会实时少掉几个域，
 * 直敲被摘掉的分区会撞 403，客户列表会按该用户的数据范围被过滤。
 * 没有任何别的入口能证明"差异化管控"不是摆设。
 *
 * 文案一律走 i18n key（附录D 规则10）。
 */
export default function ConfigHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const users = useCcStore((s) => s.users);
  const roles = useCcStore((s) => s.roles);
  const viewingUserId = useCcStore((s) => s.viewingUserId);
  const syncViewingUser = useSyncViewingUser();
  const reset = useCcStore((s) => s.reset);
  const resetAllDicts = useDictStore((s) => s.resetAll);
  const { message } = App.useApp();

  /**
   * 四大核心：各自独立，必须可直达。
   *
   * 注意 `users` 这张卡是**「进入用户管理」**，不是「新建用户」——
   * 它原先也跳 `?mode=create`，于是点核心卡落地即弹出新建抽屉，
   * 而卡片标题写的是「用户管理」。用户看到的是"我只是要看列表，却被迫先填一张表单"。
   *
   * `?mode=create` 只属于**动作**（顶栏 LxActionBar 的「新建用户」主按钮）。
   * 导航与动作分开：凡是"去某个页面看看"，URL 一律不带 mode。
   */
  const pillars: readonly LxNavItem[] = [
    {
      key: 'users',
      title: t('cc.users.title'),
      desc: t('cc.users.sub'),
      icon: <TeamOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/config/users'),
    },
    {
      key: 'permission',
      title: t('cc.pillar.permission.title'),
      desc: t('cc.pillar.permission.desc'),
      icon: <SafetyCertificateOutlined />,
      tone: 'accent',
      onClick: () => void navigate('/config/roles'),
    },
    {
      key: 'business',
      title: t('cc.business.title'),
      desc: t('cc.business.sub'),
      icon: <SettingOutlined />,
      tone: 'success',
      onClick: () => void navigate('/config/business'),
    },
    {
      key: 'audit',
      title: t('cc.audit.title'),
      desc: t('cc.audit.sub'),
      icon: <AuditOutlined />,
      tone: 'violet',
      onClick: () => void navigate('/config/audit'),
    },
  ];

  /** 其他配置：旧版治理能力延续，不属于四大核心但保留直达。 */
  const legacy: readonly LxNavItem[] = [
    {
      key: 'charter',
      title: t('cc.nav.charter.title'),
      desc: t('cc.nav.charter.desc'),
      icon: <ClusterOutlined />,
      tone: 'secondary',
      onClick: () => void navigate('/config/charter'),
    },
    {
      key: 'global',
      title: t('cc.nav.global.title'),
      desc: t('cc.nav.global.desc'),
      icon: <GlobalOutlined />,
      tone: 'secondary',
      onClick: () => void navigate('/config/global'),
    },
  ];

  return (
    <PageContainer titleKey="cc.page.home" hideTitle>
      <LxActionBar
        primary={{
          key: 'user',
          label: t('cc.bar.createUser'),
          icon: <PlusOutlined />,
          onClick: () => void navigate('/config/users?mode=create'),
        }}
        items={[
          {
            key: 'role',
            label: t('cc.bar.createRole'),
            icon: <TeamOutlined />,
            onClick: () => void navigate('/config/roles?mode=create'),
          },
          {
            key: 'dict',
            label: t('cc.dict.title'),
            icon: <TagsOutlined />,
            onClick: () => void navigate('/config/business'),
          },
        ]}
      />

      {/* 视角切换：验证权限与数据范围真生效的唯一入口 */}
      <section className="lx-section">
        <LxSectionHeader title={t('cc.home.viewAs')} sub={t('cc.home.viewAsSub')} />
        <div className="lx-cc-viewswap">
          <div className="lx-cc-viewswap__list">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`lx-cc-viewswap__item lx-focusable${u.id === viewingUserId ? ' is-active' : ''}`}
                aria-pressed={u.id === viewingUserId}
                onClick={() => syncViewingUser(u.id)}
              >
                <span className="lx-cc-viewswap__name">{u.nameKey ? t(u.nameKey) : u.account}</span>
                <span className="lx-cc-viewswap__meta">
                  {t(u.deptKey)} · {t(`cc.scope.${u.scope}`)}
                </span>
              </button>
            ))}
          </div>
          <div className="lx-cc-viewswap__foot">
            <span className="lx-cc-viewswap__count lx-num">
              {t('cc.home.permDomains', { count: PERM_DOMAINS.length })}
              {' · '}
              {t('cc.roles.listSub', { count: roles.length })}
            </span>
            <button
              type="button"
              className="lx-cell-link lx-focusable"
              onClick={() => {
                reset();
                resetAllDicts();
                void message.success(t('cc.dict.saved'));
              }}
            >
              {t('cc.dict.reset')}
            </button>
          </div>
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('cc.pillar.section')} sub={t('cc.pillar.sectionSub')} />
        <LxNavGrid items={pillars} />
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('cc.legacy.title')} sub={t('cc.legacy.sub')} />
        <LxNavGrid items={legacy} />
      </section>
    </PageContainer>
  );
}
