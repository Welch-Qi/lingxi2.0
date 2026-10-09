import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App } from 'antd';
import { CheckOutlined, StarFilled } from '@ant-design/icons';
import { LxSectionHeader, LxTag, LxThumb } from '@lingxi/ui';
import type { LxTagVariant } from '@lingxi/ui';
import type { MaterialKind, MaterialRecord } from '../data';

/**
 * 商品素材管理（商品编辑页正文末尾的一段，2026-10-07 第二十轮）。
 *
 * 用户要的是两件事，一件都不能省：
 *   ① **看得见这个商品有哪些素材** —— 此前素材只存在于独立的素材库二级页，
 *      改一个商品时得先记住它的 SKU、再去素材库按 SKU 筛，"这个商品素材齐不齐"
 *      要跨两个页面才能回答。
 *   ② **能指定哪张是商品主图** —— 主图是商品级的属性（列表页、商品卡片、订单交付页
 *      都用它），此前 `ProductRecord.image` 是**数据里写死的**，
 *      没有任何入口能改，于是"换主图"这件事在产品里根本不存在。
 *
 * 两个设计决定：
 *
 *  · **主图唯一，且只用图片素材**。视频与文档不能当主图（列表页的 LxThumb 只渲染 `<img>`），
 *    所以这两类素材的卡片不给出"设为主图"入口 —— 给一个点了没反应或点了报错的按钮，
 *    比不给更糟。角标位置留空也让"哪些能当主图"一眼可辨。
 *
 *  · **主图状态存本组件的 state，不回传表单**。它不是表单字段（表单提交走
 *    POST /api/v1/prd/products，主图是另一个端点的事），且演示态不写共享数据集。
 *    设为主图后卡片立刻换角标 —— 反馈必须即时，等提交后才知道等于没反馈。
 *
 * 为什么不用 `LxAssetGrid`：它只有 `onClick` 一个动作位，没有"当前选中"这个视觉态，
 * 也没有角标按钮位。要用得先给它加两个 props，而那会让素材库页也跟着承担
 * "每个素材都可能有主图角标"的语义 —— 那是本组件独有的。
 */
export interface ProductAssetsPanelProps {
  /** 该商品的素材（按 `productCode` 过滤后的 `PRODUCT_MATERIALS`）。 */
  materials: readonly MaterialRecord[];
  /** 数据里写死的主图地址（`ProductRecord.image`），仅作初始值参考。 */
  fallbackImage?: string | undefined;
}

const KIND_VARIANT: Record<MaterialKind, LxTagVariant> = {
  image: 'graphic',
  video: 'video',
  document: 'producing',
};

