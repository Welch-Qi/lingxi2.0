import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ApartmentOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { LxNavGrid, LxSectionHeader } from '@lingxi/ui';
import type { LxNavItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 元枢管理台首页（/overview）—— 四类能力出口的一键直达。
 *
 * 元枢对灵犀与未来开物只提供四类公共能力（三产品规划 §3 / 归口表）：
 *   ① 多租户会话与权限（/iam）
 *   ② 大数据与指标语义（/metrics）
 *   ③ 智能体工厂治理（/governance）
 *   ④ 提示词与知识引擎资产（/prompts）
 *
 * 开物（KAIWU）二期接入：治理与指标分区天然覆盖（AgentRegistrationApi 注册通道
 * 已含 OwnerProduct.KAIWU），届时只在菜单登记预留分区名，不建第二套管理台。
 */
export default function OverviewHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const exits: readonly LxNavItem[] = [
    {
      key: 'iam',
      title: t('ys.iam.menu'),
      desc: t('ys.iam.exitDesc'),
      icon: <SafetyCertificateOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/iam'),
    },
    {
      key: 'governance',
      title: t('ys.gov.menu'),
      desc: t('ys.gov.exitDesc'),
      icon: <RobotOutlined />,
      tone: 'accent',
      onClick: () => void navigate('/governance'),
    },
    {
      key: 'prompts',
      title: t('ys.prompts.menu'),
      desc: t('ys.prompts.exitDesc'),
      icon: <ApartmentOutlined />,
      tone: 'success',
      onClick: () => void navigate('/prompts'),
    },
    {
      key: 'metrics',
      title: t('ys.metrics.menu'),
      desc: t('ys.metrics.exitDesc'),
      icon: <LineChartOutlined />,
      tone: 'violet',
      onClick: () => void navigate('/metrics'),
    },
  ];

  return (
    <PageContainer titleKey="ys.overview.page" hideTitle>
      <section className="lx-section">
        <LxSectionHeader title={t('ys.overview.section')} sub={t('ys.overview.sectionSub')} />
        <LxNavGrid items={exits} />
      </section>
    </PageContainer>
  );
}
