import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  DownOutlined,
  FileTextOutlined,
  PictureOutlined,
  TagOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxAssetGrid,
  LxKpi,
  LxSearchInput,
  LxSectionHeader,
  LxTableCard,
  LxTag,
  LxThumb,
  type LxAssetItem,
  type LxTagVariant,
} from '@lingxi/ui';
import { App, Drawer } from 'antd';
import { PageContainer } from '@/components/PageContainer';
import { AIContentStudio } from '@/components/AIContentStudio';
import {
  PRODUCT_MASTER,
  PRODUCT_MATERIALS,
  type MaterialKind,
  type MaterialLang,
  type MaterialRecord,
} from './data';

/**
 * 产品素材库（/product/assets）—— 内容创意的弹药库（《产品规划说明书V2.1》§2.5）。
 *
 * 为什么它得是独立的二级页，而不是首页那张五列表：首页那张表回答"有哪些素材"，
 * 本页要回答"**能不能立刻找到能用的一张**"。§2.5 给素材库写了四件事 ——
 * 上传、分类、打标、与 SKU 关联 —— 前两件让素材存得下来，
 * 打标与 SKU 关联才是"找得到"：做一条短视频时要按用途（带尺寸、竖版、节日主题）筛，
 * 而不是先翻 12 张图再记起哪张是带尺寸的。
 *
 * 因此页面上那五个筛选项不是装饰：类型 / 所属商品 / 分类 / 标签 / 语言版本。
 * 语言版本是 §2.5 的「多语言版本」—— 缺哪个语种要能被数出来，不能靠人眼扫。
 *
 * 两种视图不是同一个东西换了皮肤：
 *   · **网格**（默认）：挑素材时看的是"长什么样"，眼睛比字段快；
 *   · **列表**：按 SKU 对账、核对语种覆盖时，要看的是字段本身。
 *
 * 数据取 `./data` 的 `PRODUCT_MATERIALS` —— 首页的「商品素材数」指标、
 * 商机中心的「意向产品」都引用同一份，这里把模型改细不会让那两处漂移。
 * 静态骨架：占位演示数据，接入后走 /api/v1/prd/materials。
 */

/** 素材类型 → 图标（缺图时降级色块里显示的那一个）与 LxTag 变体。 */
const KIND_ICON = {
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
  document: <FileTextOutlined />,
} as const;

const KIND_VARIANT: Record<MaterialKind, LxTagVariant> = {
  image: 'graphic',
  video: 'video',
  document: 'producing',
};

/**
 * 类型的展示顺序（图片 → 视频 → 文档）—— 全站唯一一份（2026-10-07 第二十轮）。
 *
 * 此前这个顺序在三处各写一遍：指标带三张卡、筛选行「类型」下拉、以及现在的分组标题。
 * 三处顺序不一致时用户会以为"指标带的视频"和"下面那组视频"数不上 ——
 * 而它们是同一批数据。合并成 `KIND_ORDER` 后，下拉与分组都由它 map 派生。
 */
const KIND_ORDER: readonly MaterialKind[] = ['image', 'video', 'document'];

/**
 * 主销语种：演示数据以英文站为首发市场，故「待翻译」= 缺 `en-US` 版本。
 * 不等于只做英文 —— 每条素材的 `langs` 保留完整语种集合，
 * 接入口径换成"缺任一目标语种"时改这一个常量即可。
 */
const TARGET_LANG: MaterialLang = 'en-US';

/** 语言版本筛选项（与 data.ts 的 `MaterialLang` 一致，加语种时这里会漏、需手动补）。 */
const LANG_OPTIONS: readonly MaterialLang[] = ['zh-CN', 'en-US', 'ja-JP', 'ar-AE'];

interface FilterState {
  kind: string;
  productCode: string;
  categoryKey: string;
  tagKey: string;
  lang: string;
}