export function ProductAssetsPanel({ materials, fallbackImage }: ProductAssetsPanelProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  /**
   * 当前主图的素材 id（null = 用商品记录里原有的主图）。
   *
   * 存 id 而不是 image 地址：同一张图可能被两条素材记录引用（演示数据里
   * `/images/product-power.png` 就出现在 m1/m5/m8 三条上），按地址判身份
   * 会把"这几条其实是同一张图"认成"三个不同主图可选"。
   * 判"是不是当前主图"按 id 走，唯一且不受冗余字段影响。
   */
  const [mainId, setMainId] = useState<string | null>(null);

  /** 可作主图的候选：只图片。 */
  const images = useMemo(() => materials.filter((m) => m.kind === 'image'), [materials]);

  /**
   * 当前主图素材记录。
   *
   * 用户还没在本页指定过（mainId 为 null）时，取该商品下**分类为 main** 的那条；
   * 若连那条也没有（演示数据里 EV-11K-WB 只有 scene/spec 两类），
   * 回落"第一张图片" —— 主图恒有值，否则列表页与订单页的缩略图全是降级色块。
   */
  const main: MaterialRecord | undefined = useMemo(() => {
    if (mainId) {
      return images.find((m) => m.id === mainId);
    }
    return images.find((m) => m.categoryKey === 'main') ?? images[0];
  }, [images, mainId]);

  const setMain = (material: MaterialRecord) => {
    setMainId(material.id);
    message.success(t('prd.assets.mainSet', { id: material.id }));
  };

  return (
    <section className="lx-glass lx-panel lx-prdassets">
      <LxSectionHeader
        title={t('prd.assets.panel')}
        sub={t('prd.assets.panelSub', {
          total: materials.length,
          images: images.length,
          video: materials.filter((m) => m.kind === 'video').length,
          doc: materials.filter((m) => m.kind === 'document').length,
        })}
      />

      {/* 当前主图：单独一行大图，不混在网格里 ——
          "现在这张是主图"是选素材时要反复对照的一件事，
          埋在网格里意味着每次都要逐格扫 badge。 */}
      <div className="lx-prdassets__main">
        <span className="lx-prdassets__mainthumb">
          {/* size="card"：主图是要看内容的缩略图，列表默认的 44×32 认不出差别。
             kind 按素材类型给，视频素材当主图时（理论上不会发生，兜底）色块也不同。 */}
          <LxThumb
            src={main?.image ?? fallbackImage}
            alt={t('prd.assets.mainTitle')}
            kind={main?.kind === 'video' ? 'video' : 'graphic'}
            size="card"
          />
        </span>
        <span className="lx-prdassets__mainmeta">
          <span className="lx-prdassets__mainlabel">{t('prd.assets.mainTitle')}</span>
          <span className="lx-prdassets__mainid lx-num">{main?.id ?? '—'}</span>
          {main ? (
            <span className="lx-prdassets__maintags">
              <LxTag variant={KIND_VARIANT[main.kind]}>{t(`prd.assets.kind.${main.kind}`)}</LxTag>
              <LxTag variant="review">{t(`prd.asset.cat.${main.categoryKey}`)}</LxTag>
            </span>
          ) : null}
        </span>
      </div>

      {materials.length === 0 ? (
        /* 素材为空时给"去上传"而不是空着：这一段的存在就是为了回答
           "素材齐不齐"，空列表回答不了"接下来该做什么"。 */
        <p className="lx-prdassets__empty">{t('prd.assets.empty')}</p>
      ) : (
        <ul className="lx-prdassets__list">
          {materials.map((material) => {
            const isMain = main?.id === material.id;
            const canBeMain = material.kind === 'image';
            return (
              <li key={material.id} className={`lx-prdassets__item${isMain ? ' is-main' : ''}`}>
                <span className="lx-prdassets__thumb">
                  <LxThumb src={material.image} alt={material.id} />
                </span>
                <span className="lx-prdassets__body">
                  <span className="lx-prdassets__id lx-num">
                    {material.id}
                    {isMain ? <StarFilled className="lx-prdassets__star" aria-hidden="true" /> : null}
                  </span>
                  <span className="lx-prdassets__tags">
                    <LxTag variant={KIND_VARIANT[material.kind]}>{t(`prd.assets.kind.${material.kind}`)}</LxTag>
                    <LxTag variant="lang">{t(`prd.asset.cat.${material.categoryKey}`)}</LxTag>
                    {material.tagKeys.map((tag) => (
                      <LxTag key={tag} variant="lang">{t(`prd.asset.tag.${tag}`)}</LxTag>
                    ))}
                  </span>
                  <span className="lx-prdassets__spec lx-num">
                    {material.spec} · {material.createdAt}
                  </span>
                </span>
                <span className="lx-prdassets__act">
                  {isMain ? (
                    /* 已是主图时给"当前主图"而不是"设为主图"的禁用态 ——
                       禁用按钮读起来像"这个操作暂时不可用"，读不出"已经是了"。 */
                    <span className="lx-prdassets__ismain">
                      <CheckOutlined />
                      {t('prd.assets.isMain')}
                    </span>
                  ) : canBeMain ? (
                    <button
                      type="button"
                      className="lx-prdassets__setmain lx-focusable"
                      onClick={() => setMain(material)}
                    >
                      {t('prd.assets.setMain')}
                    </button>
                  ) : (
                    /* 视频/文档不可作主图：这里给文字说明而不是隐藏按钮，
                       否则用户会以为漏了这个功能（而不是"它本来就不能当主图"）。 */
                    <span className="lx-muted">{t('prd.assets.notMain')}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
