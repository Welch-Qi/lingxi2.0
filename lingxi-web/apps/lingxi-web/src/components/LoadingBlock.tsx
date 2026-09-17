import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

/** 统一加载态：骨架屏或 Spin，禁止各页面自造 loading 文案。 */
export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div className="lx-loading" role="status" aria-live="polite">
      <Spin />
      <span className="lx-loading__text">{t('common.loading')}</span>
    </div>
  );
}
