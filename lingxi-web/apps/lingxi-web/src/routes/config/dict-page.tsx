import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App, Button, Popconfirm, Select, Space, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  DICT_DEFS,
  customLabel,
  isBuiltinValue,
  usageCount,
  useDictStore,
  type DictDef,
  type DictId,
  type DictValue,
} from './dict-data';
import { CcCrumb } from './_shared';

/**
 * 业务字典配置页（/config/business/:dictId）—— 一页管三类字典。
 *
 * ## 为什么三类字典共用一页而不是三页各写一份
 *
 * 三者的可配置项完全一致：**取值 / 顺序 / 启用状态**（阶段多一个性质、意向多一个 SLA）。
 * 差异只在外壳的呈现，而 CRUD 的交互（新增、停用、删除确认、重置）逻辑完全一致。
 * 分三页写一遍的结果是三处逻辑各自演化，半年后同一个"停用"在三页有三种行为。
 *
 * 用 `dictId` 驱动的一套组件，差异通过 `shape` 声明式表达：
 * `shape='stage'` 多一列状态性质、`shape='intent'` 多一列 SLA。
 *
 * ## 增删的取舍
 *
 * **内置取值不可删，只能停用** —— 因为演示数据与历史业务数据都按 `value` 存。
 * 删掉一个已被引用的取值，那些记录就再也解读不出原义（界面上会变成空白或一个陌生词）。
 * 停用则是安全的：下拉里不再出现，历史数据照旧显示。
 * 自定义取值（用户自己新增的）可以删，因为还没有数据引用它。
 *
 * ## 可配项的边界：为什么「阶段性质」和「SLA 天数」是只读的
 *
 * 本页开放的是**顺序 / 启用 / 新增 / 删除**四项。阶段性质（`kind`）与
 * 跟进 SLA（`slaDays`）虽然显示在行里，但**刻意不可编辑**（行内带锁图标）：
 *
 * - `kind` 决定赢率与漏斗的统计口径，而那几处（`opportunity/data.ts`、
 *   `customer/data.ts` 的 `isOpenStage`）是**纯函数**，在模块作用域求值，
 *   拿不到 store。若让它可配，用户改完会看到下拉变了但赢率没变 ——
 *   这正是本文件上方注释里批评 `setValueLabel` 的同一类"配了没生效"陷阱。
 * - `slaDays` 同理，它被 SLA 逾期判定消费，改了会与告警口径脱节。
 *
 * 与其给一个会骗人的输入框，不如显示出来 + 锁图标 + tooltip 说明为什么不能改。
 * 真要改口径，路径是改 `customer/data.ts` 的 `STAGE_KIND` 走发版 ——
 * 统计口径变更属于业务规则变更，不该由配置页随手改掉。
 */
/** 兜底字典元信息：调用方传了未知 dictId 时不至于整页崩在半路。 */
const FALLBACK_DEF: DictDef = {
  id: 'stage-opp',
  titleKey: 'cc.dict.stageOpp',
  descKey: 'cc.dict.stageOppDesc',
  shape: 'stage',
};

