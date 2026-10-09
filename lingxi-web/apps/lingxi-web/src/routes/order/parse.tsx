import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App } from 'antd';
import { PageContainer } from '@/components/PageContainer';

/**
 * 邮件解析建单（/order/parse）—— 粘贴客户询盘邮件，自动抽取订单要素（演示级正则）。
 * 解析结果回显后由用户核对，确认动作走新建订单页。接入后由后端 NLP 服务替换正则。
 * 版式走与五处录入页一致的 compact 壳：限宽居中 + 面板内边距 + 标签上·控件下。
 */

export default function OrderParsePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<{ customer: string; amount: string } | null>(null);

  const run = () => {
    if (!text.trim()) {
      message.warning(t('form.missing', { count: 1 }));
      return;
    }
    const no = text.match(/SO-\d{4}-\d{3,4}/i)?.[0] ?? '—';
    const amt = text.match(/\$?\d[\d,]*(?:\.\d+)?\s?(?:EUR|USD|CNY)?/i)?.[0] ?? '—';
    const cust = text.match(/Dear\s+([^\n,]+)/i)?.[1] ?? '—';
    void no;
    setParsed({ customer: cust, amount: amt });
  };

  return (
    <PageContainer titleKey="ord.parse.title" subtitleKey="ord.parse.sub">
      <div className="lx-form lx-form--compact">
        <div className="lx-form__top">
          <button
            type="button"
            className="lx-chip lx-form__back lx-focusable"
            onClick={() => void navigate('/order')}
          >
            <ArrowLeftOutlined />
            {t('ord.parse.back')}
          </button>
        </div>

        <section className="lx-glass lx-panel lx-form__section">
          <label className="lx-field__label" htmlFor="ord-parse">
            {t('ord.parse.paste')}
          </label>
          <textarea
            id="ord-parse"
            className="lx-form__control"
            rows={8}
            value={text}
            placeholder={t('ord.parse.pastePh')}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="lx-form__foot">
            <button type="button" className="lx-form__submit lx-focusable" onClick={run}>
              {t('ord.parse.run')}
            </button>
          </div>
        </section>

        <section className="lx-glass lx-panel lx-form__section">
          <div className="lx-field__label">{t('ord.parse.result')}</div>
          {parsed ? (
            <div className="lx-tk__meta">
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('ord.create.customer')}</span>
                <span className="lx-cell-text">{parsed.customer}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('ord.create.amount')}</span>
                <span className="lx-cell-text">{parsed.amount}</span>
              </div>
            </div>
          ) : (
            <div className="lx-rec__empty">{t('ord.parse.empty')}</div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
