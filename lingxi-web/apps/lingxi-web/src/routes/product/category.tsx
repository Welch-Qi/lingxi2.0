import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  LxActionBar,
  LxSectionHeader,
  LxTag,
  type LxTagVariant,
} from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import {
  CATEGORY_TREE,
  CUSTOM_FIELDS,
  findCategory,
  productCountOf,
  templatesOf,
  type AttrFieldType,
} from './category-data';

/**
 * 商品分类与属性（/product/category）—— §2.5「品类树、属性模板、自定义字段」。
 *
 * 这一页解决的问题不是"商品归到哪一类"，而是"**新商品该填哪些字段，由谁说了算**"：
 * 品类树定"这类商品属于哪"，属性模板定"这类商品必须填哪几个字段"，
 * 自定义字段则是跨类目复用的那几个（HS 编码、品牌、保修……）。
 * 三者如果各说各话，商品主数据就会在三个地方打架，
 * 而 §2.5 说得很清楚：商品中心是商品与素材的**单一事实源**。
 *
 * 交互是"**选类目 → 模板跟着换**"，不是三块并列：
 * 品类名在竖排、模板在右栏按类目过滤 —— 人脑子里的问题永远是
 * "储能类目要有容量和额定电压"，不会是"所有属性模板列一遍我该怎么选"。
 *
 * 子类目的计数退到父类目算（见 `category-data.ts` 的 `productCountOf`）：
 * 商品只挂一级类目，子类目恒为 0 会被读成"这块没数据"，而不是"口径如此"。
 */

/** 字段类型 → LxTag 变体（同一类型在任何页长得一样）。 */
const TYPE_VARIANT: Record<AttrFieldType, LxTagVariant> = {
  text: 'producing',
  number: 'graphic',
  enum: 'lang',
  bool: 'review',
};

