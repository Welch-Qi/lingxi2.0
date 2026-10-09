import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  CalendarOutlined,
  FileImageOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  MKT_CALENDAR_EVENTS,
  MKT_CALENDAR_TODAY,
  type MktCalCat,
  type MktCalEvent,
  type MktCalState,
} from './marketing-calendar-data';

/**
 * 营销总览日历（营销中心总览页顶部）。
 *
 * 三视图：月（默认）/ 周 / 年。月与周按网格铺开，年用 12 个迷你月概览。
 * 同一张日历并排三件事：活动（campaign）、内容发布计划（content）、关键事件（event），
 * 其中「三态」（已完成 / 进行中 / 计划中）用**颜色**区分，类别用**图标**区分，
 * 两者正交 —— 既能在颜色上认出状态，也能在图标上认出是哪类事。
 *
 * 今天锚点 `MKT_CALENDAR_TODAY`（演示世界，当前对齐 2026-09-30，不用 new Date()）。
 * 事件点击：活动→详情，内容→审核页；关键事件无跳转（纯标记）。
 */

type View = 'month' | 'week' | 'year';

const CAT_ICON: Record<MktCalCat, ReactNode> = {
  campaign: <CalendarOutlined />,
  content: <FileImageOutlined />,
  event: <StarOutlined />,
};

const VIEWS: readonly View[] = ['month', 'week', 'year'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parse(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y: y ?? 0, m: (m ?? 0) - 1, d: d ?? 0 };
}

function eventsOnDay(events: readonly MktCalEvent[], dateStr: string): readonly MktCalEvent[] {
  return events.filter((e) => (e.end ? dateStr >= e.start && dateStr <= e.end : e.start === dateStr));
}

