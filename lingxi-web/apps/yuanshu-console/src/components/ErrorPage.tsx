import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

/** 统一错误页（404 / 功能未开通 / 运行时异常）。 */
export function ErrorPage({ notFound = false }: { notFound?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Result
      status={notFound ? '404' : 'error'}
      title={notFound ? t('common.error.notFound') : t('common.error.system')}
      extra={
        <Button type="primary" onClick={() => void navigate('/workbench')}>
          {t('common.backHome')}
        </Button>
      }
    />
  );
}
