import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Drawer } from 'antd';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { LxTag } from '@lingxi/ui';
import type { LxTagVariant } from '@lingxi/ui';

/**
 * AI 内容生成工作台（AIContentStudio）—— 从灵犀 1.0「内容营销 · 内容生成」页搬来的三栏工作台。
 *
 * **它为什么是一个组件，而不是两个页面**：商品中心要的是「为商品批量出素材」，
 * 营销中心要的是「为一场内容生产出草稿」——两者是同一件事的两个入口
 * （选素材 → 选脚本 → 选模型 → 一键生成 → 提交审核）。拆成两份实现，
 * 两边会各自漂移（图标、空态、校验文案各改一处）。故只实现一次，由调用方决定标题与提交动作。
 *
 * 保留了 1.0 的三栏骨架（配置 / 脚本 / 预览），因为这是"生成类"交互唯一
 * 站得住的布局：左侧是可选项，右侧是产出物，中间是决定产出形态的约束。
 * 三等分改为 1.25 : 1 : 1，中文与英文的标题长度都能容下，且预览栏不再是窄到放不下缩略图的一条。
 *
 * 三条纪律（本项目通用，非本组件特有）：
 *   ① 文案一律走 i18n key（附录D 规则10）——"生成中…""提交审核"都是 UI 文案，不是数据；
 *      真正属于数据的是下方演示语料本身（素材名 / 脚本名 / 模型名）。
 *   ② 颜色一律取 var(--lx-*)，暗色由 design-tokens.css 整段重定义同名变量，本文件无需另写暗色规则。
 *   ③ 不新增色相：素材类型 / 生成模型的状态色沿用既有 LxTag 变体（graphic / video / review / lang）。
 *
 * 静态骨架：行为占位演示数据，接入后走 /api/v1/mkg/contents（生成）与 /api/v1/prd/materials（素材）。
 */

interface StudioScript {
  id: string;
  nameKey: string;
  descKey: string;
}

/** 素材类型 key 收敛成字面量联合：MATERIAL_TAG 据此是精确映射而非索引签名，
 *  否则 `noUncheckedIndexedAccess` 会把它读成 `LxTagVariant | undefined`。 */
type MaterialTypeKey = 'mkg.studio.mat.type.image' | 'mkg.studio.mat.type.video' | 'mkg.studio.mat.type.doc';

interface StudioMaterial {
  id: string;
  nameKey: string;
  typeKey: MaterialTypeKey;
  cover: string;
}

/** 演示语料（等同数据文件：只存 key，不存成品中文）。 */
const MATERIALS: readonly StudioMaterial[] = [
  { id: 'm1', nameKey: 'mkg.studio.mat.m1', typeKey: 'mkg.studio.mat.type.image', cover: '/images/content-balcony.png' },
  { id: 'm2', nameKey: 'mkg.studio.mat.m2', typeKey: 'mkg.studio.mat.type.video', cover: '/images/content-blackout.png' },
  { id: 'm3', nameKey: 'mkg.studio.mat.m3', typeKey: 'mkg.studio.mat.type.image', cover: '/images/product-solar.png' },
  { id: 'm4', nameKey: 'mkg.studio.mat.m4', typeKey: 'mkg.studio.mat.type.video', cover: '/images/content-vanlife.png' },
  { id: 'm5', nameKey: 'mkg.studio.mat.m5', typeKey: 'mkg.studio.mat.type.doc', cover: '/images/product-power.png' },
];

const IMAGE_SCRIPTS: readonly StudioScript[] = [
  { id: 'ip1', nameKey: 'mkg.studio.script.ip1', descKey: 'mkg.studio.script.ip1d' },
  { id: 'ip2', nameKey: 'mkg.studio.script.ip2', descKey: 'mkg.studio.script.ip2d' },
  { id: 'ip3', nameKey: 'mkg.studio.script.ip3', descKey: 'mkg.studio.script.ip3d' },
  { id: 'ip4', nameKey: 'mkg.studio.script.ip4', descKey: 'mkg.studio.script.ip4d' },
];

