import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  CloseCircleFilled,
  DownOutlined,
  FilterOutlined,
  ImportOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { useActingIdentity } from '@/app/providers/useActingIdentity';
import { UNRESTRICTED_SCOPE, filterByScope } from '@/app/providers/dataScope';
import { AGGREGATE, CUSTOMERS, TYPE_VARIANT } from './data';
import type { CustomerRecord, CustomerTier, CustomerType } from './data';

/**
 * 客户中心首页（/customer）—— 客户资产的家。
 *
 * 2026-09-23 三次改版：
 *   ① 去掉页面标题，首屏第一眼就是客户数据；
 *   ② 顶部操作条：[新建客户][导入] 一组靠左，[搜索框][查询] 一组靠右 ——
 *      搜索从"输入即筛"改为**显式提交**（点查询或回车），避免边打字边跳结果；
 *   ③ 生命周期阶段分段筛选占一行，最右一枚漏斗图标展开高级筛选面板；
 *   ④ 列表横跨整宽（撤下右侧的「今日待跟进」与「客户结构」）。
 *
 * 2026-09-23 四次改版（用户给的三条）：
 *   ① **筛选面板压成两行**：原先七个字段各占一行（每行"字段名 | 控件"两列），
 *      展开后面板约 300px 高，把列表挤到首屏之外。现在改成 12 栏网格：
 *      第一行 编码名称(3) 建档时间(4) 客户类型(2) 国家(3)，第二行 城市/意向/价值/动作 各 3 栏。
 *      同时**控件由胶囊组改为下拉选择** —— 胶囊组在"值多且只选一个"的场景下铺得最长
 *      （国家 6 项、城市 14 项），下拉只占一格宽。
 *   ② **导出按钮去掉**，录入动作只剩「新建客户」「导入」。
 *   ③ 面板末行加「查询」「重置」两个按钮：面板内的改动**不再即时生效**，
 *      统一由「查询」提交（与顶部搜索同一个心智）；「重置」清空面板全部条件
 *      并把阶段分段拨回「全部」，避免出现"点了重置列表还是被筛着"的困惑。
 *
 * 两套 A/B/C/D **不共用标签与配色**（附件明确的坑）：意向等级 A/B/C/D 是商机属性、
 * 价值分层 S/A/B/C/D 是客户本体属性。意向等级自 2026-09-25 起**不再出现在本页**（见下）。
 *
 * 2026-09-25 五次改版（用户给的第 3 条）：
 *   ① **客户只按两个维度分类：客户类型 + 客户价值** —— 原先常驻的分段筛选是「生命周期阶段」
 *      （由名下商机归并出的派生值），它有两个问题：一是"这家客户走到哪一步"要看它最好的
 *      那笔生意，用户得先理解归并规则；二是阶段筛选与列表里的阶段列是同一件事的两处表达。
 *      现在换成客户本体的两个**存量属性**，两者都不依赖商机。
 *   ② **两个分段组同处一行**，最右仍是漏斗开关（与线索池、商机中心同构）。
 *      分组名写在组前面，否则两组都是"全部|……|……"读不出在筛什么。
 *   ③ **筛选面板精简**：撤下 客户类型 / 客户价值 / 客户意向 三格 —— 前两者已经提到
 *      常驻分段里（同一件事不该有两个入口），后者是**商机**属性、按它筛客户要绕一层
 *      "名下有没有未关闭的 A 级商机"，与"客户只按类型 + 价值分类"的定调不符。
 *      剩下的 客户编码/名称、客户建档时间、国家/地区、城市 四个字段压成**一行**。
 */

/** 分层徽标：代码 + 层级名。配色取五维色域里已有的色相，休眠层走中性灰（不新增色相）。 */
function TierBadge({ tier, label }: { tier: CustomerTier; label: string }) {
  return (
    <span className={`lx-custier lx-custier--${tier}`}>
      <b className="lx-custier__code">{tier.toUpperCase()}</b>
      <span className="lx-custier__name">{label}</span>
    </span>
  );
}

/**
 * 筛选面板里的一格下拉。
 *
 * 抽成组件而不是在 JSX 里写五遍：五个选择框的差异只有"标签、候选项、落在哪一栏"，
 * 写五遍会让"两行网格"这件结构上的事淹没在重复代码里。
 * `aria-label` 取可见标签文案 —— 可见标签与 `<span>` 而非 `<label>`，
 * 必须显式给出可访问名，否则读屏只念出一个没有上下文的下拉框。
 */
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

