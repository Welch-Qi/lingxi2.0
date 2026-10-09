import { CUSTOMERS, INTENT_SLA_DAYS, STAGE_KIND, STAGE_ORDER, isOpenStage } from '@/routes/customer/data';
import type { CustomerRecord, Opportunity, OppIntent, OppStage } from '@/routes/customer/data';

/**
 * 商机中心演示数据。
 *
 * **不新建数据集**：商机是客户域里的同一批 `cus_opportunity` 记录，
 * 这里只是把客户数据集里的商机**拉平**成一行一条，并挂回它的客户主体。
 * 这正是三层对象的落地形态 —— 一张表、一个数据域，两个菜单是两种视图，
 * 不是两份数据。若这里另写一份商机数据，就会出现"两个中心各说各话"。
 *
 * 两条口径（《产品规划说明书V2.1》§3.6）在这里被显式实现：
 *   ① **阶段看板含已关闭商机** —— 排除已关闭就看不出损耗落在哪一段，
 *      故 `STAGE_BUCKETS` 不筛任何行；
 *   ② **意向等级只评未关闭商机** —— 已关闭商机上带意向是无意义的，列表按此置灰。
 *
 * 2026-09-24 列表改版：原「商机名称」列换成「商机时间」（= `createdAt`，报备时点），
 * 并补「意向产品」（`intendedProductId` → `prd_product` 外键）、「跟进人」、
 * 「增换购标签」（首购 / 增购 / 复购）三列，撤下「预计成交金额」。
 *
 * 「增换购标签」与附件 Sheet6 规则 4 的关系：附件把「复购 / 增购」合称一类
 * （判据＝存量老客户 且 商机流转中，即 `isRepeatDeal`）。本列把它拆成三个可判定的
 * 取值，判据换成**两问**：先问"这客户成交过没有"（客户级成交事实 `lastDealAt`），
 * 再问"这个意向产品他买过没有"（成交侧商机的产品集）—— 详见 `resolvePurchaseLabel`。
 * 不直接沿用 `customer_type`：那一列回答"这个客户算什么"，而本列要回答"这一笔买的是什么"。
 *
 * 「今日」取演示数据的基准日（不是 `new Date()`）：否则截图与断言每天都会变，
 * 验收就不可复现。
 */
/**
 * 基准日（演示数据口径，非 `new Date()`）。
 *
 * 2026-09-25 导出：商机详情页要用它算「商机存续天数」「下次跟进剩余天数」，
 * 而日期一旦取自当天，截图与断言就每天都会变、验收不可复现。
 */
export const OPP_TODAY = '2026-09-24';

/** 增换购标签（列表列，3 取值）—— 只评未关闭商机 */
export type PurchaseLabel = 'first' | 'upsell' | 'repeat';

/**
 * 该客户**已经买过**的产品 id 集合（依据：名下处于「已成交侧」的商机）。
 *
 * 只用来分「复购 / 增购」，**不用它判「首购」**：本数据集是**第 1 页切片**，
 * 客户完全可能有切片之外的成交（实测 Baltic Power OÜ、Vistula Energy、Atelier Lumière
 * 三家 `customer_type='EXISTING'`、`lastDealAt` 有值，但切片内一条已成交商机都没有）。
 * 若拿"切片内没有已成交商机"当首购判据，这三家会被判成首购 —— 与客户中心列表上
 * 明写的「存量老客户」直接打架。**首购只能看客户级的成交事实（`lastDealAt`）。**
 *
 * 一个客户算一次即可，`buildRows` 里在客户循环外算好，其名下每条商机复用。
 */
function boughtProductIds(customer: CustomerRecord): Set<string> {
  return new Set(
    customer.opportunities
      .filter((opp) => STAGE_KIND[opp.stage] === 'won')
      .map((opp) => opp.intendedProductId),
  );
}

/**
 * 增换购标签的判定（只评未关闭商机）：
 *   · 该客户**从未成交**（`lastDealAt === null`）→ **首购**（第一次买）
 *   · 成交过，且这个意向产品也买过 → **复购**（同一产品再来一次）
 *   · 成交过，但这个产品没买过 → **增购**（在既有采购上扩充品类）
 *
 * 两问的顺序不能反：先判"有没有成交过"，再判"这个产品买过没有" ——
 * 从未成交的客户买什么都是首购，此时成交产品集是空的，先判产品会全部落进"增购"。
 *
 * `lastDealAt` 为什么可以当判据：它是**客户级的事实时间戳**（"最近成交时间；
 * 新潜在客户（从未成交）为 null"，见 `CustomerRecord`），不是季度复核得来的主体属性 ——
 * 事实不会因为一次季度复评把历史商机的采购性质集体翻转，这正是本列不用
 * `customer_type` 的原因。（实测两者在本数据集上完全等价：`type='new'` ⟺ `lastDealAt=null`。）
 */
function resolvePurchaseLabel(
  customer: CustomerRecord,
  bought: ReadonlySet<string>,
  opportunity: Opportunity,
): PurchaseLabel {
  if (customer.lastDealAt === null) {
    return 'first';
  }
  return bought.has(opportunity.intendedProductId) ? 'repeat' : 'upsell';
}

/**
 * 阶段 → 视觉色（成交侧走苔原绿、流失走珊瑚红，其余保持中性不制造褒贬）。
 *
 * 2026-09-27 从 index.tsx 下沉到这里：详情页要用同一套映射，
 * 而详情页引列表页会把整页依赖图拖进来 —— 派生映射属于数据层，谁都该引它。
 */
export const CLOSE_TONE: Partial<Record<OppStage, 'won' | 'lost'>> = {
  signed: 'won',
  delivering: 'won',
  accepted: 'won',
  lost: 'lost',
};

