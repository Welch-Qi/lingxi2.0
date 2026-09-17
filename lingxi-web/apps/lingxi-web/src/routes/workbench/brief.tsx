import { useTranslation } from 'react-i18next';
import type { ModuleHomeRow } from '@/components/ModuleHome';
import { ModuleHome } from '@/components/ModuleHome';
import { LxTag } from '@lingxi/ui';

/**
 * 今日简报（/workbench/brief）—— 工作台的二级页。
 *
 * 作用：把"今天要处理什么"从工作台的卡片看板变成可逐条勾掉的清单。
 * 之所以单独成页而不塞进工作台首屏：首屏的职责是"看趋势与异常"，
 * 清单页的职责是"逐项处理"；两种使用节奏混在一屏会让首屏失去焦点
 * （产品规划说明书 §5.3"默认页即当日工作"）。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/wb/brief。
 */

interface BriefRow extends ModuleHomeRow {
  id: string;
  itemKey: string;
  moduleKey: string;
  ownerKey: string;
  due: string;
  status: 'todo' | 'done';
}

const ROWS: readonly BriefRow[] = [
  { id: '1', itemKey: 'wb.brief.r1', moduleKey: 'cus.menu.customer', ownerKey: 'wb.role.salesDirector', due: '10:00', status: 'todo' },
  { id: '2', itemKey: 'wb.brief.r2', moduleKey: 'mkg.menu.marketing', ownerKey: 'wb.role.contentDirector', due: '12:00', status: 'todo' },
  { id: '3', itemKey: 'wb.brief.r3', moduleKey: 'ord.menu.order', ownerKey: 'wb.role.channelDirector', due: '14:00', status: 'todo' },
  { id: '4', itemKey: 'wb.brief.r4', moduleKey: 'svc.menu.service', ownerKey: 'wb.role.salesDirector', due: '16:00', status: 'todo' },
  { id: '5', itemKey: 'wb.brief.r5', moduleKey: 'intel.menu.intel', ownerKey: 'wb.role.productDirector', due: '08:30', status: 'done' },
];

export default function WorkbenchBriefPage() {
  const { t } = useTranslation();

  const columns = [
    { title: t('wb.brief.col.item'), dataIndex: 'itemKey', key: 'item', render: (value: string) => t(value) },
    {
      title: t('wb.brief.col.module'),
      dataIndex: 'moduleKey',
      key: 'module',
      render: (value: string) => <LxTag variant="lang">{t(value)}</LxTag>,
    },
    { title: t('wb.brief.col.owner'), dataIndex: 'ownerKey', key: 'owner', render: (value: string) => t(value) },
    {
      title: t('wb.brief.col.due'),
      dataIndex: 'due',
      key: 'due',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: BriefRow['status']) => (
        <LxTag variant={value === 'done' ? 'done' : 'review'}>{t(`wb.brief.status.${value}`)}</LxTag>
      ),
    },
  ];

  return (
    <ModuleHome<BriefRow>
      titleKey="wb.brief.title"
      subtitleKey="wb.brief.sub"
      kpis={[
        { labelKey: 'wb.brief.kpi.total', value: '23', sub: t('wb.brief.kpi.sub.today'), color: 'primary', spark: [6, 9, 8, 12, 15, 18, 21, 23] },
        { labelKey: 'wb.brief.kpi.done', value: '8', sub: t('wb.brief.kpi.sub.byAgent'), trend: 'up', delta: '3', color: 'success' },
        { labelKey: 'wb.brief.kpi.agent', value: '5', sub: t('wb.brief.kpi.sub.agentTasks'), color: 'secondary', spark: [1, 2, 2, 3, 3, 4, 4, 5] },
        { labelKey: 'wb.brief.kpi.approval', value: '6', sub: t('wb.brief.kpi.sub.needHuman'), color: 'accent' },
      ]}
      listTitleKey="wb.brief.list.title"
      listSubKey="wb.brief.list.sub"
      searchPlaceholderKey="wb.brief.list.search"
      filterLabelKey="wb.brief.list.filter"
      columns={columns}
      rows={ROWS}
      emptyTextKey="wb.brief.list.empty"
      emptyHintKey="wb.brief.list.emptyHint"
    />
  );
}
