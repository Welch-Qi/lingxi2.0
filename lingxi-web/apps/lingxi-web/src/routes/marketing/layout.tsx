import { useLocation, useNavigate, useOutlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  CalendarOutlined,
  FolderOpenOutlined,
  RocketOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

/**
 * 营销中心 分区 layout：持久化模块切换器 + 二级出口。
 *
 * 五个业务模块做成**持久化的顶部切换器**，用户切换模块不必退回一级菜单——
 * 满足「交互流畅、快速找到操作入口」。
 *
 * 模块映射（pathname 前缀 → 高亮模块），顺序即切换器顺序：
 *   营销日历       /marketing/calendar（2026-10-06 升格为一等入口）
 *   内容管理       /marketing/assets 及其子页（upload / content/:code）
 *   内容分发       /marketing/distribute 及其子页（channel / schedule / email / visitor）
 *   活动管理       /marketing/campaigns 及其子页（new / :id）
 *   投放管理       /marketing/place
 *
 * 「营销中心」总览枢纽（2026-09-30 恢复 / 2026-10-06 改版）：/marketing 落地总览页，
 * 顶部同样是这五个快捷按钮、默认展示营销日历。本切换器此时隐藏，避免同屏两套相同导航。
 *
 * 出口带保留：站在分发子页（渠道/排期/邮件/访客）时，给一个回到分发主页面的出口，
 * 因为这些子页不是「模块」本身，切换器高亮的是「内容分发」，仍需要一个落点回主视图。
 */

interface ModuleDef {
  readonly key: string;
  readonly path: string;
  readonly titleKey: string;
  readonly icon: ReactNode;
  /** 命中本模块的路径前缀（除总览外都是前缀匹配）。 */
  readonly prefixes: readonly string[];
}

const MODULES: readonly ModuleDef[] = [
  { key: 'calendar', path: '/marketing/calendar', titleKey: 'mkg.cal.title', icon: <CalendarOutlined />, prefixes: ['/marketing/calendar'] },
  { key: 'assets', path: '/marketing/assets', titleKey: 'mkg.ov.mod.content', icon: <FolderOpenOutlined />, prefixes: ['/marketing/assets', '/marketing/upload', '/marketing/content'] },
  { key: 'distribute', path: '/marketing/distribute', titleKey: 'mkg.ov.mod.distribute', icon: <ShareAltOutlined />, prefixes: ['/marketing/distribute', '/marketing/publish', '/marketing/channel', '/marketing/schedule', '/marketing/email', '/marketing/visitor'] },
  { key: 'campaigns', path: '/marketing/campaigns', titleKey: 'mkg.campaign.menu', icon: <RocketOutlined />, prefixes: ['/marketing/campaigns'] },
  { key: 'place', path: '/marketing/place', titleKey: 'mkg.ov.mod.place', icon: <AppstoreOutlined />, prefixes: ['/marketing/place', '/marketing/place/new'] },
];

/** 站在分发子页时，提供一个明确的「回到内容分发主视图」出口。 */
const DISTRIBUTE_SUBS: readonly { path: string; titleKey: string }[] = [
  { path: '/marketing/channel', titleKey: 'mkg.chn.page' },
  // 内容排期（原 /marketing/calendar，2026-10-06 迁至 /marketing/schedule）
  { path: '/marketing/schedule', titleKey: 'mkg.cal.page' },
  { path: '/marketing/email', titleKey: 'mkg.mail.page' },
  { path: '/marketing/visitor', titleKey: 'mkg.vis.page' },
];

function activeModule(pathname: string): string {
  for (const module of MODULES) {
    if (module.prefixes.some((prefix) => pathname.startsWith(prefix))) {
      return module.key;
    }
  }
  return MODULES[0]?.key ?? 'calendar';
}

export default function MarketingLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const current = activeModule(location.pathname);
  const onDistributeSub = DISTRIBUTE_SUBS.some((sub) => location.pathname === sub.path);
  // 总览页（/marketing）自带五模块快捷按钮，隐藏持久切换器避免同屏两套相同导航。
  const isOverview = location.pathname === '/marketing';

  return (
    <div className="lx-marketing">
      {!isOverview ? (
        <nav className="lx-mkgnav" aria-label={t('mkg.menu.marketing')}>
          {MODULES.map((module) => (
            <button
              key={module.key}
              type="button"
              className={`lx-mkgnav__item lx-focusable${current === module.key ? ' is-active' : ''}`}
              onClick={() => {
                void navigate(module.path);
              }}
            >
              <span className="lx-mkgnav__icon" aria-hidden="true">
                {module.icon}
              </span>
              {t(module.titleKey)}
            </button>
          ))}
        </nav>
      ) : null}

      {onDistributeSub ? (
        <nav className="lx-mkgnav__subs" aria-label={t('mkg.ov.mod.distribute')}>
          <button
            type="button"
            className="lx-chip lx-focusable"
            onClick={() => void navigate('/marketing/distribute')}
          >
            {t('mkg.ov.mod.distribute')}
          </button>
          {DISTRIBUTE_SUBS.filter((sub) => sub.path !== location.pathname).map((sub) => (
            <button
              key={sub.path}
              type="button"
              className="lx-chip lx-focusable"
              onClick={() => void navigate(sub.path)}
            >
              {t(sub.titleKey)}
            </button>
          ))}
        </nav>
      ) : null}

      {outlet}
    </div>
  );
}