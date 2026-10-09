import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ArrowLeftOutlined, ExportOutlined } from '@ant-design/icons';
import { App } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { ORDER_ROWS } from './data';

/**
 * 导出对账单（/order/statement）—— 按客户与时间范围导出应收对账单（演示：前端生成触发）。
 * 接入后由后端生成文件流。版式走 compact 壳：限宽居中 + 面板内边距 + 3~4 列自适应栅格。
 */

export default function OrderStatementPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [from, setFrom] = useState('2026-09-01');
  const [to, setTo] = useState('2026-09-30');
  const customers = Array.from(new Set(ORDER_ROWS.map((o) => o.customer)));

  const run = () => {
    message.success(t('ord.statement.hint'));
  };

  return (
    <PageContainer titleKey="ord.statement.title" subtitleKey="ord.statement.sub">
      <div className="lx-form lx-form--compact">
        <div className="lx-form__top">
          <button
            type="button"
            className="lx-chip lx-form__back lx-focusable"
            onClick={() => void navigate('/order')}
          >
            <ArrowLeftOutlined />
            {t('ord.statement.back')}
          </button>
        </div>

        <section className="lx-glass lx-panel lx-form__section">
          <div className="lx-form__grid">
            <div className="lx-field">
              <label className="lx-field__label" htmlFor="st-cust">
                {t('ord.statement.customer')}
              </label>
              <select
                id="st-cust"
                className="lx-form__control"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="">{t('ord.list.search')}</option>
                {customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="lx-field">
              <label className="lx-field__label" htmlFor="st-from">
                {t('ord.statement.from')}
              </label>
              <input
                id="st-from"
                type="date"
                className="lx-form__control"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="lx-field">
              <label className="lx-field__label" htmlFor="st-to">
                {t('ord.statement.to')}
              </label>
              <input
                id="st-to"
                type="date"
                className="lx-form__control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="lx-form__foot">
            <button type="button" className="lx-form__submit lx-focusable" onClick={run}>
              <ExportOutlined />
              {t('ord.statement.export')}
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
