import {
  ImportWizard,
  type ImportField,
  type ImportIssue,
  type ImportSourceColumn,
} from '@/components/ImportWizard';

/**
 * 导入商机（`/opportunity/import`）—— 存量商机批量入库（试点客户 / 历史在谈单）。
 *
 * 与客户导入的关键差别：商机表带着**金额**，而金额的脏法是所有字段里最贵的一种 ——
 * "1,200,000" 与 "1200000" 混着来、写成 "120万"、带货币符号、
 * 甚至用小数点表示千位（欧洲习惯的 "1.200.000"）。
 * 所以校验明细里金额的失败必须**逐行给出**，不能汇总成"3 行金额异常"：
 * 修的人要按行去源表里改，给不出行号等于让他自己找。
 *
 * 「所属客户」只校验**存在性**（能在客户库里按编码找到），不校验其它：
 * 商机挂在谁的账下是业务判断，导入不替业务做决定；但挂到不存在的客户下是数据错误，
 * 这一条必须拦住，否则这条商机在客户 360 里永远不出现。
 *
 * 演示数据覆盖两种失败：行 09 客户编码在客户库里找不到、行 14 金额不是数字。
 *
 * 静态骨架：确认后只给结果反馈，接入后走 POST /api/v1/cus/opportunities/import。
 */

const FIELDS: readonly ImportField[] = [
  { name: 'name', labelKey: 'opp.new.field.name', required: true },
  { name: 'customerCode', labelKey: 'opp.imp.field.customer', required: true },
  { name: 'productSku', labelKey: 'opp.col.product' },
  { name: 'stage', labelKey: 'opp.col.stage', required: true },
  { name: 'intent', labelKey: 'cus.col.intent' },
  { name: 'amount', labelKey: 'opp.new.field.amount' },
  { name: 'expectedClose', labelKey: 'opp.new.field.expectedClose' },
  { name: 'ownerKey', labelKey: 'opp.col.owner' },
];

/** 源文件表头（演示值）。中文字面量改走 key 的原因同 `cus/import.tsx`。 */
const SOURCE_COLUMNS: readonly ImportSourceColumn[] = [
  { labelKey: 'opp.imp.src.name' },
  { labelKey: 'opp.imp.src.customer' },
  { labelKey: 'opp.imp.src.product' },
  { labelKey: 'opp.imp.src.stage' },
  { labelKey: 'opp.imp.src.intent' },
  { labelKey: 'opp.imp.src.amount' },
  { labelKey: 'opp.imp.src.expectedClose' },
  { labelKey: 'opp.imp.src.owner' },
];

const ISSUES: readonly ImportIssue[] = [
  { row: 9, fieldKey: 'opp.imp.field.customer', reasonKey: 'opp.imp.reason.customer' },
  { row: 14, fieldKey: 'opp.new.field.amount', reasonKey: 'opp.imp.reason.amount' },
];

export default function OpportunityImportPage() {
  return (
    <ImportWizard
      titleKey="opp.imp.title"
      subtitleKey="opp.imp.subtitle"
      backTo="/opportunity"
      backLabelKey="opp.back.list"
      fileNameKey="opp.imp.file"
      fileSize="96 KB"
      sourceColumns={SOURCE_COLUMNS}
      fields={FIELDS}
      okCount={44}
      issues={ISSUES}
      noteKey="opp.imp.note"
    />
  );
}
