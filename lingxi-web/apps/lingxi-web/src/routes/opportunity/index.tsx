import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  DownOutlined,
  FilterOutlined,
  ImportOutlined,
  MessageOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { LxSectionHeader, LxStageBoard, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import type { LxStage, LxTagVariant } from '@lingxi/ui';
import { formatMoneyCompact } from '@lingxi/utils';
import { PageContainer } from '@/components/PageContainer';
import type { OppStage } from '@/routes/customer/data';
import { findProduct } from '@/routes/product/data';
import { CLOSE_TONE, OPPORTUNITY_ROWS, OPP_AGGREGATE, OPP_AMOUNT_TOTAL, STAGE_BUCKETS } from './data';
import { useIntentOrder } from './options';
import { useActingIdentity } from '@/app/providers/useActingIdentity';
import { UNRESTRICTED_SCOPE, filterByScope } from '@/app/providers/dataScope';
import type { OpportunityRow, PurchaseLabel } from './data';
import { ReceptionPanel } from './ReceptionPanel';

/**
 * 商机中心首页（/opportunity）—— 每一次采购机会。
 *
 * 与客户中心、线索中心共用一套布局词汇，三页同构。
 *
 * 页面的两条口径（《产品规划说明书V2.1》§3.6）：
 *   ① **阶段看板含已关闭**（否则看不出损耗），**意向等级只评未关闭商机** ——
 *      已关闭的行不显示意向，显示「不评估 / Unscored」。
 *      措辞按**列宽**定，不按语义写全：意向列实测 77px（可用 ≈61px），
 *      全称「已关闭不评估 / Not scored once closed」在同列会折成 2–3 行，
 *      把该行撑高、与相邻单行不齐 —— 而这条回归**四类探针一条都不报**
 *      （既没溢出、也没省略号、也没声明 nowrap），只有与基线对照才看得见。
 *   ② 2026-09-24 起**阶段分布与阶段筛选合并成同一排卡片**：卡片即分段控件，
 *      点一张卡就筛下方列表 —— 原来看板回答"每段多少"、下方另有一条分段条回答
 *      "看哪一段"，同一件事两个控件，还各占一行。合并后口径只剩一处，也不会对不上。
 *      首位固定是「全部商机」（= 不筛），故不再需要"全部"这个额外分段项。
 *      **2026-09-25 再收两步**：① 阶段去掉「待建联」，卡片由 10 张降到 9 张
 *      （理由见 `OppStage`，唯一落在该段的那条商机并进「首触」，合计与金额不受影响）；
 *      ② 高级筛选开关从下面单独一行挪进**卡片行最右侧**（`inlineAction`）——
 *      它打开的面板填的是阶段之外的补充维度，与阶段同层，不该另起一行，
 *      于是整页从"看板 + 一条只剩开关的空条 + 面板"变成"看板 + 面板"。
 *
 * 「所属客户」列可点，直接跳客户档案 —— 这就是三层对象的回链：
 * 商机不是独立主体，它必须挂在某个客户主体上。
 *
 * 口径行的取舍（用户要求）：原来阶段看板底部那行"含已关闭 / 未关闭金额"的说明被撤掉。
 * 数字对不对得上靠**卡片之间同源**来保证（「全部商机」= 各阶段之和），不靠一行注解。
 */

/** 阶段卡片的段色：只有"成交侧 / 输单侧"上色，中间阶段保持中性。 */
const STAGE_TONE: Partial<Record<OppStage, 'success' | 'danger'>> = {
  signed: 'success',
  delivering: 'success',
  accepted: 'success',
  lost: 'danger',
};

/** 首位「全部商机」卡的键 —— 与 `stageFacet` 的"不筛"取值同字面量，点它即回到全部。 */
const ALL_STAGE = 'all';

/**
 * 增换购标签的色板映射（沿用客户 360 页的既有约定，不新增色相）：
 * 复购那里就是 `done`（苔原绿），同一件事换页不换色；
 * 增购走主色 soft，首购走中性 —— 三档「中性 → 主色 → 成功」递进。
 */
const PURCHASE_TAG: Record<PurchaseLabel, LxTagVariant> = {
  first: 'lang',
  upsell: 'graphic',
  repeat: 'done',
};

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
  closeFrom: string;
  closeTo: string;
  intent: string;
  owner: string;
}

