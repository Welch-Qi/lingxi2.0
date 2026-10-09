import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App } from 'antd';
import {
  BellOutlined,
  FileTextOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { CUSTOMERS } from './data';
import {
  CUS_FOLLOW_TODAY,
  FOLLOW_RECORDS,
  FOLLOW_TEMPLATES,
  customerNames,
  daysUntil,
  dueToday,
  overdueRecords,
  type FollowChannel,
  type FollowRecord,
  type FollowResult,
} from './follow-data';

/**
 * 跟进记录（/customer/follow）—— §4.4「跟进记录」+ OP-CUS-02/09/10/11。
 *
 * 客户 360 里那张四列表是这张表的**投影**（看的是"这个客户发生过什么"），
 * 本页看的是**"接下来要做什么"** —— 两者的第一排序键不同：
 * 360 按时间倒序，本页按"下一步该不该做"排序。把两件事塞进一页，
 * 结果是没人看第二块。
 *
 * 三个能力点落在页面上：
 *   · 模板（OP-CUS-10）：新记录从高频主题起头，而不是每次想"这次记什么"；
 *   · SLA 超期提醒：下一步跟进日到了会顶到右侧队列最上，超期标红；
 *   · 沟通记录自动归档（OP-CUS-11）：邮件 / WhatsApp / 网站的往来变成
 *     `source: auto` 的记录，接触自动进表、**结果仍要人补一句话**。
 *
 * 为什么"自动归档"的接触也算一条记录却允许它只有接触没有结论：
 * 判读`客户要什么`不能自动化，但`客户来找过我们`是事实，
 * 两者混在一起才会出现"系统说跟进过、人不知道聊了什么"。
 *
 * 静态骨架：行为作用于本地 state，接入后走 /api/v1/cus/follow-ups。
 */

const RESULT_VARIANT: Record<FollowResult, LxTagVariant> = {
  positive: 'done',
  neutral: 'lang',
  negative: 'graphic',
  noAnswer: 'producing',
};

const CHANNEL_FILTERS: readonly string[] = ['all', 'call', 'email', 'whatsapp', 'meeting', 'auto'];

const CHANNEL_VARIANT: Record<FollowChannel, LxTagVariant> = {
  call: 'producing',
  email: 'lang',
  whatsapp: 'video',
  meeting: 'graphic',
  auto: 'review',
};

export default function CustomerFollowPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [channel, setChannel] = useState('all');
  const [records, setRecords] = useState<readonly FollowRecord[]>(FOLLOW_RECORDS);
  const [activeTemplate, setActiveTemplate] = useState(FOLLOW_TEMPLATES[0].key);

  const names = useMemo(() => customerNames(CUSTOMERS), []);

  const overdue = useMemo(() => overdueRecords(records), [records]);
  const today = useMemo(() => dueToday(records), [records]);

  /** 从模板新建：把"下一步动作"落成一条待做的跟进，而不是只弹一句成功。 */
  const createFromTemplate = (key: string) => {
    message.success(t('cus.follow.template.applied', { key: t(`cus.follow.tpl.${key}`) }));
  };

  const rows = records.filter((record) => {
    const needle = keyword.trim().toLowerCase();
    if (needle && !(names.get(record.customerId) ?? '').toLowerCase().includes(needle)) {
      return false;
    }
    return channel === 'all' || record.channel === channel;
  });

  const columns = [
    {
      title: t('cus.follow.col.time'),
      dataIndex: 'at',
      key: 'at',
      width: '14%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('cus.follow.col.customer'),
      dataIndex: 'customerId',
      key: 'customer',
      width: '18%',
      render: (value: string) => <span className="lx-cell-title">{names.get(value) ?? value}</span>,
    },
    {
      title: t('cus.follow.col.channel'),
      dataIndex: 'channel',
      key: 'channel',
      width: '10%',
      render: (value: FollowChannel) => (
        <LxTag variant={CHANNEL_VARIANT[value]}>{t(`cus.follow.channel.${value}`)}</LxTag>
      ),
    },
    {
      title: t('cus.follow.col.result'),
      dataIndex: 'resultKey',
      key: 'result',
      width: '22%',
      render: (_v: string, row: FollowRecord) => (
        <span className="lx-cell-text">
          <LxTag variant={RESULT_VARIANT[row.result]}>{t(`cus.follow.result.${row.resultKey}`)}</LxTag>
          <span className="lx-cell-code">{row.id}</span>
        </span>
      ),
    },
    {
      title: t('cus.follow.col.next'),
      dataIndex: 'nextActionAt',
      key: 'next',
      width: '16%',
      render: (_v: string | null, row: FollowRecord) =>
        row.nextActionAt === null ? (
          <span className="lx-muted">—</span>
        ) : (
          <span
            className={`lx-num lx-cusfollow__next${
              daysUntil(row.nextActionAt) < 0 ? ' is-overdue' : ''
            }`}
          >
            {row.nextActionAt}
            <i className="lx-cusfollow__days">
              {daysUntil(row.nextActionAt) < 0
                ? t('cus.follow.overdue', { days: -daysUntil(row.nextActionAt) })
                : t('cus.follow.days', { days: daysUntil(row.nextActionAt) })}
            </i>
          </span>
        ),
    },
    {
      title: t('cus.follow.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '10%',
      render: (value: string) => t(value),
    },
    {
      title: t('cus.follow.col.source'),
      dataIndex: 'source',
      key: 'source',
      width: '10%',
      render: (value: FollowRecord['source']) =>
        value === 'manual' ? (
          <span className="lx-muted">{t('cus.follow.source.manual')}</span>
        ) : (
          <LxTag variant="review">
            <ThunderboltOutlined /> {t(`cus.follow.source.${value}`)}
          </LxTag>
        ),
    },
  ];

  return (
    <PageContainer titleKey="cus.follow.page" subtitleKey="cus.follow.pageSub">
      <LxActionBar
        primary={{ key: 'new', label: t('cus.follow.bar.new'), icon: <PlusOutlined /> }}
        items={[
          { key: 'import', label: t('cus.follow.bar.import'), icon: <FileTextOutlined /> },
          { key: 'sla', label: t('cus.follow.bar.sla'), icon: <BellOutlined /> },
        ]}
        note={t('cus.follow.note')}
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('cus.follow.kpi.today')}
          value={String(today.length)}
          sub={t('cus.follow.kpi.todaySub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('cus.follow.kpi.overdue')}
          value={String(overdue.length)}
          sub={t('cus.follow.kpi.overdueSub')}
          trend={overdue.length > 0 ? 'up' : 'fl'}
          delta={overdue.length > 0 ? '!' : '0'}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('cus.follow.kpi.week')}
          value={String(records.length)}
          sub={t('cus.follow.kpi.weekSub')}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('cus.follow.kpi.auto')}
          value={String(records.filter((record) => record.source !== 'manual').length)}
          sub={t('cus.follow.kpi.autoSub')}
          color="secondary"
          size="sm"
        />
      </div>

      <div className="lx-cusfollow__body">
        <section className="lx-glass lx-panel">
          <LxSectionHeader
            title={t('cus.follow.section.records')}
            sub={t('cus.follow.section.recordsSub')}
          />
          <div className="lx-cusfollow__tpl">
            <span className="lx-cusfollow__tpllabel">{t('cus.follow.template.label')}</span>
            {FOLLOW_TEMPLATES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`lx-chip lx-cusfollow__tplbtn lx-focusable${
                  item.key === activeTemplate ? ' is-active' : ''
                }`}
                onClick={() => {
                  setActiveTemplate(item.key);
                  createFromTemplate(item.key);
                }}
              >
                {t(`cus.follow.tpl.${item.key}`)}
              </button>
            ))}
          </div>
          <LxTableCard
            tools={
              <>
                <LxSearchInput
                  value={keyword}
                  placeholder={t('cus.follow.search')}
                  onChange={setKeyword}
                />
                <span className="lx-cusfollow__chips">
                  {CHANNEL_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`lx-cusfollow__chip lx-focusable${channel === item ? ' is-active' : ''}`}
                      onClick={() => setChannel(item)}
                    >
                      {item === 'all' ? t('cus.follow.filter.all') : t(`cus.follow.channel.${item}`)}
                    </button>
                  ))}
                </span>
              </>
            }
          >
            <LxTable<FollowRecord>
              fit
              columns={columns}
              dataSource={[...rows]}
              total={rows.length}
              pageNo={1}
              pageSize={20}
            />
          </LxTableCard>
        </section>

        {/* SLA 超期：跟进的失败永远发生在"忘了"，提醒必须顶在最上，不能埋在列表里。 */}
        <aside className="lx-glass lx-panel lx-cusfollow__aside">
          <LxSectionHeader title={t('cus.follow.sla.title')} sub={t('cus.follow.sla.sub')} />
          {overdue.length === 0 ? (
            <p className="lx-cusfollow__hint">{t('cus.follow.sla.empty')}</p>
          ) : (
            <ul className="lx-cusfollow__slalist">
              {overdue.map((record) => {
                const days = -daysUntil(record.nextActionAt ?? '');
                return (
                  <li key={record.id} className="lx-cusfollow__slaitem">
                    <span className="lx-cusfollow__slatop">
                      <span className="lx-cusfollow__slaname">
                        {names.get(record.customerId) ?? record.customerId}
                      </span>
                      <span className="lx-num lx-cusfollow__sladays">{days}</span>
                    </span>
                    <span className="lx-cusfollow__slameta">
                      {record.nextActionAt} · {t(`cus.follow.next.${record.nextActionKey}`)}
                    </span>
                    <button
                      type="button"
                      className="lx-cusfollow__slabtn lx-focusable"
                      onClick={() => {
                        setRecords((prev) =>
                          prev.map((item) =>
                            item.id === record.id ? { ...item, nextActionAt: CUS_FOLLOW_TODAY } : item,
                          ),
                        );
                        message.success(t('cus.follow.sla.done'));
                      }}
                    >
                      {t('cus.follow.sla.markDone')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="lx-cusfollow__hint">{t('cus.follow.sla.hint')}</p>
        </aside>
      </div>
    </PageContainer>
  );
}
