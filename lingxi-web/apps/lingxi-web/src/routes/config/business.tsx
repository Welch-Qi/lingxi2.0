import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  AimOutlined,
  GoldOutlined,
  IdcardOutlined,
  NotificationOutlined,
  ProfileOutlined,
  RiseOutlined,
  ShareAltOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { LxNavGrid } from '@lingxi/ui';
import type { LxNavItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { CcCrumb } from './_shared';

/**
 * 业务配置（/config/business）—— 四大核心之一。
 *
 * 下设八个模块，各自独立可直达：
 *   社媒账号管理 / 商品类目 / 商机阶段 / 客户意向等级 / 订单阶段
 *   活动类型 / 客户类型 / 客户价值分层（2026-10-07 第二十轮新增）。
 *
 * 2026-10-06 变化：新增「客户意向等级」入口；「品类管理」不再跳出到 /product/category ——
 * 类目的顺序与启用状态是业务规则（归配置中心），而 /product/category 是
 * 商品中心的类目视图（看商品挂在哪），两者关心的问题不同。
 *
 * 2026-10-07 第二十轮新增后三个字典入口。它们的加入理由与前三个同源：
 * 这三组取值此前是**散落在各页面的联合类型**（`CampaignType` / `CustomerType` /
 * `CustomerTier`），配不了、改不动、也没有一个"启用了哪几档"的地方可看。
 *
 * 入口按**语义分组**排，不按字母：前三个是流程口径（商机阶段 / 意向等级 / 订单阶段），
 * 后三个是客户与活动口径。八个卡在 `LxNavGrid` 里是两行，顺序即阅读顺序。
 */
export default function BusinessConfigPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items: readonly LxNavItem[] = [
    {
      key: 'social',
      title: t('cc.biz.social'),
      desc: t('cc.biz.socialDesc'),
      icon: <ShareAltOutlined />,
      tone: 'accent',
      onClick: () => void navigate('/config/business/social'),
    },
    {
      key: 'category',
      title: t('cc.dict.category'),
      desc: t('cc.dict.categoryDesc'),
      icon: <TagsOutlined />,
      tone: 'success',
      onClick: () => void navigate('/config/business/category'),
    },
    {
      key: 'stageOpp',
      title: t('cc.dict.stageOpp'),
      desc: t('cc.dict.stageOppDesc'),
      icon: <RiseOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/config/business/stage-opp'),
    },
    {
      key: 'intent',
      title: t('cc.dict.intent'),
      desc: t('cc.dict.intentDesc'),
      icon: <AimOutlined />,
      tone: 'violet',
      onClick: () => void navigate('/config/business/intent'),
    },
    {
      key: 'stageOrder',
      title: t('cc.biz.stageOrder'),
      desc: t('cc.biz.stageOrderDesc'),
      icon: <ProfileOutlined />,
      tone: 'secondary',
      onClick: () => void navigate('/config/business/stage-order'),
    },
    {
      key: 'campType',
      title: t('cc.dict.campType'),
      desc: t('cc.dict.campTypeDesc'),
      icon: <NotificationOutlined />,
      tone: 'primary',
      onClick: () => void navigate('/config/business/camp-type'),
    },
    {
      key: 'cusType',
      title: t('cc.dict.cusType'),
      desc: t('cc.dict.cusTypeDesc'),
      icon: <IdcardOutlined />,
      tone: 'secondary',
      onClick: () => void navigate('/config/business/cus-type'),
    },
    {
      key: 'cusTier',
      title: t('cc.dict.cusTier'),
      desc: t('cc.dict.cusTierDesc'),
      icon: <GoldOutlined />,
      tone: 'accent',
      onClick: () => void navigate('/config/business/cus-tier'),
    },
  ];

  return (
    <PageContainer titleKey="cc.business.title" subtitleKey="cc.business.sub">
      <CcCrumb />
      <section className="lx-section">
        <LxNavGrid items={items} />
      </section>
    </PageContainer>
  );
}
