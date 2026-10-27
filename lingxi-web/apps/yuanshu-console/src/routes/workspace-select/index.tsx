import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BankOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { ROLES } from '@/app/providers/roles';
import type { RoleKey } from '@/app/providers/roles';
import { useCcStore } from '@/routes/iam/cc-store';
import { roleKeyForUserById, userForRole } from '@/routes/iam/role-identity';
import { useSyncViewingUser } from '@/routes/iam/useSyncViewingUser';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * P1 工作区选择（改造指引 5.1 / 4.12）。
 *
 * 这是登录后进入业务系统的第一屏，承担三件事：
 *  ① 安全工作区确认（登录态与合规提示）
 *  ② 企业空间选择（多租户）
 *  ③ 角色选择 —— 角色决定进入后看到的默认工作台（产品规划说明书 V2.1 §6.3"默认页即当日工作"）
 *
 * 角色清单以《产品规划说明书 V2.1》为准：CEO + 四大总监（改造指引 1.0 的
 * "智能体架构师"属原型阶段角色，未进入 2.0 产品基线，故不采用）。
 *
 * 纯前端静态骨架：租户来自占位数据，接入后由平台会话接口下发。
 *
 * 角色清单见 `app/providers/roles.tsx`（全仓唯一事实源）；角色选中后写进工作区状态
 * （`stores/workspaceStore.ts`），顶栏与工作台据此呈现——**角色不是本页的局部 state**。
 * 原先 `role` 只活在本组件里，选完点「进入工作台」照样 navigate 到 /workbench，
 * 角色丢得干干净净，顶栏显示的还是平台会话里那个 `demo.role.owner`。
 */

/**
 * 本屏的初始岗位：会话里选过的优先，否则**从视角身份反推**（2026-10-07）。
 *
 * 与 `TopBar` 的 `effectiveRoleKey` 同一套兜底。刷新后 `roleKey` 归 null（刻意不持久化），
 * 但视角身份还在 —— 若不回退，这一屏会显示"什么都没选"，与顶栏胶囊矛盾。
 */
const initialRole = (): RoleKey | null =>
  useWorkspaceStore.getState().roleKey ??
  roleKeyForUserById(useCcStore.getState().viewingUserId, useCcStore.getState().users);

export default function WorkspaceSelectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setRole = useWorkspaceStore((state) => state.setRole);
  const roleKey = useWorkspaceStore((state) => state.roleKey);
  const users = useCcStore((state) => state.users);
  const syncViewingUser = useSyncViewingUser();
  // 二次进入（顶栏「切换角色」）时带出上次选的角色，不让人重选一遍
  const [role, setRoleKey] = useState<RoleKey | null>(initialRole);

  /**
   * 把选中的岗位落进 store，**进入即生效**（2026-10-07）。
   *
   * 此前只在按钮的 onClick 里 `setRole(role)`，于是「登录页 → 选岗位 → 这里」的
   * 路径上，登录页已经把岗位写进 store 了（那边同步了视角身份，顺带写了 roleKey），
   * 而这一屏却还拿着自己的局部 `role`。结果是：这一屏显示"选定了渠道总监"，
   * 顶栏胶囊却显示"未分配角色" —— 用户看到的两个东西互相矛盾。
   *
   * 真实链路是 `/login → /workspace-select → /workbench` 三步，**每一步都要能改岗位**，
   * 所以同步必须发生在"落到这一屏"这一刻，而不是某个按钮上。
   * 用 useEffect 而非渲染期写 store：渲染期写 store 会触发 React 警告（外部状态更新）。
   *
   * 同时同步 `viewingUserId` —— 这一屏改岗位与登录页改岗位是同一个语义
   * （"我要以这个岗位的身份工作"），不跟着换就等于「在登录页选的角色不作数」。
   */
  useEffect(() => {
    if (role === null || role === roleKey) return;
    setRole(role);
    const u = userForRole(role, users);
    if (u) syncViewingUser(u.id);
  }, [role, roleKey, setRole, users, syncViewingUser]);

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
                    onClick={() => setRoleKey(item.key)}
                  >
                    {selected ? (
                      <span className="lx-select__check" aria-hidden="true">
                        <CheckOutlined />
                      </span>
                    ) : null}
                    <span className={`lx-select__role-icon lx-select__role-icon--${item.tone}`}>
                      {item.icon}
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
                onClick={() => {
                  // store 已在上面的 useEffect 里同步过；这里只需前进。
                  void navigate('/workbench');
                }}
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