export interface OpportunityRow extends Opportunity {
  customerId: string;
  customerName: string;
  customerCode: string;
  /**
   * 归属部门 key 与负责人 user id —— 数据权限范围的判据（2026-10-06）。
   *
   * 从**客户**继承而不是从商机自己另存：商机的部门归属就是客户的部门归属，
   * 自己存一份就等于多一处需要同步的真值（客户转部门时两处不同步，
   * 于是「客户列表看到的」和「商机列表看到的」范围不一样）。
   */
  deptKey: string;
  ownerId: string;
  /** 商机编码 = 客户编码 + 客户内 3 位序号（演示口径，与《CRM字段配置表》商机编码规则一致）。 */
  code: string;
  /** 是否仍在流转中 */
  isOpen: boolean;
  /** 按意向等级 SLA 判定逾期未跟进（A 级 7 天 / B 级 30 天；C、D 未定义视为不判） */
  isOverdue: boolean;
  /**
   * 增换购标签：首购 / 增购 / 复购；**已关闭商机为 `null`**（不评）。
   * 与「意向等级」同一处置 —— 一笔已经关掉的商机，讨论它是首购还是复购没有意义
   * （流失的没买成，成交的采购性质已由合同定下），列表上显示破折号。
   */
  purchaseLabel: PurchaseLabel | null;
}

function buildRows(): OpportunityRow[] {
  const rows: OpportunityRow[] = [];
  for (const customer of CUSTOMERS) {
    const bought = boughtProductIds(customer);
    customer.opportunities.forEach((opp, oppIndex) => {
      const slaDays = INTENT_SLA_DAYS[opp.intent];
      const open = isOpenStage(opp.stage);
      const overdue = slaDays > 0 && open && diffDays(opp.lastFollowUp, OPP_TODAY) > slaDays;
      rows.push({
        ...opp,
        customerId: customer.id,
        customerName: customer.name,
        customerCode: customer.code,
        deptKey: customer.deptKey,
        ownerId: customer.ownerId,
        code: `${customer.code}${String(oppIndex + 1).padStart(3, '0')}`,
        isOpen: open,
        isOverdue: overdue,
        purchaseLabel: open ? resolvePurchaseLabel(customer, bought, opp) : null,
      });
    });
  }
  return rows;
}

/** 两个 YYYY-MM-DD 之间的天数差（b - a）。日期串字典序即时间序，转 Date 只为取差值。 */
function diffDays(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / MS_PER_DAY);
}

export const OPPORTUNITY_ROWS: readonly OpportunityRow[] = buildRows();

/**
 * 按**商机编码**取一行（订单转单预填用，2026-10-07）。
 *
 * 为什么按编码而不按 id：编码是对外稳定标识（客户码 + 客户内 3 位序号派生，见 buildRows），
 * 会出现在地址栏、订单的来源标记、跨部门对话里；id 是库内主键，只该在系统内部流转。
 * 一个把 id 拼进 URL 的功能，等接了真实后端就得整体改一遍 —— 早用对外的那个。
 *
 * 传 undefined（URL 没带 opp 参数）返回 undefined，由调用方回落成"普通新建订单"，
 * 不在这里抛错：URL 参数是外部输入，让它能优雅退化成默认路径比崩掉好。
 */
export function findOpportunityByCode(code: string | undefined): OpportunityRow | undefined {
  if (!code) {
    return undefined;
  }
  return OPPORTUNITY_ROWS.find((row) => row.code === code);
}

/** 服务端口径的总数（计数由后端出，不是把当前页数出来）。 */
export const OPP_AGGREGATE = {
  total: 118,
} as const;

export interface StageBucket {
  stage: OppStage;
  count: number;
  amountMinor: number;
}

/** 阶段分布（阶段看板的数据源）—— 全部商机，不排除已关闭的。 */
export const STAGE_BUCKETS: readonly StageBucket[] = STAGE_ORDER.map((stage) => {
  const bucket = OPPORTUNITY_ROWS.filter((row) => row.stage === stage);
  return {
    stage,
    count: bucket.length,
    amountMinor: bucket.reduce((sum, row) => sum + row.amountMinor, 0),
  };
});

/**
 * 阶段看板首位「全部商机」卡的口径 —— 与各阶段卡**同源**（同一批行的金额相加），
 * 这样"全部"恒等于各阶段之和，不会出现首位与其余几张对不上的尴尬。
 * 不用 `OPP_AGGREGATE.total`：那是服务端全量口径（118），与卡片里的 18 条切片不同源。
 */
export const OPP_AMOUNT_TOTAL = OPPORTUNITY_ROWS.reduce(
  (sum, row) => sum + row.amountMinor,
  0,
);

export type { OppIntent, OppStage };

/**
 * 可推进到的阶段：**当前段及其之后**（含已关闭段）。
 *
 * 为什么阶段只能向前：商机阶段记的是**过程事实**，退回前面的段等于把谈过的事
 * 当没谈过（从商务谈判退回首触 = 抹掉报价与谈判）。反过来"跳过一段"是允许的
 * —— 跟进不是考试，每一段都留痕反而是负担。
 *
 * 领域规则而非页面规则：详情页与跟进页都要它，故放数据层，与 `CLOSE_TONE` 同约定。
 */
export function forwardStages(current: OppStage): readonly OppStage[] {
  const from = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER.slice(from === -1 ? 0 : from);
}

/** 该阶段是否已关闭（流失关闭，或已走到成交侧三段）。已关闭商机不再评意向等级。 */
export function isClosedStage(stage: OppStage): boolean {
  return STAGE_KIND[stage] !== 'open';
}
