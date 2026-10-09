import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { LxSectionHeader, LxStepper } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 批量导入向导 ImportWizard —— 客户 / 商机 / 线索 三处导入共用。
 *
 * 为什么是"向导"而不是"选个文件就导入"：这三张表的导入都会**部分失败**
 * （公司名重复、国家代码不识别、金额不是数字）。一次性提交再报错，
 * 用户拿不到"哪一行错了、错在哪个字段"的对应关系，只能整批重来。
 * 把过程拆成四步，第二步（字段映射）和第三步（校验结果）就是给这个对应关系用的：
 * 错在第 37 行的"国家/地区"，用户改完这一格重传即可。
 *
 * 四步的顺序不可调换：
 *   选文件 → **字段映射** → 校验 → 确认
 * 映射必须在校验之前 —— 表头不匹配时，校验出来的"国家列全空"是假错，
 * 真相是那一列被映射到了别的字段上。
 *
 * 两个刻意的取舍：
 *  1. **不预演"部分成功"的写入**：确认页只说清"将导入 N 条、跳过 M 条"，
 *     不给"跳过 M 条也要导"之外的选项 —— 三条业务表都有编码唯一约束，
 *     带着错误行硬导只会把脏数据写进去。
 *  2. **模板下载与错误明细下载只给结果反馈**：一期没有文件服务，假装下载成功
 *     比没有按钮更糟；这里明确说明"演示环境不下载文件"。
 *
 * 步骤条允许点回**前序**步骤（改映射后重看校验），不允许跳到未到达的步骤。
 */

export interface ImportField {
  name: string;
  labelKey: string;
  required?: boolean | undefined;
}

export interface ImportIssue {
  /** 源文件行号（含表头偏移后的真实行号） */
  row: number;
  fieldKey: string;
  reasonKey: string;
}

/**
 * 源文件表头（如"企业名称"）。
 *
 * 它其实是**数据**：那是客户那份 Excel 里真实写着的字，不是我们的文案。
 * 但门禁（附录D 规则 10）只认「源码里非注释的中文一律走 i18n key」，
 * 不给"数据"留口子——这个口子一开，真文案就会顺路混进来。
 * 所以这里存 key、由调用方的 `t()` 渲染：中文态看到的是源表原文，
 * 英文态看到的是英文表头（一份英文区用的存量表）。源表头与目标字段
 * **刻意不同名**（"企业名称" vs "客户名称"），否则字段映射这一步就是白送的。
 */
export interface ImportSourceColumn {
  labelKey: string;
}

export interface ImportWizardProps {
  titleKey: string;
  subtitleKey: string;
  backTo: string;
  backLabelKey: string;
  /** 演示文件名（含扩展名，如 `天能-客户导入模板-2026Q3.xlsx`）——同上，走 key。 */
  fileNameKey: string;
  fileSize: string;
  sourceColumns: readonly ImportSourceColumn[];
  fields: readonly ImportField[];
  okCount: number;
  issues: readonly ImportIssue[];
  /** 右侧说明（去重口径、编码规则一类） */
  noteKey: string;
}