const EMPTY_FILTERS: FilterState = {
  codeName: '',
  closeFrom: '',
  closeTo: '',
  intent: 'all',
  owner: 'all',
};

export default function OpportunityHomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  /** 意向等级顺序：从字典派生（配置中心可调），不再在本页硬编码 a/b/c/d。 */
  const intentOrder = useIntentOrder();
  /** 当前身份（权限码 + 数据范围），数据范围在本页用于过滤可见行。 */
  const acting = useActingIdentity();

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [stageFacet, setStageFacet] = useState(ALL_STAGE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  /**
   * 页内两种视图：`list` 是商机列表（默认），`reception` 是沟通记录。
   *
   * 为什么是视图切换而不是弹层（2026-09-28 用户裁决）：沟通记录要对着商机阶段看，
   * 抽屉压住的正是那张表。切成视图后两者互斥、各自占满内容区，也不用为"返回"再想一层。
   */
  const [view, setView] = useState<'list' | 'reception'>('list');

  const patchFilters = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));
  const applyFilters = () => setAppliedFilters(filters);
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setStageFacet(ALL_STAGE);
  };

  const money = (amountMinor: number) => formatMoneyCompact(amountMinor, 'CNY', i18n.language);

  const intentOptions = [
  { key: 'all', label: t('cus.filter.all') },
    ...intentOrder.map((key) => ({ key, label: t(`cus.intent.${key}`) })),
  ];
  const ownerOptions = [
    { key: 'all', label: t('cus.filter.all') },
    ...[...new Set(OPPORTUNITY_ROWS.map((row) => row.ownerKey))].map((key) => ({ key, label: t(key) })),
  ];

  /** 阶段看板 = 阶段筛选：首位「全部商机」，其余按阶段推进序。 */
  const boardStages: LxStage[] = [
    {
      key: ALL_STAGE,
      label: t('opp.board.all'),
      count: OPPORTUNITY_ROWS.length,
      value: money(OPP_AMOUNT_TOTAL),
    },
    // 显式标 LxStage：不标的话 `tone` 会被推成 string，收窄不回 LxStageTone
    ...STAGE_BUCKETS.map<LxStage>((bucket) => ({
      key: bucket.stage,
      label: t(`cus.oppstage.${bucket.stage}`),
      count: bucket.count,
      value: money(bucket.amountMinor),
      tone: STAGE_TONE[bucket.stage] ?? 'default',
    })),
  ];

  const keywordNeedle = appliedKeyword.trim().toLowerCase();

  /**
   * 数据权限范围过滤（2026-10-06）：与客户列表同一判据。
   *
   * 放在所有筛选条件之前 —— 范围是权限不是筛选，不该被"清空筛选"绕过，
   * 也不该出现在筛选面板里（用户无从判断某个筛选项为什么少了几行）。
   */
  const scopedRows = filterByScope(OPPORTUNITY_ROWS, acting?.scopeCtx ?? UNRESTRICTED_SCOPE);

  const visibleRows = scopedRows.filter((row) => {
    if (stageFacet !== ALL_STAGE && row.stage !== stageFacet) {
      return false;
    }
    if (appliedFilters.intent !== 'all' && row.intent !== appliedFilters.intent) {
      return false;
    }
    if (appliedFilters.owner !== 'all' && row.ownerKey !== appliedFilters.owner) {
      return false;
    }
    if (appliedFilters.closeFrom && row.expectedClose < appliedFilters.closeFrom) {
      return false;
    }
    if (appliedFilters.closeTo && row.expectedClose > appliedFilters.closeTo) {
      return false;
    }
    if (appliedFilters.codeName.trim()) {
      const needle = appliedFilters.codeName.trim().toLowerCase();
      if (!row.name.toLowerCase().includes(needle) && !row.customerName.toLowerCase().includes(needle)) {
        return false;
      }
    }
    if (!keywordNeedle) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(keywordNeedle) ||
      row.customerName.toLowerCase().includes(keywordNeedle) ||
      row.customerCode.toLowerCase().includes(keywordNeedle)
    );
  });

  /**
   * 列表列（2026-09-24 改版；2026-09-24 同日再改一次：换固定列宽布局）。
   *
   * 撤下「商机名称」、换上「商机时间」的理由：名称是长文本，要靠省略号才塞得下，
   * 而销售扫列表时先看的是"这单多久了、推进到哪了"，不是名字。
   * 撤下「预计成交金额」的理由：金额要配合阶段才读得懂，单列一个数最容易误读成已成交额；
   * 各阶段卡片上的金额已经把"每段压了多少钱"讲完了。
   * 撤下「预计成交时间」的理由（用户 2026-09-24 明确要求）：它是本表第二次出现的"预计"类
   * 派生字段，与「下次跟进」在语义上高度重叠（都是"什么时候会有下文"），
   * 两列并排时读者要在脑子里比两个日期才能判断先后 —— 留「下次跟进」这一个更接近行动的日期。
   *
   * **列宽一律用百分比、合计 100%**，配合 `LxTable` 的 `fit`（`table-layout: fixed`）：
   * 列宽的权威只有这里，内容反过来不能撑宽列 —— 这才是"每列固定宽度"。
   * 本表此前是"声明 px + 内容 max-content 取大"，实测自然宽 1123px，
   * 而内容区在 1280 视口只有 998px、1366 视口 1084px，**1366 及以下必出横向滚动条**；
   * 1440 视口 1158px 看似刚好，其实余量为 0，侧栏一展开或缩放 >100% 就滚。
   * 百分比合计 100% 之后，表格宽恒等于容器宽，**任何视口都不可能横向溢出**。
   *
   * 列宽百分比不是随手分的：先按各列的**内容自然宽**（实测：商机时间 90 / 所属客户 180 /
   * 商机阶段 96 / 意向等级 84 / 意向产品 168 / 增换购标签 76 / 跟进人 111 / 下次跟进 112 /
   * 操作 116）取比例，再把从"日期类窄列"省下的份额补给**表头英文最长**的两列 ——
   * 表头被截断比单元格被截断更糟：一列都读不出叫什么，整列就废了。
   *
   * 终版九列分配（2026-09-25）：`9 + 16 + 10 + 8 + 13 + 10 + 11 + 11 + 12 = 100`。
   * 其中「商机时间」由 8% 提到 9%、「意向产品」由 14% 降到 13% —— 探针实测 8% 时
   * 日期 `2026-03-18` 需要 68px 却只有 64px（`68>64` 被省略号截掉），而日期截了就废；
   * 品名截断还有 `title`，两害相权取其轻。
   */
  const columns = [
    {
      title: t('opp.col.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      /* 9%：这一列的宽度下界是**死的** —— 日期是原子单位（`2026-03-18` 在 12px 下实测
         需 68px），截成 `2026-03-1…` 等于把日期读废。
         单元格左右内边距由 antd `size="middle"` 的 `12px 8px` 决定（合计 16px），
         故 8% @1280 视口只有 80 − 16 = 64px < 68px —— 探针实测正是 `68>64` 被截；
         9% 给到 90 − 16 = 74px，留 6px 余量。省下的 1% 从「意向产品」扣（那列挂了 `title`，
         截断是有意为之的降级）。 */
      width: '9%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      /* 11%：商机编码 = 客户编码 + 3 位客户内序号（如 DE000001001），原子单位、
         不可截断，故下界是硬的；截断时给 title 看全。 */
      title: t('opp.col.code'),
      dataIndex: 'code',
      key: 'code',
      width: '11%',
      render: (value: string) => <span className="lx-cell-text lx-num" title={value}>{value}</span>,
    },
    {
      title: t('opp.col.customer'),
      dataIndex: 'customerName',
      key: 'customer',
      /* 8%：本表最长的可读文本列，长客户名（Manila Grid Solutions Inc.）会被截断 ——
         这是"不横滚"必须付出的代价，`title` 兜住全文。
         2026-10-07 由 9% 收到 8%（第一次腾给操作列的第三、第四个百分点）：
         客户名可点进 360 页看全，截断的损失最小。 */
      width: '8%',
      render: (_value: string, row: OpportunityRow) => (
        <button
          type="button"
          className="lx-cell-link lx-oppcust lx-focusable"
          title={row.customerName}
          onClick={() => void navigate(`/customer/360/${row.customerId}`)}
        >
          {row.customerName}
        </button>
      ),
    },
    {
      /* 阶段 = 进入商机详情的入口之一（另一个是整行点击，见下方 `onRow`）。
         为什么挂在阶段上而不是商机名称上：名称列 2026-09-24 已被撤下（销售先看
         "走到哪一段"，不看名字），而阶段是这个对象**最像标题的那部分** ——
         它是行里唯一一个非按钮、却能代表这条商机的短文本。
         做成 `<button>` 而不是 `<span>`：整行点击对键盘与读屏都不可达，
         这一格必须有一个可聚焦元素落在上面。 */
      title: t('opp.col.stage'),
      dataIndex: 'stage',
      key: 'stage',
      /* 9%：英文最长的阶段名 `Negotiation` / `Closed lost`（11 字符 ≈62px）
         要放得下，否则表头会被省略号吃掉。9% @1280 视口 = 90 − 16 = 74px，余量 12px。
         2026-10-07 维持 9%：探针实测这一格 headSlack 31px，**看着最宽裕**，
         但阶段徽标是胶囊（自带左右内边距），实需 82px 已经顶到 9% 的 74px 可用宽 ——
         拿到 8% 只有 64px 会开始截断胶囊文字，而「推进到哪一段」是这个表的
         第一读点，截它比截品名更贵。故这一格一格未动。 */
      width: '9%',
      render: (value: OppStage, row: OpportunityRow) => {
        const tone = CLOSE_TONE[value];
        return (
          <button
            type="button"
            className={`lx-oppstage lx-oppstage--btn lx-focusable${tone ? ` lx-oppstage--${tone}` : ''}`}
            title={t('opp.detail.open')}
            onClick={() => void navigate(`/opportunity/${row.id}`)}
          >
            {t(`cus.oppstage.${value}`)}
          </button>
        );
      },
    },
    {
      title: t('cus.col.intent'),
      dataIndex: 'intent',
      key: 'intent',
      /* 8%：值是「A 高意向」/ 英文 `B Medium` —— 中英混排 8 字符，
         该列曾在 76px 下把英文折成两行（探针第 6 类 TDLINES 报「Intent 列 1/2 行混排」），
         固定布局下这个下界仍要守住。 */
      width: '8%',
      render: (value: string, row: OpportunityRow) =>
        row.isOpen ? (
          <span>{t(`cus.intent.${value}`)}</span>
        ) : (
          <span className="lx-muted">{t('opp.intent.closed')}</span>
        ),
    },
    {
      /* 意向产品：只存外键（`prd_product.id`），名称来这里换 —— 商品改名时列表自动跟。
         一期是同一份演示数据的两个视图，故不进商品详情页（商品分区暂无详情路由），
         只给 title 兜底，省掉一个点了没处去的假链接。 */
      title: t('opp.col.product'),
      dataIndex: 'intendedProductId',
      key: 'product',
      /* 10%：品名长度不可控（最长 'Portable Power Station 1000W'），**本表承担截断的列**
         —— 上一版 14%，让出 1% 给「商机时间」（日期是原子单位、截了就废，品名截了还有 `title`）；
         2026-10-07 再由 13% 收到 10%，把 3% 给操作列的三个动作（英文三段需 180px，
         差 17px 就折行，探针实测）。
         表头英文 'Intended product' 实测需 108px，10% @1280 视口 = 100 − 16 = 84px，
         **表头会被省略号截掉** —— 这是本轮接受的取舍：表头被截仍能靠列内品名辨列，
         而操作列折行会让 13 行每行都变成两行。截断有 `title` 兜底。 */
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
      /* 增换购标签：首购 / 增购 / 复购 —— 已关闭商机不评，给破折号。
         （留意这里与「意向等级」列**处置不同**：意向等级给的是文字「不评估」，
         因为意向是打过分、值得交代一句"为什么空"；而增换购只是个标签，
         标签位置留破折号就够，不必再占宽度造一个"不适用"胶囊。）
         紧挨「意向产品」是有意的：两列要连起来读 —— 看的还是同一个产品，
         但"这个产品他买过没有"决定了它是复购还是增购。
         8%：胶囊最宽是中文「首购」两个汉字，给表头 'Purchase' + 内边距留位置；
         已关闭商机不评、给破折号，故这一列内容极短，收窄安全。 */
      title: t('opp.col.purchase'),
      dataIndex: 'purchaseLabel',
      key: 'purchase',
      /* 8%：胶囊最宽是中文「首购」两个汉字，已关闭商机不评、给破折号，
         故这一列内容极短，收窄安全；表头 'Purchase'（8 字符 ≈48px）在 8% @1280
         = 80 − 16 = 64px 里放得下。2026-10-07 由 10% 让出 2% 给操作列。 */
      width: '8%',
      render: (value: PurchaseLabel | null) =>
        value ? (
          <LxTag variant={PURCHASE_TAG[value]}>{t(`opp.purchase.${value}`)}</LxTag>
        ) : (
          <span className="lx-muted">—</span>
        ),
    },
    {
      /* 11% 而不是 10%：英文表头 `Follow-up owner`（15 字符 ≈84px）
         在 10% 下只有 100px − 内边距 16px = 76px，表头会被截成 `Follow-up owne…`；
         11% 给到 86px 刚好放下。 */
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
      title: t('cus.col.nextFollow'),
      dataIndex: 'nextFollowUp',
      key: 'nextFollowUp',
      width: '9%',
      render: (value: string, row: OpportunityRow) => (
        <span className="lx-cell">
          <span className="lx-num" title={value}>{value}</span>
          {row.isOverdue ? (
            <span className="lx-oppdue">{t('opp.overdue')}</span>
          ) : null}
        </span>
      ),
    },
    {
      /* 操作：已关闭的商机不必再「跟进 / 关闭 / 转订单」—— 不留空单元格：
         空白会被读成"这行数据缺了"，破折号才读成"无事可做"。
         2026-09-25「首触」按钮随「待建联」阶段一起去掉：它的门槛本来就是
         `row.stage === 'waiting'`（只有还没接触上的才需要"打第一个电话"），
         阶段被去掉、那批商机并进「首触」之后这个门槛就永远不成立了 ——
         留一个恒不渲染的分支只会让人以为漏了状态。

         2026-10-07 加「转订单」（用户要求，仅跟进中的出现）：
         门槛是 `row.isOpen` 而非"已签约" —— 用户要的是**流转中就能转单**，
         商务谈妥到走完内部签约流程之间单子还要等，这段等待期里恰恰最需要先把单建起来。
         严格的"仅签约后可转"会让这批商机既不能跟进（已到成交侧）也不能转单，
         在列表上变成一个什么都做不了的行。
         18%：固定布局下这一格在 1280 视口 = 180px − 内边距 16px = 164px，
         三个动作（英文 `Follow up / Close / To order` 三段实需 164px + 间距 24px = 188px）
         放不下 —— 这是 2026-10-07 目视英文态截图发现的：16% 时 Action 单元格
         `cellH=42`（两行），而中文态三段只需 112px 看不出来，只有英文态暴露。
         探针实测三段实需 58 + 32 + 50 = 140px，加 `gap 4px 12px` 的两个列间距
         共 164px，故列宽下界是 164 + 16 = 180px，取 18%。
         1280 视口 18% 实测 169px 可用，余 5px；1366/1440 更宽，不折行。

         列宽重算（合计仍 100%）：操作列 12→18，其余八列共让出 6 ——
         阶段 10→9、增换购 10→8、客户名 9→7、意向产品 13→10。
         让出的四列**都是可截断的**（都有 `title` 或可点进详情看全）；
         「商机时间」「商机编码」两列的日期与编码是原子单位，截了等于读废，
         「意向等级」8% 是探针实测出的折行下界 —— 这三列一格未动。
         客户名与意向产品是本表**本来就承担截断**的两列（探针实测 18 行全被截），
         再收 1–2 个百分点只是加深既有的省略号，不新增损失类型。 */
      title: t('common.action'),
      key: 'action',
      width: '18%',
      render: (_value: unknown, row: OpportunityRow) => {
        if (!row.isOpen) {
          return <span className="lx-muted">—</span>;
        }
        return (
          <span className="lx-oppops">
            {/* 这两个动作尚未绑定落地（历史遗留），但仍先拦住冒泡：
               否则点它们会跳到商机详情页 —— 一个"点了去别处"的按钮
               比"点了没反应"更容易误导人以为系统抽风了。详见「转订单」处的注释。 */}
            <button
              type="button"
              className="lx-cell-link lx-focusable"
              onClick={(event) => event.stopPropagation()}
            >
              {t('opp.action.followUp')}
            </button>
            <button
              type="button"
              className="lx-cell-link lx-focusable"
              onClick={(event) => event.stopPropagation()}
            >
              {t('opp.action.close')}
            </button>
            {/* 转单落点是订单新建页并**带上商机编码**（`?opp=`）：
                那一页据此预填客户 / 订单号 / 金额 / 预计到港（见 order/create.tsx）。
                带编码而不是只 `navigate('/order/create')`：不带就是一张空表单，
                用户要把客户名金额重新敲一遍 —— 那不叫"转订单"，叫"去新建订单"。

                `stopPropagation` 是**必须**的（2026-10-07 探针实测）：
                本表 `onRow` 给整行挂了跳详情的 onClick，而 React 的事件在
                冒泡到行时才触发 —— 不拦住它，点"转订单"会先跳到商机详情页，
                探针实测落地是 `/opportunity/o1-1` 而非订单页。
                「跟进 / 关闭」此前也有同样的问题（它们还没绑动作，只表现为
                "点了没反应"）；本轮起三个动作统一 `stopPropagation`，
                后续给这两个补上真正动作时也不会再撞上这一层。 */}
            <button
              type="button"
              className="lx-cell-link lx-focusable"
              onClick={(event) => {
                event.stopPropagation();
                void navigate(`/order/create?opp=${encodeURIComponent(row.code)}`);
              }}
            >
              {t('opp.action.toOrder')}
            </button>
          </span>
        );
      },
    },
  ];

  const applyKeyword = () => setAppliedKeyword(keyword);

  return (
    <PageContainer titleKey="opp.page.home" hideTitle>
      {view === 'reception' ? (
        <ReceptionPanel onBack={() => setView('list')} />
      ) : (
        <>
      <div className="lx-entrybar">
        <button
          type="button"
          className="lx-entrybar__create lx-focusable"
          onClick={() => {
            void navigate('/opportunity/new');
          }}
        >
          <UserAddOutlined />
          {t('opp.entry.create')}
        </button>
        <button
          type="button"
          className="lx-entrybar__ghost lx-focusable"
          onClick={() => {
            void navigate('/opportunity/import');
          }}
        >
          <ImportOutlined />
          {t('cus.entry.import')}
        </button>
        <button
          type="button"
          className="lx-entrybar__ghost lx-focusable"
          onClick={() => {
            void navigate('/lead');
          }}
        >
          <TeamOutlined />
          {t('lead.menu.home')}
        </button>
        <label className="lx-entrybar__search">
          <SearchOutlined className="lx-entrybar__icon" aria-hidden="true" />
          <input
            type="search"
            value={keyword}
            placeholder={t('opp.entry.searchPlaceholder')}
            aria-label={t('opp.entry.searchPlaceholder')}
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

      {/* 阶段看板 = 阶段筛选：点卡片筛下方列表，首位「全部商机」。含已关闭商机 ——
          只看未关闭会看不出损耗落在哪一段。
          高级筛选开关走 `inlineAction`（2026-09-25）：它落在阶段卡**同一行的最右侧**。
          原先它是自己单独一行 —— 读起来像"下面还有一段独立的筛选区"，
          而它打开的面板填的正是这条阶段线之外的补充维度（客户名、预计成交时间、
          意向、跟进人），与阶段是同一层筛选，不该另起一行。 */}
      <LxStageBoard
        stages={boardStages}
        activeKey={stageFacet}
        onSelect={(key) => setStageFacet(key)}
        inlineAction={
          <button
            type="button"
            className={`lx-facetbar__toggle lx-focusable${panelOpen ? ' is-open' : ''}`}
            aria-expanded={panelOpen}
            aria-controls="opp-filter-panel"
            aria-label={t('cus.filter.toggle')}
            title={t('cus.filter.toggle')}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <FilterOutlined />
          </button>
        }
      />

      {panelOpen ? (
        <section className="lx-glass lx-filterpanel" id="opp-filter-panel">
          <div className="lx-filterpanel__grid">
            <div className="lx-filterpanel__cell lx-filterpanel__cell--name">
              <span className="lx-filterpanel__label">{t('opp.filter.name')}</span>
              <input
                type="search"
                className="lx-filterpanel__input"
                value={filters.codeName}
                placeholder={t('opp.filter.namePlaceholder')}
                aria-label={t('opp.filter.name')}
                onChange={(event) => patchFilters({ codeName: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    applyFilters();
                  }
                }}
              />
            </div>

            <div className="lx-filterpanel__cell lx-filterpanel__cell--dates">
              <span className="lx-filterpanel__label">{t('opp.filter.expectedClose')}</span>
              <div className="lx-filterpanel__dates">
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.closeFrom}
                  aria-label={t('cus.filter.createdFrom')}
                  onChange={(event) => patchFilters({ closeFrom: event.target.value })}
                />
                <span className="lx-filterpanel__dash" aria-hidden="true">
                  –
                </span>
                <input
                  type="date"
                  className="lx-filterpanel__input lx-num"
                  value={filters.closeTo}
                  aria-label={t('cus.filter.createdTo')}
                  onChange={(event) => patchFilters({ closeTo: event.target.value })}
                />
              </div>
            </div>

            <SelectCell
              className="lx-filterpanel__cell--intent"
              label={t('cus.col.intent')}
              value={filters.intent}
              options={intentOptions}
              onChange={(value) => patchFilters({ intent: value })}
            />
            <SelectCell
              className="lx-filterpanel__cell--country"
              label={t('cus.col.owner')}
              value={filters.owner}
              options={ownerOptions}
              onChange={(value) => patchFilters({ owner: value })}
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

      <section className="lx-listblock lx-opplist">
        <LxSectionHeader
          title={t('opp.list.title')}
          sub={`${t('opp.list.sub')} · ${t('opp.list.matched', { count: visibleRows.length })}`}
          actions={
            /* 沟通记录挂在**标题旁边**而不是表格里每一行：它打开的是"销售正在接待的这些潜客"
               （灵犀 1.0 客户接待那一屏），是一条与下方筛选、与具体行都无关的横向线索，
               放进每一行就变成了 14 个一模一样的入口。
               它是**视图切换**（2026-09-28），不是弹层：列表整块换成沟通记录，返回键在同一个位置。 */
            <button
              type="button"
              className="lx-section__action lx-focusable"
              onClick={() => setView('reception')}
            >
              <MessageOutlined />
              {t('opp.action.reception')}
            </button>
          }
        />
        <LxTableCard>
          <LxTable<OpportunityRow>
            columns={columns}
            dataSource={[...visibleRows]}
            total={OPP_AGGREGATE.total}
            pageNo={1}
            pageSize={20}
            /* 固定列宽 + 永不横滚：本表九列的自然宽 1123px 装不进 1366 及以下的
               内容区（998 / 1084px），开 fit 之后列宽只认上面的百分比。 */
            fit
            /* 整行可点进详情。它不会取代阶段格那个按钮 —— 行点击对键盘不可达，
               两者是"鼠标快"与"键盘可达"的关系，不是二选一。
               `onRow` 的返回类型要求返回 HTML 属性，故用箭头函数返回对象而非直接调用 navigate。 */
            onRow={(record) => ({
              onClick: () => {
                void navigate(`/opportunity/${record.id}`);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </LxTableCard>
      </section>
        </>
      )}
    </PageContainer>
  );
}
