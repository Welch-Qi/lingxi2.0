import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { App } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { LxSectionHeader, LxTag, type LxTagVariant } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { findProduct } from '../product/data';
import { findContent, type ContentStatus, type ContentType } from './content-data';

/**
 * 内容详情 / 审核（`/marketing/content/:code`）—— 对外内容的最后一道人工闸门。
 *
 * 为什么详情与审核合成一页：技术规约2.0 §3.6 G4 要求对外内容自主度 ≤A1（必须人审），
 * 而审的人要看的正是"这条内容长什么样 + 发给谁 + 谁负责"。
 * 把预览放详情页、审核放另一个抽屉，审的人就得在两屏之间来回记 —— 这是最容易出错的地方：
 * 记错了渠道就发错市场。故两栏同屏：左预览，右决策依据与动作。
 *
 * 三种状态对应三种右栏，**不是**同一个面板换文案：
 *   · `review`  —— 给「通过并排期 / 打回修改」，打回必须写意见（否则改的人不知道改什么）；
 *   · `producing` —— 生成中，没有可审的东西，显示进度而不是一对点不动的按钮；
 *   · `done` —— 已分发，这里改成看效果（曝光 / 互动 / 互动率），审核动作不出现。
 * 状态是"能不能审"的判据，所以按钮跟着状态走，不靠禁用态假装还在。
 *
 * 打回意见是必填的：这是"打回"与"不通过"的区别所在 ——
 * 一个不写理由的打回，与把这条内容丢掉没有区别。
 *
 * 静态骨架：通过 / 打回只给结果反馈，接入后走 POST /api/v1/mkg/contents/{code}/review。
 */

const TYPE_TAG: Record<ContentType, LxTagVariant> = {
  graphic: 'graphic',
  video: 'video',
};

const STATUS_TAG: Record<ContentStatus, LxTagVariant> = {
  review: 'review',
  producing: 'producing',
  done: 'done',
};

