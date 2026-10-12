import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOutlined,
  BulbOutlined,
  CommentOutlined,
  FileAddOutlined,
  FileTextOutlined,
  ImportOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxAssetGrid,
  LxFilterButton,
  LxNavGrid,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
  LxWorkList,
} from '@lingxi/ui';
import type { LxAssetItem, LxNavItem, LxWorkItem } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 知识中心首页（/knowledge）—— 组织知识资产（产品规划说明书 V2.1 §2.12）。
 *
 * 典型使用者：一线业务员与内容创意总监（主要消费）+ 知识运营（维护）。
 * 业务员进来时心里已经有明确目标（"我要找催复话术"），所以本页是**分类直达**结构，
 * 不是待办队列——用队列会凭空造一堆"待办"，反而挡住真正的检索路径。
 *
 * 四类资产各有明确消费者，分类导航里逐条写清"谁在用"，
 * 因为混在一起会导致"写完没人用"：
 *   模板 / 话术 → 人工通道（业务员直接引用）
 *   QA 库       → 营销客服智能体（标准答疑）
 *
 * ⚠️ 三产品升级（元枢归口）：提示词库（KC-16~19 / 22，版本化 + A/B）
 *   属元枢智能体工厂的提示词资产，已迁至 apps/yuanshu-console/routes/prompts；
 *   本中心只留 KC-07~15 话术 / 模板 / QA 内容（不留提示词死链）。
 *
 * 待维护队列是知识运营的视角：30 天零引用的资产、新产品缺话术、QA 未命中。
 * 它放在侧栏而不是首屏——维护是低频动作，业务员不该被它挡住。
 *
 * 关于智能体：知识萃取的 AI 能力体现为操作条上的「从优秀记录萃取」入口，
 * 以及队列行里的「AI 建议补充」标记，不设独立的建议区块。
 *
 * 文案一律走 i18n key（附录D 规则10），故演示数据定义在组件作用域内。
 *
 * 静态骨架：占位演示数据，接入后走 /api/v1/kc/assets。
 */

interface AssetRow {
  id: string;
  nameKey: string;
  code: string;
  type: 'template' | 'phrase' | 'qa' | 'prompt';
  sceneKey: string;
  lang: string;
  version: string;
}

const ROWS: readonly AssetRow[] = [
  { id: '1', nameKey: 'kc.asset.r1', code: 'KC-TPL-0042', type: 'template', sceneKey: 'demo.scene.outreach', lang: 'EN', version: 'v3' },
  { id: '2', nameKey: 'kc.asset.r2', code: 'KC-PHR-0186', type: 'phrase', sceneKey: 'demo.scene.followup', lang: 'DE', version: 'v2' },
  { id: '3', nameKey: 'kc.asset.r3', code: 'KC-QA-0231', type: 'qa', sceneKey: 'demo.scene.afterSales', lang: 'EN', version: 'v5' },
  { id: '5', nameKey: 'kc.asset.r5', code: 'KC-TPL-0038', type: 'template', sceneKey: 'demo.scene.quotation', lang: 'ES', version: 'v1' },
];

const TYPE_TAG = {
  template: 'graphic',
  phrase: 'lang',
  qa: 'done',
  prompt: 'video',
} as const;

const TYPE_ICON = {
  template: <FileTextOutlined />,
  phrase: <CommentOutlined />,
  qa: <QuestionCircleOutlined />,
  prompt: <RobotOutlined />,
} as const;