const VIDEO_SCRIPTS: readonly StudioScript[] = [
  { id: 'vp1', nameKey: 'mkg.studio.script.vp1', descKey: 'mkg.studio.script.vp1d' },
  { id: 'vp2', nameKey: 'mkg.studio.script.vp2', descKey: 'mkg.studio.script.vp2d' },
  { id: 'vp3', nameKey: 'mkg.studio.script.vp3', descKey: 'mkg.studio.script.vp3d' },
  { id: 'vp4', nameKey: 'mkg.studio.script.vp4', descKey: 'mkg.studio.script.vp4d' },
];

const IMAGE_MODELS = ['GPT-4o', 'DALL·E 3', 'Midjourney', 'SDXL'] as const;
const VIDEO_MODELS = ['GPT-4o', 'Sora', 'Kling AI', 'Runway Gen-3'] as const;

/** 素材类型 → 胶囊变体（复用既有色板，不新增色相）。 */
const MATERIAL_TAG: Record<MaterialTypeKey, LxTagVariant> = {
  'mkg.studio.mat.type.image': 'graphic',
  'mkg.studio.mat.type.video': 'video',
  'mkg.studio.mat.type.doc': 'lang',
};

export interface AIContentStudioProps {
  open: boolean;
  onClose: () => void;
  /** 工作台标题（商品中心与营销中心各用各的 key） */
  titleKey: string;
  /** 提交按钮文案；缺省用「提交审核」 */
  submitLabelKey?: string | undefined;
  /** 提交成功的反馈文案 */
  submittedKey: string;
}

