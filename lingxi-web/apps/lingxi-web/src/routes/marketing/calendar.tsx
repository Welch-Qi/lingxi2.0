import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  FormOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxKpi,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  type LxTagVariant,
} from '@lingxi/ui';
import { App, Drawer } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { MKG_CHANNEL_KEYS, type ChannelKey } from './data';
import {
  CALENDAR_WEEK,
  MKG_SCHEDULE_TODAY,
  SCHEDULE_ITEMS,
  SCHEDULE_ZONES,
  byTime,
  type ScheduleItem,
  type ScheduleStatus,
} from './calendar-data';

/**
 * 内容排期日历（/marketing/calendar）—— §2.8「内容分发与排期」，§4.4「内容排期分发」。
 *
 * 与 `/marketing/distribute` 的分工写在 `calendar-data.ts` 文件头，这里只说视图：
 * 分发页是按**结果**（触达、点击、完成度）说话的聚合视图，
 * 本页是按**时间**说话的排期视图 —— 人需要回答的是"9 月 25 日那天有没有东西、发哪个渠道、谁批的"。
 *
 * 三条刻意的设计选择：
 *
 * ① **泳道按渠道分，不按人分。** 排期的执行主体是渠道账号（一个运营管五个号），
 *    按人分会让"这周号主休假了怎么办"变成日历上的死角。
 * ② **每一格都带当地时刻与时区，不写"20:00"。** 排期一旦跨时区，
 *    只写一个时刻就等于没写 —— 对方收到的是自己当地的几点，只有带上时区才对得上。
 * ③ **待审核单独占右栏，不放进格子。** 对外内容必须人审（技术规约2.0 §3.6 G4，自主度 ≤A1），
 *    "审"是这一页唯一的高频动作，让它待在一堆卡片里等于让它消失。
 *
 * 静态骨架：行为作用于本地 state，接入后走 /api/v1/mkg/schedules。
 */

/** 排期状态 → 标签变体（同一状态在任何页长得一样）。 */
const STATUS_VARIANT: Record<ScheduleStatus, LxTagVariant> = {
  review: 'review',
  scheduled: 'lang',
  publishing: 'producing',
  published: 'done',
  postponed: 'graphic',
};

const ZONE_KEY: Record<string, string> = Object.fromEntries(
  SCHEDULE_ZONES.map((zone) => [zone.zone, zone.key]),
);

