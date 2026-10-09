import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Button, Popconfirm, Progress, Space, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { LxKpi, LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  daysToExpire,
  expireBucket,
  useBiz2Store,
  type SocialAccountValue,
} from '../biz2-data';
import { CcCrumb } from '../_shared';

/**
 * 社媒账号管理（/config/business/social）。
 *
 * ## 这一页管的是「账号」，不是「渠道」
 *
 * 渠道枚举（`mkg_channel`）在营销中心有一份、`/marketing/distribute` 与排期日历共用；
 * 而这里的一行是**某个具体账号在某平台上的授权状态**：授权到期日、健康度、是否启用。
 * 两者是「一类」与「一个」的关系，所以本页的真值从 `MKG_CHANNEL_KEYS` 派生，
 * 而不是自己抄一份平台列表 —— 渠道加了，这里自动多一行；渠道删了，这里跟着少一行。
 *
 * ## 为什么到期日与健康度可编辑，而渠道标识不可
 *
 * - **授权到期日**：OAuth 授权是会真过期的，接入后由平台回调写入。
 *  配置页能改它，是为了接入前也能手动登记与续期，不是为了伪造授权状态。
 * - **健康度**：对应降权/限流/不被推荐三件真事（限流、完播率低、平台不给推荐），
 *  人工干预后应当能标注，避免"看着一切正常但实际发不出去"。
 * - **平台标识**：改它等于让排期日历里的 `platformKey` 失效，故只读。
 *
 * ## 预警口径：阈值 30 天
 *
 * 三档（已过期 / 30 天内 / 有效）的阈值取 30 天，与营销侧一致。
 * 只给"是否过期"一个布尔值时，预警会等到过期当天才亮 —— 那时补救已经来不及；
 * 而"永久有效"这个假象比不显示更糟。
 */

