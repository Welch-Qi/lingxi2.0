import { useState } from 'react';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { ArrowLeftOutlined, UserAddOutlined } from '@ant-design/icons';
import { LxSectionHeader, LxTag } from '@lingxi/ui';
import type { LxTagVariant } from '@lingxi/ui';
import { RECEPTION_LEADS } from './reception';
import type { ReceptionLead } from './reception';

/**
 * 「沟通记录」面板 —— 承载灵犀 1.0 销售转化页的**客户接待**正文（2026-09-28 改版）。
 *
 * 为什么从抽屉改成**页内切换视图**：沟通记录与商机列表是同一件事的两种看法
 * （"我在跟谁谈"与"谈到哪一步了"），而抽屉挡住的正是用户刚在看的那张表 ——
 * 想对着商机阶段复核客户的最后一句话，得先把抽屉关掉。
 * 现在点「沟通记录」，列表整块换成这一屏；返回按钮在同一个位置换回来。
 *
 * 为什么去掉顶部那条「Echo AI 接待工作流」：
 * 它把"智能体在忙"排在了用户真正要看的对话前面；而且那条工作流的另外三段
 * （档案 / 跟进 / 成交）在 2.0 里各有归属分区，留在一条**只读**的条上
 * 只会让人以为它们在这儿能点。删掉后这一屏的第一眼就是客户说的话。
 *
 * 三条纪律：
 *  1. 对话里的时刻（`10:38`）是数据不是文案，直接渲染；只有"话"走 i18n。
 *  2. 「转客户建档」「发送」是 1.0 就有的静态动作，这里只给结果反馈，
 *     不接任何写入接口 —— 一期没有建档接口，假装写成功比没有按钮更糟。
 *  3. 选中潜客的状态留在本组件里（原先每次打开抽屉都强制回到首条）：
 *     页内切换是"换一栏看"，不是"重新打开"。切回列表再进来选中的会是首条 ——
 *     这是刻意的：列表视图不持有这层状态，硬记住反而会出现
 *     "明明没点过，却停在上次那条"。
 */

// 列表非空是编译期事实（下面这条是 1.0 搬来的演示语料），索引取首条只为消掉
// noUncheckedIndexedAccess 的可空告警，不做运行时兜底。
const FIRST_LEAD = RECEPTION_LEADS[0] as ReceptionLead;

/** 意向等级 → 胶囊。沿用线索中心既有的三档色板（review / graphic / producing），
 *  不新增色相，也不给「高意向」上红绿褒贬 —— 意向是对人不对事的分级。 */
const INTENT_TAG: Record<ReceptionLead['intent'], LxTagVariant> = {
  high: 'review',
  medium: 'graphic',
  low: 'producing',
};

export function ReceptionPanel({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [activeId, setActiveId] = useState<string>(FIRST_LEAD.id);

  const active = RECEPTION_LEADS.find((lead) => lead.id === activeId) ?? FIRST_LEAD;

  return (
    <section className="lx-section">
      <LxSectionHeader
        title={t('rec.panel.title')}
        sub={t('rec.panel.sub')}
        actions={
          <button type="button" className="lx-section__action lx-focusable" onClick={onBack}>
            <ArrowLeftOutlined />
            {t('opp.action.backToList')}
          </button>
        }
      />

      <div className="lx-glass lx-panel lx-rec lx-rec--inline">
        <div className="lx-rec__cols">
          <aside className="lx-rec__leads">
            <div className="lx-rec__block-title">{t('rec.leads.title')}</div>
            <p className="lx-rec__block-sub">{t('rec.leads.sub')}</p>
            <ul className="lx-rec__leadlist">
              {RECEPTION_LEADS.map((lead) => {
                const selected = lead.id === active.id;
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className={`lx-rec__lead lx-focusable${selected ? ' is-selected' : ''}`}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => setActiveId(lead.id)}
                    >
                      <span className="lx-rec__lead-avatar" aria-hidden="true">
                        {lead.avatarText}
                      </span>
                      <span className="lx-rec__lead-body">
                        <span className="lx-rec__lead-top">
                          <span className="lx-rec__lead-name">{lead.name}</span>
                          <LxTag variant={INTENT_TAG[lead.intent]}>{t(`rec.intent.${lead.intent}`)}</LxTag>
                        </span>
                        <span className="lx-rec__lead-sum">{t(lead.summaryKey)}</span>
                        <span className="lx-rec__lead-meta">
                          {t(lead.marketKey)} · {t(lead.sourceKey)} · {t(lead.waitingKey)}
                        </span>
                      </span>
                      {lead.unread > 0 ? (
                        <span className="lx-rec__unread lx-num" aria-hidden="true">
                          {lead.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="lx-rec__chat">
            <header className="lx-rec__chat-head">
              <div className="lx-rec__chat-headline">
                <div className="lx-rec__chat-title">
                  {active.name} · {t(active.productKey)}
                </div>
                <div className="lx-rec__chat-sub">
                  {t(active.marketKey)} · {t('rec.source.label')}
                  {t(active.sourceKey)} · {t(active.waitingKey)}
                </div>
              </div>
              <button
                type="button"
                className="lx-rec__convert lx-focusable"
                onClick={() => void message.success(`${active.name}：${t('rec.action.convertDone')}`)}
              >
                <UserAddOutlined />
                {t('rec.action.convert')}
              </button>
            </header>

            <div className="lx-rec__msgs">
              {active.conversation.map((item, index) => (
                <div key={index} className={`lx-rec__msg lx-rec__msg--${item.from}`}>
                  <span className="lx-rec__msg-meta">
                    {item.from === 'agent' ? t('rec.agent') : active.name} · {item.time}
                  </span>
                  <span className="lx-rec__bubble">{t(item.textKey)}</span>
                </div>
              ))}
            </div>

            <div className="lx-rec__composer">
              <input
                type="text"
                className="lx-rec__input"
                placeholder={t('rec.composer.placeholder')}
                aria-label={t('rec.composer.placeholder')}
              />
              <button
                type="button"
                className="lx-rec__send lx-focusable"
                onClick={() => void message.success(t('rec.action.sendDone'))}
              >
                {t('rec.action.send')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