export function AIContentStudio({
  open,
  onClose,
  titleKey,
  submitLabelKey,
  submittedKey,
}: AIContentStudioProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [type, setType] = useState<'graphic' | 'video'>('graphic');
  const [materials, setMaterials] = useState<readonly string[]>([]);
  const [scriptMode, setScriptMode] = useState<'preset' | 'custom'>('preset');
  const [scriptId, setScriptId] = useState<string>('ip1');
  const [customScript, setCustomScript] = useState('');
  const [model, setModel] = useState<string>('GPT-4o');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [draftKey, setDraftKey] = useState('');

  const scripts = type === 'graphic' ? IMAGE_SCRIPTS : VIDEO_SCRIPTS;
  const models = type === 'graphic' ? IMAGE_MODELS : VIDEO_MODELS;

  /** 每次打开都从干净状态开始：上一轮的草稿与选择不该留在这个面板里。 */
  useEffect(() => {
    if (!open) {
      return;
    }
    setType('graphic');
    setMaterials([]);
    setScriptMode('preset');
    setScriptId('ip1');
    setCustomScript('');
    setModel('GPT-4o');
    setTopic('');
    setGenerating(false);
    setGenerated(false);
    setDraftKey('');
  }, [open]);

  function switchType(next: 'graphic' | 'video') {
    setType(next);
    setScriptId(next === 'graphic' ? 'ip1' : 'vp1');
    setModel('GPT-4o');
    setGenerated(false);
    setDraftKey('');
  }

  function handleGenerate() {
    if (!topic.trim()) {
      message.warning(t('mkg.studio.warn.topic'));
      return;
    }
    setGenerating(true);
    setGenerated(false);
    setDraftKey('');
    /** 占位：真实链路是 POST /api/v1/mkg/contents:generate。 */
    window.setTimeout(() => {
      const scriptName = scriptMode === 'preset' ? t(scripts.find((s) => s.id === scriptId)?.nameKey ?? scripts[0]?.nameKey ?? '') : t('mkg.studio.script.custom');
      setDraftKey(
        t('mkg.studio.draft', {
          script: scriptName,
          count: materials.length,
          type: t(`mkg.type.${type}`),
        }),
      );
      setGenerating(false);
      setGenerated(true);
    }, 1200);
  }

  function handleSubmit() {
    if (!generated) {
      message.warning(t('mkg.studio.warn.generateFirst'));
      return;
    }
    message.success(t(submittedKey));
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={1180}
      placement="right"
      className="lx-studio-drawer"
      title={t(titleKey)}
    >
      <div className="lx-studio">
        {/* ① 内容类型：决定后面的脚本、模型与预览形态，因此放在三栏之上而不是塞进某一栏 */}
        <div className="lx-studio__types">
          <span className="lx-studio__label">{t('mkg.studio.field.type')}</span>
          <div className="lx-studio__typebtns">
            <button
              type="button"
              className={`lx-studio__typebtn${type === 'graphic' ? ' is-active' : ''} lx-focusable`}
              onClick={() => switchType('graphic')}
            >
              <FileImageOutlined />
              {t('mkg.type.graphic')}
            </button>
            <button
              type="button"
              className={`lx-studio__typebtn${type === 'video' ? ' is-active' : ''} lx-focusable`}
              onClick={() => switchType('video')}
            >
              <VideoCameraOutlined />
              {t('mkg.type.video')}
            </button>
          </div>
          <span className="lx-studio__hint">{t(`mkg.studio.typeHint.${type}`)}</span>
        </div>

        <div className="lx-studio__grid">
          {/* 左栏：生成什么 */}
          <section className="lx-studio__col">
            <div className="lx-studio__card">
              <h3 className="lx-studio__cardtitle">{t('mkg.studio.field.topic')}</h3>
              <textarea
                className="lx-studio__input"
                rows={2}
                value={topic}
                placeholder={t('mkg.studio.topic.placeholder')}
                onChange={(event) => setTopic(event.target.value)}
              />
            </div>

            <div className="lx-studio__card lx-studio__card--grow">
              <h3 className="lx-studio__cardtitle">
                {t('mkg.studio.field.materials')}
                <span className="lx-studio__cardsub">{t('mkg.studio.field.materialsSub')}</span>
              </h3>
              <div className="lx-studio__mats">
                {MATERIALS.map((material) => {
                  const checked = materials.includes(material.id);
                  return (
                    <button
                      key={material.id}
                      type="button"
                      className={`lx-studio__mat${checked ? ' is-active' : ''} lx-focusable`}
                      onClick={() =>
                        setMaterials((prev) =>
                          prev.includes(material.id)
                            ? prev.filter((id) => id !== material.id)
                            : [...prev, material.id],
                        )
                      }
                    >
                      <img className="lx-studio__matimg" src={material.cover} alt="" />
                      <span className="lx-studio__matbody">
                        <span className="lx-studio__matname">{t(material.nameKey)}</span>
                        <LxTag variant={MATERIAL_TAG[material.typeKey]}>{t(material.typeKey)}</LxTag>
                      </span>
                      {checked ? <CheckCircleOutlined className="lx-studio__matok" /> : null}
                    </button>
                  );
                })}
                <button type="button" className="lx-studio__upload lx-focusable">
                  <CloudUploadOutlined />
                  {t('mkg.studio.upload')}
                </button>
              </div>
            </div>

            <div className="lx-studio__card">
              <h3 className="lx-studio__cardtitle">
                {t('mkg.studio.field.model')}
                <span className="lx-studio__cardsub">
                  {t(`mkg.studio.modelHint.${type}`)}
                </span>
              </h3>
              <div className="lx-studio__chips">
                {models.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`lx-studio__chip${model === item ? ' is-active' : ''} lx-focusable`}
                    onClick={() => setModel(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 中栏：用什么框架生成 */}
          <section className="lx-studio__col">
            <div className="lx-studio__card lx-studio__card--grow">
              <h3 className="lx-studio__cardtitle">{t('mkg.studio.script.title')}</h3>
              <span className="lx-studio__cardsub">
                {t(`mkg.studio.script.desc.${type}`)}
              </span>
              <div className="lx-studio__segment">
                <button
                  type="button"
                  className={`lx-studio__seg${scriptMode === 'preset' ? ' is-active' : ''} lx-focusable`}
                  onClick={() => setScriptMode('preset')}
                >
                  {t('mkg.studio.script.preset')}
                </button>
                <button
                  type="button"
                  className={`lx-studio__seg${scriptMode === 'custom' ? ' is-active' : ''} lx-focusable`}
                  onClick={() => setScriptMode('custom')}
                >
                  {t('mkg.studio.script.custom')}
                </button>
              </div>

              {scriptMode === 'preset' ? (
                <div className="lx-studio__scripts">
                  {scripts.map((script) => {
                    const checked = scriptId === script.id;
                    return (
                      <button
                        key={script.id}
                        type="button"
                        className={`lx-studio__script${checked ? ' is-active' : ''} lx-focusable`}
                        onClick={() => setScriptId(script.id)}
                      >
                        <span className="lx-studio__scriptname">{t(script.nameKey)}</span>
                        <span className="lx-studio__scriptdesc">{t(script.descKey)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="lx-studio__input lx-studio__input--tall"
                  rows={8}
                  value={customScript}
                  placeholder={t('mkg.studio.script.placeholder')}
                  onChange={(event) => setCustomScript(event.target.value)}
                />
              )}
            </div>
          </section>

          {/* 右栏：生成出来是什么 */}
          <section className="lx-studio__col">
            <div className="lx-studio__card lx-studio__card--grow">
              <h3 className="lx-studio__cardtitle">{t('mkg.studio.preview.title')}</h3>
              <span className="lx-studio__cardsub">
                {t('mkg.studio.preview.desc', { type: t(`mkg.type.${type}`) })}
              </span>

              <button
                type="button"
                className="lx-studio__generate"
                onClick={handleGenerate}
                disabled={generating}
              >
                <span className="lx-studio__spark">✦</span>
                {generating ? t('mkg.studio.generating') : t('mkg.studio.generate')}
              </button>

              {generating ? (
                <div className="lx-studio__wait">
                  <span className="lx-studio__spinner" />
                  <p className="lx-studio__waitmain">{t('mkg.studio.waiting')}</p>
                  <p className="lx-studio__waitsub">
                    {t('mkg.studio.waitingSub', { model, type: t(`mkg.type.${type}`) })}
                  </p>
                </div>
              ) : null}

              {!generating && generated && type === 'graphic' ? (
                <div className="lx-studio__preview">
                  <div className="lx-studio__poster">
                    <img src="/images/product-solar.png" alt="" />
                    <span className="lx-studio__postertitle">{topic}</span>
                  </div>
                  <div className="lx-studio__thumbs">
                    <img src="/images/content-balcony.png" alt="" />
                    <img src="/images/product-power.png" alt="" />
                    <img src="/images/product-health.png" alt="" />
                  </div>
                  <p className="lx-studio__note">{t('mkg.studio.gallery')}</p>
                  <p className="lx-studio__draft">{draftKey}</p>
                  <button type="button" className="lx-studio__submit" onClick={handleSubmit}>
                    {t(submitLabelKey ?? 'mkg.studio.submit')}
                  </button>
                </div>
              ) : null}

              {!generating && generated && type === 'video' ? (
                <div className="lx-studio__preview">
                  <div className="lx-studio__player">
                    <img src="/images/content-blackout.png" alt="" />
                    <span className="lx-studio__playbtn">
                      <PlayCircleOutlined />
                    </span>
                    <span className="lx-studio__playerlabel">{topic}</span>
                    <span className="lx-studio__progress">
                      <i />
                    </span>
                  </div>
                  <div className="lx-studio__metaline">
                    <span>{t('mkg.studio.storyboard')}</span>
                    <span>{t('mkg.studio.duration')}</span>
                  </div>
                  <p className="lx-studio__note">{t('mkg.studio.storyboardHint')}</p>
                  <p className="lx-studio__draft">{draftKey}</p>
                  <button type="button" className="lx-studio__submit" onClick={handleSubmit}>
                    {t(submitLabelKey ?? 'mkg.studio.submit')}
                  </button>
                </div>
              ) : null}

              {!generating && !generated ? (
                <p className="lx-studio__empty">
                  {t('mkg.studio.empty', { type: t(`mkg.type.${type}`) })}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </Drawer>
  );
}
