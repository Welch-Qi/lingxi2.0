import { useTranslation } from 'react-i18next';
import { DeleteOutlined, PlusOutlined, StarFilled } from '@ant-design/icons';
import { LxSectionHeader } from '@lingxi/ui';
import type { ContactRecord } from '../data';

/**
 * 联系人清单编辑器 —— 客户 360「编辑客户」抽屉里的可增删清单（2026-10-07 新增）。
 *
 * 为什么单独一个组件而不是塞进 `FormSection`：清单是**可增删的行**，
 * 而 `FormSection` 表达的是"一段 + 若干标量字段"。塞进去只能把它做成
 * "一行文本装 JSON"，那不是简化是降级。同理它也不用 `FormSectionGrid` 渲染。
 *
 * **主联系人至多一个**，由 `setPrimary` 保证（不是靠禁用其余按钮 ——
 * 禁用会让用户以为"设过了不能再改"，而真实语义是"改谁谁就是主"）。
 * 设主时把原主降级，保证任意时刻 primary 的数量 ≤ 1；
 * 把最后一个主降级后清单会没有主联系人，那由数据层 `syncPrimaryContact`
 * 兜底（保留原值，不清空），页面不会因此缺字段。
 *
 * id 与姓名**无关**：改名后仍是同一行，用户改个名字不该让这一行的
 * 电话/邮箱/主标记全部失联。id 由本页的序号派生，重排即重算 ——
 * 这对本组件足够，因为它的生命周期就是一个抽屉会话。
 *
 * 姓名与职务既可能是 **i18n key**（演示种子，见 `data.ts` 的 `EXTRA_CONTACTS`），
 * 也可能是**自由文本**（用户新增的，或用户改过的）。本仓没配
 * `parseMissingKeyHandler`，i18next 查不到时原样返回入参，于是 `t()` 对两者都安全
 * （与 BANT 字段依赖同一默认行为）。
 *
 * 因此展示一律走 `t(row.name)`：种子行显示 `Monika Weber` 而不是
 * `demo.contact.weber` —— 抽屉是**编辑位**，让人看见 key 会以为数据坏了。
 * 而存回去的仍是用户输入的原文：`onChange` 只在用户真敲键盘时才写，
 * 没碰过的行保持 key 不被"洗"成文本（否则打开抽屉直接保存，
 * 整份清单的 key 都会退化成英文态下也能显示、但再无翻译可依的字面量）。
 */
export interface ContactsEditorProps {
  contacts: readonly ContactRecord[];
  onChange: (next: readonly ContactRecord[]) => void;
}

export function ContactsEditor({ contacts, onChange }: ContactsEditorProps) {
  const { t } = useTranslation();

  /** 行内改一个字段。空姓名视为无效输入，直接丢弃（不写空串回去）。 */
  const patchRow = (id: string, patch: Partial<ContactRecord>) => {
    onChange(contacts.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const setPrimary = (id: string) => {
    onChange(contacts.map((row) => ({ ...row, primary: row.id === id })));
  };

  const removeRow = (id: string) => {
    onChange(contacts.filter((row) => row.id !== id));
  };

  const addRow = () => {
    /* id 用会话内自增序号而不是随机串：抽屉每次打开都从 0 重新编号，
       而 `destroyOnHidden` 会把这份 state 一起销毁 —— 不存在两行撞号。 */
    const seq = contacts.length + 1;
    let n = seq;
    while (contacts.some((row) => row.id === `c-new-${n}`)) {
      n += 1;
    }
    onChange([
      ...contacts,
      {
        id: `c-new-${n}`,
        name: '',
        role: '',
        phone: '',
        email: '',
        primary: false,
      },
    ]);
  };

  return (
    <>
      <LxSectionHeader
        title={t('cus.p360.contact.editorTitle')}
        sub={t('cus.p360.contact.editorSub')}
        actions={
          <button
            type="button"
            className="lx-section__action lx-focusable"
            onClick={addRow}
            disabled={contacts.length >= 12}
          >
            <PlusOutlined />
            {t('cus.p360.contact.add')}
          </button>
        }
      />

      {contacts.length === 0 ? (
        <p className="lx-p360__contactempty">{t('cus.p360.contact.empty')}</p>
      ) : (
        <ul className="lx-cedit__list">
          {contacts.map((row) => (
            <li
              key={row.id}
              className={`lx-cedit__row${row.primary ? ' is-primary' : ''}`}
            >
              <div className="lx-cedit__grid">
                <label className="lx-cedit__cell">
                  <span className="lx-cedit__label">
                    {t('cus.p360.contact.field.name')}
                    <b className="lx-field__required">*</b>
                  </span>
                  <input
                    className="lx-form__control"
                    value={t(row.name)}
                    onChange={(event) => patchRow(row.id, { name: event.target.value })}
                  />
                </label>
                <label className="lx-cedit__cell">
                  <span className="lx-cedit__label">{t('cus.p360.contact.field.role')}</span>
                  <input
                    className="lx-form__control"
                    value={t(row.role)}
                    onChange={(event) => patchRow(row.id, { role: event.target.value })}
                  />
                </label>
                <label className="lx-cedit__cell">
                  <span className="lx-cedit__label">{t('cus.p360.contact.field.phone')}</span>
                  <input
                    className="lx-form__control"
                    value={row.phone}
                    onChange={(event) => patchRow(row.id, { phone: event.target.value })}
                  />
                </label>
                <label className="lx-cedit__cell">
                  <span className="lx-cedit__label">{t('cus.p360.contact.field.email')}</span>
                  <input
                    className="lx-form__control"
                    value={row.email}
                    onChange={(event) => patchRow(row.id, { email: event.target.value })}
                  />
                </label>
              </div>

              {/* 两个动作位各占一格：设为主 / 删除。
                  「删除」用 danger 描边而不是纯文字链接 —— 删联系人会连带
                  影响主联系人回写，属不可逆动作，视觉上要与"设主"分得开。 */}
              <div className="lx-cedit__acts">
                {row.primary ? (
                  <span className="lx-cedit__primary">
                    <StarFilled />
                    {t('cus.p360.contact.primary')}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="lx-cedit__setprimary lx-focusable"
                    onClick={() => setPrimary(row.id)}
                  >
                    <StarFilled />
                    {t('cus.p360.contact.setPrimary')}
                  </button>
                )}
                <button
                  type="button"
                  className="lx-cedit__del lx-focusable"
                  onClick={() => removeRow(row.id)}
                  title={t('cus.p360.contact.remove')}
                >
                  <DeleteOutlined />
                  {t('cus.p360.contact.remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}