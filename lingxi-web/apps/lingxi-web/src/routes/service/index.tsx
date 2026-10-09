import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckOutlined, SendOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { LxSearchInput, LxTag } from '@lingxi/ui';
import {
  CHANNELS,
  HISTORY,
  RECORDS,
  SESSIONS,
  STATUS_FLOW,
  TICKETS,
  TICKET_NOW,
  type ChannelKey,
  type ChatSession,
  type TicketInfo,
  type PresenceStatus,
  type TicketStatus,
} from './data';

/**
 * 客服中心 · 服务顾问工作台（2026-09-29 重构 + 2026-09-29 扩展）。
 *
 * 顶部模式条切换三块能力，右侧是在线状态选择器：
 *   · 实时会话（realtime）：默认视图，左栏接入与队列 / 中栏实时对话 / 右栏客户与工单。
 *   · 历史会话（history）：选日期 → 当日客户列表 → 点击客户展开该客户当天会话记录。
 *   · 客户工单（tickets）：指标卡（全部 / 待处理 / 已逾期 / 关闭）点选筛选 → 工单列表。
 *
 * 文案一律走 i18n key（附录D 规则10）。演示数据来自 ./data。
 */
type Mode = 'realtime' | 'history' | 'tickets';
type TkFilter = 'all' | 'pending' | 'overdue' | 'closed';

