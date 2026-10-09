import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  TeamOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { LxTable } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { CAMPAIGN_STAGES } from './campaign-data';
import {
  MKT_CAL_ITEMS,
  MKG_CAL_TODAY,
  addDays,
  conflictIds,
  conflictsOf,
  detectConflicts,
  detectOverloads,
  detectPrepOverdues,
  hasPrepOverdue,
  itemsByAudience,
  itemsByKind,
  itemsOnDay,
  prepItems,
  reminders,
  sourceCampaignOf,
} from './mkg-calendar-data';
import type { MktCalAudience, MktCalItem, MktCalKind } from './mkg-calendar-data';

/**
 * 营销日历（`/marketing/calendar`，亦为营销中心默认首页 `/marketing` 的正文）。
 *
 * 按《灵犀2.0营销日历 · 前端交互说明（简版）》重构。附件「先给结论」的五条，落到代码上是：
 *
 *  ① **五类排期混排，不只是营销活动** —— 数据层见 `mkg-calendar-data.ts`。
 *     颜色认**类型**（营销/拜访/会议/工单/任务），不是认状态——
 *     附件《组件要点》明确「色块必须附文字类型标签」，故每条卡片都带类型图标，
 *     图例也带文字，满足色盲可访问。
 *
 *  ② **视图表里承载 4 件事，缺一不可**：切换（月/周/列表）、混排、快建（hover + 号）、
 *     冲突标记。**列表视图不是可选项，是月度复盘的入口**（附件原话），故与月/周同级。
 *
 *  ③ **冲突检测是差异化核心，不是装饰** —— R1 红框 + R3 顶部汇总 + R4 黄点，
 *     三处同源于`mkg-calendar-data.ts` 的三个 detect 函数。
 *
 *  ④ **提醒可见可改** —— 右栏常驻提醒链预览（时间 + 抄送对象）。
 *     附件《交互要点》：「否则会认为是系统骚扰」。
 *
 *  ⑤ **卡片 3 层信息**：左侧类型色条 + 标题 + 右上状态点（红点=冲突 / 黄点=筹备逾期）。
 *
 * 三栏骨架（附件 §一）：左侧固定筛选树 · 中间视图 · 右侧**常驻**详情面板。
 * 右侧不跳第二层页面 —— 附件原话「避免二次跳转」，故面板嵌在同页而非抽屉。
 *
 * 与 `/marketing/schedule`（内容排期分发页）的分工：
 * 本页回答"这一天该做什么、撞没撞档"；排期页回答"哪条内容几点发哪个渠道、时区是哪儿"。
 * 前者是市场部的一天，后者是运营的一条内容 —— 混在一起两边都说不清。
 */

/** 视图：月/周/列表（列表即月度复盘入口，故与月/周同级）。 */
type View = 'month' | 'week' | 'list';

const VIEWS: readonly View[] = ['month', 'week', 'list'];

/** 五类 → 图标。类型靠图标 + 文字双重标注，不靠颜色单独区分。 */
const KIND_ICON: Record<MktCalKind, ReactNode> = {
  campaign: <CalendarOutlined />,
  visit: <TeamOutlined />,
  meeting: <FileTextOutlined />,
  ticket: <ToolOutlined />,
  task: <FileDoneOutlined />,
};

/** 图例与筛选树的固定顺序（附件《EventTypeLegend》「5 类固定配色不随主题变」）。 */
const KIND_ORDER: readonly MktCalKind[] = ['campaign', 'visit', 'meeting', 'ticket', 'task'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** YYYY-MM-DD → { y, m(0起), d }。 */
function parse(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y: y ?? 0, m: (m ?? 0) - 1, d: d ?? 0 };
}

/** 月历格（周一起始，前后月补齐，weeks 默认 6 行）。 */
function monthCells(year: number, month: number, weeks = 6): { date: string; d: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const diffToMonday = first.getDay() === 0 ? -6 : 1 - first.getDay();
  const base = new Date(year, month, 1 + diffToMonday);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    return {
      date: fmt(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      d: dt.getDate(),
      inMonth: dt.getMonth() === month,
    };
  });
}

/** 以 ref 所在周一为起点的 7 天（周一起始）。 */
function weekCells(ref: Date): { date: string; d: number }[] {
  const dow = ref.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    return { date: fmt(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: dt.getDate() };
  });
}

