import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxKpi,
  LxSectionHeader,
  LxSearchInput,
  LxTable,
  LxTableCard,
  LxTag,
  LxThumb,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { AIContentStudio } from '@/components/AIContentStudio';
import {
  COMPLETENESS_TARGET,
  PRODUCT_MASTER,
  PRODUCT_MATERIALS,
  type ProductRecord,
  type ProductStatus,
} from './data';

/**
 * 商品中心首页（/product）—— 商品与素材的单一事实源（产品规划说明书 V2.1 §2.5）。
 *
 * 页面职责（2026-09-26 重构；2026-09-27 再收敛）：
 *  - 顶部操作条：新建商品等直达入口（入口铁律，主操作永远在左上角第一个）。
 *  - 四个可点击指标卡：总商品数 / 待补全商品数 / 在售商品数 / 商品素材数。
 *    点击卡即切换下方列表——前三者过滤商品列表，最后一个**跳到产品素材库**
 *    （二级页 /product/assets）。
 *  - 默认展示全部商品列表；点击「待补全 / 在售」按状态过滤。
 *
 * 2026-09-27：**素材不再是本页页内的第二种视图**。原先点「商品素材数」会在页内切到素材表格，
 * 与本页新建的「产品素材库」二级页功能重叠 —— 同一个能力两个落点，用户不知道该去哪。
 * 收敛后本页只管商品主数据，素材（上传 / 分类 / 打标 / 多语言版本 / 与 SKU 关联）
 * 一律落在素材库页，首页上的素材入口只做跳转。
 *
 * 待补全口径：资料完整度 < COMPLETENESS_TARGET（85%），与总览完整度目标的分档一致。
 * 商品状态（E47）映射 LxTag 固定变体：在售→done、待上架→review、下架→producing，
 * 不引入新色相（禁忌 8）。
 *
 * 文案一律走 i18n key；商品主数据与素材在 ./data.ts（商机中心按外键引用，须可独立 import）。
 * 静态骨架：占位演示数据，接入后走 /api/v1/prd/products 与 /api/v1/prd/materials。
 */

const STATUS_KEY: Record<ProductStatus, string> = {
  pending: 'prd.status.pending',
  onSale: 'prd.status.onSale',
  offShelf: 'prd.status.offShelf',
};

const STATUS_VARIANT: Record<ProductStatus, LxTagVariant> = {
  pending: 'review',
  onSale: 'done',
  offShelf: 'producing',
};

