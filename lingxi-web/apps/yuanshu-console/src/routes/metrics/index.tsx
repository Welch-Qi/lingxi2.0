import { useTranslation } from 'react-i18next';
import { LxSectionHeader } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { CcComingSoon } from '@/routes/iam/_shared';

/**
 * 指标与语义（/metrics）—— 元枢「大数据 + 语义管理」出口的管理台载体。
 *
 * 归口表口径：
 *  - DT-01~07 / GM-01~12 指标口径中心管理台（本批次新增分区，页面占位）；
 *  - OP-BA-02 效能看板（骨架期先占位；口径数据经 yuanshu-semantic MetricQueryApi 供数，
 *    经营分析**业务看板**仍归灵犀 /analytics，两者不混用）。
 *
 * 说明：lingxi-web 现有 /analytics 首页为纯业务看板（全链路 KPI / 地图 / 漏斗 / 趋势），
 * 经核对不属于"DT 管理台部分"，故保留在灵犀不迁；本分区为管理台的落位新增。
 */
export default function MetricsHomePage() {
  const { t } = useTranslation();
  return (
    <PageContainer titleKey="ys.metrics.page" hideTitle>
      <section className="lx-section">
        <LxSectionHeader title={t('ys.metrics.section')} sub={t('ys.metrics.sectionSub')} />
      </section>
      <CcComingSoon titleKey="ys.metrics.dt.title" subKey="ys.metrics.dt.sub" />
      <CcComingSoon titleKey="ys.metrics.ba.title" subKey="ys.metrics.ba.sub" />
    </PageContainer>
  );
}
