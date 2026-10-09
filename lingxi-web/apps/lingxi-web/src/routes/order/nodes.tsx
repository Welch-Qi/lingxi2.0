import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { LxStageBoard } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { findOrder, OTD_STAGES } from './data';
import { OrderSummary } from './orderSummary';
import type { LxStage } from '@lingxi/ui';

/**
 * 交付节点（/order/:id/nodes）—— 订单维度的 OTD 进度看板。
 * 当前节点用 primary 色调高亮；看板为只读展示（无 onSelect）。
 */

export default function OrderNodesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const order = findOrder(id);
  const stages: readonly LxStage[] = OTD_STAGES.map((s) => ({
    ...s,
    label: t(`ord.stage.${s.key}.label`),
    tone: s.key === order?.stageKey ? 'primary' : s.tone,
  }));

  return (
    <PageContainer titleKey="ord.nodes.title" subtitleKey="ord.nodes.sub">
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
          <LxStageBoard stages={stages} caption={t('ord.nodes.caption')} activeKey={order.stageKey} />
        </>
      )}
    </PageContainer>
  );
}
