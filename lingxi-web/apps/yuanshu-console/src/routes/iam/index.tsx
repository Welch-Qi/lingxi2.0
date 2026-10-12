import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import {
  AuditOutlined,
  GlobalOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { LxActionBar, LxNavGrid, LxSectionHeader } from '@lingxi/ui';
import type { LxNavItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { PERM_DOMAINS } from '@/app/router/perm-tree';
import { useCcStore } from './cc-store';
import { useSyncViewingUser } from './useSyncViewingUser';

/**
 * IAM 首页（/iam）—— 元枢四类能力「多租户会话与权限」的管理台入口（CC-13~18、CC-05~08）。
 *
 * 本页自 lingxi-web `routes/config/index.tsx` 拆分而来（归口表：用户/角色/审计/全球化
 * 界面归属 = 元枢管理台；业务配置 CC-09~12 与企业公约 CC-01~04 界面留在灵犀）。
 *
 * 首页主体是"用户与数据权限范围"：功能权限、字段权限最终都归结为
 * "这个人在这个租户里能看到哪些行、哪些列"。
 * 数据权限范围口径统一为 SELF / DEPT / DEPT_AND_SUB / CUSTOM / ALL，
 * 由平台统一定义，各模块不得自定义（技术规约2.0 §4.8.2）。
 *
 * 「切换视角」是本页核心：权限配完之后，唯一能验证它是否真生效的办法
 * 就是换一个身份再看。真实接入后此处读元枢 SessionQueryApi（唯一身份接口，
 * 与灵犀共用同一会话，不建第二套认证）。
 */
export default function IamHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const users = useCcStore((s) => s.users);
  const roles = useCcStore((s) => s.roles);
  const viewingUserId = useCcStore((s) => s.viewingUserId);
  const syncViewingUser = useSyncViewingUser();
  const reset = useCcStore((s) => s.reset);
  const { message } = App.useApp();

  /**
   * 四个直达：各自独立，必须可达。
   * 导航与动作分开：凡是"去某个页面看看"，URL 一律不带 mode；
   * `?mode=create` 只属于顶栏动作按钮。
   */
  const pillars: readonly LxNavItem[] = [
    {
      key: 'users',
      title: t('cc.users.title'),
      desc: t('cc.users.sub'),
      icon: <TeamOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/iam/users'),
    },
    {
      key: 'permission',
      title: t('cc.pillar.permission.title'),
      desc: t('cc.pillar.permission.desc'),
      icon: <SafetyCertificateOutlined />,
      tone: 'accent',
      onClick: () => void navigate('/iam/roles'),
    },
    {
      key: 'audit',
      title: t('cc.audit.title'),
      desc: t('cc.audit.sub'),
      icon: <AuditOutlined />,
      tone: 'violet',
      onClick: () => void navigate('/iam/audit'),
    },
    {
      key: 'global',
      title: t('cc.nav.global.title'),
      desc: t('cc.nav.global.desc'),
      icon: <GlobalOutlined />,
      tone: 'secondary',
      onClick: () => void navigate('/iam/global'),
    },
  ];

  return (
    <PageContainer titleKey="ys.iam.page" hideTitle>
      <LxActionBar
        primary={{
          key: 'user',
          label: t('cc.bar.createUser'),
          icon: <PlusOutlined />,
          onClick: () => void navigate('/iam/users?mode=create'),
        }}
        items={[
          {
            key: 'role',
            label: t('cc.bar.createRole'),
            icon: <TeamOutlined />,
            onClick: () => void navigate('/iam/roles?mode=create'),
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
                void message.success(t('cc.dict.saved'));
              }}
            >
              {t('cc.dict.reset')}
            </button>
          </div>
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader title={t('cc.pillar.section')} sub={t('ys.iam.sectionSub')} />
        <LxNavGrid items={pillars} />
      </section>
    </PageContainer>
  );
}
