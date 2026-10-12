import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageContainer } from '@/components/PageContainer';

/**
 * IAM 子页通用面包屑：始终提供「返回管理台 IAM 首页」入口。
 * 子页为平铺路由（非嵌套），返回需手动挂链，否则会丢回首页默认态。
 *
 * ⚠️ 本文件自 lingxi-web `routes/config/_shared.tsx` 复制：骨架期两 app 各自持有；
 *    合并二期再下沉 packages/lingxi-ui（避免跨 app 私引）。
 */
export function CcCrumb() {
  const { t } = useTranslation();
  return (
    <nav className="lx-crumb" aria-label="breadcrumb">
      <Link to="/iam" className="lx-crumb__link">
        {t('cc.crumb.home')}
      </Link>
      <span className="lx-crumb__sep">/</span>
    </nav>
  );
}

/**
 * IAM 占位子页：标题 + 「规划中」说明。
 * 审计日志 / 全球化配置等页先占位、后续版本落地真实能力，故统一用此壳呈现模块定位。
 */
export function CcComingSoon({ titleKey, subKey }: { titleKey: string; subKey?: string }) {
  const { t } = useTranslation();
  return (
    <PageContainer titleKey={titleKey} subtitleKey={subKey}>
      <CcCrumb />
      <section className="lx-glass lx-panel lx-comingsoon">
        <span className="lx-comingsoon__badge">{t('cc.comingSoon.title')}</span>
        <p className="lx-comingsoon__desc">
          {t(titleKey)} · {t('cc.comingSoon.desc')}
        </p>
        {subKey ? <p className="lx-comingsoon__hint">{t(subKey)}</p> : null}
      </section>
    </PageContainer>
  );
}
