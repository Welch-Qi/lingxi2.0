import { useTranslation } from 'react-i18next';
import { LxTag } from '@lingxi/ui';
import { formatMoney } from '@lingxi/utils';
import type { OrderRow } from './data';

/**
 * 订单二级页共用的「订单抬头」卡片（跟踪 / 催办 / 看节点 复用）。
 * 只读展示客户、订单号、金额、当前节点、ETA、状态。
 */

const STATUS_TAG = { ontrack: 'done', risk: 'review', delayed: 'video' } as const;

export function OrderSummary({ order }: { order: OrderRow }) {
  const { t, i18n } = useTranslation();
  return (
    <section className="lx-glass lx-panel">
      <div className="lx-tk__meta">
        <div className="lx-tk__meta-item">
          <span className="lx-tk__meta-label">{t('ord.col.order')}</span>
          <div className="lx-cell-title">
            {order.customer}
            <div className="lx-cell-code">{order.orderNo}</div>
          </div>
        </div>
        <div className="lx-tk__meta-item">
          <span className="lx-tk__meta-label">{t('ord.col.amount')}</span>
          <span className="lx-num">{formatMoney(order.amountMinor, order.currency, i18n.language)}</span>
        </div>
        <div className="lx-tk__meta-item">
          <span className="lx-tk__meta-label">{t('ord.col.node')}</span>
          <LxTag variant="lang">{t(order.nodeKey)}</LxTag>
        </div>
        <div className="lx-tk__meta-item">
          <span className="lx-tk__meta-label">{t('ord.col.eta')}</span>
          <span className="lx-num">{order.eta}</span>
        </div>
        <div className="lx-tk__meta-item">
          <span className="lx-tk__meta-label">{t('common.status')}</span>
          <LxTag variant={STATUS_TAG[order.status]}>{t(`ord.status.${order.status}`)}</LxTag>
        </div>
      </div>
    </section>
  );
}
