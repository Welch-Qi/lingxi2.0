import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { App } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  PlusOutlined,
  PaperClipOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { LxSectionHeader } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { findProduct } from './data';
import { skusOfProduct, type SkuItem } from './sku-data';

/**
 * SKU 编辑子页（`/product/:id/sku`）—— 一个商品可配置多个 SKU。
 *
 * 从商品列表「SKU」或商品编辑页「管理 SKU」进入。复用商品录入页的视觉语言
 * （`.lx-form--compact` 让字段「标签左 · 控件右」横向紧凑排，整页限宽居中成一块），
 * 因此多 SKU 列表读起来也是一组紧凑的卡片，而不是一长串孤立输入框。
 *
 * 每个 SKU 可配：编码 / 名称 / 规格 / 价格 / 库存 / 主图（用户要求的六类字段）。
 * 主图沿用录入页的 `.lx-filepick__*` 拾取区（一期无文件服务，仅留文件名）。
 *
 * 静态骨架：占位演示数据，保存仅本地 message 反馈；接入后走
 * PUT /api/v1/prd/products/:id/skus。
 */
export default function ProductSkuPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const product = findProduct(id ?? '');

  const [skus, setSkus] = useState<SkuItem[]>(() => skusOfProduct(id ?? ''));

  const updateSku = (sid: string, patch: Partial<SkuItem>) =>
    setSkus((prev) => prev.map((s) => (s.id === sid ? { ...s, ...patch } : s)));

  const addSku = () =>
    setSkus((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, code: '', name: '', spec: '', price: '', stock: '', image: '' },
    ]);

  const removeSku = (sid: string) => setSkus((prev) => prev.filter((s) => s.id !== sid));

  const save = () => {
    const missing = skus.filter((s) => !s.code.trim() || !s.name.trim()).length;
    if (missing > 0) {
      message.warning(t('prd.sku.incomplete', { count: missing }));
      return;
    }
    message.success(t('prd.sku.saved'));
    void navigate('/product');
  };

  return (
    <PageContainer titleKey="prd.sku.title" subtitleKey="prd.sku.subtitle">
      <div className="lx-form lx-form--compact">
        <div className="lx-form__top">
          <button
            type="button"
            className="lx-chip lx-form__back lx-focusable"
            onClick={() => void navigate('/product')}
          >
            <ArrowLeftOutlined />
            {t('prd.back.list')}
          </button>
        </div>

        <div className="lx-skupage__product">
          <span>{t('prd.sku.product')}</span>
          <b>{product ? product.name : (id ?? '')}</b>
          <span className="lx-num">{product ? product.sku : ''}</span>
        </div>

        {skus.length === 0 ? (
          <div className="lx-glass lx-panel lx-form__section lx-skupage__empty">
            {t('prd.sku.empty')}
          </div>
        ) : (
          skus.map((s, i) => (
            <section key={s.id} className="lx-glass lx-panel lx-form__section">
              <LxSectionHeader
                title={t('prd.sku.item', { n: i + 1 })}
                sub={s.code || undefined}
                actions={
                  <button
                    type="button"
                    className="lx-form__cancel lx-focusable"
                    onClick={() => removeSku(s.id)}
                  >
                    {t('prd.sku.remove')}
                  </button>
                }
              />
              <div className="lx-form__grid">
                <div className="lx-field">
                  <label className="lx-field__label" htmlFor={`code-${s.id}`}>
                    {t('prd.sku.field.code')}
                    <b className="lx-field__required">*</b>
                  </label>
                  <input
                    id={`code-${s.id}`}
                    className="lx-form__control"
                    value={s.code}
                    placeholder={t('prd.sku.field.code.ph')}
                    onChange={(e) => updateSku(s.id, { code: e.target.value })}
                  />
                </div>
                <div className="lx-field">
                  <label className="lx-field__label" htmlFor={`name-${s.id}`}>
                    {t('prd.sku.field.name')}
                    <b className="lx-field__required">*</b>
                  </label>
                  <input
                    id={`name-${s.id}`}
                    className="lx-form__control"
                    value={s.name}
                    placeholder={t('prd.sku.field.name.ph')}
                    onChange={(e) => updateSku(s.id, { name: e.target.value })}
                  />
                </div>
                <div className="lx-field">
                  <label className="lx-field__label" htmlFor={`spec-${s.id}`}>
                    {t('prd.sku.field.spec')}
                  </label>
                  <input
                    id={`spec-${s.id}`}
                    className="lx-form__control"
                    value={s.spec}
                    placeholder={t('prd.sku.field.spec.ph')}
                    onChange={(e) => updateSku(s.id, { spec: e.target.value })}
                  />
                </div>
                <div className="lx-field">
                  <label className="lx-field__label" htmlFor={`price-${s.id}`}>
                    {t('prd.sku.field.price')}
                  </label>
                  <input
                    id={`price-${s.id}`}
                    className="lx-form__control"
                    type="number"
                    value={s.price}
                    placeholder={t('prd.sku.field.price.ph')}
                    onChange={(e) => updateSku(s.id, { price: e.target.value })}
                  />
                </div>
                <div className="lx-field">
                  <label className="lx-field__label" htmlFor={`stock-${s.id}`}>
                    {t('prd.sku.field.stock')}
                  </label>
                  <input
                    id={`stock-${s.id}`}
                    className="lx-form__control"
                    type="number"
                    value={s.stock}
                    placeholder={t('prd.sku.field.stock.ph')}
                    onChange={(e) => updateSku(s.id, { stock: e.target.value })}
                  />
                </div>
                <div className="lx-field lx-field--wide">
                  <label className="lx-field__label" htmlFor={`img-${s.id}`}>
                    {t('prd.sku.field.image')}
                  </label>
                  {s.image ? (
                    <div className="lx-filepick__file">
                      <PaperClipOutlined className="lx-filepick__fileicon" aria-hidden="true" />
                      <span className="lx-filepick__filebody">
                        <span className="lx-filepick__filename" title={s.image}>
                          {s.image}
                        </span>
                        <span className="lx-filepick__filesize">{t('form.file.picked')}</span>
                      </span>
                      <button
                        type="button"
                        className="lx-filepick__filebtn lx-focusable"
                        onClick={() => updateSku(s.id, { image: '' })}
                      >
                        {t('form.file.reselect')}
                      </button>
                    </div>
                  ) : (
                    <label className="lx-filepick__drop lx-focusable" htmlFor={`img-${s.id}`}>
                      <InboxOutlined className="lx-filepick__icon" aria-hidden="true" />
                      <span className="lx-filepick__title">{t('prd.sku.field.image')}</span>
                      <span className="lx-filepick__sub">{t('form.file.sub')}</span>
                      <input
                        id={`img-${s.id}`}
                        type="file"
                        className="lx-filepick__input"
                        onChange={(e) => updateSku(s.id, { image: e.target.files?.[0]?.name ?? '' })}
                      />
                    </label>
                  )}
                </div>
              </div>
            </section>
          ))
        )}

        <button type="button" className="lx-skupage__add lx-focusable" onClick={addSku}>
          <PlusOutlined />
          {t('prd.sku.add')}
        </button>

        <div className="lx-form__foot">
          <button
            type="button"
            className="lx-form__cancel lx-focusable"
            onClick={() => void navigate('/product')}
          >
            {t('form.cancel')}
          </button>
          <button type="button" className="lx-form__submit lx-focusable" onClick={save}>
            <CheckOutlined />
            {t('prd.sku.save')}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
