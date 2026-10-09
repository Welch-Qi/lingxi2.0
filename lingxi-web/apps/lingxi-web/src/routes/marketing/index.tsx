import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  CalendarOutlined,
  FolderOpenOutlined,
  RocketOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@/components/PageContainer';
import MarketingCalendarPage from './mkt-calendar';
import MarketingContentPage from './content';
import MarketingDistributePage from './distribute';
import MarketingCampaignsPage from './campaigns';
import MarketingPlacePage from './place';

/**
 * 营销中心总览页（/marketing）。
 *
 * 2026-10-06 改版（用户原话：「将最上面的营销日历去掉，改成之前的快捷按钮形式，
 * 最左边增加一个营销日历按钮，进入页面默认展示」）：
 *   - 顶部不再内嵌那块只占屏幕 1/5 的迷你日历（它信息量不够又不支持操作，纯占地方）；
 *   - 改回单行快捷按钮，**5 项**：营销日历（最左，且是默认正文）+ 内容管理 /
 *     内容分发 / 活动管理 / 投放管理。
 *
 * 营销日历从「一个小挂件」升格为一等入口：/marketing 落地即整页日历，
 * 下方正文即所选模块，与 /marketing/calendar 同源组件。
 *
 * 旧 /marketing/calendar 内容排期页已迁至 /marketing/schedule，与「营销日历」不是同一件事。
 */

const MODULES: readonly {
  key: string;
  labelKey: string;
  icon: ReactNode;
  Comp: ComponentType;
}[] = [
  { key: 'calendar', labelKey: 'mkg.cal.title', icon: <CalendarOutlined />, Comp: MarketingCalendarPage },
  { key: 'content', labelKey: 'mkg.ov.mod.content', icon: <FolderOpenOutlined />, Comp: MarketingContentPage },
  { key: 'distribute', labelKey: 'mkg.ov.mod.distribute', icon: <ShareAltOutlined />, Comp: MarketingDistributePage },
  { key: 'campaigns', labelKey: 'mkg.campaign.menu', icon: <RocketOutlined />, Comp: MarketingCampaignsPage },
  { key: 'place', labelKey: 'mkg.ov.mod.place', icon: <AppstoreOutlined />, Comp: MarketingPlacePage },
];

export default function MarketingIndex() {
  const { t } = useTranslation();
  // 默认展示营销日历（用户指定）
  const [active, setActive] = useState<string>('calendar');
  const ActiveComp = MODULES.find((m) => m.key === active)?.Comp ?? MarketingCalendarPage;

  return (
    <PageContainer titleKey="mkg.ov.page" hideTitle>
      <div className="lx-ov-modbar" role="tablist" aria-label={t('mkg.ov.modules.title')}>
        {MODULES.map((m) => (
          <button
            type="button"
            key={m.key}
            role="tab"
            aria-selected={active === m.key}
            className={`lx-ovmod__btn lx-focusable${active === m.key ? ' is-active' : ''}`}
            onClick={() => setActive(m.key)}
          >
            <span className="lx-ovmod__btn-icon" aria-hidden="true">
              {m.icon}
            </span>
            <span className="lx-ovmod__btn-label">{t(m.labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="lx-ov-body">
        <ActiveComp />
      </div>
    </PageContainer>
  );
}