export default function KnowledgeHomePage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  /** 四类知识资产 + 消费者说明。 */
  const navItems: readonly LxNavItem[] = [
    {
      key: 'template',
      title: t('kc.nav.template.title'),
      desc: t('kc.nav.template.desc'),
      icon: <FileTextOutlined />,
      badge: '86',
    },
    {
      key: 'phrase',
      title: t('kc.nav.phrase.title'),
      desc: t('kc.nav.phrase.desc'),
      icon: <CommentOutlined />,
      tone: 'secondary',
      badge: '420',
    },
    {
      key: 'qa',
      title: t('kc.nav.qa.title'),
      desc: t('kc.nav.qa.desc'),
      icon: <QuestionCircleOutlined />,
      tone: 'success',
      badge: '158',
    },
  ];

  /** 待维护队列（知识运营视角）：每行一个"该补/该改"的知识点。 */
  const maintainItems: readonly LxWorkItem[] = [
    {
      key: 'k1',
      title: t('kc.item.k1.title'),
      sub: t('kc.item.k1.sub'),
      tags: [{ label: t('kc.item.k1.tag1'), variant: 'review' }],
      value: 'v2',
      actionLabel: t('kc.item.k1.action'),
      actionPrimary: true,
    },
    {
      key: 'k2',
      title: t('kc.item.k2.title'),
      sub: t('kc.item.k2.sub'),
      tags: [{ label: t('kc.item.k2.tag1'), variant: 'review' }],
      agentLabel: t('kc.item.k2.agent'),
      actionLabel: t('kc.item.k2.action'),
      actionPrimary: true,
    },
    {
      key: 'k3',
      title: t('kc.item.k3.title'),
      sub: t('kc.item.k3.sub'),
      tags: [{ label: t('kc.item.k3.tag1'), variant: 'review' }],
      agentLabel: t('kc.item.k3.agent'),
      value: t('kc.item.k3.value'),
      valueTone: 'danger',
      actionLabel: t('kc.item.k3.action'),
      actionPrimary: true,
    },
  ];

  /** 高频使用：业务员最常引用的资产，直接放到分类导航下面一眼可达。 */
  const hotAssets: readonly LxAssetItem[] = [
    {
      key: 'h1',
      title: t('kc.asset.h1.title'),
      sub: t('kc.asset.h1.sub'),
      icon: <FileTextOutlined />,
      tag: { label: t('kc.type.template'), variant: 'graphic' },
    },
    {
      key: 'h2',
      title: t('kc.asset.h2.title'),
      sub: t('kc.asset.h2.sub'),
      icon: <CommentOutlined />,
      tag: { label: t('kc.type.phrase'), variant: 'lang' },
    },
    {
      key: 'h4',
      title: t('kc.asset.h4.title'),
      sub: t('kc.asset.h4.sub'),
      icon: <QuestionCircleOutlined />,
      tag: { label: t('kc.type.qa'), variant: 'done' },
    },
  ];

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.nameKey).includes(keyword) || row.code.includes(keyword))
    : ROWS;

  const columns = [
    {
      title: t('kc.col.asset'),
      dataIndex: 'nameKey',
      key: 'asset',
      render: (_value: string, row: AssetRow) => (
        <span className="lx-cell-media">
          <span className={`lx-thumb lx-thumb--${row.type === 'prompt' ? 'video' : row.type === 'template' ? 'graphic' : 'stored'}`}>
            {TYPE_ICON[row.type]}
          </span>
          <span>
            <div className="lx-cell-title">{t(row.nameKey)}</div>
            <div className="lx-cell-code">{row.code}</div>
          </span>
        </span>
      ),
    },
    {
      title: t('kc.col.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: AssetRow['type']) => <LxTag variant={TYPE_TAG[value]}>{t(`kc.type.${value}`)}</LxTag>,
    },
    { title: t('kc.col.scene'), dataIndex: 'sceneKey', key: 'scene', render: (value: string) => t(value) },
    {
      title: t('kc.col.lang'),
      dataIndex: 'lang',
      key: 'lang',
      render: (value: string) => <LxTag variant="lang">{value}</LxTag>,
    },
    {
      title: t('kc.col.version'),
      dataIndex: 'version',
      key: 'version',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('common.action'),
      key: 'action',
      render: () => (
        <button type="button" className="lx-cell-link lx-focusable">
          {t('kc.action.edit')}
        </button>
      ),
    },
  ];

  return (
    <PageContainer titleKey="kc.page.home" hideTitle>
      <LxActionBar
        primary={{ key: 'create', label: t('kc.bar.create'), icon: <FileAddOutlined /> }}
        items={[
          { key: 'extract', label: t('kc.bar.extract'), icon: <BulbOutlined /> },
          { key: 'import', label: t('kc.bar.import'), icon: <ImportOutlined /> },
        ]}
        note={
          <>
            {t('kc.note.prefix')}
            <b>698</b>
            {t('kc.note.suffix')}
          </>
        }
      />

      <div className="lx-workgrid">
        <div className="lx-workgrid__col">
          <section className="lx-glass lx-panel">
            <div className="lx-panel__head">
              <div>
                <div className="lx-panel__title">{t('kc.navpanel.title')}</div>
                <div className="lx-panel__sub">{t('kc.navpanel.sub')}</div>
              </div>
            </div>
            <LxNavGrid items={navItems} />
          </section>
        </div>

        <div className="lx-workgrid__col">
          <LxWorkList
            title={t('kc.queue.title')}
            sub={t('kc.queue.sub')}
            count={3}
            tone="accent"
            moreLabel={t('kc.queue.more')}
            items={maintainItems}
            emptyText={t('kc.queue.empty')}
          />
        </div>
      </div>

      <section className="lx-section">
        <LxSectionHeader
          title={t('kc.hot.title')}
          sub={t('kc.hot.sub')}
          actionLabel={t('kc.hot.more')}
        />
        <LxAssetGrid items={hotAssets} columns={4} />
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('kc.list.title')}
          sub={t('kc.list.sub')}
          actionLabel={t('kc.list.more')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('kc.list.search')} onChange={setKeyword} />
              <LxFilterButton label={t('kc.list.filter')} />
              <span className="lx-tools-note">
                <BookOutlined />
                {t('kc.list.scopeHint')}
              </span>
            </>
          }
        >
          <LxTable<AssetRow>
            columns={columns}
            dataSource={[...visibleRows]}
            total={698}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