const EMPTY_FILTERS: FilterState = {
  kind: 'all',
  productCode: 'all',
  categoryKey: 'all',
  tagKey: 'all',
  lang: 'all',
};

export default function ProductAssetsPage() {
  const { t } = useTranslation();
  // 静态 message 在 App Provider 外不生效，反馈必须走 App.useApp()（技术规约 §4.2）
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<MaterialRecord | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);

  const categoryKeys = useMemo(
    () => [...new Set(PRODUCT_MATERIALS.map((item) => item.categoryKey))],
    [],
  );
  const tagKeys = useMemo(
    () => [...new Set(PRODUCT_MATERIALS.flatMap((item) => [...item.tagKeys]))],
    [],
  );

  /** 筛选项的可选值：演示数据同源，加数据时这里不会自动跟上，故用 useMemo 集中定义。 */
  const visible = useMemo(() => {
    const needle = appliedKeyword.trim().toLowerCase();
    return PRODUCT_MATERIALS.filter((item) => {
      if (applied.kind !== 'all' && item.kind !== applied.kind) {
        return false;
      }
      if (applied.productCode !== 'all' && item.productCode !== applied.productCode) {
        return false;
      }
      if (applied.categoryKey !== 'all' && item.categoryKey !== applied.categoryKey) {
        return false;
      }
      if (applied.tagKey !== 'all' && !item.tagKeys.includes(applied.tagKey)) {
        return false;
      }
      if (applied.lang !== 'all' && !item.langs.includes(applied.lang as MaterialLang)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        item.productCode.toLowerCase().includes(needle) || item.productName.toLowerCase().includes(needle)
      );
    });
  }, [applied, appliedKeyword]);

  const total = PRODUCT_MATERIALS.length;
  const imageCount = PRODUCT_MATERIALS.filter((item) => item.kind === 'image').length;
  const videoCount = PRODUCT_MATERIALS.filter((item) => item.kind === 'video').length;
  const untranslated = PRODUCT_MATERIALS.filter((item) => !item.langs.includes(TARGET_LANG)).length;

  const assetItems: readonly LxAssetItem[] = visible.map((item) => ({
    key: item.id,
    title: `${item.productCode} · ${t(`prd.asset.cat.${item.categoryKey}`)}`,
    sub: item.productName,
    image: item.image,
    icon: KIND_ICON[item.kind],
    badge: item.kind === 'document' ? item.spec : undefined,
    onClick: () => setSelected(item),
  }));

  /**
   * 列表视图的数据：**按类型分组**（2026-10-07 第二十轮，用户要求"按照类型进行合并展示"）。
   *
   * 分组的顺序即 `KIND_ORDER`（图片 → 视频 → 文档），与上面指标带三张卡的顺序、
   * 筛选行「类型」下拉的候选顺序三处一致 —— 同一件事在三处的说法必须相同，
   * 否则用户会以为"指标带的视频数"和"下面视频组的条数"是两回事。
   */
  const kindGroups = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        rows: visible.filter((item) => item.kind === kind),
      })).filter((group) => group.rows.length > 0),
    [visible],
  );

  /** 筛选下拉。与商机中心的高级筛选同一套 `.lx-filterpanel__*` 形态。 */
  const select = (
    label: string,
    value: string,
    options: readonly { key: string; label: string }[],
    onChange: (value: string) => void,
  ) => (
    <div className="lx-filterpanel__cell">
      <span className="lx-filterpanel__label">{label}</span>
      <span className="lx-filterpanel__selectwrap">
        <select
          className="lx-filterpanel__select lx-focusable"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <DownOutlined className="lx-filterpanel__caret" aria-hidden="true" />
      </span>
    </div>
  );

  const allOption = { key: 'all', label: t('prd.assets.filter.all') };
  const patch = (next: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...next }));

  /* 素材库是二级页，出口有两条：回商品列表（本页是"素材"视角，列表是"商品"视角），
     以及直接去上传 / 分类 —— 挑素材时发现"这张没有"是高频情形，
     要求人先返回再点上传，等于把一次跳转变成三次。 */
  const backToList = () => {
    void navigate('/product');
  };
  const openUpload = () => {
    void navigate('/product/upload');
  };
  const openCategory = () => {
    void navigate('/product/category');
  };

  return (
    <PageContainer titleKey="prd.assets.title" hideTitle>
      <LxActionBar
        primary={{
          key: 'upload',
          label: t('prd.assets.bar.upload'),
          icon: <PictureOutlined />,
          onClick: openUpload,
        }}
        items={[
          {
            key: 'video',
            label: t('prd.assets.bar.uploadVideo'),
            icon: <VideoCameraOutlined />,
            onClick: openUpload,
          },
          {
            key: 'ai',
            label: t('prd.bar.aiMaterial'),
            icon: <AppstoreOutlined />,
            onClick: () => setStudioOpen(true),
          },
          { key: 'category', label: t('prd.assets.bar.category'), icon: <TagOutlined />, onClick: openCategory },
        ]}
        note={t('prd.assets.note')}
      />

      {/* 指标带分的是**类型**，与筛选行顶上那个「类型」互为表里 ——
          点哪张卡不筛（口径只在筛选行一处，不会出现"卡片说 12、筛完剩 5"）。 */}
      <div className="lx-grid lx-grid--kpi-4">
        <LxKpi label={t('prd.assets.metric.total')} value={String(total)} color="primary" />
        <LxKpi label={t('prd.assets.metric.image')} value={String(imageCount)} color="secondary" />
        <LxKpi label={t('prd.assets.metric.video')} value={String(videoCount)} color="violet" />
        <LxKpi label={t('prd.assets.metric.untranslated')} value={String(untranslated)} color="accent" />
      </div>

      <section className="lx-glass lx-prdassets__filters">
        {select(
          t('prd.assets.filter.kind'),
          filters.kind,
          [allOption, ...KIND_ORDER.map((kind) => ({
            key: kind,
            label: t(`prd.assets.kind.${kind}`),
          }))],
          (value) => patch({ kind: value }),
        )}
        {select(
          t('prd.assets.filter.product'),
          filters.productCode,
          [
            allOption,
            ...PRODUCT_MASTER.map((product) => ({
              key: product.sku,
              label: `${product.sku} · ${product.name}`,
            })),
          ],
          (value) => patch({ productCode: value }),
        )}
        {select(
          t('prd.assets.filter.category'),
          filters.categoryKey,
          [allOption, ...categoryKeys.map((key) => ({ key, label: t(`prd.asset.cat.${key}`) }))],
          (value) => patch({ categoryKey: value }),
        )}
        {select(
          t('prd.assets.filter.tag'),
          filters.tagKey,
          [allOption, ...tagKeys.map((key) => ({ key, label: t(`prd.asset.tag.${key}`) }))],
          (value) => patch({ tagKey: value }),
        )}
        {select(
          t('prd.assets.filter.lang'),
          filters.lang,
          [allOption, ...LANG_OPTIONS.map((lang) => ({ key: lang, label: t(`prd.assets.lang.${lang}`) }))],
          (value) => patch({ lang: value }),
        )}
        <span className="lx-prdassets__spacer" />
        <button
          type="button"
          className="lx-prdassets__reset lx-focusable"
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
            setKeyword('');
            setAppliedKeyword('');
          }}
        >
          {t('cus.filter.reset')}
        </button>
        <button type="button" className="lx-filterpanel__submit lx-focusable" onClick={() => setApplied(filters)}>
          {t('cus.entry.query')}
        </button>
      </section>

      <section className="lx-section">
        <LxSectionHeader
          title={t('prd.assets.list.title')}
          sub={t('prd.assets.list.sub', { count: visible.length })}
          actions={
            <span className="lx-prdassets__headacts">
              {/* 「商品列表」不是视图切换 —— 它换的是**页面**（商品主数据 ↔ 素材），
                  所以长得像出口而不像分段控件，也就不会被误当成"第三种视图"。 */}
              <button type="button" className="lx-chip lx-focusable" onClick={backToList}>
                <AppstoreOutlined />
                {t('prd.assets.backProducts')}
              </button>
              <span className="lx-prdassets__viewtoggle">
                <button
                  type="button"
                  className={`lx-prdassets__viewbtn lx-focusable${view === 'grid' ? ' is-active' : ''}`}
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <AppstoreOutlined />
                  {t('prd.assets.view.grid')}
                </button>
                <button
                  type="button"
                  className={`lx-prdassets__viewbtn lx-focusable${view === 'list' ? ' is-active' : ''}`}
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <FileTextOutlined />
                  {t('prd.assets.view.list')}
                </button>
              </span>
            </span>
          }
        />
        <LxTableCard
          tools={
            <LxSearchInput
              value={keyword}
              placeholder={t('prd.assets.search')}
              onChange={setKeyword}
            />
          }
        >
          {view === 'grid' ? (
            <LxAssetGrid items={assetItems} columns={4} />
          ) : (
            /* 列表视图 = 按类型分组的**属性清单**，一个属性占一行（2026-10-07 第二十轮）。

               为什么不是原来那张 9 列表格：九列里有五列是"短值"（类型 / 分类 / 规格 / 日期 /
               体积），把它们各占一列 998px 的宽度，等于每列只有 100px 出头，
               英文表头（`Category` / `Language versions` / `Uploaded`）全被截成省略号 ——
               而截掉的恰好是"这条素材属于哪一类、有没有译文"这两个最要紧的判断依据。
               改成属性行之后，同一屏能放下全部文字，且每条素材的字段纵向对齐可逐条比。

               分组而非平铺：12 条素材按类型排成三段，一眼能数出"图片 8 / 视频 2 / 文档 2"，
               正好对上上面指标带的三张卡；平铺则要自己数。
               空组不渲染（`kindGroups` 已过滤），避免出现"视频 0 条"这种占位段。 */
            <div className="lx-prdassets__groups">
              {kindGroups.map((group) => (
                <section key={group.kind} className="lx-prdassets__group">
                  <header className="lx-prdassets__grouphead">
                    <LxTag variant={KIND_VARIANT[group.kind]}>{t(`prd.assets.kind.${group.kind}`)}</LxTag>
                    <span className="lx-prdassets__groupcount lx-num">{group.rows.length}</span>
                  </header>

                  {group.rows.map((row) => (
                    <article
                      key={row.id}
                      className="lx-prdassets__rec"
                      /* 整条可点：与网格视图、抽屉三处进入细节的路径一致。
                         做成可聚焦的 button 而非 div[onClick]：列表里唯一可点的
                         大面积区域必须能被键盘走到。 */
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(row);
                        }
                      }}
                    >
                      <span className="lx-prdassets__rectop">
                        <span className="lx-prdassets__recthumb">
                          <LxThumb src={row.image} alt={row.productName} kind="graphic" />
                        </span>
                        <span className="lx-prdassets__recid lx-num">{row.id}</span>
                      </span>

                      {/* 属性行：标签在左固定宽、值在右占满。值可换行 ——
                          标签与商品名（最长 'Portable Power Station 1000W'）不该互相挤。 */}
                      <span className="lx-prdassets__recprops">
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.col.product')}</span>
                          <span className="lx-prdassets__recval">{row.productName}</span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.col.sku')}</span>
                          <span className="lx-prdassets__recval lx-num">{row.productCode}</span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.category')}</span>
                          <span className="lx-prdassets__recval">{t(`prd.asset.cat.${row.categoryKey}`)}</span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.tags')}</span>
                          <span className="lx-prdassets__recval">
                            {row.tagKeys.length === 0 ? (
                              <span className="lx-muted">—</span>
                            ) : (
                              row.tagKeys.map((tag) => (
                                <span key={tag} className="lx-prdassets__lang">
                                  {t(`prd.asset.tag.${tag}`)}
                                </span>
                              ))
                            )}
                          </span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.langs')}</span>
                          <span className="lx-prdassets__recval">
                            {row.langs.map((lang) => (
                              <span key={lang} className="lx-prdassets__lang">
                                {t(`prd.assets.lang.${lang}`)}
                              </span>
                            ))}
                            {/* 缺目标语种是**要主动说出来的**（而不是让人自己数），
                                沿用原表格里那条 `lang--missing` 的红色标记。 */}
                            {row.langs.includes(TARGET_LANG) ? null : (
                              <span className="lx-prdassets__lang lx-prdassets__lang--missing">
                                {t('prd.assets.lang.missing')}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.spec')}</span>
                          <span className="lx-prdassets__recval lx-num">{row.spec}</span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.owner')}</span>
                          <span className="lx-prdassets__recval">{t(row.ownerKey)}</span>
                        </span>
                        <span className="lx-prdassets__recprop">
                          <span className="lx-prdassets__reckey">{t('prd.assets.col.created')}</span>
                          <span className="lx-prdassets__recval lx-num">{row.createdAt}</span>
                        </span>
                      </span>
                    </article>
                  ))}
                </section>
              ))}

              {kindGroups.length === 0 ? (
                <p className="lx-prdassets__none">{t('prd.assets.empty')}</p>
              ) : null}
            </div>
          )}
        </LxTableCard>
      </section>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.productCode} · ${t(`prd.asset.cat.${selected.categoryKey}`)}` : ''}
        width={460}
      >
        {selected ? (
          <div className="lx-prdassets__drawerbody">
            <div className="lx-prdassets__preview">
              {selected.image ? (
                <img src={selected.image} alt={selected.productName} />
              ) : (
                <span aria-hidden="true">{KIND_ICON[selected.kind]}</span>
              )}
            </div>
            <dl className="lx-prdassets__kvs">
              <dt>{t('prd.col.product')}</dt>
              <dd>{selected.productName}</dd>
              <dt>{t('prd.assets.col.kind')}</dt>
              <dd>
                <LxTag variant={KIND_VARIANT[selected.kind]}>{t(`prd.assets.kind.${selected.kind}`)}</LxTag>
              </dd>
              <dt>{t('prd.assets.col.spec')}</dt>
              <dd className="lx-num">{selected.spec}</dd>
              <dt>{t('prd.assets.col.tags')}</dt>
              <dd>
                <span className="lx-prdassets__langs">
                  {selected.tagKeys.map((tagKey) => (
                    <span key={tagKey} className="lx-prdassets__lang">
                      {t(`prd.asset.tag.${tagKey}`)}
                    </span>
                  ))}
                </span>
              </dd>
              <dt>{t('prd.assets.col.langs')}</dt>
              <dd>
                <span className="lx-prdassets__langs">
                  {selected.langs.map((lang) => (
                    <span key={lang} className="lx-prdassets__lang">
                      {t(`prd.assets.lang.${lang}`)}
                    </span>
                  ))}
                </span>
              </dd>
              <dt>{t('prd.assets.col.owner')}</dt>
              <dd>{t(selected.ownerKey)}</dd>
              <dt>{t('prd.assets.col.created')}</dt>
              <dd className="lx-num">{selected.createdAt}</dd>
            </dl>
            <button
              type="button"
              className="lx-filterpanel__submit lx-focusable"
              onClick={() => {
                message.success(t('prd.assets.drawer.copied'));
                setSelected(null);
              }}
            >
              {t('prd.assets.drawer.copyRef')}
            </button>
          </div>
        ) : null}
      </Drawer>

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