export default function ProductHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /* 只有一种视图：素材已收敛到二级页（见文件头 2026-09-27 说明）。 */
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'onSale'>('all');
  const [keyword, setKeyword] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);

  const totalCount = PRODUCT_MASTER.length;
  const incompleteCount = PRODUCT_MASTER.filter((p) => p.completeness < COMPLETENESS_TARGET).length;
  const onSaleCount = PRODUCT_MASTER.filter((p) => p.status === 'onSale').length;
  const materialCount = PRODUCT_MATERIALS.length;

  const filteredProducts = useMemo(() => {
    let rows = PRODUCT_MASTER;
    if (filter === 'incomplete') rows = rows.filter((p) => p.completeness < COMPLETENESS_TARGET);
    else if (filter === 'onSale') rows = rows.filter((p) => p.status === 'onSale');
    if (keyword) {
      const kw = keyword.trim().toLowerCase();
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(kw) || p.sku.toLowerCase().includes(kw),
      );
    }
    return rows;
  }, [filter, keyword]);

  const selectAll = () => setFilter('all');
  const selectIncomplete = () => setFilter('incomplete');
  const selectOnSale = () => setFilter('onSale');
  /** 素材统一在二级页：首页面上的这个入口只负责把人送到那儿。 */
  const openAssets = () => {
    void navigate('/product/assets');
  };
  const openCreate = () => {
    void navigate('/product/new');
  };
  const openUpload = () => {
    void navigate('/product/upload');
  };

  const listTitleKey =
    filter === 'incomplete' ? 'prd.list.incomplete' : filter === 'onSale' ? 'prd.list.onSale' : 'prd.list.all';

  const productColumns = [
    {
      title: t('prd.col.thumb'),
      dataIndex: 'image',
      key: 'thumb',
      width: '8%',
      render: (_value: string | undefined, row: ProductRecord) => (
        <LxThumb src={row.image} alt={row.name} kind="graphic" />
      ),
    },
    {
      title: t('prd.col.category'),
      dataIndex: 'categoryKey',
      key: 'category',
      width: '12%',
      render: (value: string) => (
        <span className="lx-cell-text" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      title: t('prd.col.sku'),
      dataIndex: 'sku',
      key: 'sku',
      width: '14%',
      render: (value: string) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('prd.col.product'),
      dataIndex: 'name',
      key: 'name',
      width: '18%',
      render: (value: string) => <span className="lx-cell-title">{value}</span>,
    },
    {
      title: t('prd.col.status'),
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (value: ProductStatus) => (
        <LxTag variant={STATUS_VARIANT[value]}>{t(STATUS_KEY[value])}</LxTag>
      ),
    },
    {
      title: t('prd.col.assets'),
      dataIndex: 'assets',
      key: 'assets',
      width: '9%',
      render: (value: number) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('prd.col.skuCount'),
      dataIndex: 'skuCount',
      key: 'skuCount',
      width: '9%',
      render: (value: number) => <span className="lx-num">{value}</span>,
    },
    {
      title: t('prd.col.maintenance'),
      dataIndex: 'maintenanceTime',
      key: 'maintenance',
      width: '12%',
      render: (value: string) => (
        <span className="lx-num" title={value}>
          {value}
        </span>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: '12%',
      render: (_value: unknown, row: ProductRecord) => (
        <span className="lx-oppops">
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => void navigate(`/product/new?id=${row.id}`)}
          >
            {t('prd.action.edit')}
          </button>
          <button
            type="button"
            className="lx-cell-link lx-focusable"
            onClick={() => void navigate(`/product/${row.id}/sku`)}
          >
            {t('prd.sku.manage')}
          </button>
          <button type="button" className="lx-cell-link lx-focusable" onClick={openAssets}>
            {t('prd.action.material')}
          </button>
        </span>
      ),
    },
  ];

  return (
    <PageContainer titleKey="prd.page.home" hideTitle>
      <LxActionBar
        primary={{
          key: 'create',
          label: t('prd.bar.create'),
          icon: <AppstoreAddOutlined />,
          onClick: openCreate,
        }}
        items={[
          { key: 'upload', label: t('prd.bar.upload'), icon: <CloudUploadOutlined />, onClick: openUpload },
          {
            key: 'aiMaterial',
            label: t('prd.bar.aiMaterial'),
            icon: <ThunderboltFilled />,
            onClick: () => setStudioOpen(true),
          },
        ]}
        note={
          <>
            {t('prd.note.prefix')}
            <b>96</b>
            {t('prd.note.suffix')}
          </>
        }
      />

      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi
          label={t('prd.metric.total')}
          value={String(totalCount)}
          color="primary"
          onClick={selectAll}
          active={filter === 'all'}
        />
        <LxKpi
          label={t('prd.metric.incomplete')}
          value={String(incompleteCount)}
          color="accent"
          onClick={selectIncomplete}
          active={filter === 'incomplete'}
        />
        <LxKpi
          label={t('prd.metric.onSale')}
          value={String(onSaleCount)}
          color="success"
          onClick={selectOnSale}
          active={filter === 'onSale'}
        />
        <LxKpi
          label={t('prd.metric.materials')}
          value={String(materialCount)}
          color="secondary"
          onClick={openAssets}
        />
      </div>

      <section className="lx-section">
        <LxSectionHeader title={t(listTitleKey)} />
        <LxTableCard
          tools={<LxSearchInput value={keyword} placeholder={t('prd.list.search')} onChange={setKeyword} />}
        >
          <LxTable<ProductRecord>
            fit
            columns={productColumns}
            dataSource={[...filteredProducts]}
            total={filteredProducts.length}
            pageNo={1}
            pageSize={20}
          />
        </LxTableCard>
      </section>

      {/* 「AI生成素材」与营销中心共用同一个工作台：商品侧关心的是"这份素材能不能用"，
          营销侧关心的是"这篇内容发出去效果如何"，但生成过程完全一样。 */}
      <AIContentStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        titleKey="prd.studio.title"
        submitLabelKey="prd.studio.submit"
        submittedKey="prd.studio.submitted"
      />
    </PageContainer>
  );
}
