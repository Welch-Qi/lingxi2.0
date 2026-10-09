import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseOutlined, SendOutlined } from '@ant-design/icons';

/**
 * 工作台右上角的智能体悬浮入口 —— 今日要点播报。
 *
 * 为什么从横占一整行的「今日要点」区块搬到这里：那是「知道就好、不必立刻动手」的信息，
 * 却和首屏「先看盘面」的主线争同一块位置。收进一个随时可唤起的入口后，
 * 首屏让位给关键指标，需要时一键展开。
 *
 * 面板内分「行业要点 / 企业要点」两组，纵向自动滚动播报；鼠标悬停即暂停——
 * 滚动播报的目的是让人扫到，而真的要读某一条时必须能停下来读。
 * 底部留输入框：看到要点后紧接着的追问不该被丢到另一个页面去。
 *
 * 文案一律走 i18n key（附录D 规则10），数据只存 id 与所属组。
 */

type PointScope = 'trade' | 'company';

interface PointSpec {
  /** 存完整 key 而非 `${id}` 拼接：i18n 门禁按字面量采集（`*Key: 'x'`），
   *  拼接会让它退化成族匹配——族在、个别词条缺时门禁照样报通过。 */
  textKey: string;
  metaKey: string;
  scope: PointScope;
}

/** 两组各自的条目。顺序即播报顺序：先行业（外部环境），后企业（内部盘面）。 */
const POINTS: readonly PointSpec[] = [
  { textKey: 'wb.point.t1.text', metaKey: 'wb.point.t1.meta', scope: 'trade' },
  { textKey: 'wb.point.t2.text', metaKey: 'wb.point.t2.meta', scope: 'trade' },
  { textKey: 'wb.point.t3.text', metaKey: 'wb.point.t3.meta', scope: 'trade' },
  { textKey: 'wb.point.t4.text', metaKey: 'wb.point.t4.meta', scope: 'trade' },
  { textKey: 'wb.point.c1.text', metaKey: 'wb.point.c1.meta', scope: 'company' },
  { textKey: 'wb.point.c2.text', metaKey: 'wb.point.c2.meta', scope: 'company' },
  { textKey: 'wb.point.c3.text', metaKey: 'wb.point.c3.meta', scope: 'company' },
  { textKey: 'wb.point.c4.text', metaKey: 'wb.point.c4.meta', scope: 'company' },
];

const SCOPES = [
  { id: 'trade', labelKey: 'wb.dock.group.trade' },
  { id: 'company', labelKey: 'wb.dock.group.company' },
] as const;

export function PointsDock() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  /** 点面板外或按 Esc 关闭：浮层不挡页面其他操作的前提是它能被随手关掉。 */
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /** 播报流：组标签与条目拍平成一个序列，复制两份以实现无缝循环。 */
  const items = useMemo(() => {
    const nodes: ReactNode[] = [];
    SCOPES.forEach((scope) => {
      nodes.push(
        <div key={`${scope.id}-label`} className="lx-dock__grouplabel">
          {t(scope.labelKey)}
        </div>,
      );
      POINTS.filter((point) => point.scope === scope.id).forEach((point) => {
        nodes.push(
          <div key={point.textKey} className="lx-dock__item">
            <span className={`lx-dock__dot lx-dock__dot--${scope.id}`} />
            <span className="lx-dock__body">
              <span className="lx-dock__text">{t(point.textKey)}</span>
              <span className="lx-dock__meta">{t(point.metaKey)}</span>
            </span>
          </div>,
        );
      });
    });
    return nodes;
  }, [t]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    setSent(text);
    setDraft('');
  };

  return (
    <div className="lx-dock" ref={rootRef}>
      <button
        type="button"
        className={`lx-dock__fab lx-focusable${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={t('wb.dock.open')}
        title={t('wb.dock.open')}
        onClick={() => setOpen((prev) => !prev)}
      >
        {/* 用 Sage（经营分析智能体）的头像，不用通用机器人字形：
            入口一望即知"点开是谁在说话"，与经营分析页的智能分析入口、
            面板内的标识是同一张脸。 */}
        <img className="lx-dock__fabimg" src="/images/agent-analyst.png" alt="" decoding="async" />
        <span className="lx-dock__count">{POINTS.length}</span>
      </button>

      {open ? (
        <div className="lx-dock__panel" role="dialog" aria-label={t('wb.dock.title')}>
          <div className="lx-dock__head">
            <span className="lx-dock__headmain">
              <span className="lx-dock__avatar">
                <img src="/images/agent-analyst.png" alt="" loading="lazy" decoding="async" />
              </span>
              <span className="lx-dock__ident">
                <span className="lx-dock__title">{t('wb.dock.title')}</span>
                <span className="lx-dock__sub">{t('wb.dock.sub')}</span>
              </span>
            </span>
            <button
              type="button"
              className="lx-dock__close lx-focusable"
              aria-label={t('wb.dock.close')}
              title={t('wb.dock.close')}
              onClick={() => setOpen(false)}
            >
              <CloseOutlined />
            </button>
          </div>

          <div className="lx-dock__reel">
            <div className="lx-dock__track">
              <div className="lx-dock__cycle">{items}</div>
              {/* 第二份只为实现无缝循环，读屏时不应重复播报 */}
              <div className="lx-dock__cycle" aria-hidden="true">
                {items}
              </div>
            </div>
          </div>

          <form className="lx-dock__ask" onSubmit={submit}>
            <input
              className="lx-dock__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('wb.dock.placeholder')}
              aria-label={t('wb.dock.placeholder')}
            />
            <button type="submit" className="lx-dock__send lx-focusable" disabled={!draft.trim()}>
              <SendOutlined />
              <span>{t('wb.dock.send')}</span>
            </button>
          </form>

          {sent ? (
            <div className="lx-dock__sent" role="status">
              {t('wb.dock.sent')}
              <b>{sent}</b>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
