import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { App, Button, Popconfirm, Select, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { PERM_DOMAINS, type PermDomain } from '@/app/router/perm-tree';
import { DATA_SCOPES, DATA_SCOPE_DESC_KEY } from '@/app/providers/dataScope';
import { roleMemberCount, useCcStore, type RoleRow } from './cc-store';
import { CcCrumb } from './_shared';

/**
 * 角色权限（/config/roles）—— 四大核心「权限管理」的落地页。
 *
 * ## 2026-10-06 改造前
 *
 *  - `perms` 字段是**数字**（186 / 42 / 36 / 28 / 31 / 12），不是权限码数组 ——
 *    也就是说列表上「权限点 186」这个数字**没有任何来源**，改不了也查不到；
 *  - 「配置权限」按钮**没有 onClick**。
 *
 * 现在权限码从 `perm-tree`（由 13 个分区 manifest 派生）勾选而来，
 * 列表上的权限点数是**当场统计出来的** —— 改成多少就显示多少。
 *
 * ## 授予矩阵为什么按域分组、且提供「域级通配」
 *
 * 30 个资源 × 若干动作，逐条勾会有 100 多个复选框，实际没人愿意用。
 * 而现实里授权是**按域**给的（"这个人管整个客户域"），不是逐条资源挑。
 * 故每个域给一个「域级通配」开关（`cus:*`），它一次覆盖该域所有资源的任意动作；
 * 想精细控制再进域内逐条勾。两层都有，评审时既能快速授权也能看到细粒度。
 *
 * 内置角色的权限码集合受保护：内置角色被清空权限会让所有在用它的用户权限归零，
 * 且没有任何提示 —— 这是不可逆后果，必须拦住。
 */

/** 抽屉的「新建」哨兵。与真实角色 id 空间不同，故不会误判。 */
const DRAWER_NEW = '__new__';

export default function RoleManagePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const roles = useCcStore((s) => s.roles);
  const users = useCcStore((s) => s.users);
  const addRole = useCcStore((s) => s.addRole);
  const updateRole = useCcStore((s) => s.updateRole);
  const removeRole = useCcStore((s) => s.removeRole);

  const [drawer, setDrawer] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoleRow | null>(null);

  /** 某域是否被通配覆盖（`prefix:*` 在集合里）。 */
  const isWildcard = (perms: readonly string[], domain: PermDomain): boolean =>
    perms.includes(`${domain.prefix}:*`);
  const isGranted = (perms: readonly string[], code: string): boolean => perms.includes(code);

  const toggleCode = (code: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        perms: prev.perms.includes(code) ? prev.perms.filter((c) => c !== code) : [...prev.perms, code],
      };
    });
  };

  const toggleDomainAll = (domain: PermDomain) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const wildcard = `${domain.prefix}:*`;
      const allCodes = domain.resources.flatMap((r) => r.codes);
      const fullyOn = isWildcard(prev.perms, domain) || allCodes.every((c) => prev.perms.includes(c));
      // 先摘通配再谈逐条：通配与逐条同时存在会让"哪些权限点没勾"这个问题无法回答
      const base = prev.perms.filter((c) => c !== wildcard);
      const next = fullyOn ? base.filter((c) => !allCodes.includes(c)) : [...base, ...allCodes];
      return { ...prev, perms: next };
    });
  };

  const toggleWildcard = (domain: PermDomain) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const wildcard = `${domain.prefix}:*`;
      if (prev.perms.includes(wildcard)) {
        return { ...prev, perms: prev.perms.filter((c) => c !== wildcard) };
      }
      const allCodes = domain.resources.flatMap((r) => r.codes);
      return { ...prev, perms: [...prev.perms.filter((c) => !allCodes.includes(c)), wildcard] };
    });
  };

  const openEdit = (row: RoleRow) => {
    setDraft(row);
    setDrawer(row.id);
  };

  const openCreate = () => {
    setDraft({
      id: '',
      nameKey: '',
      descKey: '',
      perms: [],
      defaultScope: 'SELF',
      builtin: false,
    });
    setDrawer(DRAWER_NEW);
  };

  /** `?mode=create` → 直接打开新建抽屉（与用户页同一约定，见 users.tsx 的说明）。 */
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('mode') !== 'create') return;
    openCreate();
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const save = () => {
    if (!draft) return;
    if (drawer === DRAWER_NEW) {
      if (draft.nameKey.trim() === '') {
        void message.warning(t('cc.roles.f.name'));
        return;
      }
      addRole({ ...draft, id: `role.custom.${Date.now().toString(36)}`, builtin: false });
      void message.success(t('cc.roles.created'));
    } else {
      updateRole(draft.id, draft);
      void message.success(t('cc.roles.saved'));
    }
    setDrawer(null);
    setDraft(null);
  };

  const columns = [
    {
      title: t('cc.roles.col.name'),
      dataIndex: 'nameKey',
      key: 'name',
      width: 22,
      render: (value: string, row: RoleRow) => (
        <span>
          <div className="lx-cell-title">{value.startsWith('cc.role.custom') ? t(value) : t(value)}</div>
          <div className="lx-cell-code">{row.id}</div>
        </span>
      ),
    },
    {
      title: t('cc.roles.col.desc'),
      dataIndex: 'descKey',
      key: 'desc',
      width: 26,
      render: (value: string) => <span className="lx-cell-text">{value ? t(value) : '—'}</span>,
    },
    {
      title: t('cc.roles.col.members'),
      key: 'members',
      width: 10,
      render: (_value: unknown, row: RoleRow) => (
        <span className="lx-num">{roleMemberCount(row.id, users)}</span>
      ),
    },
    {
      title: t('cc.roles.col.perms'),
      key: 'perms',
      width: 14,
      // 当场统计：此前这里是写死的 186，与任何配置都无关
      render: (_value: unknown, row: RoleRow) => (
        <span className="lx-num">
          {row.perms.length === 0 ? '—' : `${row.perms.length} / ${PERM_DOMAINS.length}`}
        </span>
      ),
    },
    {
      title: t('cc.col.scope'),
      key: 'scope',
      width: 14,
      render: (_value: unknown, row: RoleRow) => (
        <LxTag variant="review">
          <span className="lx-num">{t(`cc.scope.${row.defaultScope}`)}</span>
        </LxTag>
      ),
    },
    {
      title: t('cc.roles.col.type'),
      dataIndex: 'builtin',
      key: 'type',
      width: 10,
      render: (value: boolean) => (
        <LxTag variant={value ? 'lang' : 'review'}>{t(value ? 'cc.roles.builtin' : 'cc.roles.custom')}</LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 18,
      render: (_value: unknown, row: RoleRow) => (
        <Space size={4} wrap className="lx-cc-actions">
          <button type="button" className="lx-cell-link lx-focusable" onClick={() => openEdit(row)}>
            {t('cc.roles.action.edit')}
          </button>
          {row.builtin ? (
            <Tooltip title={t('cc.roles.deleteBlocked')}>
              <button type="button" className="lx-cell-link lx-cell-link--muted" disabled>
                {t('cc.action.delete')}
              </button>
            </Tooltip>
          ) : (
            <Popconfirm
              title={t('cc.roles.deleteConfirm')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => {
                removeRole(row.id);
                void message.success(t('cc.roles.deleted'));
              }}
            >
              <button type="button" className="lx-cell-link lx-cell-link--danger lx-focusable">
                {t('cc.action.delete')}
              </button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const grantedCount = draft?.perms.length ?? 0;
  const totalCodes = useMemo(() => PERM_DOMAINS.reduce((sum, d) => sum + d.resources.reduce((s, r) => s + r.codes.length, 0), 0), []);

  return (
    <PageContainer titleKey="cc.roles.title" subtitleKey="cc.roles.sub">
      <CcCrumb />
      <section className="lx-section">
        <LxSectionHeader
          title={t('cc.roles.listTitle')}
          sub={t('cc.roles.listSub', { count: roles.length })}
          actionLabel={t('cc.roles.new')}
          onAction={openCreate}
        />
        <LxTableCard>
          <LxTable<RoleRow>
            fit
            columns={columns}
            dataSource={[...roles]}
            total={roles.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>

      {drawer !== null && draft ? (
        <div className="lx-cc-mask" role="dialog" aria-modal="true" onClick={() => { setDrawer(null); setDraft(null); }}>
          <aside className="lx-cc-drawer lx-cc-drawer--wide" onClick={(e) => e.stopPropagation()}>
            <header className="lx-cc-drawer__head">
              <h2 className="lx-cc-drawer__title">
                {t(drawer === DRAWER_NEW ? 'cc.roles.createTitle' : 'cc.roles.editTitle')}
              </h2>
              <span className="lx-cc-drawer__sub">
                {t(drawer === DRAWER_NEW ? 'cc.roles.createSub' : 'cc.roles.editSub')}
              </span>
            </header>

            <div className="lx-cc-drawer__body">
              <div className="lx-cc-fieldrow">
                <div className="lx-cc-field">
                  <label className="lx-cc-field__label" htmlFor="cc-role-name">
                    {t('cc.roles.f.name')}
                    <b className="lx-cc-field__required">*</b>
                  </label>
                  <input
                    id="cc-role-name"
                    className="lx-cc-field__control"
                    value={draft.nameKey.startsWith('cc.role.custom') ? t(draft.nameKey) : draft.nameKey}
                    onChange={(e) => setDraft((p) => (p ? { ...p, nameKey: e.target.value } : p))}
                  />
                </div>
                <div className="lx-cc-field">
                  <span className="lx-cc-field__label">{t('cc.roles.f.scopeDefault')}</span>
                  <Select
                    className="lx-cc-field__control"
                    value={draft.defaultScope}
                    onChange={(v) => setDraft((p) => (p ? { ...p, defaultScope: v } : p))}
                    options={DATA_SCOPES.map((s) => ({ value: s, label: `${t(`cc.scope.${s}`)} · ${t(DATA_SCOPE_DESC_KEY[s])}` }))}
                  />
                  <span className="lx-cc-field__hint">{t('cc.roles.f.scopeDefaultHint')}</span>
                </div>
              </div>

              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-role-desc">
                  {t('cc.roles.f.desc')}
                </label>
                <textarea
                  id="cc-role-desc"
                  className="lx-cc-field__control"
                  rows={2}
                  placeholder={t('cc.roles.f.descPlaceholder')}
                  value={draft.descKey.startsWith('cc.role.') || draft.descKey.startsWith('wb.role.') ? t(draft.descKey) : draft.descKey}
                  onChange={(e) => setDraft((p) => (p ? { ...p, descKey: e.target.value } : p))}
                />
              </div>

              {draft.builtin ? (
                <p className="lx-cc-note">
                  <InfoCircleOutlined />
                  {t('cc.roles.builtinLock')}
                </p>
              ) : null}

              <section className="lx-cc-perm">
                <header className="lx-cc-perm__head">
                  <h3 className="lx-cc-perm__title">{t('cc.roles.permTitle')}</h3>
                  <span className="lx-cc-perm__sub">{t('cc.roles.permSub')}</span>
                  <span className="lx-cc-perm__count lx-num">
                    {t('cc.roles.permCount', { granted: grantedCount, total: totalCodes })}
                  </span>
                </header>

                {PERM_DOMAINS.map((domain) => {
                  const wildcard = `${domain.prefix}:*`;
                  const on = isWildcard(draft.perms, domain);
                  const allCodes = domain.resources.flatMap((r) => r.codes);
                  const hitCount = on
                    ? allCodes.length
                    : allCodes.filter((c) => isGranted(draft.perms, c)).length;
                  return (
                    <div key={domain.prefix} className={`lx-cc-domain${on ? ' is-wildcard' : ''}`}>
                      <header className="lx-cc-domain__head">
                        <button
                          type="button"
                          className="lx-cc-domain__name lx-focusable"
                          aria-pressed={on}
                          onClick={() => toggleWildcard(domain)}
                          title={t('cc.roles.permWildcardHint', { code: wildcard })}
                        >
                          {t(domain.titleKey)}
                          <span className="lx-cc-domain__code lx-num">{wildcard}</span>
                          {on ? <LxTag variant="done">{t('cc.roles.permWildcard', { code: wildcard })}</LxTag> : null}
                        </button>
                        <span className="lx-cc-domain__meta lx-num">
                          {hitCount} / {allCodes.length}
                        </span>
                        <button
                          type="button"
                          className="lx-cell-link lx-focusable"
                          onClick={() => toggleDomainAll(domain)}
                          disabled={draft.builtin}
                        >
                          {t(hitCount === allCodes.length ? 'cc.roles.permClear' : 'cc.roles.permAll')}
                        </button>
                      </header>

                      <div className="lx-cc-domain__body">
                        {domain.resources.map((resource) => (
                          <div key={resource.resource} className="lx-cc-resource">
                            <span className="lx-cc-resource__name">{t(`cc.perm.resource.${domain.prefix}.${resource.resource}`)}</span>
                            <span className="lx-cc-resource__codes">
                              {resource.codes.map((code) => {
                                const checked = on || isGranted(draft.perms, code);
                                const label = code.split(':').slice(2).join(':');
                                return (
                                  <label key={code} className={`lx-cc-check${checked ? ' is-on' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={on || draft.builtin}
                                      onChange={() => toggleCode(code)}
                                    />
                                    <span className="lx-cc-check__label">{t(`cc.perm.act.${label}`)}</span>
                                    <span className="lx-cc-check__code lx-num">{code}</span>
                                  </label>
                                );
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>

            <footer className="lx-cc-drawer__foot">
              <Button onClick={() => { setDrawer(null); setDraft(null); }}>{t('common.cancel')}</Button>
              <Button type="primary" onClick={save}>
                {t('common.confirm')}
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
    </PageContainer>
  );
}