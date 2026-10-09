import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App } from 'antd';
import { GlobalOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import {
  LxActionBar,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTag,
  LxTable,
  LxTableCard,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  VISITOR_SESSIONS,
  knownRatio,
  pendingReach,
  type VisitorMatch,
  type VisitorSession,
  type VisitorSource,
} from './visitor-data';

/**
 * 访客识别与流量转化（/marketing/visitor）—— §2.8「访客识别与流量转化」。
 *
 * 典型使用者：市场负责人。他这一页要看的不是"今天多了多少曝光"，
 * 而是"这些自己找上门的人，有几个人被跟上了"。两者差一个动作，
 * 而差的这个动作就是本页存在的理由 —— 识别完没人跟，等于没识别。
 *
 * 本页结构：
 *   ① 操作入口 —— 一键触达全部待触达（右栏队列的顶部按钮，这里再给一次入口）
 *   ② 四个指标 —— 访客会话数 / 可识别率 / 待触达 / 本期留资
 *   ③ 访客会话表 —— 公司、来处、最近到访、看过什么、是否已知、能不能跟
 *   ④ 待触达队列 —— 按浏览深度排序；这一栏是本页真正的产出出口
 *
 * 右栏队列与表格里同一批公司重复出现是**故意的**：队列是"现在要做的动作"，
 * 表格是"审计这些判断对不对"。若只留表格，待触达会沉到第三屏；
 * 若只留队列，就无法复核"是不是把同行也当成了意向客户"。
 *
 * 匹配到内部对象时不给「建线索」按钮（给了等于让人重复建一份已有的对象）；
 * 留资公司也不再需要「一键触达」—— 他已经留下联系方式了，该做的是跟进而不是触达。
 */

const MATCH_VARIANT: Record<VisitorMatch, LxTagVariant> = {
  customer: 'done',
  lead: 'lang',
  unknown: 'graphic',
};

const SOURCE_VARIANT: Record<VisitorSource, LxTagVariant> = {
  organic: 'lang',
  paid: 'producing',
  referral: 'video',
  social: 'graphic',
  email: 'review',
};

export default function MarketingVisitorPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<readonly VisitorSession[]>(VISITOR_SESSIONS);
  const [keyword, setKeyword] = useState('');

  const queue = useMemo(() => pendingReach(sessions), [sessions]);

  const rows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) {
      return sessions;
    }
    return sessions.filter((session) =>
      (
        t(`mkg.vis.company.${session.companyKey}`).toLowerCase() +
        ' ' +
        session.domain.toLowerCase()
      ).includes(needle),
    );
  }, [keyword, sessions, t]);

  /** 触达 = 有人接手了。改本行状态而不是只弹一句成功 —— 否则队列永远清不掉。 */
  const reach = (id: string, companyKey: string) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === id ? { ...session, reached: true } : session)),
    );
    message.success(t('mkg.vis.reachDone', { company: t(`mkg.vis.company.${companyKey}`) }));
  };

  const reachAll = () => {
    const pending = pendingReach(sessions);
    if (pending.length === 0) {
      return;
    }
    const ids = new Set(pending.map((session) => session.id));
    setSessions((prev) => prev.map((session) => (ids.has(session.id) ? { ...session, reached: true } : session)));
    message.success(t('mkg.vis.reachAllDone', { count: pending.length }));
  };

  const filled = sessions.filter((session) => session.formFilled).length;

  const columns = [
    {
      title: t('mkg.vis.col.company'),
      dataIndex: 'companyKey',
      key: 'company',
      // 列宽预算按 aside 340px 不塌缩的最窄档（1366，表格 ~710px）算：
      // 日期列 17% 是 `2026-09-22 10:02` 的硬下限（~103px + 单元格内边距），日期不可截断；
      // 来源/是否已知列 12%/11% 是 en 胶囊（含 tag 内边距）的硬下限——tag 被硬裁
      // 成 "Organic se"/"Custome r" 比省略号更糟（探针量不到 tag 内部，靠截图目检抓的）。
      width: '17%',
      render: (value: string, row: VisitorSession) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{t(`mkg.vis.company.${value}`)}</div>
          <div className="lx-cell-code">{row.domain}</div>
        </div>
      ),
    },
    {
      title: t('mkg.vis.col.region'),
      dataIndex: 'regionKey',
      key: 'region',
      width: '8%',
      render: (value: string) => (
        // 8% 列宽放不下国家全名（en "United Kingdom" 91px）——截成字母碎片比看不懂更糟。
        // 显示 ISO 代码（原子单位），全名挂 title：澳大利亚/Australia → AU。
        <span className="lx-cell-text" title={t(`mkg.vis.region.${value}`)}>
          <span className="lx-cell-code">{value.toUpperCase()}</span>
        </span>
      ),
    },
    {
      title: t('mkg.vis.col.source'),
      dataIndex: 'source',
      key: 'source',
      width: '12%',
      render: (value: VisitorSource) => (
        <LxTag variant={SOURCE_VARIANT[value]}>{t(`mkg.vis.source.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.vis.col.lastAt'),
      dataIndex: 'lastAt',
      key: 'lastAt',
      width: '17%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('mkg.vis.col.interest'),
      dataIndex: 'interestKeys',
      key: 'interest',
      width: '17%',
      render: (value: readonly string[], row: VisitorSession) => (
        <span className="lx-cell-text">
          <span className="lx-cell-title">
            {t(`mkg.vis.page.${value[0] ?? 'p2000'}`)}
            {value.length > 1 ? ` +${value.length - 1}` : ''}
          </span>
          <span className="lx-cell-code">
            {row.pageViews} {t('mkg.vis.col.pages')} · {row.stayMinutes} {t('mkg.vis.col.minutes')}
          </span>
        </span>
      ),
    },
    {
      title: t('mkg.vis.col.match'),
      dataIndex: 'match',
      key: 'match',
      // 11% 是 en "Customer"/"Unmatched" 胶囊的硬下限（~64px + 内边距）——
      // 胶囊被硬裁成 "Custome/r" 比截断更糟（探针只量文本节点，量不到 tag 内部）。
      width: '11%',
      render: (value: VisitorMatch, row: VisitorSession) => (
        <span className="lx-cell-text">
          <LxTag variant={MATCH_VARIANT[value]}>{t(`mkg.vis.match.${value}`)}</LxTag>
          <span className="lx-cell-code">{row.matchedId ?? '—'}</span>
        </span>
      ),
    },
    {
      title: t('mkg.vis.col.action'),
      key: 'action',
      width: '18%',
      render: (_v: unknown, row: VisitorSession) => {
        if (row.reached) {
          return <span className="lx-muted">{t('mkg.vis.action.done')}</span>;
        }
        return (
          <span className="lx-oppops">
            {row.match === 'unknown' ? (
              <button
                type="button"
                className="lx-cell-link lx-focusable"
                onClick={() => {
                  message.success(t('mkg.vis.action.leadDone', { id: `LD-${row.id.slice(3)}` }));
                }}
              >
                {t('mkg.vis.action.lead')}
              </button>
            ) : null}
            {row.formFilled ? null : (
              <button
                type="button"
                className="lx-cell-link lx-focusable"
                onClick={() => reach(row.id, row.companyKey)}
              >
                {t('mkg.vis.action.reach')}
              </button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <PageContainer titleKey="mkg.vis.page" subtitleKey="mkg.vis.pageSub">
      <LxActionBar
        primary={{
          key: 'reachAll',
          label: t('mkg.vis.bar.reachAll'),
          icon: <SendOutlined />,
          onClick: reachAll,
        }}
        items={[
          {
            key: 'sync',
            label: t('mkg.vis.bar.sync'),
            icon: <ReloadOutlined />,
            onClick: () => {
              message.info(t('mkg.vis.bar.syncHint'));
            },
          },
        ]}
        note={t('mkg.vis.note')}
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.vis.kpi.sessions')}
          value={String(sessions.length)}
          sub={t('mkg.vis.kpi.sessionsSub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.vis.kpi.known')}
          value={`${knownRatio(sessions)}%`}
          sub={t('mkg.vis.kpi.knownSub')}
          trend="fl"
          delta={`${knownRatio(sessions)}%`}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.vis.kpi.pending')}
          value={String(queue.length)}
          sub={t('mkg.vis.kpi.pendingSub')}
          trend={queue.length > 0 ? 'up' : 'fl'}
          delta={queue.length > 0 ? '!' : '0'}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.vis.kpi.filled')}
          value={String(filled)}
          sub={t('mkg.vis.kpi.filledSub')}
          color="secondary"
          size="sm"
        />
      </div>

      <div className="lx-mkgvis__body">
        <section className="lx-glass lx-panel">
          <LxSectionHeader
            title={t('mkg.vis.section.visitors')}
            sub={t('mkg.vis.section.visitorsSub')}
          />
          <LxTableCard
            tools={<LxSearchInput value={keyword} placeholder={t('mkg.vis.search')} onChange={setKeyword} />}
          >
            <LxTable
              fit
              columns={columns}
              dataSource={[...rows]}
              total={rows.length}
              pageNo={1}
              pageSize={20}
            />
          </LxTableCard>
        </section>

        {/* 待触达队列：本页的产出出口。按浏览深度排，最认真的在最上。 */}
        <aside className="lx-glass lx-panel lx-mkgvis__queue">
          <LxSectionHeader title={t('mkg.vis.queue.title')} sub={t('mkg.vis.queue.sub')} />
          {queue.length === 0 ? (
            <p className="lx-mkgvis__hint">{t('mkg.vis.queue.empty')}</p>
          ) : (
            <ul className="lx-mkgvis__queuelist">
              {queue.map((session) => (
                <li key={session.id} className="lx-mkgvis__queueitem">
                  <span className="lx-mkgvis__queuehead">
                    <span className="lx-mkgvis__queuename">
                      {t(`mkg.vis.company.${session.companyKey}`)}
                    </span>
                    <span className="lx-num lx-mkgvis__queuedepth">
                      {session.pageViews} {t('mkg.vis.col.pages')}
                    </span>
                  </span>
                  <span className="lx-mkgvis__queuepages">
                    {session.interestKeys.map((key) => (
                      <span key={key} className="lx-mkgvis__queuepage">
                        {t(`mkg.vis.page.${key}`)}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    className="lx-mkgvis__queuebtn lx-focusable"
                    onClick={() => reach(session.id, session.companyKey)}
                  >
                    <SendOutlined />
                    {session.match === 'unknown'
                      ? t('mkg.vis.action.leadAndReach')
                      : t('mkg.vis.action.reach')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="lx-mkgvis__hint">
            <GlobalOutlined /> {t('mkg.vis.queue.hint')}
          </p>
        </aside>
      </div>
    </PageContainer>
  );
}