export default function SocialPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const accounts = useBiz2Store((s) => s.socialAccounts);
  const updateSocialAccount = useBiz2Store((s) => s.updateSocialAccount);
  const resetBiz2 = useBiz2Store((s) => s.resetBiz2);

  const [showOff, setShowOff] = useState(true);
  /** 抽屉态：正在编辑的账号（null = 关闭）。 */
  const [editing, setEditing] = useState<SocialAccountValue | null>(null);
  const [draftOrder, setDraftOrder] = useState(0);
  const [draftExpire, setDraftExpire] = useState('');
  const [draftHealth, setDraftHealth] = useState(0);

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.order - b.order || a.value.localeCompare(b.value)),
    [accounts],
  );
  const rows = useMemo(() => sorted.filter((a) => showOff || a.enabled), [sorted, showOff]);

  const offCount = accounts.filter((a) => !a.enabled).length;

  /** 三个预警计数：整页的 KPI 也用它们 —— 一眼看到"有几件事今天必须做"。 */
  const stat = useMemo(() => {
    const buckets = sorted.map((a) => expireBucket(daysToExpire(a.authExpireAt)));
    return {
      expired: buckets.filter((b) => b === 'expired').length,
      soon: buckets.filter((b) => b === 'soon').length,
      on: sorted.filter((a) => a.enabled).length,
      avgHealth: Math.round(sorted.reduce((sum, a) => sum + a.health, 0) / (sorted.length || 1)),
    };
  }, [sorted]);

  /** 到期档位 → LxTag 变体。六档变体里没有"危险"，故 expired 用 review（审核态橙）。 */
  const bucketVariant = (days: number | null): 'review' | 'producing' | 'done' => {
    const b = expireBucket(days);
    if (b === 'expired') return 'review';
    if (b === 'soon') return 'producing';
    return 'done';
  };

  const bucketText = (days: number | null): string => {
    if (days === null) return t('cc.biz.social.expireNone');
    const b = expireBucket(days);
    if (b === 'expired') return t('cc.biz.social.expireExpired', { days: Math.abs(days) });
    if (b === 'soon') return t('cc.biz.social.expireSoon', { days });
    return t('cc.biz.social.expireOk', { days });
  };

  const onOrder = (a: SocialAccountValue, order: number) => {
    if (Number.isNaN(order)) return;
    updateSocialAccount(a.value, { order });
  };

  const offSuffix = offCount > 0 ? t('cc.dict.offSuffix', { count: offCount }) : '';

  const columns = [
    {
      title: t('cc.dict.order'),
      key: 'order',
      width: 10,
      render: (_v: unknown, row: SocialAccountValue) => (
        <label className="lx-cc-dict__order">
          <input
            className="lx-cc-field__control"
            type="number"
            aria-label={`${t('cc.dict.order')} ${t(row.labelKey)}`}
            value={row.order}
            onChange={(e) => onOrder(row, Number(e.target.value))}
          />
        </label>
      ),
    },
    {
      title: t('cc.biz.social.col.platform'),
      key: 'platform',
      width: 18,
      render: (_v: unknown, row: SocialAccountValue) => (
        <span className="lx-cell-title">
          <LxTag variant="lang">{t(row.labelKey)}</LxTag>
          <span className="lx-cell-code lx-num">{row.value}</span>
        </span>
      ),
    },
    {
      title: t('cc.biz.social.col.expire'),
      key: 'expire',
      width: 22,
      render: (_v: unknown, row: SocialAccountValue) => {
        const days = daysToExpire(row.authExpireAt);
        return (
          <span className="lx-cc-dict__ro">
            <LxTag variant={bucketVariant(days)}>{bucketText(days)}</LxTag>
          </span>
        );
      },
    },
    {
      title: t('cc.biz.social.col.health'),
      key: 'health',
      width: 18,
      render: (_v: unknown, row: SocialAccountValue) => (
        /* 健康度用进度条而不是纯数字：0–100 的裸数字扫一列读不出好坏，
           而"限流"这件事本质上是有阈值的，条形长度比数字更接近它的实际含义。
           三档取色板既有色：绿=健康 / 黄=关注 / 红=限流（不新增色相）。 */
        <Progress
          percent={row.health}
          size="small"
          strokeColor={
            row.health >= 80
              ? 'var(--lx-color-success)'
              : row.health >= 60
                ? 'var(--lx-color-accent)'
                : 'var(--lx-color-danger)'
          }
          format={(p) => <span className="lx-num">{p}</span>}
        />
      ),
    },
    {
      title: t('common.status'),
      key: 'enabled',
      width: 9,
      render: (_v: unknown, row: SocialAccountValue) => (
        <LxTag variant={row.enabled ? 'done' : 'producing'}>
          {t(row.enabled ? 'cc.dict.enabled' : 'cc.dict.disabled')}
        </LxTag>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 23,
      render: (_v: unknown, row: SocialAccountValue) => (
        <Space size={4} wrap className="lx-cc-actions">
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => {
              setEditing(row);
              setDraftOrder(row.order);
              setDraftExpire(row.authExpireAt);
              setDraftHealth(row.health);
            }}
          >
            {t('cc.dict.action.edit')}
          </button>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => {
              updateSocialAccount(row.value, { enabled: !row.enabled });
              void message.success(t('cc.dict.savedOne'));
            }}
          >
            {t(row.enabled ? 'cc.dict.disabled' : 'cc.dict.enabled')}
          </button>
          {/* 渠道可删吗：不能。删掉这一行，排期日历里以该平台排的内容就成了孤儿泳道。
              与订单阶段同一条理由 —— 存量数据按 value 存，删了就解读不出。 */}
          <Tooltip title={t('cc.biz.social.deleteBlocked')}>
            <button type="button" className="lx-cell-link lx-cell-link--danger lx-focusable" disabled>
              <DeleteOutlined />
            </button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer titleKey="cc.biz.social" subtitleKey="cc.biz.socialDesc">
      <CcCrumb />
      <section className="lx-section">
        {/* 五个口径各占一格：用既有 kpi-4 栅格会挤掉一个，故用 --kpi 的 6 列，
            空出的那一列正好当余量，不为凑满而虚构第六个指标。 */}
        <div className="lx-grid lx-grid--kpi">
          <LxKpi label={t('cc.biz.social.kpi.total')} value={String(accounts.length)} color="primary" />
          <LxKpi
            label={t('cc.biz.social.kpi.expired')}
            value={String(stat.expired)}
            color="violet"
            active={stat.expired > 0}
          />
          <LxKpi label={t('cc.biz.social.kpi.soon')} value={String(stat.soon)} color="accent" active={stat.soon > 0} />
          <LxKpi label={t('cc.biz.social.kpi.avgHealth')} value={`${stat.avgHealth}%`} color="success" />
          <LxKpi label={t('cc.biz.social.kpi.enabled')} value={String(stat.on)} color="secondary" />
        </div>
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('cc.biz.social.listTitle')}
          sub={t('cc.biz.social.listSub', { total: accounts.length, off: offSuffix })}
          actions={
            <Popconfirm
              title={t('cc.dict.resetHint')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => {
                resetBiz2();
                void message.success(t('cc.dict.saved'));
              }}
            >
              <Button size="small">{t('cc.dict.reset')}</Button>
            </Popconfirm>
          }
        />

        <LxTableCard
          tools={
            <>
              <button
                type="button"
                className={`lx-chip lx-focusable${showOff ? ' is-active' : ''}`}
                aria-pressed={showOff}
                onClick={() => setShowOff((prev) => !prev)}
              >
                {t(showOff ? 'cc.dict.showAll' : 'cc.dict.showEnabledOnly')}
                {offCount > 0 ? <span className="lx-num"> · {offCount}</span> : null}
              </button>
              <Tooltip title={t('cc.biz.social.healthHint')}>
                <span className="lx-chip lx-cc-helpchip">
                  <InfoCircleOutlined /> {t('cc.biz.social.healthLegend')}
                </span>
              </Tooltip>
            </>
          }
        >
          <LxTable<SocialAccountValue>
            fit
            columns={columns}
            dataSource={rows}
            total={rows.length}
            pageNo={1}
            pageSize={20}
            locale={{ emptyText: t('cc.dict.empty') }}
          />
        </LxTableCard>
      </section>

      {/* 编辑抽屉：到期日 + 健康度 + 顺序一次改完。
          平台标识只读 —— 它是排期日历的 `platformKey`，改它等于让存量排期失效。 */}
      {editing ? (
        <div className="lx-cc-mask" role="presentation" onClick={() => setEditing(null)}>
          <aside
            className="lx-cc-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('cc.dict.editTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="lx-cc-drawer__head">
              <h3 className="lx-cc-drawer__title">{t('cc.dict.editTitle')}</h3>
              <p className="lx-cc-drawer__sub">
                {t(editing.labelKey)} · <span className="lx-num">{editing.value}</span>
              </p>
            </header>

            <div className="lx-cc-drawer__body">
              <div className="lx-cc-field">
                <span className="lx-cc-field__label">{t('cc.dict.order')}</span>
                <input
                  className="lx-cc-field__control"
                  type="number"
                  value={draftOrder}
                  onChange={(e) => setDraftOrder(Number(e.target.value))}
                />
                <span className="lx-cc-field__hint">{t('cc.dict.orderHint')}</span>
              </div>

              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-social-expire">
                  {t('cc.biz.social.col.expire')}
                </label>
                <input
                  id="cc-social-expire"
                  className="lx-cc-field__control"
                  type="date"
                  value={draftExpire}
                  onChange={(e) => setDraftExpire(e.target.value)}
                />
                <span className="lx-cc-field__hint">{t('cc.biz.social.expireHint')}</span>
              </div>

              <div className="lx-cc-field">
                <label className="lx-cc-field__label" htmlFor="cc-social-health">
                  {t('cc.biz.social.col.health')}
                </label>
                <input
                  id="cc-social-health"
                  className="lx-cc-field__control"
                  type="number"
                  min={0}
                  max={100}
                  value={draftHealth}
                  onChange={(e) => setDraftHealth(Number(e.target.value))}
                />
                <span className="lx-cc-field__hint">{t('cc.biz.social.healthHint')}</span>
              </div>
            </div>

            <footer className="lx-cc-drawer__foot">
              <Button size="small" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  if (Number.isNaN(draftOrder) || draftOrder < 0) {
                    void message.warning(t('cc.dict.orderInvalid'));
                    return;
                  }
                  if (Number.isNaN(draftHealth) || draftHealth < 0 || draftHealth > 100) {
                    void message.warning(t('cc.biz.social.healthInvalid'));
                    return;
                  }
                  updateSocialAccount(editing.value, {
                    order: draftOrder,
                    authExpireAt: draftExpire,
                    health: draftHealth,
                  });
                  setEditing(null);
                  void message.success(t('cc.dict.savedOne'));
                }}
              >
                {t('common.confirm')}
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
    </PageContainer>
  );
}