export default function MarketingCalendarPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('month');
  const seed = parse(MKG_CAL_TODAY);
  const [cursor, setCursor] = useState<Date>(new Date(seed.y, seed.m, seed.d));
  /** 右栏常驻面板选中的排期 id（null=未选）。 */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 悬停快建浮层的日期（非 null 即显示）。**点 + 号才置位**，见 renderMonthCell。 */
  const [quickDate, setQuickDate] = useState<string | null>(null);
  /** 快建浮层的 DOM 引用：点击外部关闭要用，不能靠 document.querySelector 找。 */
  const quickRef = useRef<HTMLDivElement | null>(null);
  /** 左树筛选：类型（空数组=全部）与受众。 */
  const [kindFilter, setKindFilter] = useState<readonly MktCalKind[]>([]);
  const [audienceFilter, setAudienceFilter] = useState<MktCalAudience | 'all'>('all');

  /**
   * 冲突检测跑在**筛选后**的口径上 —— 用户筛掉了不看的类型后，
   * 剩下的排期不该再报冲突（那会让人以为系统有幽灵告警）。
   */
  const items = useMemo(
    () => itemsByKind(itemsByAudience(MKT_CAL_ITEMS, audienceFilter), kindFilter),
    [audienceFilter, kindFilter],
  );

  /** 三处冲突标记同源：红框（R1）、顶部汇总（R3）、黄点（R4）都从这里来。 */
  const pairs = useMemo(() => detectConflicts(items), [items]);
  const inConflict = useMemo(() => conflictIds(pairs), [pairs]);
  const overloads = useMemo(() => detectOverloads(items), [items]);
  const prepOverdues = useMemo(() => detectPrepOverdues(items), [items]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const periodLabel = useMemo(() => {
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    return i18n.language.startsWith('zh') ? `${y}年${m + 1}月` : `${t(`mkg.cal.month.${m}`)} ${y}`;
  }, [cursor, i18n.language, t]);

  const goPrev = () => {
    if (view === 'week') setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() - 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };
  const goNext = () => {
    if (view === 'week') setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };
  const goToday = () => {
    const s = parse(MKG_CAL_TODAY);
    setCursor(new Date(s.y, s.m, s.d));
  };

  /**
   * 快建浮层的关闭出口（2026-10-07）。
   *
   * 不绑 hover 之后必须补这两条，否则"点 + 号打开、想点保存却关不掉"：
   *   - 点击浮层外部 → 关（`mousedown` 而非 `click`：后者在拖拽选文本时会漏判）
   * - Esc → 关
   * 用 `mousedown` + `closest` 而不是 `contains`：浮层内部有按钮，
   * `contains` 判据本身够用，但补一句 `closest('.lx-mcal__plus')` 是为了
   * 连点同一格的 + 号时能正常切换日期（而不是被外部点击立刻关掉）。
   */
  useEffect(() => {
    if (!quickDate) return undefined;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.lx-mcal__quick')) return;
      if (target?.closest('.lx-mcal__plus')) return;
      setQuickDate(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickDate(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [quickDate]);

  const isToday = (date: string) => date === MKG_CAL_TODAY;

  /**
 * 单条排期卡片：**文字色 + 左侧色条**区分类型（2026-10-07 第十九轮去掉了类型图标）。
 *
 * ## 为什么去掉图标
 *
 * 用户反馈"每天的事件要能显示至少 6 个中文字符"，而月历格宽约 100px，
 * 原来是「图标 11px + gap 4px + padding 17px + 标题」，图标一项就吃掉 15px，
 * 标题只剩约 60px ≈ 5 个中文字（11.5px 字号）。
 *
 * 去掉图标并不会丢掉类型信息 —— 类型由**文字颜色 + 左侧色条**双重承载，
 * 而颜色是这一页本来就有的机制（`.lx-mcal__ev--visit` 等已在改左侧色条与底色）。
 * 把「类型」这一维从图标转移到颜色，两个通道都变强而不是变弱。
 *
 * **色盲可访问性不能靠颜色单独承担**：故保留三处冗余 ——
 * ① `title` 属性仍带类型文字；② 右栏详情有类型标签 chip；③ 图例与左树带色块+文字。
 * 另在 `.lx-mcal__ev` 上加 `data-kind`，供探针断言"颜色与类型确实对应"。
 *
 * 字号 11.5 → 11px：中文在 11px 下仍清晰，但每行多容 1 个字；
 * 配合去掉图标，单条标题可用宽度从约 60px 提到约 78px ≈ **7 个中文字**。
 */
const renderItem = (item: MktCalItem) => {
    const conflicted = inConflict.has(item.id);
    const overdue = hasPrepOverdue(item);
    return (
      <button
        key={item.id}
        type="button"
        data-kind={item.kind}
        className={`lx-mcal__ev lx-mcal__ev--${item.kind} lx-mcal__ev--${item.state}${conflicted ? ' is-conflict' : ''}${selectedId === item.id ? ' is-selected' : ''} lx-focusable`}
        title={`${t(item.titleKey)} · ${t(`mkg.cal.kind.${item.kind}`)}`}
        onClick={() => setSelectedId(item.id)}
      >
        <span className="lx-mcal__evtext">{t(item.titleKey)}</span>
        {/* 状态点：红点=冲突、黄点=筹备逾期。分两个元素而非叠一个，
            否则两个语义会挤在同一像素上、读者只能猜。 */}
        {conflicted ? <span className="lx-mcal__dot lx-mcal__dot--conflict" aria-hidden="true" /> : null}
        {overdue ? <span className="lx-mcal__dot lx-mcal__dot--prep" aria-hidden="true" /> : null}
      </button>
    );
  };

  /** 月视图单格。 */
  const renderMonthCell = (cell: { date: string; d: number; inMonth: boolean }) => {
    const dayItems = itemsOnDay(items, cell.date);
    // 冲突项必须**强制排前**：每格只露 4 条，若冲突卡正好被折进 "+N"，
    // 红框这条最核心的机制在密集日就静默失效了（而密集日恰恰最需要它）。
    const ordered = [...dayItems].sort((a, b) => Number(inConflict.has(b.id)) - Number(inConflict.has(a.id)));
    /* 3 → 4 条（2026-10-09 用户要求"超过 3 个 +X 提示放到日期那一行的右侧，
       不然事件名称被挤了看不见"）。
       `+N` 挪走之后格内多出一行，而 `.lx-mcal__events` 实测高 93.4px、
       单条 17.8px + gap 2px → 4 条占 77.2px 仍有余量。
       **不是无脑往上加**：`.lx-mcal__events` 带 `overflow:hidden`，放不下会静默裁掉
       最下面那条（看起来像"这天只有 3 件事"），所以上限跟着实测高度走。 */
    const showing = ordered.slice(0, 4);
    const hiddenConflict = ordered.slice(4).filter((i) => inConflict.has(i.id)).length;
    const extra = ordered.length - showing.length;
    return (
      <div
        key={cell.date}
        className={`lx-mcal__cell${cell.inMonth ? '' : ' is-out'}${isToday(cell.date) ? ' is-today' : ''}`}
        /*不再用 onMouseEnter 开快建（2026-10-07 第十九轮）。
         * 悬停即弹的代价：扫读月历时鼠标必然路过若干格，于是任何一次移动都会
         * 弹出一个"创建事件"浮层盖住下方三五条排期 —— 而扫读正是这一页的主用途。
         * 附件写的是「hover 出 + 号」，出的是**号**，不是弹层；点号才弹。
         * 浮层的关闭也改成不依赖 mouse：hover 开着的时候 mouseleave 才关，
         * 鼠标从格子移到浮层上的那条路径会先触发一次 leave 导致闪烁。 */
      >
        <div className="lx-mcal__cellhead">
          <span className="lx-mcal__num lx-num">{cell.d}</span>
          {/* "+N" 移到日期行右侧（2026-10-09 用户要求）。
              原先它独占 `.lx-mcal__events` 一行，于是事件区只剩 3 行 ——
              密日的三条事件被压到**每条只显示 4 个中文字**，标题读不出来。
              "+N" 是**日期的注记**（"这天还有几条"），不是一条事件：
              放在日期行既符合它的语义，又把整行还给事件区。

              `.lx-mcal__more` 绝对定位到 cellhead 右端，故这里留一个占位，
              免得无溢出时快建号的位置与有溢出时不一致（点了 + 号才知道自己点了哪格）。 */}
          {extra > 0 ? (
            <span
              className={`lx-mcal__more${hiddenConflict > 0 ? ' is-conflict' : ''}`}
              title={hiddenConflict > 0 ? t('mkg.cal.conflict.more', { count: hiddenConflict }) : undefined}
            >
              +{extra}
              {hiddenConflict > 0 ? <span className="lx-mcal__moredot" aria-hidden="true" /> : null}
            </span>
          ) : null}
          {/* 快建：hover 出 + 号（占位透明，不占视觉重量），**点击**才开浮层。 */}
          <button
            type="button"
            className="lx-mcal__plus lx-focusable"
            aria-label={t('mkg.cal.quick.create')}
            onClick={() => setQuickDate(cell.date)}
          >
            <PlusOutlined />
          </button>
        </div>
        <div className="lx-mcal__events">
          {showing.map(renderItem)}
        </div>
      </div>
    );
  };

  const listRows = useMemo(
    () =>
      items.map((item) => {
        const prep = prepItems(item);
        const donePrep = prep.filter((p) => p.done).length;
        return {
          id: item.id,
          title: t(item.titleKey),
          kind: t(`mkg.cal.kind.${item.kind}`),
          kindId: item.kind,
          state: t(`mkg.cal.state.${item.state}`),
          start: item.start,
          audience: t(item.audienceKey),
          owner: t(item.ownerKey),
          prep: prep.length === 0 ? '—' : `${donePrep}/${prep.length}`,
          conflict: inConflict.has(item.id) ? t('mkg.cal.conflict.yes') : '—',
        };
      }),
    [items, inConflict, t],
  );

  type ListRow = (typeof listRows)[number];

  const listColumns = useMemo(
    () => [
      {
        key: 'title',
        title: t('mkg.cal.col.name'),
        dataIndex: 'title',
        /* 2026-10-07 第二十轮：显式给宽度。此前这一列**不声明width**，
         * 而 `fit`（table-layout:fixed）下未声明宽度的列会与其余列按剩余空间平分——
         * 问题在于名称列的内容是 `<button class="lx-cell-link">`，那个类
         * 带 `white-space: nowrap` 且**没有 min-width:0**，于是长活动名
         * （「欧洲储能旺季拉新渠道大会」11 字）把单元格撑到 130px+，
         * 视觉上就压进了右侧「类型」列 —— 用户报的就是这个。
         * 两处配套：这里声明百分比宽度（其余列之和留出余量），
         * 下面 render 的按钮套一层 `.lx-mcal__listname`（min-width:0 + ellipsis）。 */
        width: '22%',
        render: (value: string, row: ListRow) => (
          <button
            type="button"
            className="lx-cell-link lx-mcal__listname lx-focusable"
            title={value}
            onClick={() => setSelectedId(row.id)}
          >
            {value}
          </button>
        ),
      },
      {
        key: 'kind',
        title: t('mkg.cal.col.kind'),
        dataIndex: 'kind',
        width: '12%',
        render: (value: string, row: ListRow) => (
          <span className={`lx-mcal__kindtag lx-mcal__kindtag--${row.kindId}`}>
            <span className="lx-mcal__evcat" aria-hidden="true">
              {KIND_ICON[row.kindId]}
            </span>
            {value}
          </span>
        ),
      },
      { key: 'state', title: t('mkg.cal.col.state'), dataIndex: 'state', width: '9%' },
      { key: 'start', title: t('mkg.cal.col.start'), dataIndex: 'start', width: '10%', className: 'lx-num' },
      { key: 'audience', title: t('mkg.cal.col.audience'), dataIndex: 'audience', width: '10%' },
      { key: 'owner', title: t('mkg.cal.col.owner'), dataIndex: 'owner', width: '9%' },
      // 筹备进度与冲突标记两列是本模块独有，附件《交互要点》明说"别省"
      { key: 'prep', title: t('mkg.cal.col.prep'), dataIndex: 'prep', width: '8%', className: 'lx-num' },
      { key: 'conflict', title: t('mkg.cal.col.conflict'), dataIndex: 'conflict', width: '8%' },
    ],
    [t],
  );

  const dows = [1, 2, 3, 4, 5, 6, 0].map((i) => t(`mkg.cal.dow.${i}`));
  const week = weekCells(cursor);
  const weekFirstMonth = week[0] ? parse(week[0].date).m : cursor.getMonth();

  const selectedPrep = selected ? prepItems(selected) : [];
  /** 活动的源记录：日历右栏要显示目标/预算/渠道/生命周期，否则与活动详情页信息量不等。 */
  const selectedCampaign = useMemo(() => (selected ? sourceCampaignOf(selected) : null), [selected]);
  const selectedOverdue = selected ? hasPrepOverdue(selected) : null;
  const selectedClash = selected ? conflictsOf(pairs, selected.id) : [];
  const selectedOverload = selected ? overloads.find((d) => d.itemIds.includes(selected.id)) : undefined;
  /** 撞档日：取与所选排期相关的最早一对的日期，供冲突提示说清"哪天撞"。 */
  const selectedClashDate = useMemo(() => {
    if (!selected) return '';
    const hit = pairs.find((p) => p.aId === selected.id || p.bId === selected.id);
    return hit ? hit.date : '';
  }, [pairs, selected]);

  return (
    <PageContainer titleKey="mkg.cal.title" subtitleKey="mkg.cal.sub" hideTitle>
      <div className="lx-mcal">
        {/* ── 左树：视图 / 类型 / 受众 / 数据范围 ── */}
        <aside className="lx-mcal__side">
          <div className="lx-mcal__sidegroup">
            <span className="lx-mcal__sidehead">{t('mkg.cal.filter.view')}</span>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className={`lx-mcal__link lx-focusable${view === v ? ' is-active' : ''}`}
                onClick={() => setView(v)}
              >
                <span className="lx-mcal__linktext">{t(`mkg.cal.mview.${v}`)}</span>
              </button>
            ))}
          </div>

          <div className="lx-mcal__sidegroup">
            <span className="lx-mcal__sidehead">{t('mkg.cal.filter.kind')}</span>
            {/* 多选：点任一类型即筛选（附件交互要点 1「点任一条件 → 工具栏生成可删 chip」） */}
            {KIND_ORDER.map((kind) => {
              const on = kindFilter.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  className={`lx-mcal__link lx-focusable${on ? ' is-active' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    setKindFilter((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))
                  }
                >
                  <span className={`lx-mcal__swatch lx-mcal__swatch--${kind}`} aria-hidden="true" />
                  <span className="lx-mcal__evcat" aria-hidden="true">
                    {KIND_ICON[kind]}
                  </span>
                  <span className="lx-mcal__linktext">{t(`mkg.cal.kind.${kind}`)}</span>
                </button>
              );
            })}
          </div>

          <div className="lx-mcal__sidegroup">
            <span className="lx-mcal__sidehead">{t('mkg.cal.filter.audience')}</span>
            <button
              type="button"
              className={`lx-mcal__link lx-focusable${audienceFilter === 'all' ? ' is-active' : ''}`}
              onClick={() => setAudienceFilter('all')}
            >
              <span className="lx-mcal__linktext">{t('mkg.cal.filter.all')}</span>
            </button>
            {(['dealer', 'store', 'internal'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`lx-mcal__link lx-focusable${audienceFilter === a ? ' is-active' : ''}`}
                onClick={() => setAudienceFilter(a)}
              >
                <span className="lx-mcal__linktext">{t(`mkg.cal.aud.${a}`)}</span>
              </button>
            ))}
          </div>

          {/* 「数据范围」组已删除（2026-10-09 第二十三轮用户要求"左侧的数据范围区域去掉，
              保证左侧无滚动条"）。它此前是纯说明文字 —— 标题 + 两行 note，
              既不可点也不驱动任何筛选，而 `.lx-mcal__side` 带 `overflow:auto`，
              英文态下类型组标签还会折成两行，两者叠加就把侧栏顶出了滚动条。
              **没有筛选能力的说明块放在筛选区里是噪声**：真要讲清范围，
              该讲的地方是右栏详情与列表视图的字段，而不是占着左栏一格高度。
              对应 i18n 键 `mkg.cal.filter.scope` / `scopeNote` 一并删除（孤儿键不留）。 */}
        </aside>

        {/* ── 中栏：视图 ── */}
        <section className="lx-mcal__main">
          <div className="lx-mcal__bar">
            <div className="lx-mcal__nav">
              <button type="button" className="lx-mcal__navbtn lx-focusable" onClick={goPrev} aria-label={t('mkg.cal.prev')}>
                <LeftOutlined />
              </button>
              <span className="lx-mcal__period lx-num">
                {view === 'week'
                  ? i18n.language.startsWith('zh')
                    ? periodLabel
                    : `${t(`mkg.cal.month.${weekFirstMonth}`)} ${cursor.getFullYear()}`
                  : periodLabel}
              </span>
              <button type="button" className="lx-mcal__navbtn lx-focusable" onClick={goNext} aria-label={t('mkg.cal.next')}>
                <RightOutlined />
              </button>
            </div>
            <span className="lx-mcal__seg">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`lx-mcal__segbtn lx-focusable${view === v ? ' is-active' : ''}`}
                  onClick={() => setView(v)}
                >
                  {t(`mkg.cal.mview.${v}`)}
                </button>
              ))}
            </span>
            {/* R3/R4 汇总条见下方独立行（不放工具栏）：596px 的中栏塞不下这条 22 字的中文
                汇总，硬塞进工具栏只能省略号截断 —— 而截断掉的正是"有几处需要处理"这个数。 */}
            <button type="button" className="lx-mcal__today lx-focusable" onClick={goToday}>
              {t('mkg.cal.today')}
            </button>
          </div>

          {/* R3/R4 顶部汇总条（附件交互 C）：先说全局有多少，而不是每格弹窗。
              与筛选 chip 同排但独占一行，故不受中栏宽度挤压。
              每个 chip 各自加条件 —— 无条件渲染会显示「0 天过载」，
              告警栏里出现 0 等于这条告警不存在，还会让另一条真的被忽略。 */}
          {overloads.length > 0 || prepOverdues.length > 0 ? (
            <div className="lx-mcal__alerts">
              {overloads.length > 0 ? (
                <span className="lx-mcal__alertchip">
                  <WarningOutlined aria-hidden="true" />
                  {t('mkg.cal.alert.overload', { count: overloads.length })}
                </span>
              ) : null}
              {prepOverdues.length > 0 ? (
                <span className="lx-mcal__alertchip lx-mcal__alertchip--prep">
                  <WarningOutlined aria-hidden="true" />
                  {t('mkg.cal.alert.prep', { count: prepOverdues.length })}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* 已选筛选条件的可删 chip（附件交互要点 1） */}
          {kindFilter.length > 0 || audienceFilter !== 'all' ? (
            <div className="lx-mcal__chips">
              {kindFilter.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="lx-chip lx-focusable"
                  onClick={() => setKindFilter((prev) => prev.filter((k) => k !== kind))}
                >
                  {t(`mkg.cal.kind.${kind}`)}
                  <CloseOutlined aria-hidden="true" />
                </button>
              ))}
              {audienceFilter !== 'all' ? (
                <button type="button" className="lx-chip lx-focusable" onClick={() => setAudienceFilter('all')}>
                  {t(`mkg.cal.aud.${audienceFilter}`)}
                  <CloseOutlined aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}

          {view === 'month' ? (
            <div className="lx-mcal__grid">
              {dows.map((d, i) => (
                <div key={`dow-${i}`} className="lx-mcal__dow">
                  {d}
                </div>
              ))}
              {monthCells(cursor.getFullYear(), cursor.getMonth()).map(renderMonthCell)}
            </div>
          ) : null}

          {view === 'week' ? (
            <div className="lx-mcal__week">
              {week.map((cell) => {
                const dayItems = itemsOnDay(items, cell.date);
                const p = parse(cell.date);
                const dow = new Date(p.y, p.m, p.d).getDay();
                return (
                  <div key={cell.date} className={`lx-mcal__wcol${isToday(cell.date) ? ' is-today' : ''}`}>
                    <div className="lx-mcal__whead">
                      <span className="lx-mcal__wdow">{dows[dow]}</span>
                      <span className="lx-mcal__num lx-num">{cell.d}</span>
                    </div>
                    <div className="lx-mcal__events">{dayItems.map(renderItem)}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {view === 'list' ? (
            <div className="lx-mcal__list">
              <LxTable<ListRow>
                rowKey="id"
                columns={listColumns}
                dataSource={listRows}
                fit
                onRow={(row: ListRow) => ({
                  onClick: () => setSelectedId(row.id),
                })}
              />
            </div>
          ) : null}

          {/* 图例：五类固定配色 + 两种状态点（附件组件表 EventTypeLegend） */}
          <div className="lx-mcal__legend">
            {KIND_ORDER.map((kind) => (
              <span key={kind} className="lx-mcal__leg">
                <span className={`lx-mcal__swatch lx-mcal__swatch--${kind}`} aria-hidden="true" />
                {t(`mkg.cal.kind.${kind}`)}
              </span>
            ))}
            <span className="lx-mcal__legsep" />
            <span className="lx-mcal__leg">
              <span className="lx-mcal__dot lx-mcal__dot--conflict" aria-hidden="true" />
              {t('mkg.cal.legend.conflict')}
            </span>
            <span className="lx-mcal__leg">
              <span className="lx-mcal__dot lx-mcal__dot--prep" aria-hidden="true" />
              {t('mkg.cal.legend.prep')}
            </span>
          </div>
          {/* 快建浮层：点 + 号才出现，**不绑 hover**。
              此前它有 onMouseEnter/onMouseLeave 来维持开合，于是出现两个必现问题：
              ① 鼠标从格子移到浮层的路径上先触发格子的 mouseleave → 浮层当场消失；
              ② 想点浮层里的「保存」得先精准落在它身上，稍偏一点就关。
              现在开合只由三个显式动作控制：点 + 号开、点取消关、点保存关，
              再加 Esc 键与浮层外部点击 —— 都是用户能预期到的行为。 */}
          {quickDate ? (
            <div
              ref={quickRef}
              className="lx-mcal__quick"
              role="dialog"
              aria-label={t('mkg.cal.quick.title')}
            >
              <span className="lx-mcal__quicktitle">{t('mkg.cal.quick.title')}</span>
              <dl className="lx-mcal__quickkv">
                <dt>{t('mkg.cal.col.kind')}</dt>
                <dd>{t('mkg.cal.kind.task')}</dd>
                <dt>{t('mkg.cal.quick.due')}</dt>
                <dd className="lx-num">{quickDate}</dd>
                <dt>{t('mkg.cal.quick.owner')}</dt>
                <dd>{t('demo.owner.linlan')}</dd>
                <dt>{t('mkg.cal.quick.remind')}</dt>
                <dd>
                  {t('mkg.cal.remind.d2')} / {t('mkg.cal.remind.h2')}
                </dd>
              </dl>
              <div className="lx-mcal__quickacts">
                <button type="button" className="lx-mcal__act lx-focusable" onClick={() => setQuickDate(null)}>
                  {t('mkg.cal.quick.cancel')}
                </button>
                <button
                  type="button"
                  className="lx-mcal__act lx-mcal__act--primary lx-focusable"
                  onClick={() => setQuickDate(null)}
                >
                  {t('mkg.cal.quick.save')}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── 右栏：常驻详情面板（不跳第二层页面） ── */}
        <aside className="lx-mcal__panel">
          {selected ? (
            <>
              <div className="lx-mcal__paneltop">
                <span className={`lx-mcal__kindtag lx-mcal__kindtag--${selected.kind}`}>
                  <span className="lx-mcal__evcat" aria-hidden="true">
                    {KIND_ICON[selected.kind]}
                  </span>
                  {t(`mkg.cal.kind.${selected.kind}`)}
                </span>
                <span className={`lx-mcal__statetag lx-mcal__statetag--${selected.state}`}>
                  {t(`mkg.cal.state.${selected.state}`)}
                </span>
              </div>
              <h3 className="lx-mcal__panelname">{t(selected.titleKey)}</h3>
              <dl className="lx-mcal__kv">
                <dt>{t('mkg.cal.col.start')}</dt>
                <dd className="lx-num">{selected.start}</dd>
                {selected.end ? (
                  <>
                    <dt>{t('mkg.cal.col.end')}</dt>
                    <dd className="lx-num">{selected.end}</dd>
                  </>
                ) : null}
                <dt>{t('mkg.cal.col.audience')}</dt>
                <dd>{t(selected.audienceKey)}</dd>
                <dt>{t('mkg.cal.col.owner')}</dt>
                <dd>{t(selected.ownerKey)}</dd>
                <dt>{t('mkg.cal.col.scale')}</dt>
                <dd>{t(selected.scaleKey)}</dd>
              </dl>

              {/* 活动专属字段（2026-10-07 第十九轮）。
                  此前右栏只有跨类型通用字段，导致「日历里的活动详情」比
                  「活动管理的活动详情」少了目标/预算/渠道/生命周期 —— 用户明确指出
                  这个反差。两页读的是同一份 `CAMPAIGNS`，差别只在右栏有没有把
                  活动的业务字段展开。这里按类型分派：只有 campaign 类才有。
                  其余四类（拜访/会议/工单/任务）本就没有这些字段，不显示空白行。 */}
              {selectedCampaign ? (
                <>
                  <dl className="lx-mcal__kv lx-mcal__kv--camp">
                    <dt>{t('mkg.campaign.detail.goal')}</dt>
                    <dd>{t(selectedCampaign.goalKey)}</dd>
                    <dt>{t('mkg.campaign.detail.budget')}</dt>
                    <dd className="lx-num">
                      {selectedCampaign.budget} / {selectedCampaign.gmv}
                    </dd>
                    <dt>{t('mkg.campaign.detail.channels')}</dt>
                    <dd>{selectedCampaign.channels.map((c) => t(c)).join(' · ')}</dd>
                    <dt>{t('mkg.cal.col.assets')}</dt>
                    <dd className="lx-num">
                      {selectedCampaign.materials} / {selectedCampaign.products}
                    </dd>
                  </dl>

                  {/* 生命周期阶段：活动详情页那条时间线的精简版。
                      四段全列出（不只标当前段）—— 日历右栏宽度有限，
                      但"卡在待审核两周了"这个判断需要看得到它前面那段。 */}
                  <div className="lx-mcal__life">
                    <span className="lx-mcal__prephead">{t('mkg.campaign.detail.timeline')}</span>
                    <ol className="lx-mcal__lifesteps">
                      {CAMPAIGN_STAGES.map((stage) => {
                        const idx = CAMPAIGN_STAGES.indexOf(selectedCampaign.status);
                        const at = CAMPAIGN_STAGES.indexOf(stage);
                        const state = at < idx ? 'is-done' : at === idx ? 'is-active' : '';
                        return (
                          <li key={stage} className={state}>
                            {t(`mkg.campaign.stage.${stage}`)}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </>
              ) : null}

              {/* 筹备清单：进度条 + 逐项状态（附件交互 D） */}
              {selectedPrep.length > 0 ? (
                <div className="lx-mcal__prep">
                  <div className="lx-mcal__prephead">
                    <span>{t('mkg.cal.prep.title')}</span>
                    <span className="lx-num">
                      {selectedPrep.filter((p) => p.done).length}/{selectedPrep.length}
                      {selectedOverdue ? ` · ${t('mkg.cal.prep.overdue', { count: selectedOverdue.days })}` : ''}
                    </span>
                  </div>
                  <div className="lx-mcal__bar2">
                    <i
                      style={{
                        width: `${Math.round((selectedPrep.filter((p) => p.done).length / selectedPrep.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <ul className="lx-mcal__preplist">
                    {selectedPrep.map((p) => (
                      <li key={p.id} className={p.done ? 'is-done' : ''}>
                        <span className="lx-mcal__prepmark" aria-hidden="true">
                          {p.done ? <CheckOutlined /> : null}
                        </span>
                        <span className="lx-mcal__preptext">{t(p.labelKey)}</span>
                        <span className="lx-mcal__prepdate lx-num">{addDays(selected.start, p.offsetDays).slice(5)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* 提醒链预览（附件交互 D）：可见才不被当成骚扰 */}
              <div className="lx-mcal__remind">
                <span className="lx-mcal__prephead">{t('mkg.cal.remind.title')}</span>
                <ul className="lx-mcal__remindlist">
                  {reminders(selected).map((r, i) => (
                    <li key={`${selected.id}-R${i}`}>
                      <span className="lx-mcal__reminddate lx-num">{addDays(selected.start, r.offsetDays).slice(5)}</span>
                      <span className="lx-mcal__remindlabel">{t(r.labelKey)}</span>
                      <span className="lx-mcal__remindcc">{t(r.ccKey)}</span>
                    </li>
                  ))}
                </ul>
                <p className="lx-mcal__remindnote">{t('mkg.cal.remind.channel')}</p>
              </div>

              {/* 冲突提示：建议必须是动作而不是描述（附件交互 C 关键点） */}
              {selectedClash.length > 0 || selectedOverload ? (
                <div className="lx-mcal__conflict">
                  <span className="lx-mcal__conflicthead">
                    <WarningOutlined aria-hidden="true" /> {t('mkg.cal.conflict.title')}
                  </span>
                  {selectedClash.length > 0 ? (
                    <p className="lx-mcal__conflicttext">
                      {t('mkg.cal.conflict.with', {
                        date: selectedClashDate,
                        a: t(selected.titleKey),
                        b: selectedClash.map((c) => t(c.titleKey)).join('、'),
                      })}
                    </p>
                  ) : null}
                  {selectedOverload ? (
                    <p className="lx-mcal__conflicttext">
                      {t('mkg.cal.conflict.overload', {
                        count: selectedOverload.count,
                        date: selectedOverload.date,
                      })}
                    </p>
                  ) : null}
                  {/* 三个出口（附件交互 B 的反馈段）：仍要改期 / 换个日期 / 合并为一场 */}
                  <div className="lx-mcal__conflictacts">
                    <button type="button" className="lx-mcal__act lx-mcal__act--danger lx-focusable">
                      {t('mkg.cal.conflict.keep')}
                    </button>
                    <button type="button" className="lx-mcal__act lx-focusable">
                      {t('mkg.cal.conflict.shift')}
                    </button>
                    <button type="button" className="lx-mcal__act lx-focusable">
                      {t('mkg.cal.conflict.merge')}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="lx-mcal__panactions">
                <button type="button" className="lx-mcal__act lx-focusable" onClick={() => setSelectedId(null)}>
                  {t('mkg.cal.panel.close')}
                </button>
                {selected.href ? (
                  <button
                    type="button"
                    className="lx-mcal__act lx-mcal__act--primary lx-focusable"
                    onClick={() => void navigate(selected.href as string)}
                  >
                    {t('mkg.cal.panel.open')}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="lx-mcal__panempty">
              <CalendarOutlined aria-hidden="true" />
              <span>{t('mkg.cal.panel.hint')}</span>
            </div>
          )}
        </aside>

      </div>
    </PageContainer>
  );
}