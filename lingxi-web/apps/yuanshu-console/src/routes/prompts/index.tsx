import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BulbOutlined,
  HistoryOutlined,
  RobotOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxFilterButton,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
  LxTag,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 提示词资产（/prompts）—— KC-16~19、KC-22（元枢 · 智能体工厂的提示词库管理面）。
 *
 * 本页自 lingxi-web `routes/knowledge/index.tsx` 拆分迁入（归口表：提示词管理
 * 界面归属 = 元枢管理台；话术 / 模板 / QA 内容 KC-07~15 留在灵犀知识中心）。
 *
 * 铁律（技术规约2.0 §3.6 G7）：提示词必须入库、版本化 + A/B，代码只引用场景码，
 * 不引用模型名——内联提示词会让改一句话要发一次版，且无法做回归评测。
 *
 * 静态骨架：占位演示数据，接入后走元枢提示词 API（/api/v1/ys/**，契约登记于 contracts.md）。
 */

interface PromptRow {
  id: string;
  nameKey: string;
  code: string;
  sceneKey: string;
  version: string;
  ab: 'A/B' | '—';
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
}

const ROWS: readonly PromptRow[] = [
  { id: '1', nameKey: 'kc.asset.r4', code: 'KC-PRM-0034', sceneKey: 'demo.scene.contentGen', version: 'v2', ab: 'A/B', status: 'ACTIVE' },
  { id: '2', nameKey: 'ys.prompt.r2', code: 'KC-PRM-0031', sceneKey: 'demo.scene.outreach', version: 'v7', ab: '—', status: 'ACTIVE' },
  { id: '3', nameKey: 'ys.prompt.r3', code: 'KC-PRM-0028', sceneKey: 'demo.scene.afterSales', version: 'v4', ab: 'A/B', status: 'DRAFT' },
  { id: '4', nameKey: 'ys.prompt.r4', code: 'KC-PRM-0019', sceneKey: 'demo.scene.followup', version: 'v9', ab: '—', status: 'RETIRED' },
];

const STATUS_TAG = {
  ACTIVE: 'done',
  DRAFT: 'review',
  RETIRED: 'lang',
} as const;

export default function PromptsHomePage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  const visibleRows = keyword
    ? ROWS.filter((row) => t(row.nameKey).includes(keyword) || row.code.includes(keyword) || t(row.sceneKey).includes(keyword))
    : ROWS;

  const columns = [
    {
      title: t('kc.col.asset'),
      dataIndex: 'nameKey',
      key: 'asset',
      render: (_value: string, row: PromptRow) => (
        <span className="lx-cell-media">
          <span className="lx-thumb lx-thumb--video">
            <RobotOutlined />
          </span>
          <span>
            <div className="lx-cell-title">{t(row.nameKey)}</div>
            <div className="lx-cell-code">{row.code}</div>
          </span>
        </span>
      ),
    },
    { title: t('kc.col.scene'), dataIndex: 'sceneKey', key: 'scene', render: (value: string) => t(value) },
    {
      title: t('kc.col.version'),
      dataIndex: 'version',
      key: 'version',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('ys.prompt.ab'),
      dataIndex: 'ab',
      key: 'ab',
      render: (value: PromptRow['ab']) =>
        value === 'A/B' ? <LxTag variant="video">{value}</LxTag> : <span className="lx-cell-code">{value}</span>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: PromptRow['status']) => <LxTag variant={STATUS_TAG[value]}>{t(`ys.prompt.status.${value}`)}</LxTag>,
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
    <PageContainer titleKey="ys.prompt.page" hideTitle>
      <LxActionBar
        primary={{ key: 'new', label: t('ys.prompt.new'), icon: <BulbOutlined /> }}
        items={[
          { key: 'version', label: t('kc.bar.version'), icon: <TagsOutlined /> },
          { key: 'history', label: t('ys.prompt.history'), icon: <HistoryOutlined /> },
        ]}
        note={
          <>
            {t('ys.prompt.note.prefix')}
            <b>34</b>
            {t('ys.prompt.note.suffix')}
          </>
        }
      />

      <section className="lx-section">
        <LxSectionHeader
          title={t('kc.nav.prompt.title')}
          sub={t('kc.nav.prompt.desc')}
          actionLabel={t('kc.list.more')}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t('kc.list.search')} onChange={setKeyword} />
              <LxFilterButton label={t('kc.list.filter')} />
            </>
          }
        >
          <LxTable<PromptRow>
            columns={columns}
            dataSource={[...visibleRows]}
            total={ROWS.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
