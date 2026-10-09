import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App } from 'antd';
import {
  LinkOutlined,
  SyncOutlined,
  WarningOutlined,
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
import {
  MKG_ACCOUNT_TODAY,
  SOCIAL_ACCOUNTS,
  daysToExpire,
  sortedByUrgency,
  type AuthStatus,
  type SocialAccount,
} from './channel-data';

/**
 * 社媒账号（/marketing/channel）—— §2.8 第一行能力「社媒账号维护」。
 *
 * 这一页回答的问题是"**号还能不能发**"，不是"内容做得好不好"。
 * 排期页把所有内容按日历压下去，却管不了授权哪天到期；
 * 到期那天排期会静默失败 —— 三十条排期，一条都发不出去，而没人收到通知。
 * 因此本页把「授权到期预警」单独提到右栏，按"还有几天"排序，
 * 而不是把它做成列表里的一枚小标签（排期页也有一枚，两者都会被引擎盖住）。
 *
 * 健康度用色条而不是纯数字：要在一屏里扫出"哪个号状态变差了"，
 * 数字 64 / 76 的差距看不出来，一条黄带子能看出来。
 * 但色条旁边必须留数字 —— 只看颜色等于把精确值抹掉了（色觉障碍下尤其明显）。
 *
 * 静态骨架：行为作用于本地 state，接入后走 /api/v1/mkg/accounts。
 */

const AUTH_VARIANT: Record<AuthStatus, LxTagVariant> = {
  connected: 'done',
  expiring: 'review',
  expired: 'graphic',
  revoked: 'graphic',
};

export default function MarketingChannelPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');

  const rows = useMemo(
    () => sortedByUrgency(SOCIAL_ACCOUNTS).filter((account) => {
      const needle = keyword.trim().toLowerCase();
      if (!needle) {
        return true;
      }
      return (
        account.handle.toLowerCase().includes(needle) ||
        t(`mkg.channel.${account.platformKey}`).toLowerCase().includes(needle)
      );
    }),
    [keyword, t],
  );

  const expiring = SOCIAL_ACCOUNTS.filter((account) => {
    const days = daysToExpire(account);
    return days <= 14;
  }).sort((a, b) => daysToExpire(a) - daysToExpire(b));

  const avgHealth = Math.round(
    SOCIAL_ACCOUNTS.reduce((sum, account) => sum + account.health, 0) / SOCIAL_ACCOUNTS.length,
  );
  const posts30d = SOCIAL_ACCOUNTS.reduce((sum, account) => sum + account.posts30d, 0);

  const columns = [
    {
      title: t('mkg.chn.col.account'),
      dataIndex: 'handle',
      key: 'handle',
      width: '20%',
      render: (_v: string, row: SocialAccount) => (
        <div className="lx-cell-text">
          <div className="lx-cell-title">{row.handle}</div>
          <div className="lx-cell-code">{row.id}</div>
        </div>
      ),
    },
    {
      title: t('mkg.chn.col.platform'),
      dataIndex: 'platformKey',
      key: 'platform',
      width: '11%',
      render: (value: SocialAccount['platformKey']) => (
        <LxTag variant="graphic">{t(`mkg.channel.${value}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.chn.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '11%',
      render: (value: string) => t(`demo.owner.${value}`),
    },
    {
      title: t('mkg.chn.col.followers'),
      dataIndex: 'followers',
      key: 'followers',
      width: '11%',
      render: (value: number) => (
        <span className="lx-num">{value.toLocaleString(i18n.language)}</span>
      ),
    },
    {
      title: t('mkg.chn.col.health'),
      dataIndex: 'health',
      key: 'health',
      width: '16%',
      render: (value: number) => (
        <span className="lx-mkgchn__health">
          <span className="lx-num">{value}</span>
          <span className="lx-mkgchn__track">
            <i className={value >= 80 ? 'is-good' : value >= 60 ? '' : 'is-bad'} style={{ width: `${value}%` }} />
          </span>
        </span>
      ),
    },
    {
      title: t('mkg.chn.col.auth'),
      dataIndex: 'authStatus',
      key: 'auth',
      width: '15%',
      render: (status: AuthStatus) => (
        <LxTag variant={AUTH_VARIANT[status]}>{t(`mkg.chn.auth.${status}`)}</LxTag>
      ),
    },
    {
      title: t('mkg.chn.col.expire'),
      dataIndex: 'authExpireAt',
      key: 'expire',
      width: '16%',
      render: (_v: string, row: SocialAccount) => {
        const days = daysToExpire(row);
        return (
          <span className={`lx-num lx-mkgchn__expire${days <= 7 ? ' is-warn' : ''}`}>
            {row.authExpireAt}
            <i className="lx-mkgchn__days">
              {days < 0 ? t('mkg.chn.days.overdue') : t('mkg.chn.days.left', { days })}
            </i>
          </span>
        );
      },
    },
  ];

  return (
    <PageContainer titleKey="mkg.chn.page" subtitleKey="mkg.chn.pageSub">
      <LxActionBar
        primary={{ key: 'bind', label: t('mkg.chn.bar.bind'), icon: <LinkOutlined /> }}
        items={[{ key: 'refresh', label: t('mkg.chn.bar.refresh'), icon: <SyncOutlined /> }]}
        note={t('mkg.chn.note')}
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('mkg.chn.kpi.bound')}
          value={String(SOCIAL_ACCOUNTS.length)}
          sub={t('mkg.chn.kpi.boundSub')}
          color="primary"
          size="sm"
        />
        <LxKpi
          label={t('mkg.chn.kpi.expiring')}
          value={String(expiring.length)}
          sub={t('mkg.chn.kpi.expiringSub')}
          trend={expiring.length > 0 ? 'up' : 'fl'}
          delta={expiring.length > 0 ? '!' : '0'}
          color="accent"
          size="sm"
        />
        <LxKpi
          label={t('mkg.chn.kpi.health')}
          value={String(avgHealth)}
          sub={t('mkg.chn.kpi.healthSub')}
          color="success"
          size="sm"
        />
        <LxKpi
          label={t('mkg.chn.kpi.posts')}
          value={String(posts30d)}
          sub={t('mkg.chn.kpi.postsSub')}
          color="secondary"
          size="sm"
        />
      </div>

      <div className="lx-mkgchn__body">
        <section className="lx-glass lx-panel">
          <LxSectionHeader
            title={t('mkg.chn.section.accounts')}
            sub={t('mkg.chn.section.accountsSub')}
          />
          <LxTableCard
            tools={
              <>
                <LxSearchInput
                  value={keyword}
                  placeholder={t('mkg.chn.search')}
                  onChange={setKeyword}
                />
              </>
            }
          >
            <LxTable<SocialAccount>
              fit
              columns={columns}
              dataSource={[...rows]}
              total={rows.length}
              pageNo={1}
              pageSize={20}
            />
          </LxTableCard>
        </section>

        {/* 授权到期预警单独一栏：它是一段时间后才会爆炸的事，放进列表会被埋掉。 */}
        <aside className="lx-glass lx-panel lx-mkgchn__warn">
          <LxSectionHeader title={t('mkg.chn.warn.title')} sub={t('mkg.chn.warn.sub')} />
          {expiring.length === 0 ? (
            <p className="lx-mkgchn__hint">{t('mkg.chn.warn.empty')}</p>
          ) : (
            <ul className="lx-mkgchn__warnlist">
              {expiring.map((account) => {
                const days = daysToExpire(account);
                return (
                  <li key={account.id} className="lx-mkgchn__warnitem">
                    <span className="lx-mkgchn__warnhead">
                      <span className="lx-mkgchn__warnhandle">{account.handle}</span>
                      <span className={`lx-num lx-mkgchn__warndays${days <= 7 ? ' is-warn' : ''}`}>
                        {days < 0 ? t('mkg.chn.days.overdue') : t('mkg.chn.days.left', { days })}
                      </span>
                    </span>
                    <span className="lx-mkgchn__warntag">
                      {t(`mkg.channel.${account.platformKey}`)}
                    </span>
                    <button
                      type="button"
                      className="lx-mkgchn__warnbtn lx-focusable"
                      onClick={() => {
                        message.success(t('mkg.chn.renewDone'));
                      }}
                    >
                      <LinkOutlined />
                      {t('mkg.chn.renew')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="lx-mkgchn__hint">
            <WarningOutlined /> {t('mkg.chn.warn.hint')}
          </p>
          <p className="lx-mkgchn__stamp lx-num">{MKG_ACCOUNT_TODAY}</p>
        </aside>
      </div>
    </PageContainer>
  );
}
