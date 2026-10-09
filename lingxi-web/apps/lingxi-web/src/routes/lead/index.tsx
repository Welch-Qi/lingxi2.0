import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DownOutlined, FilterOutlined, ImportOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { findProduct } from '@/routes/product/data';
import { GRADE_ORDER, LEADS, LEAD_AGGREGATE, STATUS_ORDER, UNASSIGNED_OWNER_KEY, leadGrade } from './data';
import type { LeadRecord, LeadStatus } from './data';

/**
 * 线索中心首页（/lead）—— 从名单到合格线索。
 *
 * 版式与客户中心共用同一套布局词汇（`.lx-entrybar` / `.lx-facetbar` /
 * `.lx-filterpanel` / `.lx-listblock`），三页同构，降学习成本。
 *
 * 本页的三条口径，直接来自《产品规划说明书V2.1》第三章：
 *   ① **线索不是客户**：列表里没有客户编码 —— 编码是建档后才有的；
 *   ② **转化一次且可追溯**：`convertedCustomerId` 有值即"已转化"，操作列直接跳客户档案；
 *   ③ **状态只有 3 态**（待联系 / 已转化 / 无效）：是否已分配由负责人是否为空表达，
 *      不占状态位（附件明确：状态位只表达业务结论，不表达流转过程）。
 *
 * 2026-09-25 列表改版（用户三条）：首列「线索名称」换成「线索创建时间」（并收编原
 * 「线索时间」列，同一个值不再列两遍）；增「意向产品」「跟进人」两列；操作列由
 * 单一「认领」扩成按状态给的动作组（认领 / 跟进 / 作废）。详见 columns 上的注释。
 */

/** 状态标签配色：待联系=审阅态、已转化=完成态、无效=图文态（中性，不做红绿褒贬）。 */
const STATUS_VARIANT: Record<LeadStatus, 'review' | 'done' | 'graphic'> = {
  pending: 'review',
  converted: 'done',
  invalid: 'graphic',
};

