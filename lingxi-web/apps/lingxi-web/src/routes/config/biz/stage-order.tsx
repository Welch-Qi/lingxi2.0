import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Button, Popconfirm, Space, Tooltip } from 'antd';
import { DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { ORDER_ROWS } from '@/routes/order/data';
import { useBiz2Store, type OrderStageValue } from '../biz2-data';
import { CcCrumb } from '../_shared';

/**
 * 订单阶段管理（/config/business/stage-order）。
 *
 * ## 与商机阶段字典（`/config/business/stage-opp`）的关系
 *
 * 两个页面长得几乎一样，但**判据不同，所以不合并成参数化的一页**：
 *
 * | | 商机阶段 | 订单阶段 |
 * |---|---|---|
 * | 值来源 | `STAGE_KIND`（封闭枚举） | `OTD_STAGES`（订单履约七节点） |
 * | 必答项 | `kind` 性质 —— 赢率/漏斗口径 | `terminal` 终态 —— OTD 是否收口 |
 * | 只读项 | 性质、SLA | 终态 |
 * | 可配项 | 顺序、启用 | 顺序、启用、阶段 SLA |
 *
 * 若合并成一个 `?shape=xxx` 的页面，就得让每个维度回答"另一个维度的必答项对它有没有意义"，
 * 而那些问题的答案永远是"没有" —— 那是在为不存在的要求写分支。
 *
 * ## 为什么不开放「新增阶段」
 *
 * `OTD_STAGES` 是履约流程的**定义**，不是可枚举的下拉选项：
 * 订单行的 `stageKey` 必须命中其中之一，而看板的七个节点卡是按这份定义硬渲染的。
 * 页面里加一个没有节点卡、没有演示数据、也没有任何订单能进入的阶段，
 * 结果是配置中心说有八个阶段、订单看板还是七张卡 —— 又一次"配了没生效"。
 * 与 `dict-data.ts` 允许新增自定义取值的前提（那边 value 可以是自由标识）不同，
 * 这里的前提不成立，故只开放顺序/启用/SLA。
 *
 * ## 「终态」为什么不可编辑
 *
 * 与商机阶段的 `kind` 同一条理由：终态决定订单是否还进流转看板与 OTD 达成率，
 * 而那两处消费点在模块作用域求值，改配置不会让它们重算。
 * 显示出来 + 锁图标 + tooltip说明，比给一个会骗人的开关诚实。
 */

export default function StageOrderPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const orderStages = useBiz2Store((s) => s.orderStages);
  const updateOrderStage = useBiz2Store((s) => s.updateOrderStage);
  const resetBiz2 = useBiz2Store((s) => s.resetBiz2);

  const [showOff, setShowOff] = useState(true);
  /** 抽屉态：正在编辑的阶段（null = 关闭）。 */
  const [editing, setEditing] = useState<OrderStageValue | null>(null);
  const [draftOrder, setDraftOrder] = useState(0);
  const [draftSla, setDraftSla] = useState(0);

  const rows = useMemo(
    () =>
      [...orderStages]
        .filter((s) => showOff || s.enabled)
        .sort((a, b) => a.order - b.order || a.value.localeCompare(b.value)),
    [orderStages, showOff],
  );

  const offCount = orderStages.filter((s) => !s.enabled).length;

  /** 演示订单里落在该阶段的单数 —— 与 `usageCount` 同义：告诉你停用会影响多少存量。 */
  const usedBy = (value: string): number => ORDER_ROWS.filter((r) => r.stageKey === value).length;

  const onOrder = (s: OrderStageValue, order: number) => {
    if (Number.isNaN(order)) return;
    updateOrderStage(s.value, { order });
  };

  const offSuffix = offCount > 0 ? t('cc.dict.offSuffix', { count: offCount }) : '';

  const columns = [
    {
      title: t('cc.dict.order'),
      key: 'order',
      width: 11,
      render: (_v: unknown, row: OrderStageValue) => (
        <label className="lx-cc-dict__order">
          <input
            className="lx-cc-field__control"
            type="number"
            aria-label={`${t('cc.dict.order')} ${t(row.labelKey)}`}
            value={row.order}
            onChange={(e) => onOrder(row, Number(e.target.value))}
          />
        </label>
      ),
    },
    {
      title: t('cc.biz.stageOrder.col.stage'),
      key: 'stage',
      width: 20,
      render: (_v: unknown, row: OrderStageValue) => (
        <span className="lx-cell-title">
          <LxTag variant={row.enabled ? 'done' : 'producing'}>{t(row.labelKey)}</LxTag>
          <span className="lx-cell-code lx-num">{row.value}</span>
        </span>
      ),
    },
    {
      title: t('cc.biz.stageOrder.col.transit'),
      key: 'transit',
      width: 15,
      render: (_v: unknown, row: OrderStageValue) =>
        row.terminal ? (
          <Tooltip title={t('cc.biz.stageOrder.terminalHint')}>
            <span className="lx-cc-dict__ro">
              <LxTag variant="done">{t('cc.biz.stageOrder.terminal')}</LxTag>
              <LockOutlined />
            </span>
          </Tooltip>
        ) : (
          <span className="lx-muted">{t('cc.biz.stageOrder.inTransit')}</span>
        ),
    },
    {
      title: t('cc.biz.stageOrder.col.sla'),
      key: 'sla',
      width: 13,
      render: (_v: unknown, row: OrderStageValue) => (
        <span className="lx-num">
          {row.slaDays > 0 ? t('cc.biz.stageOrder.slaDays', { days: row.slaDays }) : t('cc.biz.stageOrder.slaNone')}
        </span>
      ),
    },
    {
      /* 表头不能直接用 `cc.dict.usedBy` —— 那个键的值是
         「{{count}} 处引用」，它是**给数值的模板**不是列名。
         当表头用就会把 `{{count}}` 原样印在表头上（截图里真的这么出现过）。
         列名要一个不带占位符的独立键。 */
      title: t('cc.dict.usedByCol'),
      key: 'used',
      width: 11,
      render: (_v: unknown, row: OrderStageValue) => {
        const used = usedBy(row.value);
        return used > 0 ? (
          <span className="lx-num">{t('cc.dict.usedByCount', { count: used })}</span>
        ) : (
          <span className="lx-muted">—</span>
        );
      },
    },
    {
      title: t('common.status'),
      key: 'enabled',
      width: 9,
      render: (_v: unknown, row: OrderStageValue) => (
        <LxTag variant={row.enabled ? 'done' : 'producing'}>
          {t(row.enabled ? 'cc.dict.enabled' : 'cc.dict.disabled')}
        </LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 21,
      render: (_v: unknown, row: OrderStageValue) => (
        <Space size={4} wrap className="lx-cc-actions">
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => {
              setEditing(row);
              setDraftOrder(row.order);
              setDraftSla(row.slaDays);
            }}
          >
            {t('cc.dict.action.edit')}
          </button>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => {
              updateOrderStage(row.value, { enabled: !row.enabled });
              void message.success(t('cc.dict.savedOne'));
            }}
          >
            {t(row.enabled ? 'cc.dict.disabled' : 'cc.dict.enabled')}
          </button>
          {/* 内置阶段不可删：删掉之后订单行的 stageKey 无法解读，且没有任何地方会提示少了什么。
              与「不可删、只能停用」是同一条理由在字典页的复用。 */}
          <Tooltip title={t('cc.biz.stageOrder.deleteBlocked')}>
            <button type="button" className="lx-cell-link lx-cell-link--danger lx-focusable" disabled>
              <DeleteOutlined />
            </button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer titleKey="cc.biz.stageOrder" subtitleKey="cc.biz.stageOrderDesc">
      <CcCrumb />
      <section className="lx-section">
        <LxSectionHeader
          title={t('cc.biz.stageOrder.listTitle')}
          sub={t('cc.biz.stageOrder.listSub', { total: orderStages.length, off: offSuffix })}
          actions={
            <Popconfirm
              title={t('cc.dict.resetHint')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => {
                resetBiz2();
                void message.success(t('cc.dict.saved'));
              }}
            >
              <Button size="small">{t('cc.dict.reset')}</Button>
            </Popconfirm>
          }
        />

        <LxTableCard
          tools={
            <button
              type="button"
              className={`lx-chip lx-focusable${showOff ? ' is-active' : ''}`}
              aria-pressed={showOff}
              onClick={() => setShowOff((prev) => !prev)}
            >
              {t(showOff ? 'cc.dict.showAll' : 'cc.dict.showEnabledOnly')}
              {offCount > 0 ? <span className="lx-num"> · {offCount}</span> : null}
            </button>
          }
        >
          <LxTable<OrderStageValue>
            fit
            columns={columns}
            dataSource={rows}
            total={rows.length}
            pageNo={1}
            pageSize={20}
            locale={{ emptyText: t('cc.dict.empty') }}
          />
        </LxTableCard>
      </section>

      {/* 编辑抽屉：顺序与阶段 SLA 一次改完。
          终态在这里只做展示 —— 它是 OTD 的定义，不是一个可以随手拨的开关。 */}
      {editing ? (
        <div className="lx-cc-mask" role="presentation" onClick={() => setEditing(null)}>
          <aside
            className="lx-cc-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('cc.dict.editTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="lx-cc-drawer__head">
              <h3 className="lx-cc-drawer__title">{t('cc.dict.editTitle')}</h3>
              <p className="lx-cc-drawer__sub">
                {t(editing.labelKey)} · <span className="lx-num">{editing.value}</span>
              </p>
            </header>

            <div className="lx-cc-drawer__body">
              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.dict.order')}</span>
                <input
                  className="lx-cc-field__control"
                  type="number"
                  value={draftOrder}
                  onChange={(e) => setDraftOrder(Number(e.target.value))}
                />
                <span className="lx-cc-field__hint">{t('cc.dict.orderHint')}</span>
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.biz.stageOrder.col.sla')}</span>
                <input
                  className="lx-cc-field__control"
                  type="number"
                  min={0}
                  value={draftSla}
                  onChange={(e) => setDraftSla(Number(e.target.value))}
                />
                <span className="lx-cc-field__hint">{t('cc.biz.stageOrder.slaHint')}</span>
              </div>

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.biz.stageOrder.col.transit')}</span>
                <span className="lx-cc-field__control lx-muted">
                  {editing.terminal ? t('cc.biz.stageOrder.terminal') : t('cc.biz.stageOrder.inTransit')}
                </span>
                <span className="lx-cc-field__hint">{t('cc.biz.stageOrder.terminalHint')}</span>
              </div>
            </div>

            <footer className="lx-cc-drawer__foot">
              <Button size="small" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  if (Number.isNaN(draftOrder) || draftOrder < 0) {
                    void message.warning(t('cc.dict.orderInvalid'));
                    return;
                  }
                  if (Number.isNaN(draftSla) || draftSla < 0) {
                    void message.warning(t('cc.biz.stageOrder.slaInvalid'));
                    return;
                  }
                  updateOrderStage(editing.value, { order: draftOrder, slaDays: draftSla });
                  setEditing(null);
                  void message.success(t('cc.dict.savedOne'));
                }}
              >
                {t('common.confirm')}
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
    </PageContainer>
  );
}