export default function ServiceWorkbench() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 工单详情「返回」带 ?mode=tickets 回工单列表；其余入口默认实时会话。
  const modeParam = searchParams.get('mode');
  const initialMode: Mode =
    modeParam === 'realtime' || modeParam === 'history' || modeParam === 'tickets' ? modeParam : 'realtime';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [presence, setPresence] = useState<PresenceStatus>('online');

  // 实时会话态（提升到顶层：切走再切回保留选择）
  const [activeId, setActiveId] = useState<string>(SESSIONS[0]!.id);
  const [view, setView] = useState<'active' | 'records'>('active');
  const [channelFilter, setChannelFilter] = useState<ChannelKey | 'all'>('all');
  const [draft, setDraft] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>(() => SESSIONS.map((s) => ({ ...s })));
  const [ticketStatus, setTicketStatus] = useState<Record<string, TicketStatus>>(() =>
    Object.fromEntries(Object.entries(TICKETS).map(([id, info]) => [id, info.status])),
  );

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0]!;
  const activeTicket = active.ticketId ? TICKETS[active.ticketId] : undefined;
  const activeStatus = active.ticketId ? (ticketStatus[active.ticketId] ?? 'open') : undefined;

  const visibleSessions = [...sessions]
    .filter((s) => channelFilter === 'all' || s.channel === channelFilter)
    .sort((a, b) => a.waitingMins - b.waitingMins);

  const visibleRecords =
    channelFilter === 'all' ? RECORDS : RECORDS.filter((r) => r.channel === channelFilter);

  const selectSession = (id: string) => {
    setActiveId(id);
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, unread: 0 } : s)));
  };

  const openRecordCustomer = (customer: string) => {
    const matched = sessions.find((s) => s.customer === customer);
    if (matched) {
      selectSession(matched.id);
      setView('active');
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              messages: [
                ...s.messages,
                { id: `m${s.messages.length + 1}`, direction: 'out', text, time: 'now' },
              ],
            }
          : s,
      ),
    );
    setDraft('');
  };

  const advanceTicket = () => {
    if (!active.ticketId || !activeStatus) return;
    const stepIndex = STATUS_FLOW.indexOf(activeStatus);
    const next = STATUS_FLOW[Math.min(stepIndex + 1, STATUS_FLOW.length - 1)] ?? 'closed';
    setTicketStatus((prev) => ({ ...prev, [active.ticketId as string]: next }));
  };

  const closeTicket = () => {
    if (!active.ticketId) return;
    setTicketStatus((prev) => ({ ...prev, [active.ticketId as string]: 'closed' }));
  };

  return (
    <div className="lx-svc">
      {/* 顶部：模式条（左）+ 在线状态选择器（右） */}
      <header className="lx-svc__bar">
        <div className="lx-svc__modes" role="tablist" aria-label={t('svc.wb.inbox')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'realtime'}
            className={`lx-focusable${mode === 'realtime' ? ' is-active' : ''}`}
            onClick={() => setMode('realtime')}
          >
            {t('svc.mode.realtime')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'history'}
            className={`lx-focusable${mode === 'history' ? ' is-active' : ''}`}
            onClick={() => setMode('history')}
          >
            {t('svc.mode.history')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'tickets'}
            className={`lx-focusable${mode === 'tickets' ? ' is-active' : ''}`}
            onClick={() => setMode('tickets')}
          >
            {t('svc.mode.tickets')}
          </button>
        </div>
        <div className="lx-svc__presence" role="group" aria-label={t('svc.presence.label')}>
          <button
            type="button"
            className={`lx-svc__pres lx-focusable${presence === 'online' ? ' is-active' : ''}`}
            onClick={() => setPresence('online')}
          >
            <span className="lx-svc__pres-dot is-online" aria-hidden="true" />
            {t('svc.presence.online')}
          </button>
          <button
            type="button"
            className={`lx-svc__pres lx-focusable${presence === 'away' ? ' is-active' : ''}`}
            onClick={() => setPresence('away')}
          >
            <span className="lx-svc__pres-dot is-away" aria-hidden="true" />
            {t('svc.presence.away')}
          </button>
          <button
            type="button"
            className={`lx-svc__pres lx-focusable${presence === 'offline' ? ' is-active' : ''}`}
            onClick={() => setPresence('offline')}
          >
            <span className="lx-svc__pres-dot is-offline" aria-hidden="true" />
            {t('svc.presence.offline')}
          </button>
        </div>
      </header>

      {mode === 'realtime' && (
        <div className="lx-svc__grid">
          {/* 左栏：渠道接入条 + 视图切换 + 队列/记录 */}
          <aside className="lx-svc__inbox">
            <div className="lx-svc__channels" role="group" aria-label={t('svc.wb.channels')}>
              <button
                type="button"
                className={`lx-svc__channel lx-focusable${channelFilter === 'all' ? ' is-active' : ''}`}
                onClick={() => setChannelFilter('all')}
              >
                {t('svc.wb.all')}
              </button>
              {CHANNELS.map((channel) => (
                <button
                  key={channel.key}
                  type="button"
                  className={`lx-svc__channel lx-focusable${channel.online ? '' : ' is-off'}${
                    channelFilter === channel.key ? ' is-active' : ''
                  }`}
                  onClick={() => setChannelFilter(channelFilter === channel.key ? 'all' : channel.key)}
                  title={t(`svc.channel.${channel.key}`)}
                >
                  <span className="lx-svc__channel-dot" aria-hidden="true" />
                  {channel.icon}
                  {t(`svc.channel.${channel.key}`)}
                  {channel.unread > 0 ? (
                    <span className="lx-svc__channel-badge lx-num" aria-hidden="true">
                      {channel.unread}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="lx-svc__toggle" role="tablist" aria-label={t('svc.wb.inbox')}>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'active'}
                className={`lx-focusable${view === 'active' ? ' is-active' : ''}`}
                onClick={() => setView('active')}
              >
                {t('svc.wb.toggle.active')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'records'}
                className={`lx-focusable${view === 'records' ? ' is-active' : ''}`}
                onClick={() => setView('records')}
              >
                {t('svc.wb.toggle.records')}
              </button>
            </div>

            {view === 'active' ? (
              <div className="lx-svc__list">
                {visibleSessions.length === 0 ? (
                  <div className="lx-rec__empty">{t('svc.wb.records.empty')}</div>
                ) : (
                  visibleSessions.map((session) => {
                    const last = session.messages[session.messages.length - 1];
                    const preview = last ? (last.textKey ? t(last.textKey) : last.text ?? '') : '';
                    return (
                      <button
                        key={session.id}
                        type="button"
                        className={`lx-svc__session lx-focusable${session.id === activeId ? ' is-active' : ''}`}
                        aria-current={session.id === activeId ? 'true' : undefined}
                        onClick={() => selectSession(session.id)}
                      >
                        <span className="lx-svc__session-top">
                          <span className="lx-svc__session-name">{session.customer}</span>
                          {session.unread > 0 ? (
                            <span className="lx-svc__unread lx-num" aria-hidden="true">
                              {session.unread}
                            </span>
                          ) : null}
                        </span>
                        <span className="lx-svc__session-meta">
                          <LxTag variant="lang">{t(`svc.channel.${session.channel}`)}</LxTag>
                          <span className="lx-svc__waiting">
                            {t('svc.wb.waiting', { mins: session.waitingMins })}
                          </span>
                        </span>
                        <span className="lx-svc__session-preview" title={preview}>
                          {preview}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="lx-svc__list">
                {visibleRecords.length === 0 ? (
                  <div className="lx-rec__empty">{t('svc.wb.records.empty')}</div>
                ) : (
                  <ol className="lx-rec__timeline">
                    {visibleRecords.map((record) => (
                      <li
                        key={record.id}
                        className="lx-rec__item"
                        role="button"
                        tabIndex={0}
                        onClick={() => openRecordCustomer(record.customer)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openRecordCustomer(record.customer);
                        }}
                      >
                        <span className={`lx-rec__dot lx-rec__dot--${record.direction}`} aria-hidden="true" />
                        <div className="lx-rec__body">
                          <div className="lx-rec__meta">
                            <span className="lx-num lx-rec__time">{record.time}</span>
                            <LxTag variant="lang">{t(`svc.channel.${record.channel}`)}</LxTag>
                            <LxTag variant={record.direction === 'in' ? 'producing' : 'graphic'}>
                              {t(record.direction === 'in' ? 'svc.rec.direction.in' : 'svc.rec.direction.out')}
                            </LxTag>
                            <span className="lx-cell-title">{record.customer}</span>
                          </div>
                          <div className="lx-rec__snippet">{t(record.snippetKey)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </aside>

          {/* 中栏：实时对话窗（气泡/输入条复用 reception.css 的 .lx-rec__*） */}
          <section className="lx-svc__conversation">
            <header className="lx-svc__conv-head">
              <span className="lx-svc__conv-title">{active.customer}</span>
              <LxTag variant="lang">{t(`svc.channel.${active.channel}`)}</LxTag>
              {active.typing ? <span className="lx-svc__typing">{t('svc.chat.typing')}</span> : null}
            </header>

            <div className="lx-rec__msgs">
              {active.messages.map((message) => (
                <div
                  key={message.id}
                  className={`lx-rec__msg lx-rec__msg--${message.direction === 'in' ? 'customer' : 'agent'}`}
                >
                  <span className="lx-rec__msg-meta">
                    {message.direction === 'in' ? active.customer : t('svc.chat.me')} · {message.time}
                  </span>
                  <span className="lx-rec__bubble">
                    {message.textKey ? t(message.textKey) : message.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="lx-rec__composer">
              <input
                className="lx-rec__input"
                value={draft}
                placeholder={t('svc.chat.input.placeholder')}
                aria-label={t('svc.chat.input.placeholder')}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="lx-rec__send lx-focusable" onClick={send}>
                <SendOutlined />
                {t('svc.chat.send')}
              </button>
            </div>
          </section>

          {/* 右栏：客户上下文 + 工单面板 */}
          <aside className="lx-svc__context">
            <section className="lx-svc__ctx-section">
              <div className="lx-svc__ctx-title">{t('svc.wb.customer')}</div>
              <div className="lx-svc__field">
                <span className="lx-svc__field-label">{t('svc.wb.contact')}</span>
                <span className="lx-svc__field-value">{t(active.contactKey)}</span>
              </div>
              <div className="lx-svc__field">
                <span className="lx-svc__field-label">{t('svc.wb.country')}</span>
                <span className="lx-svc__field-value">{t(active.countryKey)}</span>
              </div>
              <div className="lx-svc__tags">
                {active.tags.map((tag) => (
                  <LxTag key={tag.labelKey} variant={tag.variant}>
                    {t(tag.labelKey)}
                  </LxTag>
                ))}
              </div>
            </section>

            <section className="lx-svc__ctx-section">
              <div className="lx-svc__ctx-title">{t('svc.wb.ticket')}</div>
              {activeTicket && activeStatus ? (
                <>
                  <div className="lx-tk__meta">
                    <div className="lx-tk__meta-item">
                      <span className="lx-tk__meta-label">{t('svc.wb.ticket.no')}</span>
                      <span className="lx-cell-title">{activeTicket.ticketNo}</span>
                    </div>
                    <div className="lx-tk__meta-item">
                      <span className="lx-tk__meta-label">{t('svc.tk.col.category')}</span>
                      <LxTag variant="lang">{t(activeTicket.categoryKey)}</LxTag>
                    </div>
                    <div className="lx-tk__meta-item">
                      <span className="lx-tk__meta-label">{t('svc.tk.col.owner')}</span>
                      <span className="lx-cell-text">{t(activeTicket.ownerKey)}</span>
                    </div>
                    <div className="lx-tk__meta-item">
                      <span className="lx-tk__meta-label">{t('svc.tk.col.handler')}</span>
                      <span className="lx-cell-text">{t(activeTicket.handlerKey)}</span>
                    </div>
                  </div>

                  <ol className="lx-steps">
                    {STATUS_FLOW.map((step, index) => (
                      <li
                        key={step}
                        className={`lx-steps__item${
                          index < STATUS_FLOW.indexOf(activeStatus) ? ' is-done' : ''
                        }${index === STATUS_FLOW.indexOf(activeStatus) ? ' is-active' : ''}`}
                      >
                        <span className="lx-steps__dot" aria-hidden="true">
                          {index < STATUS_FLOW.indexOf(activeStatus) ? <CheckOutlined /> : index + 1}
                        </span>
                        <span className="lx-steps__label">{t(`svc.detail.steps.${step}`)}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="lx-tk__actions">
                    <button
                      type="button"
                      className="lx-form__submit lx-focusable"
                      onClick={advanceTicket}
                      disabled={activeStatus === 'closed'}
                    >
                      {t('svc.detail.advance')}
                    </button>
                    <button
                      type="button"
                      className="lx-tk__close lx-focusable"
                      onClick={closeTicket}
                      disabled={activeStatus === 'closed'}
                    >
                      {t('svc.detail.close')}
                    </button>
                  </div>
                  {activeStatus === 'closed' ? (
                    <div className="lx-tk__closed">{t('svc.wb.ticket.closedHint')}</div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="lx-svc__ticket-empty">{t('svc.wb.ticket.none')}</div>
                  <button
                    type="button"
                    className="lx-svc__create lx-focusable"
                    onClick={() => void navigate('/service/tickets/new')}
                  >
                    {t('svc.wb.ticket.create')}
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      )}

      {mode === 'history' && <HistoryView />}
      {mode === 'tickets' && <TicketsView ticketStatus={ticketStatus} setTicketStatus={setTicketStatus} />}
    </div>
  );
}

/** 历史会话视图：日期选择 → 当日客户列表 → 点击客户展开会话记录。 */
function HistoryView() {
  const { t } = useTranslation();
  const [date, setDate] = useState<string>(HISTORY[0]!.date);
  const [customer, setCustomer] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const day = HISTORY.find((d) => d.date === date) ?? HISTORY[0]!;
  const selected = day.customers.find((c) => c.customer === customer) ?? null;
  /** 按客户名查询：在「当前日期」范围内做不区分大小写的子串过滤。 */
  const filteredCustomers = customerQuery.trim()
    ? day.customers.filter((c) => c.customer.toLowerCase().includes(customerQuery.trim().toLowerCase()))
    : day.customers;

  return (
    <div className="lx-svc__hist">
      <aside className="lx-svc__hist-side">
        <div className="lx-svc__hist-date">
          <label htmlFor="lx-hist-date">{t('svc.hist.date')}</label>
          <select
            id="lx-hist-date"
            className="lx-svc__select"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setCustomer(null);
            }}
          >
            {HISTORY.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date}
              </option>
            ))}
          </select>
        </div>
        <div className="lx-svc__hist-list">
          <div className="lx-svc__hist-search">
            <LxSearchInput
              value={customerQuery}
              placeholder={t('svc.hist.search')}
              onChange={setCustomerQuery}
            />
          </div>
          <div className="lx-svc__hist-list-title">{t('svc.hist.customers')}</div>
          {filteredCustomers.length === 0 ? (
            <div className="lx-rec__empty">{t('svc.hist.empty')}</div>
          ) : (
            filteredCustomers.map((c) => (
              <button
                key={c.customer}
                type="button"
                className={`lx-svc__hist-item lx-focusable${c.customer === customer ? ' is-active' : ''}`}
                onClick={() => setCustomer(c.customer)}
              >
                <span className="lx-svc__hist-item-name">{c.customer}</span>
                <LxTag variant="lang">{t(`svc.channel.${c.channel}`)}</LxTag>
                <span className="lx-svc__hist-item-count lx-num" aria-hidden="true">
                  {c.messages.length}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="lx-svc__hist-detail">
        {selected ? (
          <>
            <header className="lx-svc__conv-head">
              <span className="lx-svc__conv-title">{selected.customer}</span>
              <LxTag variant="lang">{t(`svc.channel.${selected.channel}`)}</LxTag>
            </header>
            <div className="lx-rec__msgs">
              {selected.messages.map((m) => (
                <div
                  key={m.id}
                  className={`lx-rec__msg lx-rec__msg--${m.direction === 'in' ? 'customer' : 'agent'}`}
                >
                  <span className="lx-rec__msg-meta">
                    {m.direction === 'in' ? selected.customer : t('svc.chat.me')} · {m.time}
                  </span>
                  <span className="lx-rec__bubble">{m.textKey ? t(m.textKey) : m.text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="lx-svc__empty">{t('svc.hist.selectHint')}</div>
        )}
      </section>
    </div>
  );
}

const TK_STATUS_KEY: Record<TicketStatus, string> = {
  open: 'svc.status.open',
  processing: 'svc.status.processing',
  resolved: 'svc.status.resolved',
  closed: 'svc.status.closed',
};
const TK_STATUS_VARIANT: Record<TicketStatus, 'review' | 'producing' | 'done'> = {
  open: 'review',
  processing: 'producing',
  resolved: 'done',
  closed: 'done',
};

/** 客户工单视图：指标卡（全部/待处理/已逾期/关闭）点选筛选 → 工单列表。 */
function TicketsView({
  ticketStatus,
  setTicketStatus,
}: {
  ticketStatus: Record<string, TicketStatus>;
  setTicketStatus: Dispatch<SetStateAction<Record<string, TicketStatus>>>;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TkFilter>('all');
  const all = Object.values(TICKETS);
  const statusOf = (x: TicketInfo) => ticketStatus[x.id] ?? x.status;
  const pending = all.filter((x) => statusOf(x) === 'open' || statusOf(x) === 'processing');
  const overdue = all.filter(
    (x) => statusOf(x) !== 'closed' && statusOf(x) !== 'resolved' && x.dueAt < TICKET_NOW,
  );
  const closed = all.filter((x) => statusOf(x) === 'closed');
  const shown = filter === 'all' ? all : filter === 'pending' ? pending : filter === 'overdue' ? overdue : closed;

  /* 操作列：按状态动态显示可操作链接（复用实时会话右栏的状态机语义）。
     待受理/处理中可「推进状态」与「闭环」；已解决只可「闭环」；已闭环显示静默标记。 */
  const advance = (id: string) => {
    const cur = ticketStatus[id] ?? TICKETS[id]!.status;
    const stepIndex = STATUS_FLOW.indexOf(cur);
    const next = STATUS_FLOW[Math.min(stepIndex + 1, STATUS_FLOW.length - 1)] ?? 'closed';
    setTicketStatus((prev) => ({ ...prev, [id]: next }));
  };
  const close = (id: string) => setTicketStatus((prev) => ({ ...prev, [id]: 'closed' }));

  const cards: { key: TkFilter; label: string; value: number; tone: string }[] = [
    { key: 'all', label: t('svc.tk.metric.all'), value: all.length, tone: 'total' },
    { key: 'pending', label: t('svc.tk.metric.pending'), value: pending.length, tone: 'pending' },
    { key: 'overdue', label: t('svc.tk.metric.overdue'), value: overdue.length, tone: 'overdue' },
    { key: 'closed', label: t('svc.tk.metric.closed'), value: closed.length, tone: 'closed' },
  ];

  return (
    <div className="lx-svc__tickets">
      <div className="lx-svc__tkcards">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`lx-svc__tkcard lx-focusable lx-svc__tkcard--${c.tone}${
              filter === c.key ? ' is-active' : ''
            }`}
            onClick={() => setFilter(c.key)}
          >
            <span className="lx-svc__tkcard-value lx-num">{c.value}</span>
            <span className="lx-svc__tkcard-label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="lx-svc__tktable-wrap">
        <table className="lx-svc__tktable">
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{t('svc.tk.col.no')}</th>
              <th>{t('svc.tk.col.customer')}</th>
              <th>{t('svc.tk.col.category')}</th>
              <th>{t('svc.tk.col.desc')}</th>
              <th>{t('svc.tk.col.status')}</th>
              <th>{t('svc.tk.col.owner')}</th>
              <th>{t('svc.tk.col.op')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => {
              const st = statusOf(x);
              return (
              <tr key={x.id}>
                <td className="lx-cell-title">
                  <Link to={`/service/tickets/${x.id}`} className="lx-link lx-focusable">
                    {x.ticketNo}
                  </Link>
                </td>
                <td className="lx-cell-title">{x.customer}</td>
                <td>
                  <LxTag variant="lang">{t(x.categoryKey)}</LxTag>
                </td>
                <td className="lx-cell-text">
                  <Tooltip title={t(x.descKey)}>
                    <span className="lx-svc__tkdesc">{t(x.descKey)}</span>
                  </Tooltip>
                </td>
                <td>
                  <LxTag variant={TK_STATUS_VARIANT[st]}>{t(TK_STATUS_KEY[st])}</LxTag>
                </td>
                <td className="lx-cell-text">{t(x.ownerKey)}</td>
                <td className="lx-svc__tkop">
                  <Link to={`/service/tickets/${x.id}`} className="lx-link lx-focusable">
                    {t('svc.detail.view')}
                  </Link>
                  {st === 'closed' ? (
                    <span className="lx-svc__tkop-done">{t('svc.detail.steps.closed')}</span>
                  ) : (
                    <>
                      {(st === 'open' || st === 'processing') && (
                        <button type="button" className="lx-link lx-focusable" onClick={() => advance(x.id)}>
                          {t('svc.detail.advance')}
                        </button>
                      )}
                      <button type="button" className="lx-link lx-focusable" onClick={() => close(x.id)}>
                        {t('svc.detail.close')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 ? <div className="lx-rec__empty">{t('svc.list.empty')}</div> : null}
      </div>
    </div>
  );
}
