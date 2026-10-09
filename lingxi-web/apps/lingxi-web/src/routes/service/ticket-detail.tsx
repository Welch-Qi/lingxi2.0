import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { LxTag, LxSectionHeader } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { TICKETS, STATUS_FLOW, type TicketStatus } from './data';

/**
 * 工单详情（/service/tickets/:id）—— 从工单列表「工单号」或「查看详情」拉起。
 *
 * 只读展示：工单字段 + 状态流转步骤（复用实时会话右栏的状态机语义，但不在此处改状态，
 * 以免与工作台列表的状态态分叉）。返回回 /service（工单列表在工作台「客户工单」Tab）。
 */

const STATUS_KEY: Record<TicketStatus, string> = {
  open: 'svc.status.open',
  processing: 'svc.status.processing',
  resolved: 'svc.status.resolved',
  closed: 'svc.status.closed',
};
const STATUS_VARIANT: Record<TicketStatus, 'review' | 'producing' | 'done'> = {
  open: 'review',
  processing: 'producing',
  resolved: 'done',
  closed: 'done',
};

export default function ServiceTicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const ticket = id ? TICKETS[id] : undefined;

  return (
    <PageContainer titleKey="svc.detail.title" subtitleKey="svc.detail.sub">
      <div className="lx-form__top">
        <button
          type="button"
          className="lx-chip lx-form__back lx-focusable"
          onClick={() => void navigate('/service?mode=tickets')}
        >
          <ArrowLeftOutlined />
          {t('svc.detail.back')}
        </button>
      </div>

      {!ticket ? (
        <div className="lx-rec__empty">{t('svc.list.empty')}</div>
      ) : (
        <>
          <section className="lx-glass lx-panel">
            <div className="lx-tk__meta">
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.no')}</span>
                <span className="lx-cell-title">{ticket.ticketNo}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.customer')}</span>
                <span className="lx-cell-text">{ticket.customer}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.category')}</span>
                <LxTag variant="lang">{t(ticket.categoryKey)}</LxTag>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.status')}</span>
                <LxTag variant={STATUS_VARIANT[ticket.status]}>{t(STATUS_KEY[ticket.status])}</LxTag>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.owner')}</span>
                <span className="lx-cell-text">{t(ticket.ownerKey)}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.handler')}</span>
                <span className="lx-cell-text">{t(ticket.handlerKey)}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.created')}</span>
                <span className="lx-cell-text">{ticket.createdAt}</span>
              </div>
              <div className="lx-tk__meta-item">
                <span className="lx-tk__meta-label">{t('svc.tk.col.nextFollow')}</span>
                <span className="lx-cell-text">{ticket.nextFollowAt}</span>
              </div>
            </div>

            <div className="lx-tk__detail">
              <div className="lx-field__label">{t('svc.tk.col.title')}</div>
              <div className="lx-cell-text">{t(ticket.titleKey)}</div>
              <div className="lx-field__label">{t('svc.tk.col.desc')}</div>
              <div className="lx-cell-text">{t(ticket.descKey)}</div>
            </div>
          </section>

          <section className="lx-glass lx-panel">
            <LxSectionHeader title={t('svc.detail.flow')} />
            <ol className="lx-steps">
              {STATUS_FLOW.map((step, index) => (
                <li
                  key={step}
                  className={`lx-steps__item${
                    index < STATUS_FLOW.indexOf(ticket.status) ? ' is-done' : ''
                  }${index === STATUS_FLOW.indexOf(ticket.status) ? ' is-active' : ''}`}
                >
                  <span className="lx-steps__dot" aria-hidden="true">
                    {index < STATUS_FLOW.indexOf(ticket.status) ? <CheckOutlined /> : index + 1}
                  </span>
                  <span className="lx-steps__label">{t(`svc.detail.steps.${step}`)}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </PageContainer>
  );
}
