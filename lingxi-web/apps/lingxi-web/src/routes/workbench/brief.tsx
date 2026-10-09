import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckOutlined, DownloadOutlined, PlusOutlined, StarFilled } from '@ant-design/icons';
import {
  LxActionBar,
  LxBanner,
  LxFilterButton,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  LxWorkList,
} from '@lingxi/ui';
import type { LxWorkItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 今日简报（/workbench/brief）—— 工作台的二级页。
 *
 * 作用：把"今天要处理什么"从工作台的卡片看板变成可逐条处理的清单。
 * 之所以单独成页而不塞进工作台首屏：首屏的职责是"看趋势与异常"，
 * 清单页的职责是"逐项处理"；两种使用节奏混在一屏会让首屏失去焦点
 * （产品规划说明书 V2.1 §6.3"默认页即当日工作"）。
 *
 * 与工作台首屏的分工也体现在组件选择上：首屏用卡片看板（LxKpi / LxPanel），
 * 本页用 **LxWorkList** —— 每一行都带行内动作，不用跳转即可处理掉，
 * 这是"清单页"该有的交互（§5.3：待办类卡片支持直接处理）。
 *
 * 关于智能体：AI 已代办的项以行内标记「AI 已代办」呈现，并计入页顶成果数字，
 * 让用户一眼看出"今天有 8 件事不用我动手"——这才是智能体的价值表达方式，
 * 而不是在清单里再插一栏"智能体建议"。
 *
 * 队列行的分类标签直接复用各模块的一级菜单名，避免同一概念出现两套叫法。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据定义在组件作用域内。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/wb/brief。
 */

interface BriefRow {
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
  const [keyword, setKeyword] = useState('');

  /** 今日待办：按截止时间升序。AI 已代办的也列出来，让用户看到进度而非只剩尾巴。 */
  const items: readonly LxWorkItem[] = [
    {
      key: 'b1',
      title: t('wb.brief.item.b1.title'),
      sub: t('wb.brief.item.b1.sub'),
      tags: [{ label: t('ana.menu.analytics'), variant: 'lang' }],
      value: '10:00',
      valueTone: 'danger',
      actionLabel: t('wb.brief.action.handle'),
      actionPrimary: true,
    },
    {
      key: 'b2',
      title: t('wb.brief.item.b2.title'),
      sub: t('wb.brief.item.b2.sub'),
      tags: [{ label: t('mkg.menu.marketing'), variant: 'lang' }],
      agentLabel: t('wb.brief.item.b2.agent'),
      value: '12:00',
      valueTone: 'accent',
      actionLabel: t('wb.brief.action.review'),
      actionPrimary: true,
    },
    {
      key: 'b3',
      title: t('wb.brief.item.b3.title'),
      sub: t('wb.brief.item.b3.sub'),
      tags: [{ label: t('ord.menu.order'), variant: 'lang' }],
      value: '14:00',
      valueTone: 'accent',
      actionLabel: t('wb.brief.action.urge'),
      actionPrimary: true,
    },
    {
      key: 'b4',
      title: t('wb.brief.item.b4.title'),
      sub: t('wb.brief.item.b4.sub'),
      tags: [{ label: t('svc.menu.service'), variant: 'lang' }],
      agentLabel: t('wb.brief.item.b4.agent'),
      value: '16:00',
      valueTone: 'accent',
      actionLabel: t('wb.brief.action.handle'),
    },
    {
      key: 'b5',
      title: t('wb.brief.item.b5.title'),
      sub: t('wb.brief.item.b5.sub'),
      tags: [{ label: t('intel.menu.intel'), variant: 'lang' }],
      agentLabel: t('wb.brief.item.b5.agent'),
      value: '08:30',
      valueTone: 'success',
      actionLabel: t('wb.brief.action.view'),
    },
  ];

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.itemKey).includes(keyword))
    : ROWS;

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
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('wb.brief.action.open')}
        </button>
      ),
    },
  ];

  return (
    <PageContainer titleKey="wb.brief.title" subtitleKey="wb.brief.sub">
      <LxBanner title={t('wb.brief.banner.title')} desc={t('wb.brief.banner.desc')} icon={<StarFilled />} />

      <LxActionBar
        primary={{ key: 'add', label: t('wb.brief.bar.add'), icon: <PlusOutlined /> }}
        items={[
          { key: 'done', label: t('wb.brief.bar.done'), icon: <CheckOutlined /> },
          { key: 'export', label: t('wb.brief.bar.export'), icon: <DownloadOutlined /> },
        ]}
        note={
          <>
            {t('wb.brief.note.prefix')}
            <b>8</b>
            {t('wb.brief.note.suffix')}
          </>
        }
      />

      <div className="lx-workgrid">
        <div className="lx-workgrid__col">
          <LxWorkList
            title={t('wb.brief.list.title')}
            sub={t('wb.brief.list.sub')}
            count={23}
            tone="danger"
            moreLabel={t('wb.brief.list.more')}
            items={items}
            emptyText={t('wb.brief.list.empty')}
          />
        </div>

        <div className="lx-workgrid__col">
          <div className="lx-grid lx-grid--kpi-4">
            <LxKpi label={t('wb.brief.kpi.total')} value="23" sub={t('wb.brief.kpi.sub.today')} color="primary" size="sm" spark={[6, 9, 8, 12, 15, 18, 21, 23]} />
            <LxKpi label={t('wb.brief.kpi.done')} value="8" sub={t('wb.brief.kpi.sub.done')} trend="up" delta="3" color="success" size="sm" />
            <LxKpi label={t('wb.brief.kpi.agent')} value="5" sub={t('wb.brief.kpi.sub.agentTasks')} color="secondary" size="sm" spark={[1, 2, 2, 3, 3, 4, 4, 5]} />
            <LxKpi label={t('wb.brief.kpi.approval')} value="6" sub={t('wb.brief.kpi.sub.needHuman')} color="accent" size="sm" />
          </div>
        </div>
      </div>

      <section className="lx-section">
        <LxSectionHeader
          title={t('wb.brief.table.title')}
          sub={t('wb.brief.table.sub')}
          actionLabel={t('wb.brief.list.more')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('wb.brief.list.search')} onChange={setKeyword} />
              <LxFilterButton label={t('wb.brief.list.filter')} />
            </>
          }
        >
          <LxTable<BriefRow>
            columns={columns}
            dataSource={[...visibleRows]}
            total={ROWS.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