export default function ProductCategoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('c1');

  const roots = CATEGORY_TREE.filter((node) => node.parentId === null);
  const childrenOf = (id: string) => CATEGORY_TREE.filter((node) => node.parentId === id);
  const activeName = findCategory(activeId)?.nameKey ?? 'prd.cat.energy';
  const templates = templatesOf(activeId);
  const customFields = CUSTOM_FIELDS;

  return (
    <PageContainer titleKey="prd.category.page" hideTitle>
      {/* 本页从首页动作栏的「品类管理」进来，没有别的回程 —— 补一条显式出口 */}
      <div className="lx-prdcat__back">
        <button
          type="button"
          className="lx-chip lx-focusable"
          onClick={() => void navigate('/product')}
        >
          <ArrowLeftOutlined />
          {t('prd.back.list')}
        </button>
      </div>

      <LxActionBar
        primary={{ key: 'newCategory', label: t('prd.category.bar.newCategory'), icon: <TagsOutlined /> }}
        items={[
          { key: 'newTemplate', label: t('prd.category.bar.newTemplate'), icon: <ApartmentOutlined /> },
          { key: 'newField', label: t('prd.category.bar.newField'), icon: <PlusOutlined /> },
        ]}
        note={t('prd.category.note')}
      />

      <div className="lx-prdcat__body">
        {/* ── 左：品类树 ────────────────────────────────── */}
        <section className="lx-glass lx-panel">
          <LxSectionHeader title={t('prd.category.section.tree')} />
          <ul className="lx-prdcat__tree">
            {roots.map((root) => {
              const children = childrenOf(root.id);
              return (
                <li key={root.id}>
                  <button
                    type="button"
                    className={`lx-prdcat__node lx-focusable${root.id === activeId ? ' is-active' : ''}`}
                    aria-current={root.id === activeId}
                    onClick={() => setActiveId(root.id)}
                  >
                    <span>{t(root.nameKey)}</span>
                    <span className="lx-prdcat__count">{productCountOf(root.id)}</span>
                  </button>
                  {children.length > 0 ? (
                    <ul className="lx-prdcat__children">
                      {children.map((child) => (
                        <li key={child.id}>
                          <button
                            type="button"
                            className={`lx-prdcat__node lx-focusable${child.id === activeId ? ' is-active' : ''}`}
                            aria-current={child.id === activeId}
                            onClick={() => setActiveId(child.id)}
                          >
                            <span>{t(child.nameKey)}</span>
                            <span className="lx-prdcat__count">{productCountOf(child.id)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 右：模板与自定义字段 ─────────────────────── */}
        <div className="lx-prdcat__col">
          <section className="lx-glass lx-panel">
            <LxSectionHeader
              title={t('prd.category.section.templates')}
              sub={t('prd.category.section.templatesSub')}
              actions={
                <button type="button" className="lx-section__action lx-focusable">
                  <SettingOutlined />
                  {t('prd.category.action.manage')}
                </button>
              }
            />

            {/* 模板按选中类目过滤，故这里先说明"当前看的是哪一类" ——
                否则右侧模板换了一组，用户会以为列表自己变了。 */}
            <p className="lx-prdcat__vals lx-prdcat__sub">
              {t('prd.category.appliesTo')} · <b>{t(activeName)}</b>（{templates.length}）
            </p>

            {templates.length === 0 ? (
              <p className="lx-prdcat__vals">{t('prd.category.noTemplate')}</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="lx-prdcat__tpl">
                  <div className="lx-prdcat__tplhead">
                    <span className="lx-prdcat__tplname">{t(template.nameKey)}</span>
                    {template.shared ? (
                      <LxTag variant="done">{t('prd.category.template.shared')}</LxTag>
                    ) : null}
                    <span className="lx-prdcat__count">{template.fields.length} {t('prd.category.template.fields')}</span>
                  </div>

                  {/* 字段清单用网格而不是表格：字段数不固定（3–4），表格会留出大量空行。 */}
                  <div className="lx-prdcat__fieldgrid">
                    <span className="lx-prdcat__fieldname">{t('prd.category.field.name')}</span>
                    <span>{t('prd.category.field.type')}</span>
                    <span>{t('prd.category.field.required')}</span>
                    <span>{t('prd.category.field.values')}</span>

                    {template.fields.map((field) => (
                      <div key={field.id} className="lx-prdcat__row">
                        <span
                          className="lx-prdcat__fieldname"
                          title={t(field.nameKey)}
                        >
                          {t(field.nameKey)}
                          {field.unitKey ? `（${t(`prd.unit.${field.unitKey}`)}）` : ''}
                        </span>
                        <span>
                          <LxTag variant={TYPE_VARIANT[field.type]}>{t(`prd.attr.type.${field.type}`)}</LxTag>
                        </span>
                        <span>
                          {field.required ? (
                            <span className="lx-prdcat__required">{t('prd.category.field.required')}</span>
                          ) : (
                            <span className="lx-prdcat__count">—</span>
                          )}
                        </span>
                        <span className="lx-prdcat__vals">
                          {field.valueKeys.length === 0
                            ? '—'
                            : field.valueKeys.map((valueKey) => t(`prd.attr.value.${valueKey}`)).join(' / ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="lx-glass lx-panel">
            <LxSectionHeader title={t('prd.category.section.custom')} sub={t('prd.category.section.customSub')} />
            <div className="lx-prdcat__fieldgrid lx-prdcat__fieldgrid--custom">
              <span className="lx-prdcat__fieldname">{t('prd.category.field.name')}</span>
              <span>{t('prd.category.field.type')}</span>
              <span>{t('prd.category.field.scope')}</span>

              {customFields.map((field) => (
                <div key={field.id} className="lx-prdcat__row">
                  <span className="lx-prdcat__fieldname">{t(field.nameKey)}</span>
                  <span>
                    <LxTag variant={TYPE_VARIANT[field.type]}>{t(`prd.attr.type.${field.type}`)}</LxTag>
                  </span>
                  <span className="lx-prdcat__vals">
                    {field.appliesTo.length === 0
                      ? t('prd.category.field.allCategories')
                      : field.appliesTo
                          .map((categoryId) => {
                            const node = findCategory(categoryId);
                            return node ? t(node.nameKey) : categoryId;
                          })
                          .join(' / ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
