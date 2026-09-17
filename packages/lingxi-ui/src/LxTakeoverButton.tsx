import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * 人工接管按钮（技术规约2.0 §4.6.6 / 产品「接管铁律」）。
 *
 * 为什么必须在每个智能体任务上出现：接管是产品底线能力——
 * 智能体跑偏时，人必须能立即中断在途自动动作并接手上下文，而不是等它跑完。
 */
export function LxTakeoverButton({
  taskId,
  disabled = false,
  onTakeover,
}: {
  taskId: string;
  disabled?: boolean | undefined;
  onTakeover: (taskId: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Button size="small" disabled={disabled} onClick={() => void onTakeover(taskId)}>
      {t('agent.takeover')}
    </Button>
  );
}
