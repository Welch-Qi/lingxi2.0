import type { ReactNode } from 'react';
import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usePermission } from '@lingxi/ui';

/**
 * 403 无权限页（与 ErrorPage 分开，不复用）。
 *
 * 为什么不复用 ErrorPage：ErrorPage 的语义是「运行时异常 / 找不到路由」，
 * 而「登录了、路由也匹配，但你没有这条权限」是**正常的授权结果**，
 * 用 error 态会让人以为系统坏了。分开之后处置动作也不同：
 * 403 的落点是「返回工作台 + 去要权限」，404 只有「返回工作台」。
 */
export function ForbiddenPage({ permCode }: { permCode?: string | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title={t('common.error.noPermission')}
      subTitle={permCode ? t('cc.perm.denied.code', { code: permCode }) : t('cc.perm.denied.sub')}
      extra={
        <Button type="primary" onClick={() => void navigate('/overview')}>
          {t('common.backHome')}
        </Button>
      }
    />
  );
}

/**
 * 路由级权限守卫。
 *
 * `code` 缺省 = 登录即可访问（语义见 `ModuleRoute.permCode` 的注释），
 * 此时直接放行，不做任何判断 —— 免得把「没写权限码」误判成「谁都不许进」。
 *
 * 为什么原地渲染 403 而不是跳回工作台：静默跳转会让用户以为点错了菜单，
 * 反复点同一个入口才知道自己没权限。原地告诉他缺哪条码，是唯一能让他去要权限的路径。
 *
 * 铁律（技术规约2.0 §4.9.2）：前端权限只用于渲染控制，真正判定在后端。
 */
export function RequirePerm({ code, children }: { code?: string | undefined; children: ReactNode }) {
  const { has } = usePermission();
  if (!code || has(code)) return <>{children}</>;
  return <ForbiddenPage permCode={code} />;
}