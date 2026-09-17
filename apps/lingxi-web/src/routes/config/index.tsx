import { useTranslation } from 'react-i18next';
import {
  AuditOutlined,
  ClusterOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 配置中心首页（/config）—— 治理与规则（产品规划说明书 §2.11）。
 *
 * 首页以"用户与数据权限范围"为主体：功能权限、字段权限最终都归结为
 * "这个人在这个租户里能看到哪些行、哪些列"，
 * 数据权限范围口径统一为 SELF / DEPT / DEPT_AND_SUB / CUSTOM / ALL，
 * 由平台统一定义，各模块不得自定义（技术规约2.0 §4.8.2）。
 *
 * 企业公约也在此维护——它同时是 AI 生成内容的约束注入源，
 * 变更后必须使相关提示词缓存失效（§3.5 F6）。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/cc/users。
 */

interface UserRow extends ModuleHomeRow {
  id: string;
  nameKey: string;
  account: string;
  deptKey: string;
  roleKey: string;
  scope: 'SELF' | 'DEPT' | 'DEPT_AND_SUB' | 'CUSTOM' | 'ALL';
  enabled: boolean;
}

const ROWS: readonly UserRow[] = [
  { id: '1', nameKey: 'demo.user.lin', account: 'lin.lan', deptKey: 'demo.dept.sales', roleKey: 'wb.role.salesDirector', scope: 'DEPT_AND_SUB', enabled: true },
  { id: '2', nameKey: 'demo.user.zhou', account: 'zhou.mu', deptKey: 'demo.dept.channel', roleKey: 'wb.role.channelDirector', scope: 'DEPT', enabled: true },
  { id: '3', nameKey: 'demo.user.chen', account: 'chen.yu', deptKey: 'demo.dept.content', roleKey: 'wb.role.contentDirector', scope: 'SELF', enabled: true },
  { id: '4', nameKey: 'demo.user.wu', account: 'wu.han', deptKey: 'demo.dept.product', roleKey: 'wb.role.productDirector', scope: 'ALL', enabled: true },
  { id: '5', nameKey: 'demo.user.guest', account: 'guest.audit', deptKey: 'demo.dept.audit', roleKey: 'demo.role.auditor', scope: 'CUSTOM', enabled: false },
];

export default function ConfigHomePage() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('cc.col.user'),
      dataIndex: 'nameKey',
      key: 'user',
      render: (_value: string, row: UserRow) => (
        <span>
          <div className="lx-cell-title">{t(row.nameKey)}</div>
          <div className="lx-cell-code">{row.account}</div>
        </span>
      ),
    },
    { title: t('cc.col.dept'), dataIndex: 'deptKey', key: 'dept', render: (value: string) => t(value) },
    { title: t('cc.col.role'), dataIndex: 'roleKey', key: 'role', render: (value: string) => t(value) },
    {
      title: t('cc.col.scope'),
      dataIndex: 'scope',
      key: 'scope',
      render: (value: string) => (
        <LxTag variant="lang">
          <span className="lx-num">{t(`cc.scope.${value}`)}</span>
        </LxTag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (value: boolean) => (
        <LxTag variant={value ? 'done' : 'producing'}>{t(value ? 'cc.status.enabled' : 'cc.status.disabled')}</LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('cc.action.permission')}
        </button>
      ),
    },
  ];

  return (
    <ModuleHome<UserRow>
      titleKey="cc.page.home"
      subtitleKey="cc.page.homeSub"
      kpis={[
        { labelKey: 'cc.kpi.users', value: '48', sub: t('cc.kpi.sub.enabled'), trend: 'up', delta: '3', color: 'primary', spark: [10, 12, 14, 16, 18, 20, 22, 24] },
        { labelKey: 'cc.kpi.roles', value: '12', sub: t('cc.kpi.sub.custom'), trend: 'fl', delta: '0', color: 'secondary', spark: [12, 12, 12, 12, 12, 12, 12, 12] },
        { labelKey: 'cc.kpi.perms', value: '186', sub: t('cc.kpi.sub.bound'), trend: 'up', delta: '14', color: 'accent', spark: [12, 15, 18, 20, 22, 26, 28, 32] },
        { labelKey: 'cc.kpi.toggles', value: '24', sub: t('cc.kpi.sub.gray'), trend: 'up', delta: '2', color: 'success', spark: [4, 5, 5, 6, 6, 7, 7, 8] },
      ]}
      insightsTitleKey="cc.insight.title"
      insightsSubKey="cc.insight.sub"
      insightsMoreKey="cc.insight.more"
      insights={[
        { typeKey: 'cc.insight.change.type', textKey: 'cc.insight.change.text', sourceKey: 'cc.insight.change.source', accent: 'primary', tone: 'sage', icon: <AuditOutlined /> },
        { typeKey: 'cc.insight.login.type', textKey: 'cc.insight.login.text', sourceKey: 'cc.insight.login.source', accent: 'accent', tone: 'sage', icon: <SafetyCertificateOutlined /> },
        { typeKey: 'cc.insight.charter.type', textKey: 'cc.insight.charter.text', sourceKey: 'cc.insight.charter.source', accent: 'success', tone: 'muse', icon: <ClusterOutlined /> },
      ]}
      quicks={[
        { titleKey: 'cc.quick.users', descKey: 'cc.quick.usersDesc', icon: <TeamOutlined />, tone: 'primary' },
        { titleKey: 'cc.quick.roles', descKey: 'cc.quick.rolesDesc', icon: <SafetyCertificateOutlined />, tone: 'accent' },
        { titleKey: 'cc.quick.business', descKey: 'cc.quick.businessDesc', icon: <SettingOutlined />, tone: 'secondary' },
      ]}
      listTitleKey="cc.list.title"
      listSubKey="cc.list.sub"
      listMoreKey="cc.list.more"
      searchPlaceholderKey="cc.list.search"
      filterLabelKey="cc.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="cc.list.empty"
      emptyHintKey="cc.list.emptyHint"
      total={48}
    />
  );
}