export default function DictConfigPage({ dictId }: { dictId: DictId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const dicts = useDictStore((s) => s.dicts);
  const addValue = useDictStore((s) => s.addValue);
  const removeValue = useDictStore((s) => s.removeValue);
  const toggleValue = useDictStore((s) => s.toggleValue);
  const setValueOrder = useDictStore((s) => s.setValueOrder);
  const updateValue = useDictStore((s) => s.updateValue);
  const resetDict = useDictStore((s) => s.resetDict);

  const def = DICT_DEFS.find((d) => d.id === dictId) ?? FALLBACK_DEF;
  const values = dicts[dictId];
  const [showOff, setShowOff] = useState(true);
  /** 抽屉态：正在编辑的取值（null = 关闭）。行内「编辑」打开，改完一次落盘多项。 */
  const [editing, setEditing] = useState<DictValue | null>(null);
  const [draftOrder, setDraftOrder] = useState(0);
  const [draftKind, setDraftKind] = useState<'open' | 'won' | 'lost'>('open');

  const rows = useMemo(
    () => [...values].filter((v) => showOff || v.enabled).sort((a, b) => a.order - b.order || a.value.localeCompare(b.value)),
    [values, showOff],
  );

  /** 已停用的取值数（章节副标题与筛选胶囊都用它）。 */
  const offCount = values.filter((v) => !v.enabled).length;

  /** 展示名：内置取值走既有语言包，自定义取值走 cc.dict.custom.<value>。 */
  const labelOf = (v: DictValue): string => {
    const key = v.labelKey.startsWith('cc.dict.custom.') ? customLabel(v.value) : v.labelKey;
    const text = t(key);
    // 语言包里没有该自定义值（用户刚建的名字还没进包）→ 直接显示 value 本身，
    // 绝不显示裸 key：裸 key 会被误读成系统错误。
    return text === key ? v.value : text;
  };

  const onAdd = () => {
    // 新值标识用时间戳而非序号：用户可能删过几次，序号会撞上已存在的 value
    const value = `custom${Date.now().toString(36).slice(-4)}`;
    const maxOrder = Math.max(0, ...values.map((v) => v.order));
    addValue(dictId, { value, labelKey: customLabel(value), order: maxOrder + 10, enabled: true });
    void message.success(t('cc.dict.created'));
  };

  const onDelete = (v: DictValue) => {
    if (isBuiltinValue(dictId, v.value)) {
      void message.warning(t('cc.dict.deleteBlocked'));
      return;
    }
    removeValue(dictId, v.value);
    void message.success(t('cc.dict.deleted'));
  };

  const onOrder = (v: DictValue, order: number) => {
    if (Number.isNaN(order)) return;
    setValueOrder(dictId, v.value, order);
  };

  /* 章节副标题：只在真的停了值时才带后缀。全启用时说「共 8 个取值，0 个已停用」是噪声。 */
  const offSuffix = offCount > 0 ? t('cc.dict.offSuffix', { count: offCount }) : '';

  return (
    <PageContainer titleKey={def.titleKey} subtitleKey={def.descKey}>
      <CcCrumb />
      <section className="lx-section">
        <LxSectionHeader
          title={t('cc.dict.title')}
          /* 副标题不重复页头那一句：PageContainer 的 subtitle 已经是 def.descKey，
             两处一字不差地重复会让页面读起来像复制粘贴出错。
             这里换成"当前字典有多少取值、其中几个已停用"—— 信息不同才有存在的理由。 */
          sub={t('cc.dict.listSub', { total: values.length, off: offSuffix })}
          actions={
            <Space size={6}>
              <Button size="small" icon={<PlusOutlined />} onClick={onAdd}>
                {t('cc.dict.addValue')}
              </Button>
              <Popconfirm
                title={t('cc.dict.resetHint')}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
                onConfirm={() => {
                  resetDict(dictId);
                  void message.success(t('cc.dict.saved'));
                }}
              >
                <Button size="small">{t('cc.dict.reset')}</Button>
              </Popconfirm>
            </Space>
          }
        />

        <LxTableCard
          tools={
            <>
              {/* 显示停用项的开关：文案必须说清"现在显示什么"而不是"可以做什么"。
                  写成「停用 / 启用」会让人以为点了就去停用取值（那是行内的另一个动作），
                  这里只回答"停用的那些看不看"。 */}
              <button
                type="button"
                className={`lx-chip lx-focusable${showOff ? ' is-active' : ''}`}
                aria-pressed={showOff}
                onClick={() => setShowOff((prev) => !prev)}
              >
                {t(showOff ? 'cc.dict.showAll' : 'cc.dict.showEnabledOnly')}
                {offCount > 0 ? <span className="lx-num"> · {offCount}</span> : null}
              </button>
            </>
          }
        >
          <div className="lx-cc-dict">
            {rows.length === 0 ? (
              <p className="lx-cc-empty">{t('cc.dict.empty')}</p>
            ) : (
              rows.map((v) => {
                const used = usageCount(dictId, v.value);
                const builtin = isBuiltinValue(dictId, v.value);
                return (
                  <div key={v.value} className={`lx-cc-dict__row${v.enabled ? '' : ' is-off'}`}>
                    <label className="lx-cc-dict__order">
                      <span className="lx-cc-field__label">{t('cc.dict.order')}</span>
                      <input
                        className="lx-cc-field__control"
                        type="number"
                        value={v.order}
                        onChange={(e) => onOrder(v, Number(e.target.value))}
                      />
                    </label>

                    <span className="lx-cc-dict__name">
                      <LxTag variant={v.enabled ? 'done' : 'producing'}>{labelOf(v)}</LxTag>
                    </span>

                    <span className="lx-cc-dict__key lx-num">{v.value}</span>

                    {def.shape === 'stage' ? (
                      <Tooltip title={t('cc.dict.readOnlyKind')}>
                        <span className="lx-cc-dict__ro">
                          <LxTag variant="lang">{t(`cc.dict.stageKind.${v.kind ?? 'open'}`)}</LxTag>
                          <LockOutlined />
                        </span>
                      </Tooltip>
                    ) : null}

                    {def.shape === 'intent' ? (
                      <Tooltip title={t('cc.dict.readOnlySla')}>
                        <label className="lx-cc-dict__sla">
                          <span className="lx-cc-field__label">{t('cc.dict.sla')}</span>
                          <span className="lx-num">{v.slaDays ?? 0}</span>
                        </label>
                      </Tooltip>
                    ) : null}

                    {used > 0 ? (
                      <Tooltip title={t('cc.dict.inUse', { count: used })}>
                        <span className="lx-cc-dict__key">
                          <InfoCircleOutlined /> {t('cc.dict.usedBy', { count: used })}
                        </span>
                      </Tooltip>
                    ) : null}

                    <button
                      type="button"
                      className="lx-cell-link lx-focusable"
                      onClick={() => {
                        setEditing(v);
                        setDraftOrder(v.order);
                        setDraftKind(v.kind ?? 'open');
                      }}
                    >
                      {t('cc.dict.action.edit')}
                    </button>

                    <button
                      type="button"
                      className="lx-cell-link lx-focusable"
                      onClick={() => toggleValue(dictId, v.value)}
                    >
                      {t(v.enabled ? 'cc.dict.disabled' : 'cc.dict.enabled')}
                    </button>

                    <Popconfirm
                      title={builtin ? t('cc.dict.deleteBlocked') : t('cc.dict.deleteConfirm')}
                      okText={t('common.confirm')}
                      cancelText={t('common.cancel')}
                      onConfirm={() => onDelete(v)}
                    >
                      <button
                        type="button"
                        className="lx-cell-link lx-cell-link--danger lx-focusable"
                        disabled={builtin}
                      >
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  </div>
                );
              })
            )}
          </div>
        </LxTableCard>
      </section>

      {/* 编辑抽屉：一个取值的多项属性一次改完、一次保存。
          行内只留「启用/停用」这种一步动作 —— 顺序与性质要解释清楚才敢改，
          塞进窄列里既放不下说明也放不下输入框。 */}
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
                {labelOf(editing)} · <span className="lx-num">{editing.value}</span>
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

              {def.shape === 'stage' ? (
                <div className="lx-cc-field">
                  <span className="lx-cc-field__label">{t('cc.dict.kind')}</span>
                  <Select
                    className="lx-cc-field__control"
                    value={draftKind}
                    onChange={setDraftKind}
                    disabled={isBuiltinValue(dictId, editing.value)}
                    options={(['open', 'won', 'lost'] as const).map((k) => ({
                      value: k,
                      label: t(`cc.dict.stageKind.${k}`),
                    }))}
                  />
                  <span className="lx-cc-field__hint">
                    {isBuiltinValue(dictId, editing.value)
                      ? t('cc.dict.readOnlyKind')
                      : t('cc.dict.kindHintCustom')}
                  </span>
                </div>
              ) : null}

              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.dict.nameKey')}</span>
                <span className="lx-cc-field__control lx-muted lx-num">{editing.value}</span>
                <span className="lx-cc-field__hint">{t('cc.dict.nameKeyHint')}</span>
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
                  if (Number.isNaN(draftOrder)) {
                    void message.warning(t('cc.dict.orderInvalid'));
                    return;
                  }
                  updateValue(
                    dictId,
                    editing.value,
                    def.shape === 'stage' ? { order: draftOrder, kind: draftKind } : { order: draftOrder },
                  );
                  setEditing(null);
                  void message.success(t('cc.dict.saved'));
                }}
              >
                {t('common.confirm')}
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}

      {/* 同一分区内的其余字典：放在底部而不是顶部，让用户改完一个能直接跳下一个。
          跳转路径**直接用 dict.id** —— 此前是一串三元表达式把三个 id 映射到三条路径，
          那样每加一个字典都要记得改这里，漏改的表现是「底部胶囊点过去还是同一个页」。
          `d.id === dictId ? 'stage-opp' : ...` 这种写法在六个字典下已是错的了。*/}
      <section className="lx-section">
        <LxSectionHeader title={t('cc.dict.title')} sub={t('cc.dict.sub')} />
        <Space size={8} wrap>
          {DICT_DEFS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`lx-chip lx-focusable${d.id === dictId ? ' is-active' : ''}`}
              aria-pressed={d.id === dictId}
              onClick={() => void navigate(`/config/business/${d.id}`)}
            >
              {t(d.titleKey)}
            </button>
          ))}
        </Space>
      </section>
    </PageContainer>
  );
}