const TIER_ORDER: readonly CustomerTier[] = ['s', 'a', 'b', 'c', 'd'];
const TYPE_ORDER: readonly CustomerType[] = ['prospect', 'first', 'repeat'];

/** 高级筛选的字段状态。`all` 表示该维度不作限制。 */
interface FilterState {
  codeName: string;
  createdFrom: string;
  createdTo: string;
  country: string;
  city: string;
}

const EMPTY_FILTERS: FilterState = {
  codeName: '',
  createdFrom: '',
  createdTo: '',
  country: 'all',
  city: 'all',
};

export default function CustomerHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /** 当前身份（权限码 + 数据范围）。真实会话下 user 来自平台，此处为配置中心派生的视角身份。 */
  const acting = useActingIdentity();

  /** 顶部搜索：输入值与生效值分开 —— 点「查询」或回车才生效（用户要求的显式提交）。 */
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  /**
   * 两个常驻分段：客户类型 + 客户价值。
   * 点击即时生效 —— 它们是常驻的一维粗筛（各只 3 / 5 个取值），不适合再套一层提交。
   */
  const [typeFacet, setTypeFacet] = useState('all');
  const [tierFacet, setTierFacet] = useState('all');
  const [panelOpen, setPanelOpen] = useState(false);
  /**
   * 面板筛选同样分"草稿"与"生效"两份：面板内的每次改动只写草稿，
   * 由「查询」一次性提交。一个客户可能要同时改三四项条件（换国家再看城市），
   * 逐项即时生效会让列表来回跳几次，反而看不清自己在筛什么。
   */
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const patchFilters = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));

  const applyFilters = () => setAppliedFilters(filters);

  /** 重置：清空面板条件，并把两个分段拨回「全部」——
      否则分段上残留的选项会让用户以为「重置」没生效。 */
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setTypeFacet('all');
    setTierFacet('all');
  };

  /** 国家 / 城市的候选项直接由数据集归纳 —— 演示数据里出现过的才可筛，不硬编码一份清单。 */
  const countryOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...[...new Set(CUSTOMERS.map((row) => row.countryKey))].map((key) => ({ key, label: t(key) })),
  ];
  const cityOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...[...new Set(CUSTOMERS.map((row) => row.cityKey))].map((key) => ({ key, label: t(key) })),
  ];

  const typeOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...TYPE_ORDER.map((key) => ({ key, label: t(`cus.type.${key}`) })),
  ];
  const tierOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...TIER_ORDER.map((key) => ({ key, label: t(`cus.tier.${key}`) })),
  ];

  const keywordNeedle = appliedKeyword.trim().toLowerCase();

  /**
   * 数据权限范围过滤（2026-10-06）。
   *
   * 放在所有筛选条件**之前**（而不是之后）：范围是权限，不是筛选 ——
   * 它不该出现在筛选面板里、也不该能被"清空筛选"绕过。
   * 用户在配置中心把某人的范围改成 SELF，这个列表就会立刻少到只剩他自己负责的行；
   * 切回 ALL 又全部回来。这条链路是"数据权限是真功能"的唯一证据。
   *
   * 真实后端就绪后这一行由服务端下推查询条件（前端只做渲染层过滤，不是安全边界）。
   */
  const scopedRows = filterByScope(CUSTOMERS, acting?.scopeCtx ?? UNRESTRICTED_SCOPE);

  const visibleRows = scopedRows.filter((row) => {
    if (typeFacet !== 'all' && row.type !== typeFacet) {
      return false;
    }
    if (tierFacet !== 'all' && row.tier !== tierFacet) {
      return false;
    }
    if (appliedFilters.country !== 'all' && row.countryKey !== appliedFilters.country) {
      return false;
    }
    if (appliedFilters.city !== 'all' && row.cityKey !== appliedFilters.city) {
      return false;
    }
    // 建档时间是 YYYY-MM-DD 的字典序比较，与日期序一致，不必转 Date
    if (appliedFilters.createdFrom && row.createdAt < appliedFilters.createdFrom) {
      return false;
    }
    if (appliedFilters.createdTo && row.createdAt > appliedFilters.createdTo) {
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
      t(row.countryKey).toLowerCase().includes(keywordNeedle) ||
      t(row.cityKey).toLowerCase().includes(keywordNeedle)
    );
  });

  /**
   * 列表列。
   *
   * 列宽一律用**百分比、合计 100%**，配合 `LxTable` 的 `fit`（`table-layout: fixed`）——
   * 列宽的权威只有这里，内容再长也不能把列撑宽。本表八列原本靠"内容恰好装得下"
   * 侥幸不出横向滚动条（实测自然宽 ≤ 998px），但只要客户名再长一点、
   * 或窗口再窄一档就会滚；改成固定列宽后**任何视口都不可能横向溢出**，
   * 代价是长客户名 / 长职务被截断并由 `title` 兜全文。
   */
  const columns = [
    {
      title: t('cus.col.name'),
      dataIndex: 'name',
      key: 'name',
      width: '24%',
      render: (_value: string, row: CustomerRecord) => (
        <span className="lx-cell">
          {/* 分层跟名称同行：它是"这家客户有多重"的识别信息，和名称一体；独立成列时
              它会跟「客户类型」并排成两个徽标，容易被读成同一把尺子（附件明确是两套）。 */}
          <span className="lx-cell-name">
            <span className="lx-cell-title" title={row.name}>
              {row.name}
            </span>
            <TierBadge tier={row.tier} label={t(`cus.tier.${row.tier}`)} />
          </span>
          <span className="lx-cell-code" title={t(row.ownerKey)}>
            {t(row.ownerKey)}
          </span>
        </span>
      ),
    },
    {
      title: t('cus.col.code'),
      dataIndex: 'code',
      key: 'code',
      width: '10%',
      render: (value: string) => <span className="lx-cell-code lx-num" title={value}>{value}</span>,
    },
    {
      /* 13%：值是三类客户的胶囊，英文最长 `First-time buyer`（16 字符 ≈90px + 胶囊内边距）
         —— 胶囊自带 nowrap、压不动，列宽不足会被**硬裁**（连省略号都没有），
         故这条下界是硬的。 */
      title: t('cus.col.type'),
      dataIndex: 'type',
      key: 'type',
      width: '13%',
      render: (value: CustomerType) => (
        <LxTag variant={TYPE_VARIANT[value]}>{t(`cus.type.${value}`)}</LxTag>
      ),
    },
    {
      title: t('cus.col.country'),
      dataIndex: 'countryKey',
      key: 'country',
      width: '9%',
      render: (value: string) => (
        <span className="lx-cell-text" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      /* 12%：一格两行（姓名 + 职务）。职务是自由文本，
         两行都带 `title` —— 截断后不给完整读法就成了信息丢失。 */
      title: t('cus.col.contact'),
      dataIndex: 'contactKey',
      key: 'contact',
      width: '12%',
      render: (value: string, row: CustomerRecord) => (
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
      title: t('cus.col.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '10%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      title: t('cus.col.lastDeal'),
      dataIndex: 'lastDealAt',
      key: 'lastDeal',
      width: '10%',
      render: (value: string | null) =>
        value ? <span className="lx-num" title={value}>{value}</span> : <span className="lx-muted">{t('cus.list.neverDealt')}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: '12%',
      render: (_value: unknown, row: CustomerRecord) => (
        <button
          type="button"
          className="lx-cell-link lx-focusable"
          onClick={() => void navigate(`/customer/360/${row.id}`)}
        >
          {t('cus.action.360')}
        </button>
      ),
    },
  ];

  const applyKeyword = () => setAppliedKeyword(keyword);

  return (
    <PageContainer titleKey="cus.page.home" hideTitle>
      {/* 顶部操作条：录入类动作靠左、检索类动作靠右。搜索必须显式提交（用户要求配「查询」按钮）。 */}
      <div className="lx-entrybar">
        <button
          type="button"
          className="lx-entrybar__create lx-focusable"
          onClick={() => {
            void navigate('/customer/new');
          }}
        >
          <UserAddOutlined />
          {t('cus.entry.create')}
        </button>
        <button
          type="button"
          className="lx-entrybar__ghost lx-focusable"
          onClick={() => {
            void navigate('/customer/import');
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
            placeholder={t('cus.entry.searchPlaceholder')}
            aria-label={t('cus.entry.searchPlaceholder')}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyKeyword();
              }
            }}
          />
          {keyword ? (
            <button
              type="button"
              className="lx-entrybar__clear lx-focusable"
              aria-label={t('cus.entry.clear')}
              title={t('cus.entry.clear')}
              onClick={() => {
                setKeyword('');
                setAppliedKeyword('');
              }}
            >
              <CloseCircleFilled />
            </button>
          ) : null}
        </label>
        <button type="button" className="lx-entrybar__query lx-focusable" onClick={applyKeyword}>
          {t('cus.entry.query')}
        </button>
      </div>

      {/* 一行两组分段：客户类型 + 客户价值（2026-09-25 用户要求，取代原「生命周期阶段」）。
          组名必须写在组前面 —— 两组都是"全部 | ……"，不给名字读不出在筛哪个维度。
          修饰类 `--multi` 把 `.lx-seg` 的 `flex: 1` 关掉（两组各占一半会让选项被内部
          隐藏滚动条静默吃掉），并让漏斗开关贴到最右。 */}
      <div className="lx-facetbar lx-facetbar--multi">
        <span className="lx-facetbar__label">{t('cus.facet.type.label')}</span>
        <div className="lx-seg" role="group" aria-label={t('cus.facet.type.label')}>
          {typeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={option.key === typeFacet}
              className={`lx-seg__item lx-focusable${option.key === typeFacet ? ' is-active' : ''}`}
              onClick={() => setTypeFacet(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="lx-facetbar__label">{t('cus.facet.tier.label')}</span>
        <div className="lx-seg" role="group" aria-label={t('cus.facet.tier.label')}>
          {tierOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={option.key === tierFacet}
              className={`lx-seg__item lx-focusable${option.key === tierFacet ? ' is-active' : ''}`}
              onClick={() => setTierFacet(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`lx-facetbar__toggle lx-focusable${panelOpen ? ' is-open' : ''}`}
          aria-expanded={panelOpen}
          aria-controls="cus-filter-panel"
          aria-label={t('cus.filter.toggle')}
          title={t('cus.filter.toggle')}
          onClick={() => setPanelOpen((open) => !open)}
        >
          <FilterOutlined />
        </button>
      </div>

      {/* 高级筛选面板：只剩 4 个字段 + 查询/重置，压成**一行**（2+3+2+2+3 = 12 栏）。
          撤下 客户类型 / 客户价值（已提到常驻分段）与 客户意向（商机属性，不按它筛客户）。 */}
      {panelOpen ? (
        <section className="lx-glass lx-filterpanel lx-filterpanel--cus" id="cus-filter-panel">
          <div className="lx-filterpanel__grid">
            <div className="lx-filterpanel__cell lx-filterpanel__cell--name">
              <span className="lx-filterpanel__label">{t('cus.filter.codeName')}</span>
              <input
                type="search"
                className="lx-filterpanel__input"
                value={filters.codeName}
                placeholder={t('cus.filter.codeNamePlaceholder')}
                aria-label={t('cus.filter.codeName')}
                onChange={(event) => patchFilters({ codeName: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    applyFilters();
                  }
                }}
              />
            </div>

            <div className="lx-filterpanel__cell lx-filterpanel__cell--dates">
              <span className="lx-filterpanel__label">{t('cus.filter.createdAt')}</span>
              <div className="lx-filterpanel__dates">
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.createdFrom}
                  aria-label={t('cus.filter.createdFrom')}
                  onChange={(event) => patchFilters({ createdFrom: event.target.value })}
                />
                <span className="lx-filterpanel__dash" aria-hidden="true">
                  –
                </span>
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.createdTo}
                  aria-label={t('cus.filter.createdTo')}
                  onChange={(event) => patchFilters({ createdTo: event.target.value })}
                />
              </div>
            </div>

            <SelectCell
              className="lx-filterpanel__cell--country"
              label={t('cus.col.country')}
              value={filters.country}
              options={countryOptions}
              onChange={(value) => patchFilters({ country: value })}
            />
            <SelectCell
              className="lx-filterpanel__cell--city"
              label={t('cus.col.city')}
              value={filters.city}
              options={cityOptions}
              onChange={(value) => patchFilters({ city: value })}
            />

            <div className="lx-filterpanel__actions">
              <button
                type="button"
                className="lx-filterpanel__submit lx-focusable"
                onClick={applyFilters}
              >
                {t('cus.entry.query')}
              </button>
              <button type="button" className="lx-filterpanel__reset lx-focusable" onClick={resetFilters}>
                {t('cus.filter.reset')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* 列表横跨整宽（原则 4 的修订版：用户要求撤下右栏，台账就该占满这一屏）。 */}
      <section className="lx-listblock">
        <LxSectionHeader
          title={t('cus.list.title')}
          sub={`${t('cus.list.sub')} · ${t('cus.list.matched', { count: visibleRows.length })}`}
        />
        <LxTableCard>
          <LxTable<CustomerRecord>
            columns={columns}
            dataSource={[...visibleRows]}
            total={AGGREGATE.total}
            pageNo={1}
            pageSize={20}
            /* 固定列宽 + 永不横滚：本表七列当时"恰好"装得下，属于运气而非保证，
               一并纳入统一口径（列宽只认上面的百分比）。 */
            fit
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