/** 筛选面板的一格下拉。 */
function SelectCell({
  className,
  label,
  value,
  options,
  onChange,
}: {
  className: string;
  label: string;
  value: string;
  options: readonly { key: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className={`lx-filterpanel__cell ${className}`}>
      <span className="lx-filterpanel__label">{label}</span>
      <span className="lx-filterpanel__selectwrap">
        <select
          className="lx-filterpanel__select lx-focusable"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <DownOutlined className="lx-filterpanel__caret" aria-hidden="true" />
      </span>
    </div>
  );
}

interface FilterState {
  codeName: string;
  registeredFrom: string;
  registeredTo: string;
  source: string;
  country: string;
  grade: string;
}

const EMPTY_FILTERS: FilterState = {
  codeName: '',
  registeredFrom: '',
  registeredTo: '',
  source: 'all',
  country: 'all',
  grade: 'all',
};

export default function LeadHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFacet, setStatusFacet] = useState('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const patchFilters = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));
  const applyFilters = () => setAppliedFilters(filters);
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setStatusFacet('all');
  };

  const statusOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...STATUS_ORDER.map((status) => ({ key: status, label: t(`lead.status.${status}`) })),
  ];
  const sourceOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...[...new Set(LEADS.map((row) => row.sourceKey))].map((key) => ({ key, label: t(key) })),
  ];
  const countryOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...[...new Set(LEADS.map((row) => row.countryKey))].map((key) => ({ key, label: t(key) })),
  ];
  const gradeOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...GRADE_ORDER.map((key) => ({ key, label: t(`lead.grade.${key}`) })),
  ];

  const keywordNeedle = appliedKeyword.trim().toLowerCase();

  const visibleRows = LEADS.filter((row) => {
    if (statusFacet !== 'all' && row.status !== statusFacet) {
      return false;
    }
    if (appliedFilters.source !== 'all' && row.sourceKey !== appliedFilters.source) {
      return false;
    }
    if (appliedFilters.country !== 'all' && row.countryKey !== appliedFilters.country) {
      return false;
    }
    if (appliedFilters.grade !== 'all' && leadGrade(row.score) !== appliedFilters.grade) {
      return false;
    }
    // 线索时间是 YYYY-MM-DD 的字典序，与日期序一致，不必转 Date
    if (appliedFilters.registeredFrom && row.registeredAt < appliedFilters.registeredFrom) {
      return false;
    }
    if (appliedFilters.registeredTo && row.registeredAt > appliedFilters.registeredTo) {
      return false;
    }
    if (appliedFilters.codeName.trim()) {
      const needle = appliedFilters.codeName.trim().toLowerCase();
      if (!row.code.toLowerCase().includes(needle) && !row.name.toLowerCase().includes(needle)) {
        return false;
      }
    }
    if (!keywordNeedle) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(keywordNeedle) ||
      row.code.toLowerCase().includes(keywordNeedle) ||
      t(row.contactKey).toLowerCase().includes(keywordNeedle) ||
      t(row.countryKey).toLowerCase().includes(keywordNeedle)
    );
  });

  /**
   * 列表列（2026-09-25 改版，用户三条要求）。
   *
   * ① 首列由「线索名称」换成「线索创建时间」：名称是长文本，要靠省略号才塞得下，
   *    而线索池是**按时间流转的队列**（越新的越要抢），先看"这条多久了"比先看名字有用。
   *    原先第 5 列另有一个「线索时间」列（同一个 `registeredAt`），两列并存就是同一个值
   *    列两遍，故一并合并到首位这一列。
   * ② 增「意向产品」（外键换商品名）与「跟进人」—— 与商机中心、客户360 同一处置：
   *    列头复用 `opp.col.*`（同概念同数据，不另抄文案），商品名走 `findProduct`。
   * ③ 九列的宽度预算（2026-09-24 更新）：本表改走 `LxTable` 的 `fit`
   *    （`table-layout: fixed` + **百分比列宽、合计 100%**），列宽的权威只有下面的
   *    `width`，内容反过来不能把列撑宽。此前是"声明 px + 内容 max-content 取大"，
   *    实测自然宽 1092px，而 1280 视口内容区 998px、1366 视口 1084px —— **1366 及以下出横向滚动条**。
   *    改成百分比之后表格宽恒等于容器宽，任何视口都不可能横向溢出；
   *    超出的内容按"截断 + `title` 悬停看全"处理。
   *
   * 百分比不是平均分的：英文表头最长的两列（`Follow-up owner`、`Action`）优先满足
   * —— 表头被截断，整列就读不出叫什么；其余按内容自然宽的比例分。
   */
  const columns = [
    {
      /* 首列 = 线索创建时间（原「线索名称」列的落点，同时收编原第 5 列的「线索时间」）。
         名称与编码不再进列表 —— 两者仍可搜（顶栏搜索框）可筛（筛选面板「线索编码/名称」），
         只是不再各占一格宽度。 */
      title: t('lead.col.registeredAt'),
      dataIndex: 'registeredAt',
      key: 'registeredAt',
      width: '10%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      /* 11%：线索编码 = 来源两位简称 + 8 位注册日期 + 4 位序号（如 EX202609220001），
         原子单位、不可截断，故下界是硬的；截断时给 title 看全。 */
      title: t('lead.col.code'),
      dataIndex: 'code',
      key: 'code',
      width: '13%',
      render: (value: string) => <span className="lx-cell-text lx-num" title={value}>{value}</span>,
    },
    {
      /* 12%：品名长度不可控（最长 'Portable Power Station 1000W'），本列承担截断。
         表头英文 'Intended product' ≈90px，12% @1280 = 120px − 内边距 16px = 104px，放得下。 */
      title: t('opp.col.product'),
      dataIndex: 'intendedProductId',
      key: 'product',
      width: '10%',
      render: (value: string) => {
        const name = findProduct(value)?.name ?? value;
        return (
          <span className="lx-oppprod" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      title: t('lead.col.source'),
      dataIndex: 'sourceKey',
      key: 'source',
      /* 6%：英文来源名最长 `Social engagement`（≈123px）远超列宽 —— 必然截断。
         截断必须带 `title`（用户 2026-09-24 要求"显示不全截断、悬停显示全"）；
         且要包一层 `.lx-cell-text`：直接把文案渲染进 `td` 时，省略号虽由 `td` 产生，
         但**没有元素可以挂 `title`**，悬停读不到全文。 */
      width: '6%',
      render: (value: string) => (
        <span className="lx-cell-text" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      /* 7%：一格两行（姓名 主 + 职务 辅）。职务是自由文本，英文
         「Head of engineering」比列宽还长 —— 固定布局下它会被省略号截断（不再是折行），
         故**两行都必须带 `title`**：截断后不给完整读法就成了信息丢失。 */
      title: t('lead.col.contact'),
      dataIndex: 'contactKey',
      key: 'contact',
      width: '7%',
      render: (value: string, row: LeadRecord) => (
        <span className="lx-cell">
          <span className="lx-cell-title lx-cell-title--sm" title={t(value)}>
            {t(value)}
          </span>
          <span className="lx-cell-code" title={t(row.contactRoleKey)}>
            {t(row.contactRoleKey)}
          </span>
        </span>
      ),
    },
    {
      title: t('cus.col.country'),
      dataIndex: 'countryKey',
      key: 'country',
      width: '7%',
      render: (value: string) => (
        <span className="lx-cell-text" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      /* 9%：值是 `LxTag` 胶囊，胶囊自带 nowrap、不能被压 ——
         列宽不足时它会**溢出格子被硬裁**（探针 CLIP 那一类，连省略号都没有）。
         英文最长的状态名要放得下，故这条下界是硬的。 */
      title: t('lead.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '9%',
      render: (value: LeadStatus) => (
        <LxTag variant={STATUS_VARIANT[value]}>{t(`lead.status.${value}`)}</LxTag>
      ),
    },
    {
      /* 9%：一格两行 —— 分值 + 分级（分级是分值的派生值，弱化处理）。
         两个都在一行内，宽度需求 ≈ 分值 3 字符 + 分级 8 字符。 */
      title: t('lead.col.score'),
      dataIndex: 'score',
      key: 'score',
      width: '9%',
      render: (value: number) => (
        <span className="lx-leadscore">
          {/* 线索评分是 0–100 的整数（最多 3 字符），不存在被截断的情形 → 不挂 title */}
          <span className="lx-num">{value}</span>
          <span className="lx-leadscore__grade">{t(`lead.grade.${leadGrade(value)}`)}</span>
        </span>
      ),
    },
    {
      /* 11%：值是「Echo（智能体）」/ 英文人名，中英混排 ——
         要同时放下表头 `Follow-up owner`（15 字符 ≈84px，11% @1280 = 110px − 16px = 94px ✓）
         与单元格内容。 */
      title: t('opp.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '11%',
      render: (value: string) => (
        <span className="lx-oppowner" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      /* 操作：动作按状态给，最多三个（认领 / 跟进 / 作废）。
         · 已转化 → 只有「客户360」这一条回链（转化是终态，不再有动作）；
         · 已无效 → 破折号（"无事可做"），不留空单元格（空白会被读成"这行数据缺了"）；
         · 待联系 → 「跟进」「作废」恒有，「认领」**只在没有负责人时**才出现
           （用户裁决 2026-09-25）—— 已经有人跟的线索再点"认领"是抢单，不是认领。

         19% 是本表给得最重的一列，理由：三个动作（英文 `Claim / Follow up / Discard`）
         在 12px 字号下约 145px，19% @1280 = 190px − 内边距 16px = 166px ✓；
         给窄了就折成两行，而这一列只要有一行折行，TDLINES 就会报「Action 列 1/2 混排」。
         （三个动作能压到 145px 靠的是 `.lx-oppops .lx-cell-link { padding: 0 }`
         —— 清掉按钮残留的 UA 默认 padding，每个动作省 12px，见 styles/workspace.css。） */
      title: t('common.action'),
      key: 'action',
      width: '18%',
      render: (_value: unknown, row: LeadRecord) => {
        if (row.convertedCustomerId) {
          return (
            <button
              type="button"
              className="lx-cell-link lx-focusable"
              onClick={() => void navigate(`/customer/360/${row.convertedCustomerId}`)}
            >
              {t('cus.action.360')}
            </button>
          );
        }
        if (row.status === 'invalid') {
          return <span className="lx-muted">—</span>;
        }
        return (
          <span className="lx-oppops">
            {row.ownerKey === UNASSIGNED_OWNER_KEY ? (
              <button type="button" className="lx-cell-link lx-focusable">
                {t('lead.action.claim')}
              </button>
            ) : null}
            <button type="button" className="lx-cell-link lx-focusable">
              {t('opp.action.followUp')}
            </button>
            <button type="button" className="lx-cell-link lx-focusable">
              {t('lead.action.void')}
            </button>
          </span>
        );
      },
    },
  ];

  const applyKeyword = () => setAppliedKeyword(keyword);

  return (
    <PageContainer titleKey="lead.page.home" hideTitle>
      <div className="lx-entrybar">
        <button
          type="button"
          className="lx-entrybar__create lx-focusable"
          onClick={() => {
            void navigate('/lead/new');
          }}
        >
          <UserAddOutlined />
          {t('lead.entry.create')}
        </button>
        <button
          type="button"
          className="lx-entrybar__ghost lx-focusable"
          onClick={() => {
            void navigate('/lead/import');
          }}
        >
          <ImportOutlined />
          {t('cus.entry.import')}
        </button>
        <label className="lx-entrybar__search">
          <SearchOutlined className="lx-entrybar__icon" aria-hidden="true" />
          <input
            type="search"
            value={keyword}
            placeholder={t('lead.entry.searchPlaceholder')}
            aria-label={t('lead.entry.searchPlaceholder')}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyKeyword();
              }
            }}
          />
        </label>
        <button type="button" className="lx-entrybar__query lx-focusable" onClick={applyKeyword}>
          {t('cus.entry.query')}
        </button>
      </div>

      <div className="lx-facetbar">
        <div className="lx-seg" role="group" aria-label={t('lead.col.status')}>
          {statusOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={option.key === statusFacet}
              className={`lx-seg__item lx-focusable${option.key === statusFacet ? ' is-active' : ''}`}
              onClick={() => setStatusFacet(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`lx-facetbar__toggle lx-focusable${panelOpen ? ' is-open' : ''}`}
          aria-expanded={panelOpen}
          aria-controls="lead-filter-panel"
          aria-label={t('cus.filter.toggle')}
          title={t('cus.filter.toggle')}
          onClick={() => setPanelOpen((open) => !open)}
        >
          <FilterOutlined />
        </button>
      </div>

      {panelOpen ? (
        <section className="lx-glass lx-filterpanel" id="lead-filter-panel">
          <div className="lx-filterpanel__grid">
            <div className="lx-filterpanel__cell lx-filterpanel__cell--name">
              <span className="lx-filterpanel__label">{t('lead.filter.codeName')}</span>
              <input
                type="search"
                className="lx-filterpanel__input"
                value={filters.codeName}
                placeholder={t('lead.filter.codeNamePlaceholder')}
                aria-label={t('lead.filter.codeName')}
                onChange={(event) => patchFilters({ codeName: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    applyFilters();
                  }
                }}
              />
            </div>

            <div className="lx-filterpanel__cell lx-filterpanel__cell--dates">
              <span className="lx-filterpanel__label">{t('lead.filter.registeredAt')}</span>
              <div className="lx-filterpanel__dates">
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.registeredFrom}
                  aria-label={t('cus.filter.createdFrom')}
                  onChange={(event) => patchFilters({ registeredFrom: event.target.value })}
                />
                <span className="lx-filterpanel__dash" aria-hidden="true">
                  –
                </span>
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.registeredTo}
                  aria-label={t('cus.filter.createdTo')}
                  onChange={(event) => patchFilters({ registeredTo: event.target.value })}
                />
              </div>
            </div>

            <SelectCell
              className="lx-filterpanel__cell--source"
              label={t('lead.col.source')}
              value={filters.source}
              options={sourceOptions}
              onChange={(value) => patchFilters({ source: value })}
            />
            <SelectCell
              className="lx-filterpanel__cell--country"
              label={t('cus.col.country')}
              value={filters.country}
              options={countryOptions}
              onChange={(value) => patchFilters({ country: value })}
            />
            <SelectCell
              className="lx-filterpanel__cell--grade"
              label={t('lead.filter.grade')}
              value={filters.grade}
              options={gradeOptions}
              onChange={(value) => patchFilters({ grade: value })}
            />

            <div className="lx-filterpanel__actions">
              <button type="button" className="lx-filterpanel__submit lx-focusable" onClick={applyFilters}>
                {t('cus.entry.query')}
              </button>
              <button type="button" className="lx-filterpanel__reset lx-focusable" onClick={resetFilters}>
                {t('cus.filter.reset')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="lx-listblock lx-leadlist">
        <LxSectionHeader
          title={t('lead.list.title')}
          sub={`${t('lead.list.sub')} · ${t('lead.list.matched', { count: visibleRows.length })}`}
        />
        <LxTableCard>
          <LxTable<LeadRecord>
            columns={columns}
            dataSource={[...visibleRows]}
            total={LEAD_AGGREGATE.total}
            pageNo={1}
            pageSize={20}
            /* 固定列宽 + 永不横滚：本表九列的自然宽 1092px 装不进 1366 及以下的
               内容区（998 / 1084px），开 fit 之后列宽只认上面的百分比。 */
            fit
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
