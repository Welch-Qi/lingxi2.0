import {
  ImportWizard,
  type ImportField,
  type ImportIssue,
  type ImportSourceColumn,
} from '@/components/ImportWizard';

/**
 * 导入客户（`/customer/import`）—— 存量客户批量入库。
 *
 * 为什么必须走四步向导而不是"选文件就导"：客户表有**客户编码唯一约束**，
 * 而存量表格里的重复是常态（同一家公司在两个展会各被录过一次）。
 * 一次性提交再报错，用户拿不到"第 41 行为什么被跳过"，
 * 只能把 60 行重传一遍 —— 向导的第二步（字段映射）与第三步（校验明细）就是给这个对应关系的。
 *
 * 映射步骤不是形式：存量表的表头五花八门（"企业名称" / "公司名" / "Customer"），
 * 表头猜错时校验结果会全是"国家列为空"——**假错**，真相是那一列被映射到了别的字段。
 * 所以映射在校验之前，且必须由人确认。
 *
 * 演示数据刻意包含三类失败，覆盖存量数据的三种典型脏法：
 *   行 37 国家代码不识别（写成 "Germany" 而不是 DE）、
 *   行 41 客户编码与库内重复、行 52 联系电话格式不合法。
 * 三类都出现在同一份文件里，是为了让"部分成功"这条路被真正走一遍 ——
 * 只演示全成功，用户上线后第一次遇到部分失败就不知道该怎么办。
 *
 * 静态骨架：确认后只给结果反馈，接入后走 POST /api/v1/cus/customers/import。
 */

/** 映射目标字段与被校验字段是同一份清单：校验明细里的"字段"列直接取它们的标签。 */
const FIELDS: readonly ImportField[] = [
  { name: 'name', labelKey: 'cus.col.name', required: true },
  { name: 'code', labelKey: 'cus.new.field.code' },
  { name: 'countryKey', labelKey: 'cus.col.country', required: true },
  { name: 'city', labelKey: 'cus.col.city' },
  { name: 'contact', labelKey: 'cus.col.contact' },
  { name: 'phone', labelKey: 'cus.imp.field.phone' },
  { name: 'type', labelKey: 'cus.col.type', required: true },
  { name: 'tier', labelKey: 'cus.new.field.tier' },
  { name: 'industryKey', labelKey: 'cus.new.field.industry' },
  { name: 'sourceKey', labelKey: 'cus.new.field.source' },
  { name: 'ownerKey', labelKey: 'cus.col.owner' },
];

/** 源文件表头（演示值，与 FIELDS 一一对应）。
 *  写成 key 而不是中文字面量：门禁不给"演示数据"开中文口子（见 ImportWizard 的
 *  `ImportSourceColumn` 注释）。这些表头与上面的目标字段**刻意不同名**
 *  （"企业名称" vs "客户名称"、"来源" vs "客户来源"），映射这一步才不是在白送。 */
const SOURCE_COLUMNS: readonly ImportSourceColumn[] = [
  { labelKey: 'cus.imp.src.name' },
  { labelKey: 'cus.imp.src.code' },
  { labelKey: 'cus.imp.src.country' },
  { labelKey: 'cus.imp.src.city' },
  { labelKey: 'cus.imp.src.contact' },
  { labelKey: 'cus.imp.src.phone' },
  { labelKey: 'cus.imp.src.type' },
  { labelKey: 'cus.imp.src.tier' },
  { labelKey: 'cus.imp.src.industry' },
  { labelKey: 'cus.imp.src.source' },
  { labelKey: 'cus.imp.src.owner' },
];

const ISSUES: readonly ImportIssue[] = [
  { row: 37, fieldKey: 'cus.col.country', reasonKey: 'cus.imp.reason.country' },
  { row: 41, fieldKey: 'cus.new.field.code', reasonKey: 'cus.imp.reason.dup' },
  { row: 52, fieldKey: 'cus.imp.field.phone', reasonKey: 'cus.imp.reason.phone' },
];

export default function CustomerImportPage() {
  return (
    <ImportWizard
      titleKey="cus.imp.title"
      subtitleKey="cus.imp.subtitle"
      backTo="/customer"
      backLabelKey="cus.back.list"
      fileNameKey="cus.imp.file"
      fileSize="28 KB"
      sourceColumns={SOURCE_COLUMNS}
      fields={FIELDS}
      okCount={38}
      issues={ISSUES}
      noteKey="cus.imp.note"
    />
  );
}
