import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Drawer } from 'antd';
import { CheckOutlined, InboxOutlined, PaperClipOutlined } from '@ant-design/icons';
import { LxSectionHeader } from '@lingxi/ui';
import type { FormFieldSpec, FormSection } from './EntityForm';

/**
 * 字段网格（受控）—— 「一段分节 + 若干字段」的渲染器。
 *
 * 为什么从 `EntityForm` 里抽出来：录入（新建页）与编辑（详情页抽屉）**改的是同一批字段**。
 * 抽之前编辑抽屉只能整段复刻字段渲染 JSX（控件类型、必填红标、提示位置、
 * `wide` 独占行、文件拾取区），那是两份必然漂移的代码 —— 改必填校验的提示位置要改两处，
 * 而漏一处的后果是"新建页和编辑页长得不一样"，用户会以为是两个功能。
 *
 * 本组件只管**渲染**与**必填校验**，不碰提交去向：
 *   · `EntityForm` 提交后 `navigate(backTo)` 离开本页；
 *   · `EntityEditDrawer` 提交后关抽屉、留在原页（详情页的编辑不该把人踢走）。
 * 提交动作与成功后去哪由调用方决定，这里只暴露 `validate()`。
 *
 * 版式沿用 `forms.css` 的 `.lx-form__*`：抽屉里挂 `lx-form--compact` 拿到
 * 「标签上·控件下 + auto-fill 多列」，与五张录入页同一套栅格。
 * 抽屉宽 720px，auto-fill(220px) 实测落 2~3 列，不会出现单控件独占一行的空旷。
 */

/** 一段分节的渲染结果。section 自身的标题 / 说明交给调用方的容器（如 LxSectionHeader）。 */
export interface FormSectionRenderProps {
  section: FormSection;
  values: Record<string, string>;
  missing: readonly string[];
  setValue: (name: string, value: string) => void;
}

function FormField({
  field,
  value,
  invalid,
  onChange,
}: {
  field: FormFieldSpec;
  value: string;
  invalid: boolean;
  onChange: (next: string) => void;
}) {
  const { t } = useTranslation();
  const control = `lx-form__control${invalid ? ' is-invalid' : ''}`;
  const inputId = `f-${field.name}`;
  const labelText = field.unitKey ? `${t(field.labelKey)} (${t(field.unitKey)})` : t(field.labelKey);

  return (
    <div className={`lx-field${field.wide ? ' lx-field--wide' : ''}`}>
      <label className="lx-field__label" htmlFor={inputId}>
        {labelText}
        {field.required ? <b className="lx-field__required">*</b> : null}
      </label>

      {/* 只读字段：出纯文本而不是禁用态 input。
          禁用 input 有两个问题：一是**值在里面选不中**（用户想复制客户名做别的事），
          二是禁用控件在表单里普遍被读屏跳过，于是这一格对无障碍树等于不存在。
          纯文本 + `aria-disabled` 的标签把"看得到、动不了"两件事都说到。 */}
      {field.readOnly ? (
        <span className="lx-form__readonly" aria-disabled="true" id={inputId}>
          {value || t('form.readonlyEmpty')}
        </span>
      ) : field.kind === 'file' ? (
        value ? (
          <div className="lx-filepick__file">
            <PaperClipOutlined className="lx-filepick__fileicon" aria-hidden="true" />
            <span className="lx-filepick__filebody">
              <span className="lx-filepick__filename" title={value}>
                {value}
              </span>
              <span className="lx-filepick__filesize">{t('form.file.picked')}</span>
            </span>
            <button
              type="button"
              className="lx-filepick__filebtn lx-focusable"
              onClick={() => onChange('')}
            >
              {t('form.file.reselect')}
            </button>
          </div>
        ) : (
          <label
            className={`lx-filepick__drop lx-focusable${invalid ? ' is-invalid' : ''}`}
            htmlFor={inputId}
          >
            <InboxOutlined className="lx-filepick__icon" aria-hidden="true" />
            <span className="lx-filepick__title">
              {field.placeholderKey ? t(field.placeholderKey) : t('form.file.title')}
            </span>
            <span className="lx-filepick__sub">{t('form.file.sub')}</span>
            <input
              id={inputId}
              type="file"
              className="lx-filepick__input"
              onChange={(event) => onChange(event.target.files?.[0]?.name ?? '')}
            />
          </label>
        )
      ) : field.kind === 'textarea' ? (
        <textarea
          id={inputId}
          className={control}
          rows={field.rows ?? 3}
          value={value}
          placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.kind === 'select' ? (
        <select
          id={inputId}
          className={control}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t('form.selectPlaceholder')}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.labelKey ? t(option.labelKey) : option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          className={control}
          type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
          value={value}
          placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {field.hintKey ? <span className="lx-field__hint">{t(field.hintKey)}</span> : null}
    </div>
  );
}

export function FormSectionGrid({ section, values, missing, setValue }: FormSectionRenderProps) {
  return (
    <div className="lx-form__grid">
      {section.fields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          value={values[field.name] ?? ''}
          invalid={missing.includes(field.name)}
          onChange={(next) => setValue(field.name, next)}
        />
      ))}
    </div>
  );
}