/** 月历格（周一起始，含前后月补齐）。weeks 默认 6 行。 */
function monthCells(year: number, month: number, weeks = 6): { date: string; d: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // 以「含 1 号那一周的周一」为起点，实现周一起始（周日=0 → 取上一周一；其余 → 1-getDay）
  const diffToMonday = first.getDay() === 0 ? -6 : 1 - first.getDay();
  const base = new Date(year, month, 1 + diffToMonday);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    return { date: fmt(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: dt.getDate(), inMonth: dt.getMonth() === month };
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

export default function MarketingCalendar({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('month');
  const seed = parse(MKT_CALENDAR_TODAY);
  const [cursor, setCursor] = useState<Date>(new Date(seed.y, seed.m, seed.d));
  const events = MKT_CALENDAR_EVENTS;

  const periodLabel = useMemo(() => {
    if (view === 'year') return String(cursor.getFullYear());
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    return i18n.language.startsWith('zh') ? `${y}年${m + 1}月` : `${t(`mkg.ov.cal.month.${m}`)} ${y}`;
  }, [view, cursor, i18n.language, t]);

  const goPrev = () => {
    if (view === 'month') setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    else if (view === 'week') setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() - 7));
    else setCursor((c) => new Date(c.getFullYear() - 1, c.getMonth(), 1));
  };
  const goNext = () => {
    if (view === 'month') setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    else if (view === 'week') setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7));
    else setCursor((c) => new Date(c.getFullYear() + 1, c.getMonth(), 1));
  };

  const isToday = (dateStr: string) => dateStr === MKT_CALENDAR_TODAY;

  // 紧凑月视图数据：以 cursor（默认今天）所在周为第一行，向后取 4 周；跨天活动按周合并为横条
  // （一段一周、整段一个标题），单日事件占一格。每周 2 条泳道贪心放置，放不下的计入当天角标 +N。
  const compactWeeks = useMemo(() => {
    // 取 cursor 所在周的周一为起点（周一起始），保证「今天」一定落在第 1 行
    const cDow = cursor.getDay();
    const cMonday = cDow === 0 ? -6 : 1 - cDow;
    const baseMonday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + cMonday);
    return Array.from({ length: 4 }, (_, w) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(baseMonday.getFullYear(), baseMonday.getMonth(), baseMonday.getDate() + w * 7 + i);
        return { date: fmt(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: dt.getDate(), inMonth: dt.getMonth() === cursor.getMonth() };
      });
      const weekStart = days[0]?.date ?? '';
      const weekEnd = days[6]?.date ?? '';
      const active = events
        .filter((e) => (e.end ?? e.start) >= weekStart && e.start <= weekEnd)
        .sort((a, b) => a.start.localeCompare(b.start) || (b.end ?? b.start).localeCompare(a.end ?? a.start));
      const laneIntervals: [Array<[number, number]>, Array<[number, number]>] = [[], []];
      const placed: { ev: MktCalEvent; from: number; span: number; lane: 0 | 1 }[] = [];
      const placedCount = [0, 0, 0, 0, 0, 0, 0];
      for (const ev of active) {
        const end = ev.end ?? ev.start;
        const from = days.findIndex((d) => d.date === (ev.start <= weekStart ? weekStart : ev.start));
        const to = days.findIndex((d) => d.date === (end >= weekEnd ? weekEnd : end));
        if (from < 0 || to < 0) continue;
        const fits = (li: 0 | 1) => laneIntervals[li].every(([s, e]) => to < s || from > e);
        let lane: 0 | 1 | null = null;
        if (fits(0)) lane = 0;
        else if (fits(1)) lane = 1;
        if (lane === null) continue;
        laneIntervals[lane].push([from, to]);
        placed.push({ ev, from, span: to - from + 1, lane });
        for (let i = from; i <= to; i++) placedCount[i] = (placedCount[i] ?? 0) + 1;
      }
      return { days, placed, placedCount };
    });
  }, [cursor, events]);

  const renderChip = (e: MktCalEvent) => (
    <button
      type="button"
      key={e.id}
      className={`lx-ovcal__event lx-ovcal__event--${e.state} lx-focusable`}
      title={t(e.titleKey)}
      onClick={() => {
        if (e.href) void navigate(e.href);
      }}
    >
      <span className="lx-ovcal__cat" aria-hidden="true">
        {CAT_ICON[e.cat]}
      </span>
      <span className="lx-ovcal__etext">{t(e.titleKey)}</span>
    </button>
  );

  const Legend = () => (
    <div className="lx-ovcal__legend">
      <span className="lx-ovcal__leg">
        <i className="lx-ovcal__swatch lx-ovcal__event--done" />
        {t('mkg.ov.cal.state.done')}
      </span>
      <span className="lx-ovcal__leg">
        <i className="lx-ovcal__swatch lx-ovcal__event--running" />
        {t('mkg.ov.cal.state.running')}
      </span>
      <span className="lx-ovcal__leg">
        <i className="lx-ovcal__swatch lx-ovcal__event--planned" />
        {t('mkg.ov.cal.state.planned')}
      </span>
      <span className="lx-ovcal__legsep" />
      <span className="lx-ovcal__leg">
        <span className="lx-ovcal__cat">{CAT_ICON.campaign}</span>
        {t('mkg.ov.cal.leg.campaign')}
      </span>
      <span className="lx-ovcal__leg">
        <span className="lx-ovcal__cat">{CAT_ICON.content}</span>
        {t('mkg.ov.cal.leg.content')}
      </span>
      <span className="lx-ovcal__leg">
        <span className="lx-ovcal__cat">{CAT_ICON.event}</span>
        {t('mkg.ov.cal.leg.event')}
      </span>
    </div>
  );

  // 周一起始：Mon Tue Wed Thu Fri Sat Sun
  const dows = [1, 2, 3, 4, 5, 6, 0].map((i) => t(`mkg.ov.cal.dow.${i}`));

  return (
    <div className={`lx-ovcal${compact ? ' lx-ovcal--compact' : ''}`}>
      <div className="lx-ovcal__bar">
        <div className="lx-ovcal__nav">
          <button type="button" className="lx-ovcal__navbtn lx-focusable" onClick={goPrev} aria-label={t('mkg.ov.cal.prev')}>
            <LeftOutlined />
          </button>
          <span className="lx-ovcal__period lx-num">{periodLabel}</span>
          <button type="button" className="lx-ovcal__navbtn lx-focusable" onClick={goNext} aria-label={t('mkg.ov.cal.next')}>
            <RightOutlined />
          </button>
        </div>
        {!compact ? (
          <span className="lx-ovcal__seg">
            {VIEWS.map((v) => (
              <button
                type="button"
                key={v}
                className={`lx-ovcal__segbtn lx-focusable${view === v ? ' is-active' : ''}`}
                onClick={() => setView(v)}
              >
                {t(`mkg.ov.cal.view.${v}`)}
              </button>
            ))}
          </span>
        ) : null}
      </div>

      {/* 图例：紧凑视图同样需要（2026-10-06）。
          此前只有大视图渲染 Legend，紧凑视图省略了它 —— 于是"圆点=进行中、
          方块=已完成"这条编码在窄视图里无处可查，读者只能靠猜。
          紧凑视图的横条现在也带类别图标，图例正是解释这两条通道的唯一钥匙。 */}
      <Legend />

      {compact ? (
        <div className="lx-ovcal__grid">
          <div className="lx-ovcal__dowrow">
            {dows.map((d, i) => (
              <div key={`dow-${i}`} className="lx-ovcal__dow">
                {d}
              </div>
            ))}
          </div>
          {compactWeeks.map((wk, w) => (
            <div key={w} className="lx-ovcal__weekrow">
              {wk.days.map((d, i) => {
                const dayEvents = eventsOnDay(events, d.date);
                const overflow = dayEvents.length - (wk.placedCount[i] ?? 0);
                return (
                  <div
                    key={d.date}
                    className={`lx-ovcal__day${d.inMonth ? '' : ' is-out'}${isToday(d.date) ? ' is-today' : ''}`}
                    title={dayEvents.length ? dayEvents.map((e) => t(e.titleKey)).join('\n') : undefined}
                  >
                    <span className="lx-ovcal__num lx-num">{d.d}</span>
                    {overflow > 0 ? <span className="lx-ovcal__more">+{overflow}</span> : null}
                  </div>
                );
              })}
              {wk.placed.map(({ ev, from, span, lane }) => (
                <button
                  key={ev.id}
                  type="button"
                  className={`lx-ovcal__bev lx-ovcal__event--${ev.state} lx-focusable`}
                  style={{ gridColumn: `${from + 1} / span ${span}`, gridRow: lane + 2 }}
                  title={t(ev.titleKey)}
                  onClick={() => {
                    if (ev.href) void navigate(ev.href);
                  }}
                >
                  {/* 类别图标 + 状态色点（2026-10-06 可视化增强）：
                      此前紧凑视图只有状态色点，**看不出这一周排的是活动还是内容** ——
                      状态与类别是两个正交维度（同一周里可能既有进行中的活动也有待发的内容），
                      只有一个通道时读者必须点开 hover 才知道是什么事。
                      这里把类别图标放回横条（8px，与大视图 chip 同一套 CAT_ICON），
                      与状态圆点并排 —— 颜色认状态、图标认类别，两条通道各司其职。 */}
                  <span className="lx-ovcal__bcat" aria-hidden="true">
                    {CAT_ICON[ev.cat]}
                  </span>
                  <span className="lx-ovcal__cdot" aria-hidden="true" />
                  <span className="lx-ovcal__etext">{t(ev.titleKey)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : view === 'month' ? (
        <div className="lx-ovcal__grid">
          {dows.map((d, i) => (
            <div key={`dow-${i}`} className="lx-ovcal__dow">
              {d}
            </div>
          ))}
          {monthCells(cursor.getFullYear(), cursor.getMonth()).map((cell) => {
            const dayEvents = eventsOnDay(events, cell.date);
            const showing = dayEvents.slice(0, 3);
            const extra = dayEvents.length - showing.length;
            return (
              <div
                key={cell.date}
                className={`lx-ovcal__cell${cell.inMonth ? '' : ' is-out'}${isToday(cell.date) ? ' is-today' : ''}`}
              >
                <span className="lx-ovcal__num lx-num">{cell.d}</span>
                <div className="lx-ovcal__events">
                  {showing.map(renderChip)}
                  {extra > 0 ? <span className="lx-ovcal__more">+{extra}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!compact && view === 'week' ? (
        <div className="lx-ovcal__week">
          {weekCells(cursor).map((cell) => {
            const dayEvents = eventsOnDay(events, cell.date);
            const p = parse(cell.date);
            const dow = new Date(p.y, p.m, p.d).getDay();
            return (
              <div key={cell.date} className={`lx-ovcal__wcol${isToday(cell.date) ? ' is-today' : ''}`}>
                <div className="lx-ovcal__whead">
                  <span className="lx-ovcal__wdow">{dows[dow]}</span>
                  <span className="lx-ovcal__num lx-num">{cell.d}</span>
                </div>
                <div className="lx-ovcal__events">{dayEvents.map(renderChip)}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!compact && view === 'year' ? (
        <div className="lx-ovcal__year">
          {Array.from({ length: 12 }, (_, m) => (
            <div key={m} className="lx-ovcal__month">
              <button
                type="button"
                className="lx-ovcal__monthtitle lx-focusable"
                onClick={() => {
                  setCursor(new Date(cursor.getFullYear(), m, 1));
                  setView('month');
                }}
              >
                {t(`mkg.ov.cal.month.${m}`)}
              </button>
              <div className="lx-ovcal__minigrid">
                {monthCells(cursor.getFullYear(), m).map((cell) => {
                  const dayEvents = eventsOnDay(events, cell.date);
                  const firstState: MktCalState | undefined = dayEvents[0]?.state;
                  return (
                    <span
                      key={cell.date}
                      className={`lx-ovcal__minicell${cell.inMonth ? '' : ' is-out'}${isToday(cell.date) ? ' is-today' : ''}${dayEvents.length > 0 ? ' has' : ''}`}
                      title={dayEvents.map((e) => t(e.titleKey)).join('\n')}
                    >
                      {firstState ? <i className={`lx-ovcal__dot lx-ovcal__event--${firstState}`} /> : null}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
