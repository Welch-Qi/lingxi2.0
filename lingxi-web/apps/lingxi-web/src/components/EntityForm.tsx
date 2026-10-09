import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { LxSectionHeader } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';
import { FormSectionGrid } from '@/components/FormSections';

/**
 * 录入表单页壳 EntityForm —— 客户 / 商机 / 线索 / 商品 / 内容 五处的"新建"共用一套骨架。
 *
 * 为什么抽成 schema 驱动而不是各写一份 JSX：五张表单的**版式与交互完全一致**
 * （分节、两列栅格、必填标记、取消/提交、成功回列表），差异只在字段清单。
 * 各写一份的结果是五种"差不多的表单"，改一处（比如必填校验的提示位置）要改五遍，
 * 而且用户会在五个页面里看到五种间距。字段清单是数据，版式是规则 —— 规则只有一份。
 *
 * 三条约定的来由：
 *  1. **提交后回列表页**，不用"保存并继续"：这五个录入动作的业务频率都是"一次录一条"，
 *     留在空表单上只会让人以为没保存成功。成功反馈用 message 明确说清去了哪。
 *  2. **必填校验是提交时统一做**，不做失焦即校验：录一条客户要 4 个字段，
 *     边填边红会让整页在填完前一直是"错"的状态。
 *  3. **`wide` 字段独占一行**：备注、地址这类长文本挤在半栏里，用户看不到自己在写什么。
 *
 * 日期用原生 `<input type="date">`：它随浏览器区域格式化（不随应用语言），
 * 属已知限制 —— 与仓内其它日期录入保持一致，不为此单独引入日期组件。
 *
 * `file` 是唯一有副作用的字段类型（素材上传、内容上传用）：它渲染的是
 * `ImportWizard` 里同一套文件拾取区（`.lx-filepick__*`），选中的文件名进 values，
 * 于是"必填"校验对文件字段与文本字段是同一条逻辑，不必为它单开一支。
 * 一期没有文件服务，文件名是唯一留痕；接入后把 `onChange` 里的 name 换成上传返回的 URL 即可。
 */

export type FormFieldKind = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';

export interface FormFieldOption {
  value: string;
  /** 展示文案的 i18n key；与 `label` 二选一 */
  labelKey?: string | undefined;
  /**
   * 直接展示的文案。只给**不翻译的数据**用 —— SKU、品名这类专名
   * （与 `data.ts`「品名是专有名词，不翻译」同一条约定）。
   * 面向用户的文案一律走 `labelKey`：写死中文的值过不了
   * check-i18n 的「en 值含中文」检查。
   */
  label?: string | undefined;
}

export interface FormFieldSpec {
  name: string;
  labelKey: string;
  kind: FormFieldKind;
  required?: boolean | undefined;
  /** 输入框占位文案；`kind=file` 时当作拾取区的主文案（"上传主图"之类） */
  placeholderKey?: string | undefined;
  hintKey?: string | undefined;
  options?: readonly FormFieldOption[] | undefined;
  /** 文本域行数（仅 kind=textarea） */
  rows?: number | undefined;
  /** 独占整行（长文本 / 备注） */
  wide?: boolean | undefined;
  /**
   * 单位 i18n key（如 `prd.unit.kwh`）。展示时附到标签后：`容量 (kWh)`。
   * 走标签而非额外列，避免破坏 compact 变体「标签上·控件下」的 4 列栅格。
   */
  unitKey?: string | undefined;
  /**
   * 只读展示：出**纯文本**而非输入控件，且不参与必填校验（2026-10-07 加）。
   *
   * 为什么需要它：编辑抽屉里有两类字段 —— 可改的与"不可改但要看得见"的。
   * 之前后一类只有两种处理，都不对：
   *   · **整字段裁掉**：抽屉里看不到「所属客户」，用户会以为这条商机没有客户
   *     （本轮用户反馈"点击编辑后未展示客户信息"就是这一条）；
   *   · **留一个 input 但不写回**：用户能改，改了却不生效 —— 那是撒谎的控件，
   *     比不给控件更糟。
   * `readOnly` 明确表达"这里看得到、动不了"，控件禁用态另给视觉说明（见文案 `form.readonlyHint`）。
   *
   * 读屏与键盘：纯文本节点不进 Tab 序列（它不是交互元素），
   * 标签仍渲染并带 `aria-disabled` 说明不可编辑。
   */
  readOnly?: boolean | undefined;
}

export interface FormSection {
  titleKey: string;
  subKey?: string | undefined;
  fields: readonly FormFieldSpec[];
}

