import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BankOutlined,
  AppstoreOutlined,
  CheckOutlined,
  CrownOutlined,
  GlobalOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';

/**
 * P1 工作区选择（改造指引 5.1 / 4.12）。
 *
 * 这是登录后进入业务系统的第一屏，承担三件事：
 *  ① 安全工作区确认（登录态与合规提示）
 *  ② 企业空间选择（多租户）
 *  ③ 角色选择 —— 角色决定进入后看到的默认工作台（产品规划说明书 §5.3"默认页即当日工作"）
 *
 * 角色清单以《产品规划说明书2.0》为准：CEO + 四大总监（改造指引 1.0 的
 * "智能体架构师"属原型阶段角色，未进入 2.0 产品基线，故不采用）。
 *
 * 纯前端静态骨架：租户与角色均来自占位数据，接入后由平台会话接口下发。
 */

type RoleKey = 'ceo' | 'product' | 'channel' | 'content' | 'sales';

interface RoleSpec {
  key: RoleKey;
  titleKey: string;
  descKey: string;
  iconKey: string;
  tone: 'primary' | 'secondary' | 'accent' | 'success' | 'violet';
}

const ROLES: readonly RoleSpec[] = [
  { key: 'ceo', titleKey: 'ws.role.ceo', descKey: 'ws.role.ceoDesc', iconKey: 'ceo', tone: 'primary' },
  { key: 'product', titleKey: 'ws.role.product', descKey: 'ws.role.productDesc', iconKey: 'product', tone: 'secondary' },
  { key: 'channel', titleKey: 'ws.role.channel', descKey: 'ws.role.channelDesc', iconKey: 'channel', tone: 'accent' },
  { key: 'content', titleKey: 'ws.role.content', descKey: 'ws.role.contentDesc', iconKey: 'content', tone: 'success' },
  { key: 'sales', titleKey: 'ws.role.sales', descKey: 'ws.role.salesDesc', iconKey: 'sales', tone: 'violet' },
];

const ROLE_ICONS: Record<string, ReactElement> = {
  ceo: <CrownOutlined />,
  product: <AppstoreOutlined />,
  channel: <GlobalOutlined />,
  content: <NotificationOutlined />,
  sales: <TeamOutlined />,
};

export default function WorkspaceSelectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleKey | null>(null);

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

            <div className="lx-select__eyebrow">{t('ws.eyebrow')}</div>
            <h1 className="lx-select__h1">
              {t('ws.h1.line1')}
              <br />
              <em>{t('ws.h1.em')}</em>
              {t('ws.h1.line2')}
            </h1>
            <p className="lx-select__lead">{t('ws.lead')}</p>

            <div className="lx-select__stats">
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">11</div>
                <div className="lx-select__stat-label">{t('ws.stat.modules')}</div>
              </div>
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">6</div>
                <div className="lx-select__stat-label">{t('ws.stat.agents')}</div>
              </div>
              <div className="lx-select__stat">
                <div className="lx-select__stat-value lx-num">3</div>
                <div className="lx-select__stat-label">{t('ws.stat.dataSources')}</div>
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
              <div className="lx-select__heading">{t('ws.enterTitle')}</div>
              <div className="lx-select__sub">{t('ws.enterSub')}</div>
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
                    onClick={() => setRole(item.key)}
                  >
                    {selected ? (
                      <span className="lx-select__check" aria-hidden="true">
                        <CheckOutlined />
                      </span>
                    ) : null}
                    <span className={`lx-select__role-icon lx-select__role-icon--${item.tone}`}>
                      {ROLE_ICONS[item.iconKey]}
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
              <button
                type="button"
                className="lx-select__btn lx-focusable"
                disabled={role === null}
                onClick={() => void navigate('/workbench')}
              >
                {t('ws.enterAction')}
              </button>
              <button type="button" className="lx-select__btn lx-select__btn--ghost lx-focusable">
                {t('ws.createWorkspace')}
              </button>
            </div>

            <div className="lx-select__sub">{t('ws.footNote')}</div>
          </div>
        </section>
      </div>
    </>
  );
}
