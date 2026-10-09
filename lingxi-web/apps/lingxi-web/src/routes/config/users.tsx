import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { App, Button, Popconfirm, Select, Space, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { LxFilterButton, LxSearchInput, LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { useActingIdentity } from '@/app/providers/useActingIdentity';
import { PERM_DOMAINS } from '@/app/router/perm-tree';
import { DataScopePicker, RoleMultiSelect } from './cc-fields';
import {
  DEFAULT_VIEWING_USER_ID,
  DEPTS,
  effectivePerms,
  roleMemberCount,
  useCcStore,
  type UserRow,
} from './cc-store';
import { useSyncViewingUser } from './useSyncViewingUser';
import { CcCrumb } from './_shared';

/**
 * 用户管理（/config/users）—— 四大核心之一。
 *
 * ## 2026-10-06 改造前，这一页的每个动作都是死的
 *
 *  - 「新建用户」跳 `/config/users?mode=create`，而全仓**没有一处消费 mode 参数**；
 *  - 「配置权限」按钮**没有 onClick**，点了什么也不发生；
 *  - `total={48} pageNo={1}` 写死，与表里 5 行对不上。
 *
 * 现在三处都是真的：新建/编辑走右抽屉，删除带二次确认，
 * 数据范围与角色分配当场生效（切「以此身份查看」即可验证菜单与列表的变化）。
 *
 * ## 为什么用抽屉而不是独立页面
 *
 * 用户的编辑是一次性动作（改完就走），而列表是反复回来的地方。
 * 抽屉让"改一条 → 看列表里它变了 → 再改下一条"不用来回跳路由；
 * 新建同理 —— 建完抽屉关闭，列表原地刷新，比跳到新页面再跳回来短。
 * （弹层范式沿用全站既有的 Drawer，见 AgentTaskDrawer。）
 */

/** 抽屉的「新建」哨兵。与真实用户 id 空间不同，故不会误判。 */
const DRAWER_NEW = '__new__';

export default function UserManagePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const users = useCcStore((s) => s.users);
  const roles = useCcStore((s) => s.roles);
  const viewingUserId = useCcStore((s) => s.viewingUserId);
  const updateUser = useCcStore((s) => s.updateUser);
  const removeUser = useCcStore((s) => s.removeUser);
  const acting = useActingIdentity();
  /* 切视角必须走这个 hook 而不是裸 setViewingUser：后者不更新顶栏角色胶囊，
     会出现「用户名换了、角色还是上一个」的分裂状态（见 hook 的文件头）。 */
  const syncViewingUser = useSyncViewingUser();

  const [keyword, setKeyword] = useState('');
  const [statusFacet, setStatusFacet] = useState<'all' | 'on' | 'off'>('all');
  const [deptFacet, setDeptFacet] = useState('all');
  /** 用户类型筛选：碳基/硅基。缺省 'all'，两段种子都要看得见。 */
  const [typeFacet, setTypeFacet] = useState<'all' | 'carbon' | 'silicon'>('all');
  /**
   * 抽屉态：null = 关闭；`DRAWER_NEW` = 新建；其余为被编辑用户的 id。
   *
   * 用常量而非 `'new' | string`：后者会被`string` 吸收成 `string`，
   * 于是「新建」与「编辑 id 为 new 的用户」在类型上无法区分（lint 也报冗余联合）。
   */
  const [drawer, setDrawer] = useState<string | null>(null);

  /**
   * `?mode=create` 打开新建抽屉（2026-10-06 接线）。
   *
   * 此前首页的「新建用户」按钮跳这个参数，而全仓**没有任何一处消费它** ——
   * 那是一条指向本页自己的死链。现在参数真被消费：从首页点「新建用户」
   * 会直接落到填好的新建表单，而不是先停在列表上再自己找按钮。
   */
  const [params, setParams] = useSearchParams();

  /** 抽屉表单的草稿值。与列表筛选刻意分开：草稿改动不该让列表跟着跳。 */
  const [draft, setDraft] = useState<UserRow | null>(null);

  const visibleRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return users.filter((row) => {
      if (needle && !t(row.nameKey).toLowerCase().includes(needle) && !row.account.toLowerCase().includes(needle)) {
        return false;
      }
      if (statusFacet === 'on' && !row.enabled) return false;
      if (statusFacet === 'off' && row.enabled) return false;
      if (deptFacet !== 'all' && row.deptKey !== deptFacet) return false;
      if (typeFacet !== 'all' && row.userType !== typeFacet) return false;
      return true;
    });
  }, [users, keyword, statusFacet, deptFacet, typeFacet, t]);

  /**
   * 某用户的权限域命中情况。
   *
   * 返回**前 3 个**而不是全部：吴涵这种「产品总监 + 超管」会命中 7 个域，
   * 全列出来那一格能塞 14 行、把整表撑到必须横滚 —— 而"这个人管哪些域"
   * 用户真正要的是概览。要精确看某个域去哪：点进角色页看授予矩阵。
   */
  const domainHit = (row: UserRow): readonly string[] => {
    const perms = effectivePerms(row, roles);
    return PERM_DOMAINS.filter(
      (d) =>
        perms.includes(`${d.prefix}:*`) ||
        d.resources.some((r) => r.codes.some((c) => perms.includes(c))),
    )
      .map((d) => d.prefix)
      .slice(0, 3);
  };

  /** 该用户命中的权限域总数（列尾标 +N 用）。 */
  const domainTotal = (row: UserRow): number => {
    const perms = effectivePerms(row, roles);
    return PERM_DOMAINS.filter(
      (d) =>
        perms.includes(`${d.prefix}:*`) ||
        d.resources.some((r) => r.codes.some((c) => perms.includes(c))),
    ).length;
  };

  const openEdit = (row: UserRow) => {
    setDraft(row);
    setDrawer(row.id);
  };

  const openCreate = () => {
    // 新建时带出「第一个角色的缺省范围」：让默认值来自配置而不是每次重新想一遍
    const firstRole = roles[0];
    setDraft({
      id: '',
      nameKey: '',
      account: '',
      email: '',
      // 缺省碳基：新建表单里的类型是显式可改的，但初值必须先有一个。
      // 若让智能体账号由管理员在这里手建，它不会有 agentKey，
      // 与智能体中心那条注册记录就对不上——那种账号应该在智能体中心建。
      userType: 'carbon',
      deptKey: 'demo.dept.sales',
      roleIds: firstRole ? [firstRole.id] : [],
      scope: firstRole?.defaultScope ?? 'SELF',
      scopeDeptKeys: [],
      enabled: true,
    });
    setDrawer(DRAWER_NEW);
  };

  /**
   * `?mode=create` → 直接打开新建抽屉（2026-10-06 接线）。
   *
   * 放在 openCreate 之后是因为 effect 需要调用它；依赖数组只列 [params]，
   * 因为 openCreate 每次渲染都是新函数，把它列进去会让 effect 每帧重跑。
   *
   * **为什么必须 replace 而不是 push**：留着参数的话，用户关掉抽屉后在页面内
   * 任何一次 re-render（切筛选、打字、停用某个用户）都会让 `params` 变化触发
   * 这个 effect，表单在用户已经填了一半的时候重新弹一次。
   * 首轮接线用的是 replace，但漏了"抽屉关掉后再进来"这一路 ——
   * 真正的根治是调用方不许把参数带错（首页核心卡片已修正），
   * 这里 replace 是第二道防线，不是唯一防线。
   */
  useEffect(() => {
    if (params.get('mode') !== 'create') return;
    openCreate();
    // 用 replace 清掉参数：否则关掉抽屉后 URL 上还留着 mode=create，
    // 刷新一下又会弹出一个空表单 —— 用户会以为刚才白填了。
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const saveDraft = () => {
    if (!draft) return;
    if (draft.account.trim() === '') {
      void message.warning(t('cc.users.f.account'));
      return;
    }
    if (draft.roleIds.length === 0) {
      void message.warning(t('cc.users.roleNone'));
      return;
    }
    if (draft.scope === 'CUSTOM' && draft.scopeDeptKeys.length === 0) {
      void message.warning(t('cc.users.f.scopeDeptsHint'));
      return;
    }
    if (drawer === DRAWER_NEW) {
      useCcStore.getState().addUser({ ...draft, id: `u.${Date.now().toString(36)}` });
      void message.success(t('cc.users.created'));
    } else {
      updateUser(draft.id, draft);
      void message.success(t('cc.users.saved'));
    }
    setDrawer(null);
    setDraft(null);
  };

  const closeDrawer = () => {
    setDrawer(null);
    setDraft(null);
  };

  const patch = (next: Partial<UserRow>) => setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const columns = [
    {
      title: t('cc.col.user'),
      dataIndex: 'nameKey',
      key: 'user',
      width: 15,
      render: (_value: string, row: UserRow) => (
        <span>
          <div className="lx-cell-title">
            {row.nameKey ? t(row.nameKey) : row.account}
            {row.userType === 'silicon' ? (
              /* 类型标签紧贴姓名：这一列回答"是人还是机器"，
                 放到独立的列里会离姓名太远，扫一行时看不到。
                 LxTag 的契约只有 variant + children，不收 className（自由传 class
                 会被后来人当成可以覆盖色板），间距交给外层 span。 */
              <span className="lx-cc-usertype">
                <LxTag variant="video">{t('cc.userType.silicon')}</LxTag>
              </span>
            ) : null}
          </div>
          <div className="lx-cell-code">{row.account}</div>
        </span>
      ),
    },
    {
      title: t('cc.col.userType'),
      key: 'userType',
      width: 9,
      render: (_value: unknown, row: UserRow) => (
        <LxTag variant={row.userType === 'silicon' ? 'video' : 'lang'}>
          {t(row.userType === 'silicon' ? 'cc.userType.silicon' : 'cc.userType.carbon')}
        </LxTag>
      ),
    },
    {
      title: t('cc.col.dept'),
      dataIndex: 'deptKey',
      key: 'dept',
      width: 12,
      render: (value: string) => t(value),
    },
    {
      title: t('cc.col.role'),
      dataIndex: 'roleIds',
      key: 'role',
      width: 17,
      render: (value: readonly string[]) =>
        value.length === 0 ? (
          <span className="lx-muted">—</span>
        ) : (
          <span className="lx-cc-rolechips">
            {value.map((id) => {
              const role = roles.find((r) => r.id === id);
              if (!role) return null;
              return (
                <LxTag key={id} variant="lang">
                  {t(role.nameKey)}
                  <span className="lx-num"> · {roleMemberCount(id, users)}</span>
                </LxTag>
              );
            })}
          </span>
        ),
    },
    {
      title: t('cc.col.scope'),
      dataIndex: 'scope',
      key: 'scope',
      width: 14,
      render: (value: UserRow['scope']) => (
        <LxTag variant="review">
          <span className="lx-num">{t(`cc.scope.${value}`)}</span>
        </LxTag>
      ),
    },
    {
      title: t('cc.users.permPoints'),
      key: 'domains',
      width: 14,
      render: (_value: unknown, row: UserRow) => {
        const hits = domainHit(row);
        const total = domainTotal(row);
        if (total === 0) {
          return <span className="lx-muted">—</span>;
        }
        return (
          <span className="lx-cc-domchips">
            {hits.map((p) => (
              <LxTag key={p} variant="video">
                <span className="lx-num">{t(`cc.perm.domain.${p}`)}</span>
              </LxTag>
            ))}
            {total > hits.length ? (
              /* 只标数量、不截断文字：省下的域由「配置权限」进抽屉看全，
                 这里藏掉域名会让人以为"这人只有这几个域"。 */
              <span className="lx-muted lx-num">+{total - hits.length}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t('common.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 7,
      render: (value: boolean) => (
        <LxTag variant={value ? 'done' : 'producing'}>{t(value ? 'cc.status.enabled' : 'cc.status.disabled')}</LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 12,
      render: (_value: unknown, row: UserRow) => {
        const silicon = row.userType === 'silicon';
        return (
          <Space size={4} wrap className="lx-cc-actions">
            <button type="button" className="lx-cell-link lx-focusable" onClick={() => openEdit(row)}>
              {t('cc.roles.action.edit')}
            </button>
            {viewingUserId === row.id ? (
              <LxTag variant="done">{t('cc.users.viewingAs', { name: t(row.nameKey) })}</LxTag>
            ) : (
              <button
                type="button"
                className="lx-cell-link lx-focusable"
                onClick={() => {
                  syncViewingUser(row.id);
                  void message.success(t('cc.users.viewingBanner', { name: t(row.nameKey), scope: t(`cc.scope.${row.scope}`) }));
                }}
              >
                {t('cc.users.viewAs')}
              </button>
            )}
            {/* 硅基员工**不可删**：它的账号由智能体注册表生成，删掉之后智能体中心
                还在跑、权限却凭空消失，且没有任何地方会告诉你少了什么。
                与内置角色不可删是同一条理由：会留下一个"存在但无解"的孤儿。
                处置方式是「停用」—— 立刻断掉访问，且可随时恢复。 */}
            {silicon ? (
              <Tooltip title={t('cc.users.siliconDeleteBlocked')}>
                <button type="button" className="lx-cell-link lx-cell-link--danger lx-focusable" disabled>
                  <DeleteOutlined />
                </button>
              </Tooltip>
            ) : (
              <Popconfirm
                title={t('cc.users.deleteConfirm')}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
                onConfirm={() => {
                  removeUser(row.id);
                  void message.success(t('cc.users.deleted'));
                }}
              >
                <button type="button" className="lx-cell-link lx-cell-link--danger lx-focusable">
                  <DeleteOutlined />
                </button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer titleKey="cc.users.title" subtitleKey="cc.users.sub">
      <CcCrumb />
      <section className="lx-section">
        <LxSectionHeader
          title={t('cc.users.listTitle')}
          sub={t('cc.users.listSub', { count: users.length })}
          actionLabel={t('cc.users.new')}
          onAction={openCreate}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('cc.list.search')} onChange={setKeyword} />
              <Select
                className="lx-cc-filter"
                value={statusFacet}
                onChange={(v) => setStatusFacet(v)}
                options={[
                  { value: 'all', label: t('cc.users.filter.status') },
                  { value: 'on', label: t('cc.users.filter.statusOn') },
                  { value: 'off', label: t('cc.users.filter.statusOff') },
                ]}
              />
              <Select
                className="lx-cc-filter"
                value={deptFacet}
                onChange={setDeptFacet}
                options={[
                  { value: 'all', label: t('cc.users.filter.dept') },
                  ...DEPTS.map((d) => ({ value: d.key, label: t(d.nameKey) })),
                ]}
              />
              <Select
                className="lx-cc-filter"
                value={typeFacet}
                onChange={setTypeFacet}
                options={[
                  { value: 'all', label: t('cc.users.filter.type') },
                  { value: 'carbon', label: t('cc.userType.carbon') },
                  { value: 'silicon', label: t('cc.userType.silicon') },
                ]}
              />
              <LxFilterButton label={t('cc.list.filter')} />
            </>
          }
        >
          <LxTable<UserRow>
            fit
            columns={columns}
            dataSource={[...visibleRows]}
            total={visibleRows.length}
            pageNo={1}
            pageSize={20}
            locale={{ emptyText: t('cc.users.empty') }}
          />
        </LxTableCard>
      </section>

      {/* 视角提示条：让"为什么侧边栏少了几个菜单"这件事有解释，而不是让人以为系统坏了 */}
      {viewingUserId !== 'u.wu' && acting ? (
        <section className="lx-cc-banner">
          <span className="lx-cc-banner__text">{t('cc.users.viewingBanner', { name: acting.user.displayName, scope: t(`cc.scope.${acting.scope}`) })}</span>
          <button
            type="button"
            className="lx-cc-banner__back lx-focusable"
            onClick={() => syncViewingUser(DEFAULT_VIEWING_USER_ID)}
          >
            {t('cc.users.stopViewing')}
          </button>
        </section>
      ) : null}

      {/* 编辑/新建抽屉 */}
      {drawer !== null && draft ? (
        <div className="lx-cc-mask" role="dialog" aria-modal="true" onClick={closeDrawer}>
          <aside className="lx-cc-drawer" onClick={(e) => e.stopPropagation()}>
            <header className="lx-cc-drawer__head">
              <h2 className="lx-cc-drawer__title">
                {t(drawer === DRAWER_NEW ? 'cc.users.createTitle' : 'cc.users.editTitle')}
              </h2>
              <span className="lx-cc-drawer__sub">
                {t(drawer === DRAWER_NEW ? 'cc.users.createSub' : 'cc.users.editSub')}
              </span>
            </header>

            <div className="lx-cc-drawer__body">
              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-user-account">
                  {t('cc.users.f.account')}
                  <b className="lx-cc-field__required">*</b>
                </label>
                <input
                  id="cc-user-account"
                  className="lx-cc-field__control"
                  value={draft.account}
                  onChange={(e) => patch({ account: e.target.value })}
                />
                <span className="lx-cc-field__hint">{t('cc.users.f.accountHint')}</span>
              </div>

              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-user-name">
                  {t('cc.users.f.name')}
                </label>
                <input
                  id="cc-user-name"
                  className="lx-cc-field__control"
                  value={draft.nameKey.startsWith('demo.user.') ? t(draft.nameKey) : draft.nameKey}
                  onChange={(e) => patch({ nameKey: e.target.value })}
                />
                <span className="lx-cc-field__hint">{t('cc.users.f.name')}</span>
              </div>

              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-user-email">
                  {t('cc.users.f.email')}
                </label>
                <input
                  id="cc-user-email"
                  className="lx-cc-field__control"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.users.f.dept')}</span>
                <Select
                  className="lx-cc-field__control"
                  value={draft.deptKey}
                  onChange={(v) => patch({ deptKey: v })}
                  options={DEPTS.map((d) => ({ value: d.key, label: t(d.nameKey) }))}
                />
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.users.f.roles')}</span>
                <RoleMultiSelect value={draft.roleIds} roles={roles} onChange={(ids) => patch({ roleIds: ids })} />
                <span className="lx-cc-field__hint">{t('cc.users.permPointsHint')}</span>
              </div>

              {/* 用户类型：**仅新建时可改**。
                  存量用户的类型是系统事实（SSO 同步来的= 碳基，智能体注册的 = 硅基），
                  在这里改等于允许把人的账号标成机器、或反之，且不会真的改变什么 ——
                  用户一变类型，智能体中心那边并没有对应条目。
                  故编辑态一律只读展示，把话说清来源。 */}
              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.col.userType')}</span>
                {drawer === DRAWER_NEW ? (
                  <Select
                    className="lx-cc-field__control"
                    value={draft.userType}
                    onChange={(v) => patch({ userType: v })}
                    options={[
                      { value: 'carbon', label: t('cc.userType.carbon') },
                      { value: 'silicon', label: t('cc.userType.silicon') },
                    ]}
                  />
                ) : (
                  <>
                    <LxTag variant={draft.userType === 'silicon' ? 'video' : 'lang'}>
                      {t(draft.userType === 'silicon' ? 'cc.userType.silicon' : 'cc.userType.carbon')}
                    </LxTag>
                    <span className="lx-cc-field__hint">{t('cc.users.f.userTypeFixed')}</span>
                  </>
                )}
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.users.f.scope')}</span>
                <DataScopePicker
                  value={{ scope: draft.scope, deptKeys: draft.scopeDeptKeys }}
                  onChange={(next) => patch({ scope: next.scope, scopeDeptKeys: next.deptKeys })}
                />
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.users.f.enabled')}</span>
                <Select
                  className="lx-cc-field__control"
                  value={draft.enabled ? 'on' : 'off'}
                  onChange={(v) => patch({ enabled: v === 'on' })}
                  options={[
                    { value: 'on', label: t('cc.users.f.enabledOn') },
                    { value: 'off', label: t('cc.users.f.enabledOff') },
                  ]}
                />
              </div>
            </div>

            <footer className="lx-cc-drawer__foot">
              <Button onClick={closeDrawer}>{t('common.cancel')}</Button>
              <Button type="primary" onClick={saveDraft}>
                {t('common.confirm')}
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
    </PageContainer>
  );
}