export interface EntityFormProps {
  titleKey: string;
  subtitleKey: string;
  /** 取消与保存成功后回到哪里 */
  backTo: string;
  backLabelKey: string;
  /**
   * 静态字段清单。当提供 `sectionsResolver` 时本项可被忽略（解析器完全接管 sections）。
   * 仍保留为可选以便其余四张录入页维持原调用方式。
   */
  sections?: readonly FormSection[] | undefined;
  submitLabelKey: string;
  /** 保存成功后的反馈（说明去了哪） */
  submitHintKey: string;
  /**
   * 动态 sections 解析器：按当前表单值返回 sections。
   * 用于「选了类目 → 规格段换成该类目属性模板字段」这类联动。
   * 提供时，渲染与提交校验都以解析结果为准。
   */
  sectionsResolver?: ((values: Record<string, string>) => readonly FormSection[]) | undefined;
  /**
   * 初始值（编辑态预填基础字段，含类目 → 触发对应属性段）。
   * 一期演示数据只覆盖基础字段；属性模板尚无持久化值，留空由用户填。
   */
  initialValues?: Record<string, string> | undefined;
  /**
   * 版式变体。
   *  - `default`：2 列堆叠、控件 width:100%（其余表单维持原样）；
   *  - `compact`：限宽 1080px 居中成「一块」、section 补内边距（治贴边）、字段改
   *    「标签上·控件下」4 列自适应栅格（宽屏 4 列 / 中屏 3 列），五张录入页共用。
   */
  variant?: 'default' | 'compact' | undefined;
  /** 页头右上角自定义节点（如商品编辑页的「管理 SKU」入口）。 */
  headerExtra?: ReactNode | undefined;
  /**
   * 正文**末尾**的自定义节点，在提交按钮之前（2026-10-07 加）。
   *
   * 为什么不复用 `headerExtra`：那一位是**页面级**的导航入口（去另一个页面），
   * 而商品编辑页的素材管理是**本表单的一部分** —— 它改的是这个商品自己的素材与主图，
   * 放在页头会被读成"跳去素材库"，而它其实是就地管理。
   * 两处语义不同，位置不同才不会被误读。
   */
  footerExtra?: ReactNode | undefined;
}

export function EntityForm({
  titleKey,
  subtitleKey,
  backTo,
  backLabelKey,
  sections,
  submitLabelKey,
  submitHintKey,
  variant = 'default',
  headerExtra,
  footerExtra,
  sectionsResolver,
  initialValues,
}: EntityFormProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [missing, setMissing] = useState<readonly string[]>([]);

  /* 动态 sections：给了 resolver 就按当前值算，否则用静态 sections（缺省空数组）。 */
  const baseSections = sections ?? [];
  const resolvedSections = sectionsResolver ? sectionsResolver(values) : baseSections;

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // 已经填上的字段立刻消掉红标，不必等下次提交 —— 否则"改好了还是红的"，
    // 用户会以为改动没生效。
    setMissing((prev) => prev.filter((item) => item !== name));
  };

  const submit = () => {
    const required = resolvedSections
      .flatMap((section) => section.fields)
      .filter((field) => field.required)
      .map((field) => field.name)
      .filter((name) => (values[name] ?? '').trim() === '');
    if (required.length > 0) {
      setMissing(required);
      message.warning(t('form.missing', { count: required.length }));
      return;
    }
    message.success(t(submitHintKey));
    void navigate(backTo);
  };

  return (
    <PageContainer titleKey={titleKey} subtitleKey={subtitleKey}>
      <div className={`lx-form${variant === 'compact' ? ' lx-form--compact' : ''}`}>
        <div className="lx-form__top">
          <button
            type="button"
            className="lx-chip lx-form__back lx-focusable"
            onClick={() => void navigate(backTo)}
          >
            <ArrowLeftOutlined />
            {t(backLabelKey)}
          </button>
          {headerExtra ? <div className="lx-form__top-extra">{headerExtra}</div> : null}
        </div>

        {resolvedSections.map((section) => (
          <section key={section.titleKey} className="lx-glass lx-panel lx-form__section">
            <LxSectionHeader title={t(section.titleKey)} sub={section.subKey ? t(section.subKey) : undefined} />
            {/* 字段渲染委托给 FormSectionGrid —— 与详情页的编辑抽屉（`FormEditDrawer`）
                共用同一份实现。同一批字段在「新建」与「编辑」两处必须长得一样，
                各自写一份 JSX 的话，改必填红标位置这类事要改两遍且迟早漏一处。 */}
            <FormSectionGrid
              section={section}
              values={values}
              missing={missing}
              setValue={setValue}
            />
          </section>
        ))}

        {footerExtra ? <div className="lx-form__footextra">{footerExtra}</div> : null}

        <div className="lx-form__foot">
          <button
            type="button"
            className="lx-form__cancel lx-focusable"
            onClick={() => void navigate(backTo)}
          >
            {t('form.cancel')}
          </button>
          <button type="button" className="lx-form__submit lx-focusable" onClick={submit}>
            <CheckOutlined />
            {t(submitLabelKey)}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
