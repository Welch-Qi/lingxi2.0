import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';

/**
 * 底部状态栏：环境标识、租户、时区、链路状态。
 *
 * 为什么常驻：运维与客服排障时，用户报错截图即可定位环境与租户，
 * 避免"在哪个环境出现的问题"这类反复确认（对应可观测规约 §4.11）。
 */
export function StatusBar() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  return (
    <footer className="lx-statusbar">
      <span className="lx-statusbar__dot" aria-hidden />
      <span>{t('common.connected')}</span>
      <span className="lx-statusbar__sep" />
      <span>
        {t('common.tenant')}: {tenant?.name ?? '-'}
      </span>
      <span className="lx-statusbar__sep" />
      <span>{tenant?.timezone ?? 'UTC'}</span>
    </footer>
  );
}