export default function MarketingCalendarPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [items, setItems] = useState<readonly ScheduleItem[]>(SCHEDULE_ITEMS);
  const [view, setView] = useState<'week' | 'list'>('week');
  const [active, setActive] = useState<ScheduleItem | null>(null);

  const isToday = (day: string) => day === MKG_SCHEDULE_TODAY;

  const pending = useMemo(
    () => items.filter((item) => item.status === 'review').sort(byTime),
    [items],
  );
  const planned = items.filter((item) => item.status === 'scheduled').length;
  const published = items.filter((item) => item.status === 'published' || item.status === 'publishing')
    .length;
  const postponed = items.filter((item) => item.status === 'postponed').length;

  /** 审核通过：人审放行的那一步，放行后进入排期、到点自动分发。 */
  const approve = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'scheduled' } : item)));
    setActive((prev) => (prev && prev.id === id ? { ...prev, status: 'scheduled' } : prev));
    message.success(t('mkg.cal.review.approveDone'));
  };

  /** 驳回：不进排期，退回生产段。对外内容不放行与放行一样是硬动作，都要走这一步。 */
  const reject = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'postponed' } : item)));
    setActive((prev) => (prev && prev.id === id ? { ...prev, status: 'postponed' } : prev));
    message.info(t('mkg.cal.review.rejectDone'));
  };

  const renderCard = (item: ScheduleItem) => (
    <button
      type="button"
      className={`lx-mkgcal__card lx-mkgcal__card--${item.status} lx-focusable`}
      title={`${item.time} ${t(`mkg.cal.tz.${ZONE_KEY[item.zone] ?? 'shanghai'}`)}`}
      onClick={() => setActive(item)}
    >
      <span className="lx-mkgcal__cardtime lx-num">{item.time}</span>
      <span className="lx-mkgcal__cardtitle">{t(item.titleKey)}</span>
    </button>
  );

  const listColumns = [
    {
      title: t('mkg.cal.col.content'),
      dataIndex: 'titleKey',
      key: 'content',
      width: '26%',
      render: (_v: string, row: ScheduleItem) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{t(row.titleKey)}</div>
          <div className="lx-cell-code">{row.id}</div>
        </div>
      ),
    },
    {
      title: t('mkg.cal.col.channel'),
      dataIndex: 'channelKey',
      key: 'channel',
      width: '12%',
      render: (value: ChannelKey) => <LxTag variant="graphic">{t(`mkg.channel.${value}`)}</LxTag>,
    },
    { title: t('mkg.cal.col.date'), dataIndex: 'date', key: 'date', width: '12%' },
    { title: t('mkg.cal.col.time'), dataIndex: 'time', key: 'time', width: '9%' },
    {
      title: t('mkg.cal.col.zone'),
      dataIndex: 'zone',
      key: 'zone',
      width: '14%',
      render: (zone: string) => t(`mkg.cal.tz.${ZONE_KEY[zone] ?? 'shanghai'}`),
    },
    {
      title: t('mkg.cal.col.langs'),
      dataIndex: 'langs',
      key: 'langs',
      width: '12%',
      render: (langs: readonly string[]) => langs.join(' / '),
    },
    {
      title: t('mkg.cal.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status: ScheduleStatus) => (
        <LxTag variant={STATUS_VARIANT[status]}>{t(`mkg.cal.status.${status}`)}</LxTag>
      ),
    },
  ];

  return (
    <PageContainer titleKey="mkg.cal.page" subtitleKey="mkg.cal.pageSub">
      <LxActionBar
        primary={{ key: 'new', label: t('mkg.cal.bar.new'), icon: <CalendarOutlined /> }}
        items={[
          { key: 'auto', label: t('mkg.cal.bar.autoFill'), icon: <FormOutlined /> },
          { key: 'batch', label: t('mkg.cal.bar.batchApprove'), icon: <CheckCircleOutlined /> },
        ]}
        note={t('mkg.cal.note')}
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.cal.kpi.planned')}
          value={String(planned)}
          sub={t('mkg.cal.kpi.plannedSub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.cal.kpi.review')}
          value={String(pending.length)}
          sub={t('mkg.cal.kpi.reviewSub')}
          trend={pending.length > 0 ? 'up' : 'fl'}
          delta={pending.length > 0 ? '!' : '0'}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.cal.kpi.published')}
          value={String(published)}
          sub={t('mkg.cal.kpi.publishedSub')}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.cal.kpi.postponed')}
          value={String(postponed)}
          sub={t('mkg.cal.kpi.postponedSub')}
          color="secondary"
          size="sm"
        />
      </div>

      <div className="lx-mkgcal__body">
        <section className="lx-glass lx-panel">
          <LxSectionHeader
            title={t('mkg.cal.section.week')}
            sub={t('mkg.cal.section.weekSub')}
            actions={
              <span className="lx-mkgcal__seg">
                <button
                  type="button"
                  className={`lx-mkgcal__segbtn lx-focusable${view === 'week' ? ' is-active' : ''}`}
                  onClick={() => setView('week')}
                >
                  <CalendarOutlined />
                  {t('mkg.cal.view.week')}
                </button>
                <button
                  type="button"
                  className={`lx-mkgcal__segbtn lx-focusable${view === 'list' ? ' is-active' : ''}`}
                  onClick={() => setView('list')}
                >
                  <ClockCircleOutlined />
                  {t('mkg.cal.view.list')}
                </button>
              </span>
            }
          />

          {view === 'week' ? (
            <div className="lx-mkgcal__week">
              <span className="lx-mkgcal__lanehead">{t('mkg.cal.col.channel')}</span>
              {CALENDAR_WEEK.map((day, index) => (
                <span
                  key={day}
                  className={`lx-mkgcal__day${isToday(day) ? ' is-today' : ''}`}
                >
                  <span className="lx-mkgcal__dow">{t(`mkg.cal.d.${index + 1}`)}</span>
                  <span className="lx-mkgcal__dom lx-num">{Number(day.slice(8))}</span>
                </span>
              ))}

              {MKG_CHANNEL_KEYS.map((channel) => (
                <div key={channel} className="lx-mkgcal__lane">
                  <span className="lx-mkgcal__lanelabel">{t(`mkg.channel.${channel}`)}</span>
                  {CALENDAR_WEEK.map((day) => {
                    const cells = items
                      .filter((item) => item.channelKey === channel && item.date === day)
                      .sort(byTime);
                    return (
                      <span key={`${channel}-${day}`} className="lx-mkgcal__cell">
                        {cells.length === 0 ? (
                          <span className="lx-mkgcal__cellempty" aria-hidden="true">
                            ·
                          </span>
                        ) : (
                          cells.map((item) => (
                            <span key={item.id} className="lx-mkgcal__slot">
                              {renderCard(item)}
                            </span>
                          ))
                        )}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="lx-mkgcal__hint">{t('mkg.cal.listHint')}</p>
          )}
        </section>

        {/* 待审核单独占一栏：这是这一页唯一的高频人工动作（§3.6 G4，自主度 ≤A1）。 */}
        <aside className="lx-glass lx-panel lx-mkgcal__review">
          <LxSectionHeader title={t('mkg.cal.review.title')} sub={t('mkg.cal.review.sub')} />
          {pending.length === 0 ? (
            <p className="lx-mkgcal__hint">{t('mkg.cal.review.empty')}</p>
          ) : (
            <ul className="lx-mkgcal__reviewlist">
              {pending.map((item) => (
                <li key={item.id} className="lx-mkgcal__reviewitem">
                  <button
                    type="button"
                    className="lx-mkgcal__reviewbtn lx-focusable"
                    onClick={() => setActive(item)}
                  >
                    <span className="lx-mkgcal__rvtitle">{t(item.titleKey)}</span>
                    <span className="lx-mkgcal__rvmeta">
                      <span className="lx-num">{item.time}</span>
                      {' · '}
                      {t(`mkg.channel.${item.channelKey}`)}
                      {' · '}
                      {item.date.slice(5)}
                    </span>
                  </button>
                  <span className="lx-mkgcal__rvops">
                    <button
                      type="button"
                      className="lx-mkgcal__rvop lx-mkgcal__rvop--ok lx-focusable"
                      onClick={() => approve(item.id)}
                    >
                      <CheckCircleOutlined />
                      {t('mkg.cal.review.approve')}
                    </button>
                    <button
                      type="button"
                      className="lx-mkgcal__rvop lx-mkgcal__rvop--no lx-focusable"
                      onClick={() => reject(item.id)}
                    >
                      <CloseOutlined />
                      {t('mkg.cal.review.reject')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {view === 'list' ? (
        <section className="lx-section">
          <LxSectionHeader title={t('mkg.cal.section.list')} sub={t('mkg.cal.section.listSub')} />
          <LxTableCard>
            <LxTable<ScheduleItem>
              fit
              columns={listColumns}
              dataSource={[...items].sort(byTime)}
              total={items.length}
              pageNo={1}
              pageSize={20}
            />
          </LxTableCard>
        </section>
      ) : null}

      <Drawer
        open={active !== null}
        onClose={() => setActive(null)}
        width={420}
        title={active ? t(active.titleKey) : ''}
      >
        {active ? (
          <div className="lx-mkgcal__detail">
            <dl className="lx-mkgcal__dlist">
              <dt>{t('mkg.cal.col.status')}</dt>
              <dd>
                <LxTag variant={STATUS_VARIANT[active.status]}>
                  {t(`mkg.cal.status.${active.status}`)}
                </LxTag>
              </dd>
              <dt>{t('mkg.cal.col.channel')}</dt>
              <dd>{t(`mkg.channel.${active.channelKey}`)}</dd>
              <dt>{t('mkg.cal.col.date')}</dt>
              <dd className="lx-num">{active.date}</dd>
              <dt>{t('mkg.cal.col.time')}</dt>
              <dd className="lx-num">{active.time}</dd>
              <dt>{t('mkg.cal.col.zone')}</dt>
              <dd>
                {t(`mkg.cal.tz.${ZONE_KEY[active.zone] ?? 'shanghai'}`)}
                <span className="lx-mkgcal__zone"> {active.zone}</span>
              </dd>
              <dt>{t('mkg.cal.col.langs')}</dt>
              <dd>{active.langs.join(' / ')}</dd>
              <dt>{t('mkg.cal.col.owner')}</dt>
              <dd>{t(`demo.owner.${active.ownerKey}`)}</dd>
            </dl>

            <p className="lx-mkgcal__hint">
              <SendOutlined /> {t('mkg.cal.detail.hint')}
            </p>

            <div className="lx-mkgcal__detailops">
              <button
                type="button"
                className="lx-mkgcal__rvop lx-mkgcal__rvop--ok lx-focusable"
                onClick={() => approve(active.id)}
              >
                <CheckCircleOutlined />
                {t('mkg.cal.review.approve')}
              </button>
              <button
                type="button"
                className="lx-mkgcal__rvop lx-mkgcal__rvop--no lx-focusable"
                onClick={() => reject(active.id)}
              >
                <CloseOutlined />
                {t('mkg.cal.review.reject')}
              </button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
