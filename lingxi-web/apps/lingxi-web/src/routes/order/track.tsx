import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@/components/PageContainer';
import { findOrder, OTD_STAGES } from './data';
import { OrderSummary } from './orderSummary';

/**
 * 订单跟踪（/order/:id/track）—— 订单维度的实时物流动态。
 * 演示：从当前 OTD 节点之前的阶段生成已完成 / 进行中的跟踪事件时间线。
 */

export default function OrderTrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const order = findOrder(id);
  const currentIndex = order ? OTD_STAGES.findIndex((s) => s.key === order.stageKey) : -1;
  const events = OTD_STAGES.slice(0, currentIndex + 1).map((s) => ({
    key: s.key,
    label: t(`ord.stage.${s.key}.label`),
  }));

  return (
    <PageContainer titleKey="ord.track.title" subtitleKey="ord.track.sub">
      <div className="lx-form__top">
        <button
          type="button"
          className="lx-chip lx-form__back lx-focusable"
          onClick={() => void navigate('/order')}
        >
          <ArrowLeftOutlined />
          {t('ord.create.back')}
        </button>
      </div>

      {!order ? (
        <div className="lx-rec__empty">{t('ord.list.empty')}</div>
      ) : (
        <>
          <OrderSummary order={order} />
          <section className="lx-glass lx-panel">
            <div className="lx-field__label">{t('ord.track.events')}</div>
            {events.length === 0 ? (
              <div className="lx-rec__empty">{t('ord.track.empty')}</div>
            ) : (
              <ol className="lx-steps">
                {events.map((ev, i) => (
                  <li
                    key={ev.key}
                    className={`lx-steps__item${i < events.length - 1 ? ' is-done' : ' is-active'}`}
                  >
                    <span className="lx-steps__dot" aria-hidden="true">
                      {i < events.length - 1 ? '✓' : i + 1}
                    </span>
                    <span className="lx-steps__label">{ev.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </PageContainer>
  );
}
