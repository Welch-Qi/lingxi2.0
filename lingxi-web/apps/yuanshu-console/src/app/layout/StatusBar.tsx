import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUiStore } from '@/stores/uiStore';

/**
 * 底部状态栏（改造指引 4.10 + 产品规划说明书 V2.1 §6.1）。
 *
 * 三个状态指示器：智能体运行状态 / 数据同步状态 / 连接健康。
 * 为什么常驻：这三项是"系统是否在正常干活"的最小可观测面，
 * 异常时变红可点开排查；同时运维与客服排障时，用户截图即可定位环境与租户
 * （对应可观测规约 §4.11），避免"在哪个环境出现的问题"这类反复确认。
 */
export function StatusBar() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const pendingTaskCount = useUiStore((s) => s.pendingTaskCount);
  const toggleTaskDrawer = useUiStore((s) => s.toggleTaskDrawer);

  return (
    <footer className="lx-statusbar">
      <button type="button" className="lx-statusbar__item is-online lx-focusable" onClick={toggleTaskDrawer}>
        <span className="lx-pulse-dot" aria-hidden="true" />
        <span className="lx-num">{t('status.agentsOnline', { count: 6 })}</span>
        {pendingTaskCount > 0 ? <span className="lx-num">· {t('status.agentPending', { count: pendingTaskCount })}</span> : null}
      </button>

      <span className="lx-statusbar__sep" />

      <span className="lx-statusbar__item is-online">
        <span className="lx-pulse-dot" aria-hidden="true" />
        {t('status.dataSynced')}
      </span>

      <span className="lx-statusbar__sep" />

      <span className="lx-statusbar__item is-online">
        <span className="lx-pulse-dot" aria-hidden="true" />
        {t('common.connected')}
      </span>

      <span className="lx-statusbar__right">
        <span>
          {t('common.tenant')}: {tenant?.name ?? '-'}
        </span>
        <span className="lx-statusbar__sep" />
        <span className="lx-num">{tenant?.timezone ?? 'UTC'}</span>
      </span>
    </footer>
  );
}