export default function MarketingContentDetailPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [comment, setComment] = useState('');

  const row = findContent(code ?? '');
  const backToList = () => {
    void navigate('/marketing');
  };

  const approve = () => {
    message.success(t('mkg.detail.approved'));
    backToList();
  };

  const reject = () => {
    if (comment.trim() === '') {
      message.warning(t('mkg.detail.needComment'));
      return;
    }
    message.success(t('mkg.detail.rejected'));
    backToList();
  };

  /* 编号来自 URL，用户手敲一个不存在的编号是常态 —— 给一条明确的回程，
     而不是渲染半页空白（空白会被读成"加载失败"）。 */
  if (!row) {
    return (
      <PageContainer titleKey="mkg.detail.page" hideTitle>
        <div className="lx-mkgct">
          <div className="lx-mkgct__back">
            <button type="button" className="lx-chip lx-focusable" onClick={backToList}>
              <ArrowLeftOutlined />
              {t('mkg.back.content')}
            </button>
          </div>
          <section className="lx-glass lx-panel lx-mkgct__review">
            <LxSectionHeader title={t('mkg.detail.notFound')} sub={t('mkg.detail.notFoundSub')} />
          </section>
        </div>
      </PageContainer>
    );
  }

  const product = findProduct(row.productCode);

  return (
    <PageContainer titleKey="mkg.detail.page" hideTitle>
      <div className="lx-mkgct">
        <div className="lx-mkgct__back">
          <button type="button" className="lx-chip lx-focusable" onClick={backToList}>
            <ArrowLeftOutlined />
            {t('mkg.back.content')}
          </button>
        </div>

        {/* 页头：一条内容是什么，一行说完。标签顺序固定为 类型 → 语种 → 状态，
            与列表页的列序一致 —— 同一份信息在两页换个位置读，等于让人重新学一遍。 */}
        <header className="lx-glass lx-panel lx-mkgct__head">
          <div className="lx-mkgct__headmain">
            <h2 className="lx-mkgct__title">{t(row.titleKey)}</h2>
            <div className="lx-mkgct__meta">
              <span className="lx-cell-code">{row.code}</span>
              <LxTag variant={TYPE_TAG[row.type]}>{t(`mkg.type.${row.type}`)}</LxTag>
              <LxTag variant="lang">{row.lang}</LxTag>
              <LxTag variant={STATUS_TAG[row.status]}>{t(`mkg.status.${row.status}`)}</LxTag>
            </div>
          </div>
        </header>

        <div className="lx-mkgct__body">
          {/* ── 左：预览 ─────────────────────────────── */}
          <div className="lx-mkgct__main">
            <section className="lx-glass lx-panel lx-mkgct__review">
              <LxSectionHeader title={t('mkg.detail.preview')} sub={t('mkg.detail.previewSub')} />
              <div className="lx-mkgct__stage">
                {/* 视频内容给**可播放的 `<video>`**（2026-10-06）：此前视频与图文一样
                    只渲染一张静态封面图，"视频"在这里等于永远停在这一帧 —— 审的人
                    看不到动效与时长，而这恰是判断内容能不能发的核心依据。
                    `controls` 必开（审核人需要自己拖进度），`poster` 用封面图
                    （未播放时仍是那张缩略图，视觉不退化）。
                    图文仍走 `<img>` 分支。 */}
                {row.video ? (
                  <video
                    className="lx-mkgct__video"
                    src={row.video}
                    poster={row.image}
                    controls
                    preload="metadata"
                    playsInline
                  />
                ) : row.image ? (
                  <img src={row.image} alt={t(row.titleKey)} />
                ) : (
                  <span className="lx-mkgct__stageicon" aria-hidden="true">
                    {row.type === 'video' ? <PlayCircleOutlined /> : <FileImageOutlined />}
                  </span>
                )}
              </div>
              {row.video ? (
                <p className="lx-mkgct__videohint">{t('mkg.detail.videoHint')}</p>
              ) : null}
              <p className="lx-mkgct__copy">{t(row.excerptKey)}</p>
            </section>
          </div>

          {/* ── 右：决策依据与动作 ───────────────────── */}
          <aside className="lx-mkgct__side">
            <section className="lx-glass lx-panel lx-mkgct__review">
              {row.status === 'review' ? (
                <>
                  <LxSectionHeader title={t('mkg.detail.review')} sub={t('mkg.detail.reviewSub')} />
                  <textarea
                    className="lx-form__control"
                    rows={4}
                    value={comment}
                    placeholder={t('mkg.detail.commentPh')}
                    aria-label={t('mkg.detail.comment')}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <div className="lx-mkgct__actions">
                    <button type="button" className="lx-form__submit lx-focusable" onClick={approve}>
                      <CheckOutlined />
                      {t('mkg.detail.approve')}
                    </button>
                    <button type="button" className="lx-form__cancel lx-focusable" onClick={reject}>
                      <CloseOutlined />
                      {t('mkg.detail.reject')}
                    </button>
                  </div>
                </>
              ) : null}

              {row.status === 'producing' ? (
                <>
                  <LxSectionHeader title={t('mkg.detail.producing')} sub={t('mkg.detail.producingSub')} />
                  <LxTag variant="producing">{t('mkg.status.producing')}</LxTag>
                </>
              ) : null}

              {row.status === 'done' ? (
                <>
                  <LxSectionHeader title={t('mkg.detail.effect')} sub={t('mkg.detail.effectSub')} />
                  <div className="lx-mkgct__stats">
                    <span className="lx-mkgct__stat">
                      <b className="lx-num">42.8k</b>
                      {t('mkg.detail.reach')}
                    </span>
                    <span className="lx-mkgct__stat">
                      <b className="lx-num">1.9k</b>
                      {t('mkg.detail.engage')}
                    </span>
                    <span className="lx-mkgct__stat">
                      <b className="lx-num">4.4%</b>
                      {t('mkg.detail.rate')}
                    </span>
                  </div>
                </>
              ) : null}
            </section>

            <section className="lx-glass lx-panel lx-mkgct__review">
              <LxSectionHeader title={t('mkg.detail.facts')} />
              <dl className="lx-mkgct__kvs">
                <dt>{t('mkg.col.channel')}</dt>
                <dd>{t(row.channelKey)}</dd>
                <dt>{t('mkg.detail.owner')}</dt>
                <dd>{t(row.ownerKey)}</dd>
                <dt>{t('mkg.detail.publishAt')}</dt>
                <dd className="lx-num">{row.publishAt}</dd>
                <dt>{t('mkg.detail.product')}</dt>
                <dd>{product ? `${product.sku} · ${product.name}` : row.productCode}</dd>
                <dt>{t('mkg.col.updated')}</dt>
                <dd>{t(row.updatedKey)}</dd>
              </dl>
            </section>

            <section className="lx-glass lx-panel lx-mkgct__review">
              <LxSectionHeader title={t('mkg.detail.trace')} sub={t('mkg.detail.traceSub')} />
              <ol className="lx-mkgct__trace">
                <li className="lx-mkgct__traceitem">
                  <span className="lx-mkgct__tracetime">09-24 08:12</span>
                  {t('mkg.detail.trace.gen')}
                </li>
                <li className="lx-mkgct__traceitem">
                  <span className="lx-mkgct__tracetime">09-24 09:05</span>
                  {t('mkg.detail.trace.submit', { owner: t(row.ownerKey) })}
                </li>
                {row.status === 'done' ? (
                  <li className="lx-mkgct__traceitem">
                    <span className="lx-mkgct__tracetime">09-24 10:00</span>
                    {t('mkg.detail.trace.published', { channel: t(row.channelKey) })}
                  </li>
                ) : null}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
