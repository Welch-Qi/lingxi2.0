import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Button, Result, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { consumeRedirectPath, useAuth } from '@/app/providers/AuthProvider';
import '@/styles/login.css';

/**
 * 登录分区（/login）。
 *
 * 合规说明（技术规约2.0 §4.9.1）：本页不是自建登录表单，而是统一身份平台的
 * 跳转中转页——账号口令、MFA、密码策略全部由 Keycloak 承载，灵犀系统不落任何凭据。
 * 之所以保留一个页面，是为了承载三件事：
 *  ① OIDC 回调落地（授权码换 token 后由 AuthProvider 完成，本页只负责跳回）；
 *  ② 跳转中的用户反馈（避免白屏）；
 *  ③ 身份平台不可达时的显式降级提示（而不是让用户卡在空白页）。
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const [ssoFailed, setSsoFailed] = useState(false);
  // 惰性初始化：consumeRedirectPath 有副作用（读取即清除），不能放在渲染表达式中
  const [fallbackTarget] = useState(() => consumeRedirectPath() ?? '/workbench');

  const redirectFromQuery = params.get('redirect');
  const target = redirectFromQuery ? decodeURIComponent(redirectFromQuery) : fallbackTarget;

  // 未登录 → 立即跳转统一身份平台（用户无需先看到登录界面再点一次）
  useEffect(() => {
    if (status !== 'anonymous' || ssoFailed) {
      return;
    }
    void login(target).catch(() => setSsoFailed(true));
  }, [status, ssoFailed, login, target]);

  if (status === 'authenticated') {
    return <Navigate to={target} replace />;
  }

  if (status === 'loading') {
    return (
      <div className="lx-login">
        <Spin size="large" tip={t('login.verifying')} />
      </div>
    );
  }

  if (ssoFailed) {
    return (
      <div className="lx-login">
        <Result
          status="warning"
          title={t('login.ssoUnavailableTitle')}
          subTitle={t('login.ssoUnavailableHint')}
          extra={
            <Button type="primary" onClick={() => void login(target)}>
              {t('login.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="lx-login">
      <div className="lx-login__brand">
        <span className="lx-login__mark" aria-hidden />
        <Typography.Title level={3} className="lx-login__title">
          {t('appName')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('login.tagline')}</Typography.Text>
      </div>
      <Spin tip={t('login.redirecting')} />
    </div>
  );
}
