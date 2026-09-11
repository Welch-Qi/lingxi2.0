import { Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * AI 产出标记（技术规约2.0 §3.6 G10 / 产品双通道原则）。
 *
 * 为什么必须显式标记：用户需要一眼分辨"这条记录是人写的还是智能体写的"，
 * 才能决定是否信任与是否需要复核；标记同时是审计追溯的入口。
 *
 * 数据来源：业务表 source_type=AGENT + source_agent_code + source_task_id。
 */
export function LxAgentSourceTag({
  sourceType,
  agentCode,
  taskId,
}: {
  sourceType: 'HUMAN' | 'AGENT' | 'SYSTEM';
  agentCode?: string | null;
  taskId?: string | null;
}) {
  const { t } = useTranslation();
  if (sourceType !== 'AGENT') {
    return null;
  }
  return (
    <Tooltip title={t('agent.sourceTooltip', { agent: agentCode ?? '-', task: taskId ?? '-' })}>
      <Tag color="cyan">{t('agent.generated')}</Tag>
    </Tooltip>
  );
}
