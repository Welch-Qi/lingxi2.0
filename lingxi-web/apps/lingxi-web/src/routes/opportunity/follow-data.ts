import { STAGE_KIND, STAGE_ORDER } from '@/routes/customer/data';
import type { OppStage } from '@/routes/customer/data';
import { OPPORTUNITY_ROWS } from './data';
import type { OpportunityRow } from './data';

/**
 * 商机跟进记录（`/opportunity/:id/follow`）的演示数据。
 *
 * **不另写一份跟进数据**：跟进记录与商机是同一个业务对象的两面 ——
 * 商机说"这条单子现在怎么样"，跟进记录说"凭什么这么说"。脱离商机单独造一批
 * 跟进流水，两者迟早会对不上（日期、跟进人、下次跟进三处都会漂）。
 * 故这里从 `OPPORTUNITY_ROWS` **派生**：数据层只有商机，跟进历史是它的投影。
 *
 * 派生规则（三条都为了让历史"读起来像真的"，而不是一堆占位行）：
 *
 *  ① **条数随阶段走**：停在首触的商机只有 1 条记录，谈到商务谈判的有 4 条。
 *     条数 = 当前段在 `STAGE_ORDER` 里的下标（封顶 `MAX_RECORDS`）。
 *     若一律给 3 条，全部 18 条商机的历史会长得一模一样 —— 那不是跟进记录，是模板。
 *
 *  ② **日期在 `createdAt → lastFollowUp` 之间均匀铺开，末条对齐 `lastFollowUp`**：
 *     这条区间是演示数据里唯一真实存在的一对时间戳，不铺开就会出现
 *     "报备 3 月、第一条跟进 8 月"这种说不通的历史。流失商机同样有历史，
 *     它们不是从石头里冒出来的。
 *
 *  ③ **阶段沿轨道推进，末条对齐当前段**：第 i 条记在 `STAGE_ORDER[i]` 段上，
 *     最后一条钉在 `row.stage`。中间允许跳段（`delivering` 的倒数第二条在
 *     `negotiate`），演示数据本就只有 createdAt 一个真实时间戳，
 *     硬造"每段一条"等于编造，注释写明比假装齐整更诚实。
 *
 * 跟进小结用 `stage` 派生的 i18n key（`opp.follow.log.<stage>`）而不是逐条硬编码：
 * 一条记录挂在哪一段，谈的通常就是那段该谈的事（首触确认需求、报价谈商务条件）。
 * 8 个阶段共 8 条文案，比给 90 条记录各写一句更可维护，也不会出现 90 句重复。
 * 本页新记的记录走`summaryText`（销售手写原文），两条路径分开，理由见 `FollowRecord`。
 *
 * ⚠️ 提交新跟进**不改这份数据**（演示态，与详情页的「关闭」同一处置）：
 * 新记录只进页面本地的 state。数据层保持只读，接入后由POST 接口落库。
 */

/** 跟进方式（4 类，CRM 跟进记录的标准分类）。 */
export type FollowMode = 'call' | 'email' | 'visit' | 'meeting';

/** 单条跟进记录。 */
export interface FollowRecord {
  id: string;
  /** 所属商机 id（`Opportunity.id`） */
  oppId: string;
  /** 跟进日期 YYYY-MM-DD */
  date: string;
  /** 跟进方式 */
  mode: FollowMode;
  /** 跟进人 i18n key —— 与 `Opportunity.ownerKey` 同口径（字段名带 Key 的值一律存 key） */
  ownerKey: string;
  /** 本次跟进结束时所处阶段（决定摘要文案与轨道位置） */
  stage: OppStage;
  /**
   * 跟进小结的 i18n key：`opp.follow.log.<stage>`。
   *
   * 派生记录用它；**本页新记的记录留空**，改用 `summaryText` 放销售自己写的原文 ——
   * 两条路径不能塞进同一个字段：key 要过en 禁中文检查，原文是用户数据不过。
   */
  summaryKey?: string | undefined;
  /** 本页新记的小结原文（销售手写，不翻译、不进语言包）。 */
  summaryText?: string | undefined;
  /** 本次跟进约定的下次跟进时间；末条取商机自身的 `nextFollowUp` */
  nextFollowUp: string;
}

/** 跟进方式轮转顺序 —— 真实销售不会连着三通电话，轮着来才像流水。 */
const MODE_CYCLE: readonly FollowMode[] = ['call', 'visit', 'email', 'meeting'];

/** 单条商机最多派生几条历史：再多就成日志而不是跟进记录了。 */
const MAX_RECORDS = 5;

/**
 * 该商机应有多少条跟进记录：阶段推进了几段，就跟进过几次。
 * 流失商机（`STAGE_ORDER` 末位）按封顶值给 —— 它同样是一段真实过程。
 */
function recordCount(stage: OppStage): number {
  if (STAGE_KIND[stage] === 'lost') {
    return MAX_RECORDS;
  }
  return Math.min(Math.max(STAGE_ORDER.indexOf(stage), 1), MAX_RECORDS);
}

/** YYYY-MM-DD 加减天数（按 UTC 日界，避免时区把差一天算成差两天）。 */
function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** 该商机当前段之前、可见的推进段（去掉末位「流失关闭」—— 它不是一次跟进）。 */
function trackStages(): readonly OppStage[] {
  return STAGE_ORDER.filter((stage) => STAGE_KIND[stage] !== 'lost');
}

function buildRecords(row: OpportunityRow): FollowRecord[] {
  const count = recordCount(row.stage);
  const stages = trackStages();
  const spanDays = Math.round(
    (Date.parse(`${row.lastFollowUp}T00:00:00Z`) - Date.parse(`${row.createdAt}T00:00:00Z`)) / 86_400_000,
  );
  // 末条固定落在 lastFollowUp，中间按span 等分 —— 见文件头规则②
  const stepDays = count > 1 ? Math.round(spanDays / (count - 1)) : 0;

  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const date = isLast ? row.lastFollowUp : addDays(row.createdAt, stepDays * index);
    // 末条对齐当前段；中间沿轨道推进，下标越界时钉在轨道末段（见文件头规则③）
    const stage = isLast ? row.stage : (stages[Math.min(index, stages.length - 1)] ?? row.stage);
    return {
      id: `${row.id}-F${index + 1}`,
      oppId: row.id,
      date,
      mode: MODE_CYCLE[index % MODE_CYCLE.length] as FollowMode,
      ownerKey: row.ownerKey,
      stage,
      summaryKey: `opp.follow.log.${stage}`,
      // 倒数第二条的「下次跟进」就是下一条的日期，首条无前驱故无下次
      nextFollowUp: isLast
        ? row.nextFollowUp
        : index + 1 === count - 1
          ? row.lastFollowUp
          : addDays(date, Math.max(stepDays, 1)),
    };
  });
}

/** 全量跟进记录（按商机聚合，由 `findFollowRecords` 取用）。 */
export const FOLLOW_RECORDS: readonly FollowRecord[] = OPPORTUNITY_ROWS.flatMap(buildRecords);

/** 取某条商机的跟进历史，**按日期倒序**（最近一次在最上，与跟进页的阅读顺序一致）。 */
export function findFollowRecords(oppId: string): readonly FollowRecord[] {
  return FOLLOW_RECORDS.filter((record) => record.oppId === oppId).sort((a, b) => (a.date < b.date ? 1 : -1));
}