export function ImportWizard({
  titleKey,
  subtitleKey,
  backTo,
  backLabelKey,
  fileNameKey,
  fileSize,
  sourceColumns,
  fields,
  okCount,
  issues,
  noteKey,
}: ImportWizardProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(false);

  /** 源列 → 目标字段，默认按列序对齐（真实系统靠表头相似度猜，这里给同一份结果）。 */
  const [mapping, setMapping] = useState<readonly string[]>(() =>
    sourceColumns.map((_column, index) => fields[index]?.name ?? ''),
  );

  const steps = useMemo(
    () => [t('imp.step.file'), t('imp.step.mapping'), t('imp.step.check'), t('imp.step.confirm')],
    [t],
  );

  const mappedCount = mapping.filter(Boolean).length;
  const totalCount = okCount + issues.length;

  const pick = () => {
    setPicked(true);
  };

  const next = () => {
    if (step === 0 && !picked) {
      message.warning(t('imp.pickFirst'));
      return;
    }
    if (step === 1 && mappedCount < fields.filter((field) => field.required).length) {
      message.warning(t('imp.mapIncomplete'));
      return;
    }
    if (step === 3) {
      message.success(t('imp.done', { count: okCount }));
      void navigate(backTo);
      return;
    }
    setStep((prev) => prev + 1);
  };

  return (
    <PageContainer titleKey={titleKey} subtitleKey={subtitleKey}>
      <div className="lx-imp">
        <div className="lx-imp__topbar">
          <button
            type="button"
            className="lx-chip lx-focusable"
            onClick={() => void navigate(backTo)}
          >
            <ArrowLeftOutlined />
            {t(backLabelKey)}
          </button>
          <span className="lx-imp__note">{t(noteKey)}</span>
        </div>

        <LxStepper steps={steps} active={step} onChange={(index) => setStep(index < step ? index : step)} />

        {step === 0 ? (
          <section className="lx-glass lx-panel lx-imp__panel">
            <LxSectionHeader title={t('imp.file.title')} sub={t('imp.file.sub')} />
            {picked ? (
              <div className="lx-filepick__file">
                <FileExcelOutlined className="lx-filepick__fileicon" aria-hidden="true" />
                <span className="lx-filepick__filebody">
                  <span className="lx-filepick__filename">{t(fileNameKey)}</span>
                  <span className="lx-filepick__filesize">
                    {fileSize} · {t('imp.file.columns', { count: sourceColumns.length })}
                  </span>
                </span>
                <button
                  type="button"
                  className="lx-filepick__filebtn lx-focusable"
                  onClick={() => {
                    setPicked(false);
                  }}
                >
                  {t('imp.file.reselect')}
                </button>
              </div>
            ) : (
              <button type="button" className="lx-filepick__drop lx-focusable" onClick={pick}>
                <InboxOutlined className="lx-filepick__icon" aria-hidden="true" />
                <span className="lx-filepick__title">{t('imp.file.dropTitle')}</span>
                <span className="lx-filepick__sub">{t('imp.file.dropSub')}</span>
              </button>
            )}
            <div className="lx-imp__filefoot">
              <button
                type="button"
                className="lx-imp__ghost lx-focusable"
                onClick={() => {
                  message.info(t('imp.templateDemo'));
                }}
              >
                <DownloadOutlined />
                {t('imp.file.template')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="lx-glass lx-panel lx-imp__panel">
            <LxSectionHeader title={t('imp.map.title')} sub={t('imp.map.sub')} />
            <ul className="lx-imp__maplist">
              {fields.map((field, index) => (
                <li key={field.name} className="lx-imp__maprow">
                  <span className="lx-imp__maplabel">
                    {t(field.labelKey)}
                    {field.required ? <b className="lx-field__required">*</b> : null}
                  </span>
                  <span className="lx-imp__maparrow" aria-hidden="true">
                    ←
                  </span>
                  <select
                    className="lx-form__control lx-imp__mapselect"
                    value={mapping[index] ?? ''}
                    aria-label={t('imp.map.source', { field: t(field.labelKey) })}
                    onChange={(event) =>
                      setMapping((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))
                    }
                  >
                    <option value="">{t('imp.map.ignore')}</option>
                    {sourceColumns.map((column) => (
                      <option key={column.labelKey} value={column.labelKey}>
                        {t(column.labelKey)}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="lx-glass lx-panel lx-imp__panel">
            <LxSectionHeader title={t('imp.check.title')} sub={t('imp.check.sub')} />
            <div className="lx-imp__stats">
              <span className="lx-imp__stat is-ok">
                <b className="lx-num">{okCount}</b>
                {t('imp.check.ok')}
              </span>
              <span className={`lx-imp__stat${issues.length > 0 ? ' is-bad' : ''}`}>
                <b className="lx-num">{issues.length}</b>
                {t('imp.check.bad')}
              </span>
              <span className="lx-imp__stat">
                <b className="lx-num">{totalCount}</b>
                {t('imp.check.total')}
              </span>
            </div>

            {issues.length > 0 ? (
              <table className="lx-imp__table">
                <thead>
                  <tr>
                    <th>{t('imp.check.colRow')}</th>
                    <th>{t('imp.check.colField')}</th>
                    <th>{t('imp.check.colReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={`${issue.row}-${issue.fieldKey}`}>
                      <td className="lx-num">{issue.row}</td>
                      <td>{t(issue.fieldKey)}</td>
                      <td className="lx-imp__reason">{t(issue.reasonKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="lx-imp__clean">{t('imp.check.clean')}</p>
            )}
          </section>
        ) : null}

        {step === 3 ? (
          <section className="lx-glass lx-panel lx-imp__panel">
            <LxSectionHeader title={t('imp.confirm.title')} sub={t('imp.confirm.sub')} />
            <ul className="lx-imp__summary">
              <li>
                <span>{t('imp.confirm.source')}</span>
                <b>{t(fileNameKey)}</b>
              </li>
              <li>
                <span>{t('imp.confirm.import')}</span>
                <b className="lx-num">{okCount}</b>
              </li>
              <li>
                <span>{t('imp.confirm.skip')}</span>
                <b className="lx-num">{issues.length}</b>
              </li>
              <li>
                <span>{t('imp.confirm.mapped')}</span>
                <b className="lx-num">{mappedCount}</b>
              </li>
            </ul>
            <p className="lx-imp__warn">{t('imp.confirm.warn')}</p>
          </section>
        ) : null}

        <div className="lx-imp__foot">
          <button
            type="button"
            className="lx-imp__ghost lx-focusable"
            disabled={step === 0}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          >
            {t('imp.prev')}
          </button>
          <button type="button" className="lx-form__submit lx-focusable" onClick={next}>
            {step === 3 ? <CloudUploadOutlined /> : null}
            {step === 3 ? t('imp.submit') : t('imp.next')}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
