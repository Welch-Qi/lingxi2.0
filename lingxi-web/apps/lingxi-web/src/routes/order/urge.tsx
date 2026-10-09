import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { findOrder } from './data';
import { OrderSummary } from './orderSummary';

/**
 * 订单催办（/order/:id/urge）—— 向客户或内部节点责任人发送催办（演示：前端触发反馈）。
 * 接入后由消息中心投递。
 */

const CHANNELS = ['email', 'phone', 'msg'] as const;

export default function OrderUrgePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const order = findOrder(id);
  const [recipient, setRecipient] = useState(order?.customer ?? '');
  const [channel, setChannel] = useState<string>('email');
  const [content, setContent] = useState('');

  const send = () => {
    if (!content.trim()) {
      message.warning(t('form.missing', { count: 1 }));
      return;
    }
    message.success(t('ord.urge.hint'));
    void navigate('/order');
  };

  return (
    <PageContainer titleKey="ord.urge.title" subtitleKey="ord.urge.sub">
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
            <div className="lx-form__grid">
              <div className="lx-field">
                <label className="lx-field__label" htmlFor="urge-rcpt">
                  {t('ord.urge.recipient')}
                </label>
                <input
                  id="urge-rcpt"
                  className="lx-form__control"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              <div className="lx-field">
                <label className="lx-field__label" htmlFor="urge-ch">
                  {t('ord.urge.channel')}
                </label>
                <select
                  id="urge-ch"
                  className="lx-form__control"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {t(`ord.urge.channel.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lx-field lx-field--wide">
                <label className="lx-field__label" htmlFor="urge-msg">
                  {t('ord.urge.message')}
                </label>
                <textarea
                  id="urge-msg"
                  className="lx-form__control"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
            <div className="lx-form__foot">
              <button type="button" className="lx-form__submit lx-focusable" onClick={send}>
                {t('ord.urge.send')}
              </button>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}
