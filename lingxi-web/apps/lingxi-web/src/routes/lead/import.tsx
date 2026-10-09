import {
  ImportWizard,
  type ImportField,
  type ImportIssue,
  type ImportSourceColumn,
} from '@/components/ImportWizard';

/**
 * 导入线索（`/lead/import`）—— 展会名单 / 海关数据 / 官网留资的批量入库。
 *
 * 线索是**四条来源通道汇进来的一堆表**（名片扫描件、海关数据导出、官网表单、社媒后台），
 * 表头各写各的，这是本页比客户导入更需要"字段映射"这一步的原因：
 * 客户导入的源表通常是同一套模板填出来的，线索导入几乎每次都不一样。
 *
 * 校验口径比客户宽一档：线索不做编码查重（同一个人从两个渠道留下联系方式是正常现象，
 * 去重应该发生在**转化时**而不是登记时），故演示数据里的失败集中在两件事上 ——
 *   行 18 来源值不在候选集内、行 25 国家代码不识别、行 33 联系电话不合法、行 41 评分超出 0-100。
 * 后两条是"能修"的错（改完重传即可），前两条是"要问来源方"的错，
 * 两类都演示到，用户才知道明细表不是只看数量。
 *
 * 静态骨架：确认后只给结果反馈，接入后走 POST /api/v1/cus/leads/import。
 */

const FIELDS: readonly ImportField[] = [
  { name: 'name', labelKey: 'lead.new.field.name', required: true },
  { name: 'code', labelKey: 'lead.new.field.code' },
  { name: 'sourceKey', labelKey: 'lead.col.source', required: true },
  { name: 'countryKey', labelKey: 'lead.new.field.country', required: true },
  { name: 'city', labelKey: 'lead.new.field.city' },
  { name: 'contact', labelKey: 'lead.col.contact' },
  { name: 'phone', labelKey: 'lead.new.field.phone' },
  { name: 'productSku', labelKey: 'lead.new.field.product' },
  { name: 'score', labelKey: 'lead.col.score' },
];

/** 源文件表头（演示值）——刻意用"企业名/所在国"这种与目标字段不同名的写法，
 *  好让字段映射这一步看起来真的是在做事，而不是白送。
 *  中文字面量改走 key 的原因同 `cus/import.tsx`。 */
const SOURCE_COLUMNS: readonly ImportSourceColumn[] = [
  { labelKey: 'lead.imp.src.name' },
  { labelKey: 'lead.imp.src.code' },
  { labelKey: 'lead.imp.src.source' },
  { labelKey: 'lead.imp.src.country' },
  { labelKey: 'lead.imp.src.city' },
  { labelKey: 'lead.imp.src.contact' },
  { labelKey: 'lead.imp.src.phone' },
  { labelKey: 'lead.imp.src.product' },
  { labelKey: 'lead.imp.src.score' },
];

const ISSUES: readonly ImportIssue[] = [
  { row: 18, fieldKey: 'lead.col.source', reasonKey: 'lead.imp.reason.source' },
  { row: 25, fieldKey: 'lead.new.field.country', reasonKey: 'lead.imp.reason.country' },
  { row: 33, fieldKey: 'lead.new.field.phone', reasonKey: 'lead.imp.reason.phone' },
  { row: 41, fieldKey: 'lead.col.score', reasonKey: 'lead.imp.reason.score' },
];

export default function LeadImportPage() {
  return (
    <ImportWizard
      titleKey="lead.imp.title"
      subtitleKey="lead.imp.subtitle"
      backTo="/lead"
      backLabelKey="lead.back.list"
      fileNameKey="lead.imp.file"
      fileSize="412 KB"
      sourceColumns={SOURCE_COLUMNS}
      fields={FIELDS}
      okCount={63}
      issues={ISSUES}
      noteKey="lead.imp.note"
    />
  );
}