/**
 * 编辑抽屉 —— 详情页右上角「编辑 XX」的落点。
 *
 * 为什么是抽屉而不是跳到录入页：用户是在**看**这个客户/商机时发现某个字段要改，
 * 跳走意味着改完还要自己找回这一页。抽屉留在原地，关掉就是继续看。
 *
 * 与 `EntityForm` 的分工（本组件不重复实现的）：
 *   · 字段清单由调用方给（与该域的录入页同一份 sections）；
 *   · 必填校验复用同一段逻辑（`collectMissing`），提示文案也共用 `form.missing`；
 *   · 提交去向不同：本组件 `onSubmit(values)` 后自动关闭，由调用方决定怎么落数据。
 *
 * `destroyOnHidden` 是必须的：不加的话在 A 客户点编辑、关掉、切到 B 客户再点编辑，
 * 抽屉里还留着 A 的值 —— 演示态没有路由变化能重置它。
 */
export interface FormEditDrawerProps {
  open: boolean;
  onClose: () => void;
  titleKey: string;
  subtitleKey?: string | undefined;
  sections: readonly FormSection[];
  /** 编辑态预填；抽屉每次打开都以此为初值（配 destroyOnHidden，不必考虑重置时机） */
  initialValues: Record<string, string>;
  submitLabelKey: string;
  /** 保存成功的反馈（调用方给语义，如"客户信息已更新"） */
  submitHintKey: string;
  onSubmit: (values: Record<string, string>) => void;
  /** 宽版：字段多、需要 3 列时用（如客户 10 字段 vs 商机 11 字段） */
  wide?: boolean | undefined;
  headerExtra?: ReactNode | undefined;
  /**
   * 追加在字段清单之后、动作条之前的自定义段（2026-10-07 加）。
   *
   * 为什么需要：`FormSection` 表达的是"一段 + 若干**标量**字段"，
   * 而有些东西天生不是标量 —— 联系人清单（可增删的若干行、每行还要能设主）
   * 就是一例。硬塞进 `FormSection` 只能把它做成"一行文本装 JSON"，
   * 那不是简化是降级。
   *
   * 调用方自己管这份数据（本组件不读不写它的值）：抽屉只负责把它渲染在
   * 正确的位置与滚动区域内，故它与必填校验互不干扰。
   */
  children?: ReactNode;
}

export function FormEditDrawer({
  open,
  onClose,
  titleKey,
  subtitleKey,
  sections,
  initialValues,
  submitLabelKey,
  submitHintKey,
  onSubmit,
  wide = false,
  children,
}: FormEditDrawerProps) {
  const { t } = useTranslation();
  // 静态 message 在 App Provider 外不生效，反馈必须走 App.useApp()（技术规约 §4.2）
  const { message } = App.useApp();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [missing, setMissing] = useState<readonly string[]>([]);

  /** 必填校验：与 EntityForm 同一段逻辑、同一个提示 key。 */
  const requiredNames = useMemo(
    () =>
      sections
        .flatMap((section) => section.fields)
        .filter((field) => field.required)
        .map((field) => field.name),
    [sections],
  );

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // 已经填上的字段立刻消掉红标：否则"改好了还是红的"，用户会以为没生效。
    setMissing((prev) => prev.filter((item) => item !== name));
  };

  const submit = () => {
    const blank = requiredNames.filter((name) => (values[name] ?? '').trim() === '');
    if (blank.length > 0) {
      setMissing(blank);
      message.warning(t('form.missing', { count: blank.length }));
      return;
    }
    onSubmit(values);
    message.success(t(submitHintKey));
    onClose();
  };

  return (
    <Drawer
      title={t(titleKey)}
      placement="right"
      width={wide ? 880 : 720}
      open={open}
      onClose={onClose}
      destroyOnHidden
      /* 底部动作条固定：字段多时抽屉要内部滚动，提交按钮若跟着滚走，
         填到一半想保存得先滚回底 —— 那就等于没有保存按钮。 */
      footer={
        <div className="lx-form__foot">
          <button type="button" className="lx-form__cancel lx-focusable" onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button type="button" className="lx-form__submit lx-focusable" onClick={submit}>
            <CheckOutlined />
            {t(submitLabelKey)}
          </button>
        </div>
      }
    >
      {subtitleKey ? (
        <p className="lx-form__drawersub">{subtitleKey ? t(subtitleKey) : null}</p>
      ) : null}
      <div className="lx-form lx-form--compact lx-form--drawer">
        {sections.map((section) => (
          <section key={section.titleKey} className="lx-form__section">
            <LxSectionHeader
              title={t(section.titleKey)}
              sub={section.subKey ? t(section.subKey) : undefined}
            />
            <FormSectionGrid section={section} values={values} missing={missing} setValue={setValue} />
          </section>
        ))}
        {/* 自定义段：不属于任何 section，自带自己的标题 */}
        {children ? <div className="lx-form__section lx-form__section--slot">{children}</div> : null}
      </div>
    </Drawer>
  );
}
