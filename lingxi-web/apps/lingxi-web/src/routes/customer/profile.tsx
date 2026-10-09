import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeftOutlined, EditOutlined, MailOutlined, PhoneOutlined, UserAddOutlined } from '@ant-design/icons';
import { LxEmpty, LxSectionHeader, LxTable, LxTableCard, LxTag } from '@lingxi/ui';
import type { LxTagVariant } from '@lingxi/ui';
import { formatMoneyCompact } from '@lingxi/utils';
import { PageContainer } from '@/components/PageContainer';
import { FormEditDrawer } from '@/components/FormSections';
import { findProduct } from '@/routes/product/data';
import { CUSTOMERS, STAGE_KIND, TYPE_VARIANT, contactsOf, isOpenStage, isRepeatDeal, syncPrimaryContact } from './data';
import type { ContactRecord, CustomerRecord, CustomerTier, OppIntent, OppStage, Opportunity } from './data';
import { customerEditPatch, customerEditSections, customerEditValues } from './fields';
import { ContactsEditor } from './components/ContactsEditor';

/**
 * 客户360（/customer/360/:id）—— 一企一档的档案界面。
 *
 * 字段与分区严格按附件《CRM字段配置表》组织：
 *   · 客户主体 8 字段（类型/价值分层/所属行业/客户规模/所在区域/客户负责人/客户来源/建档时间）；
 *   · 商机 14 字段里对外展示的那部分（商机时间 / 意向产品 / 阶段 / 意向等级 / BANT /
 *     预计成交时间 / 下次跟进时间 / 最近跟进时间 / 负责人）——
 *     2026-09-24 起「商机创建时间」与「意向产品」是产品设计补的两个字段（附件里没有）；
 *   · 意向等级 A/B/C/D 与价值分层 S/A/B/C/D 是两套不同的尺子，故在界面上用**不同组件、
 *     不同配色**呈现（意向走 LxTag、分层走 lx-custier），不共用同一列视觉语言。
 *
 * 2026-09-23 改版（用户给的三条）：
 *   ① **商机列表独占整宽** —— 原先左栏放商机表、跟进记录，右栏放客户主体与联系人，
 *      商机表 7 列被压到 812px，英文态必然横滚。现在撤下右栏，表格吃满内容区。
 *   ② **客户主体 + 联系人合并进上面的基础信息卡** —— 页头那块（名称/类型/分层/编码/四个概览数）
 *      本来就是"这个客户是谁"，与客户主体十字段是同一件事的两半，分居上下两块要多费一次视线。
 *      合并后页头 = 身份 + 概览数 + 完整字段表 + 联系人，一屏读完"一企一档"。
 *      名称与编码不重复列进字段表 —— 它们已经是页头的大标题与编码片。
 *   ③ **商机列表可切到跟进记录** —— 两块内容互斥且都是"这家客户的生意往来"，
 *      并列会把页面拉得很长；改成一组页签，同一位置切换，页面高度不随内容翻倍。
 *      跟进记录按最近跟进时间倒序，在大宽度下铺成卡片网格（单列时间轴在 1180px 里会空掉七成）。
 *
 * 2026-09-25 改版（用户给的四条里属于本页的那些）：
 *   ① **顶部加「返回客户中心」链接** —— 原先那个返回按钮在 hero 卡**里面**（卡片首行），
 *      读作"这张卡片的返回"而不是"这一页的返回"；提到页面顶部、卡片之外，它才是页面级导航。
 *   ② **去掉正副标题**（`PageContainer hideTitle`，h1 仍留在 DOM 里供读屏与大纲）。
 *      本页第一眼要看到的是"这家客户是谁"，标题行只是把同一件事说了第三遍
 *      （hero 里已经有客户名）。
 *   ③ **商机列表换列**：原「商机名称」列换成「商机时间」（`createdAt`，报备时点，
 *      与商机中心同一口径），增「意向产品」（外键换商品名）与「跟进人」，
 *      撤「预计成交金额」；末尾增操作列（跟进 / 关闭）；BANT 与「复购/增购」标记
 *      从原名称列的副行挪进**一个独立窄列**（用户裁决）—— 名称列撤掉后它们需要新落点。
 *   ④ **跟进记录由卡片网格改成列表**（LxTable）：跟进时间 / 跟进人 / 跟进小结 / 下次跟进时间。
 *      卡片版是"一条商机一张卡"，宽屏下一张卡用到约 400px、其余七成空着；表格让四个字段
 *      纵向对齐，跨商机横向可比。
 *
 * 底部两段按"附件业务规则"取数，而不是凭空列举：
 *   · 复购标记 = 客户类型是存量老客户 且 商机处于流转中（Sheet6 规则 4）；
 *   · 跟进记录 = 各商机按最近跟进时间倒序 —— 记录的是"这条商机最后聊到哪、下一步定在何时"。
 *
 * ⚠️ 一处**有意与商机中心对齐**的改动（不在用户四条要求里，但同源数据不该两套规则）：
 *   已关闭商机的「意向等级」显示为「不评估」。`opportunity_intent` 的字段口径是
 *   "**仅评估未关闭商机**"（见 data.ts 的类型注释与附件 Sheet3），商机中心的列表早就照此
 *   置灰了，而本页此前对已验收 / 已流失的商机照样渲染「A 高意向」——同一张表、两个视图、
 *   两个说法。宽度与处置随本次换列一并统一。
 *
 * 2026-10-07 右上角加「编辑客户」（用户要求）：
 *   本页此前是**纯档案页**——看到客户类型不对、负责人换人了，只能记住名字回列表重进，
 *   而列表里也没有编辑入口，改一次要跨两个页面。
 *
 *   落点是**抽屉**而不是跳录入页：用户是在看这个客户时发现字段要改，跳走意味着
 *   改完要自己找回这一页；抽屉留在原地，关掉就是继续看。
 *
 *   改动只落本页 state（`patch`），不写 `CUSTOMERS` —— 那是模块级常量、
 *   164 家客户的数组被客户列表 / 商机 / 跟进 / 本页四处引用，演示态改它会串到别的页面。
 *   页面上**所有**读客户字段的地方（页头类型与分层、客户主体十字段、联系人块、
 *   商机行的"复购"标记判据）统一读 `merged`，所以改一次全页一致；
 *   若某处仍读 `customer` 原始对象，就会出现"标签页说负责人换了、字段表还是旧的"。
 */

const INTENT_TAG: Record<OppIntent, LxTagVariant> = { a: 'review', b: 'graphic', c: 'lang', d: 'producing' };

/** 商机列表 / 跟进记录 —— 两块内容一次只显示一块。 */
type ProfileTab = 'opp' | 'follow';

/**
 * 商机行 = 数据模型 + 页内派生。
 *
 * 用 `extends` 而不是把 14 个字段再抄一遍：抄一遍的代价是模型加字段时这里静默漏掉，
 * 而 TS 不会报错（少写一个字段在新接口里只是"没有"）—— 那正是 `createdAt` / `intendedProductId`
 * 上次加字段时最容易踩的坑。
 */
interface OppRow extends Opportunity {
  /** 复购/增购标记（附件 Sheet6 规则 4 的派生，不落库） */
  repeat: boolean;
  /** 商机编码 = 客户编码 + 客户内 3 位序号（第十轮编码改造派生，不落库） */
  code: string;
}

/** 分层徽标：与列表页同一套视觉，保证"同一层级在任何页面长得一样"。 */
function TierBadge({ tier, label }: { tier: CustomerTier; label: string }) {
  return (
    <span className={`lx-custier lx-custier--${tier}`}>
      <b className="lx-custier__code">{tier.toUpperCase()}</b>
      <span className="lx-custier__name">{label}</span>
    </span>
  );
}

export default function CustomerProfilePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProfileTab>('opp');
  /** 编辑抽屉是否打开。 */
  const [editing, setEditing] = useState(false);
  /**
   * 本页生效的客户基本信息覆盖量（null = 未编辑）。
   *
   * 用覆盖量而不是 `useState(customer)` 存整条记录：整条记录里 id / createdAt /
   * opportunities 都不该被编辑表单改到，抄一份既多余又给了误改的机会。
   * 读时回落（`{...customer, ...patch}`）让页面上所有读客户字段的地方自动跟着走。
   */
  const [patch, setPatch] = useState<Partial<CustomerRecord> | null>(null);

  /**
   * 本页生效的联系人清单覆盖量（null = 未编辑）。
   *
   * 与 `patch` 同构：演示态不写共享数据集。清单初值走 `contactsOf`，
   * 它对没登记多联系人的客户会**由记录现场合成一个**（见 data.ts 的说明），
   * 所以这一项永远是数组不会是空的 —— 否则 150 几家客户的联系人区会整块消失。
   */
  const [contactPatch, setContactPatch] = useState<readonly ContactRecord[] | null>(null);

  /**
   * 编辑抽屉里正在编辑的联系人清单（null = 未动过）。
   *
   * 与 `contactPatch` 分开是必要的：前者是**提交后才生效**的值，
   * 后者是**编辑会话中**的值。"取消"要能丢掉后者而保留前者 ——
   * 若共用一个 state，用户点两次编辑再取消，第一次加的联系人就撤不掉了。
   */
  const [contactDraft, setContactDraft] = useState<readonly ContactRecord[] | null>(null);

  /** 数据层原始记录（未叠加本页编辑）。命名为 `baseCustomer` 以与下面的生效记录 `customer` 区分。 */
  const baseCustomer: CustomerRecord | undefined = useMemo(
    () => CUSTOMERS.find((row) => row.id === id),
    [id],
  );

  /** 本页生效的客户记录：编辑后 = 原记录 + 覆盖量（见上方 patch 注释）。 */
  const merged: CustomerRecord | undefined = useMemo(
    () => (baseCustomer ? { ...baseCustomer, ...patch } : undefined),
    [baseCustomer, patch],
  );

  /**
   * 本页生效的联系人清单：编辑后用覆盖量，未编辑走 `contactsOf` 的合成值。
   *
   * 放在 `if (!merged) 早退` **之前**（故入参是 `merged` 而非下面那个 `customer`）：
   * Hook 必须无条件逐次同序调用，挂在早退之后等于"客户不存在时不调 Hook"——
   * 路由从有客户切到无客户（同参数换id）时 Hook 顺序变一次，React 直接抛错。
   *
   * 初值取 `merged`（已叠加 `patch` 的生效记录）而不是 `baseCustomer`：
   * 用户可能在**同一次编辑**里既改了客户负责人、又换了主联系人 ——
   * 若初值读原始记录，`syncPrimaryContact` 刚回写进去的新主联系人名就会
   * 被原始值盖掉，"改主联系人"这条路径当场失灵。
   *
   * 主联系人排最前。**不在数据层排**：`contactsOf` 同时服务展示与编辑抽屉初值，
   * 而编辑抽屉需要保持用户的原始行序（否则用户刚排好的顺序一开抽屉就变了）；
   * 排序是纯展示决策，故放这里。
   */
  const contacts = useMemo(
    () =>
      [...(contactPatch ?? (merged ? contactsOf(merged) : []))].sort(
        (a, b) => Number(b.primary) - Number(a.primary),
      ),
    [contactPatch, merged],
  );

  /**
   * 金额紧凑显示：窄列里全量记法（¥1,560,000.00）会把表格撑到横向滚动。
   * locale 必须显式传 i18n.language —— 用 `Intl.NumberFormat(undefined, …)` 取的是
   * 运行时默认语言，英文界面里会照样输出「¥156万」这种中文数量级，等于没本地化。
   */
  const money = useCallback(
    (amountMinor: number) => formatMoneyCompact(amountMinor, 'CNY', i18n.language),
    [i18n.language],
  );

  /**
   * 页面级返回链接（在 hero 卡**之外**、页面顶部）。
   *
   * 放在这里而不是卡片里：卡片里的返回读作"这张卡片的返回"。同一个按钮
   * 在 404 分支与正常分支都要用，故提成一个变量 —— 两处各写一遍会漂。
   */
  const backLink = (
    <div className="lx-p360__topbar">
      <button type="button" className="lx-p360__back lx-focusable" onClick={() => void navigate('/customer')}>
        <ArrowLeftOutlined />
        {t('cus.p360.back')}
      </button>
    </div>
  );

  if (!merged) {
    return (
      <PageContainer titleKey="cus.p360.title" hideTitle>
        {backLink}
        <section className="lx-glass lx-panel">
          {/* 返回动作只在页面顶部那一处 —— 空状态里再放一个同样的按钮，
              两个一模一样的按钮相隔 60px，是重复而不是冗余可删。 */}
          <LxEmpty title={t('cus.p360.missing')} hint={t('cus.p360.missingHint')} />
        </section>
      </PageContainer>
    );
  }
  /**
   * 本页生效的客户记录（已判空，沿用原变量名 customer）。
   *
   * 显式标注类型而不是靠推断：赋值表达式的类型在 `exactOptionalPropertyTypes` 下
   * 是 `CustomerRecord`，标注让这个别名与原始查找变量在类型上完全一致，
   * 下方 20 余处 `customer.xxx` 不必改一个字。
   */
  const customer: CustomerRecord = merged;

  const oppRows: readonly OppRow[] = customer.opportunities.map((opp, oppIndex) => ({
    ...opp,
    repeat: isRepeatDeal(customer, opp),
    code: `${customer.code}${String(oppIndex + 1).padStart(3, '0')}`,
  }));

  /** 概览四个数：累计成交 = 成交关闭商机；未关闭商机金额 = 流转中商机（附件 Sheet6 规则 3 的口径）。
      金额全程是最小单位整数（分），相加不引入浮点误差。 */
  const wonAmount = customer.opportunities
    .filter((opp) => STAGE_KIND[opp.stage] === 'won')
    .reduce((sum, opp) => sum + opp.amountMinor, 0);
  const openOpps = customer.opportunities.filter((opp) => isOpenStage(opp.stage));
  const openAmount = openOpps.reduce((sum, opp) => sum + opp.amountMinor, 0);

  const facts: readonly { key: string; label: string; value: string }[] = [
    { key: 'total', label: t('cus.p360.fact.total'), value: money(wonAmount) },
    { key: 'open', label: t('cus.p360.fact.open'), value: money(openAmount) },
    { key: 'count', label: t('cus.p360.fact.openCount'), value: String(openOpps.length) },
    {
      key: 'last',
      label: t('cus.p360.fact.lastDeal'),
      value: customer.lastDealAt ?? t('cus.list.neverDealt'),
    },
  ];

  /* 客户主体字段表：名称与编码不列 —— 它们已经是页头的大标题与编码片，
     再列一遍会在相隔 20px 的地方重复同一串字。 */
  const baseFields: readonly { key: string; label: string; value: string }[] = [
    { key: 'type', label: t('cus.p360.field.type'), value: t(`cus.type.${customer.type}`) },
    { key: 'tier', label: t('cus.p360.field.tier'), value: `${customer.tier.toUpperCase()} ${t(`cus.tier.${customer.tier}`)}` },
    { key: 'industry', label: t('cus.p360.field.industry'), value: t(customer.industryKey) },
    { key: 'scale', label: t('cus.p360.field.scale'), value: t('cus.p360.scaleValue', { count: customer.scale }) },
    { key: 'region', label: t('cus.p360.field.region'), value: t(customer.countryKey) },
    { key: 'owner', label: t('cus.p360.field.owner'), value: t(customer.ownerKey) },
    { key: 'source', label: t('cus.p360.field.source'), value: t(customer.sourceKey) },
    { key: 'created', label: t('cus.p360.field.createdAt'), value: customer.createdAt },
  ];

  /**
   * 商机列表列（2026-09-25 改版；2026-09-24 换固定列宽布局、撤「预计成交时间」）。
   *
   * **列宽一律用百分比、合计 100%**，配合 `LxTable` 的 `fit`（`table-layout: fixed`）：
   * 列宽的权威只有下面的 `width`，内容反过来不能撑宽列。
   * 本表此前是"声明 px + 内容 max-content 取大"，实测自然宽 1118px ——
   * 而内容区在 1280 视口只有 998px、1366 视口 1084px，**1366 及以下出横向滚动条**；
   * 1440 视口 1158px 看着刚好，其实余量为 0。改成百分比后表格宽恒等于容器宽，
   * 任何视口都不可能横向溢出，超出部分按"截断 + `title` 悬停看全"处理。
   *
   * 撤「预计成交时间」的理由（用户 2026-09-24 明确要求）：它与「下次跟进」语义高度重叠
   * （都是"什么时候会有下文"），两列并排要读者自己比两个日期才判断得出先后，
   * 留「下次跟进」这个更接近行动的日期。商机中心同一时间做了同样的取舍。
   *
   * 百分比按各列**内容自然宽**的比例分配，优先照顾英文表头最长的两列
   * （`Intended product` / `Follow-up owner`）—— 表头被截断整列就废了。
   */
  const columns = [
    {
      /* 9%：值是 `2026-03-18`（10 字符定宽，中英态同长），9% @1280 = 87px
         − 内边距 16px = 71px 仍宽裕（实测编码列需要 91px，这列只要 ~62px）。
         本轮从 10% 让出 1% 给商机编码列 —— 让出的判据是"这一格让出去
         会不会新增损失类型"：日期让 1% 仍是全的，而编码被截就要打省略号、
         用户点之前无法确认自己点的是哪条商机。 */
      title: t('opp.col.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '9%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      /* 商机编码 = **进入这条商机详情页的入口**（2026-10-07 用户要求）。
         为什么落在编码列而不是商机名称列：360 页的商机表**没有商机名称列**
         （2026-09-25 改版把名称换成了「商机时间」），而编码是本行唯一稳定标识 ——
         客户名可重复、时间可撞，只有编码全局唯一。入口挂在它上面，用户看一行就知道
         点哪一格能进去。

         做成 `<button>` 而不是 `<span>`：整行点击对键盘与读屏都不可达，
         这一格必须有一个可聚焦元素落在上面（同商机中心列表页的处置）。

         11%（本轮从 10% 上调）：这一列是本轮新增的**导航入口**，被截就等于
         入口不可用 —— 用户点之前无法确认自己点的是哪条商机。
         实测 @1280 编码 `DE000001001` 需91px，10% 只给到 87px，差 4px 就出
         省略号（`clipped: scrollW 91 > clientW 87`）；1366 及以上 10% 才够。
         视口矩阵里1280 是必测下界，入口列不能"大部分视口够用"。
         `title` 仍兜住全文。 */
      title: t('opp.col.code'),
      dataIndex: 'code',
      key: 'code',
      width: '11%',
      render: (value: string, row: OppRow) => (
        <button
          type="button"
          className="lx-cell-link lx-num lx-p360__opplink lx-focusable"
          /* `data-opp-id` 给验收探针用：不带它，探针只能判"URL 变了"，
             而"URL 变了"可能来自任何一次跳转。带上目标 id 才能断言
             "点这一行编码，去的就是这一行商机"。 */
          data-opp-id={row.id}
          onClick={() => {
            void navigate(`/opportunity/${row.id}`);
          }}
        >
          {value}
        </button>
      ),
    },
    {
      /* 意向产品：只存外键（`prd_product.id`），名称来这里换 —— 商品改名时两个中心一起跟。
         商品分区暂无详情路由，故只给 title 兜底，不造"点了没处去"的假链接
         （与商机中心同一处置）。 */
      title: t('opp.col.product'),
      dataIndex: 'intendedProductId',
      key: 'product',
      width: '13%',
      render: (value: string) => {
        const name = findProduct(value)?.name ?? value;
        return (
          <span className="lx-oppprod lx-p360__prod" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      /* 9%：本列内容最多 4 个汉字（「跟进培育」），大头是表头 ——
         英文最长 `Negotiation` / `Closed lost`（11 字符 ≈62px）要放得下。 */
      title: t('opp.col.stage'),
      dataIndex: 'stage',
      key: 'stage',
      width: '9%',
      render: (value: OppStage) => (
        <span className={`lx-oppstage lx-oppstage--${STAGE_KIND[value]}`}>{t(`cus.oppstage.${value}`)}</span>
      ),
    },
    {
      /* 意向等级：已关闭的商机给文字「不评估」，不给历史分数 —— `opportunity_intent`
         的口径是"仅评估未关闭商机"（见 data.ts 类型注释与附件 Sheet3），商机中心早就
         这么处置了。同一张表两个视图不该两个说法，故本次一并对齐（文件头有说明）。
         10%：值是 `LxTag` 胶囊（中文「A 高意向」中英混排），胶囊自带 nowrap、压不动，
         列宽不足会被硬裁（连省略号都没有），故这条下界是硬的。 */
      title: t('cus.col.intent'),
      dataIndex: 'intent',
      key: 'intent',
      width: '10%',
      render: (value: OppIntent, row: OppRow) =>
        isOpenStage(row.stage) ? (
          <LxTag variant={INTENT_TAG[value]}>{t(`cus.intent.${value}`)}</LxTag>
        ) : (
          <span className="lx-muted">{t('opp.intent.closed')}</span>
        ),
    },
    {
      /* BANT · 增换购（用户裁决：独立成一个窄列）。
         名称列撤掉后，原先挂在它副行的这两样东西需要新落点；合成一列是有意的 ——
         两样都是"这条商机成色如何"的短标记，各占一列要白吃两个 80px。
         BANT 是散文（中文最长 27 字、英文最长 78 字符），窄列里必然出省略号，
         故保留 `title` 给全文 —— 宁可截断，不可溢出。
         15% 是本表给得最重的一列：它是唯一要同时放"可压缩的散文 + 不可压缩的胶囊"的格子。 */
      title: t('cus.p360.col.flags'),
      key: 'flags',
      width: '15%',
      render: (_value: unknown, row: OppRow) => (
        <span className="lx-p360__flags">
          <span className="lx-cell-code lx-p360__bant" title={t(row.bantKey)}>
            {t(row.bantKey)}
          </span>
          {row.repeat ? <LxTag variant="done">{t('cus.p360.opp.repeat')}</LxTag> : null}
        </span>
      ),
    },
    {
      /* 11%：值是「Echo（智能体）」中英混排；表头英文 `Follow-up owner`（≈84px）
         也要放得下，11% @1280 = 110px − 内边距 16px = 86px ✓。 */
      title: t('opp.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '11%',
      render: (value: string) => (
        <span className="lx-oppowner lx-p360__owner" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      title: t('cus.col.nextFollow'),
      dataIndex: 'nextFollowUp',
      key: 'nextFollowUp',
      width: '10%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      /* 操作：已关闭的商机既不必「跟进」也无从「关闭」，给破折号而不是留空 ——
         空白会被读成"这行数据缺了"，破折号才读成"无事可做"（与商机中心同一处置）。

         12% 在本表是宽裕的（只有九列）：两个动作（英文 `Follow up / Close`）
         在 12px 字号下约 85px + 间距，12% @1280 = 120px − 内边距 16px = 96px，不折行。
         两个动作能压到 85px 靠的是 `.lx-oppops .lx-cell-link { padding: 0 }`
         —— 清掉按钮残留的 UA 默认 padding，每个动作省 12px（见 styles/workspace.css）。 */
      title: t('common.action'),
      key: 'action',
      width: '12%',
      render: (_value: unknown, row: OppRow) =>
        isOpenStage(row.stage) ? (
          <span className="lx-oppops">
            <button type="button" className="lx-cell-link lx-focusable">
              {t('opp.action.followUp')}
            </button>
            <button type="button" className="lx-cell-link lx-focusable">
              {t('opp.action.close')}
            </button>
          </span>
        ) : (
          <span className="lx-muted">—</span>
        ),
    },
  ];

  /**
   * 跟进记录行：按最近跟进时间倒序（越近越靠上）。
   *
   * 一条商机一行 —— 演示数据把"跟进记录"建模成**商机上的最近一次跟进**
   * （`lastFollowUp` / `followSummaryKey` / `nextFollowUp` 同属那一次），
   * 与卡片版口径完全一致，只是换了呈现。真接入后这里会换成 `cus_follow_up` 明细表，
   * 一行才对应一次跟进。
   */
  const followRows = [...customer.opportunities].sort((a, b) => (a.lastFollowUp < b.lastFollowUp ? 1 : -1));

  /**
   * 跟进记录列（用户指定四列）。
   *
   * 列宽同样是**百分比、合计 100%**（`fit`）。四列的分法是"一列吃余量"：
   * 「跟进小结」是本表唯一的散文列，且它越长越有信息量 —— 58% 全给它，
   * 其余三列（两个日期 + 人名）只需放下自己的内容和英文表头。
   */
  const followColumns = [
    {
      title: t('cus.p360.follow.time'),
      dataIndex: 'lastFollowUp',
      key: 'lastFollowUp',
      width: '13%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
    {
      title: t('opp.col.owner'),
      dataIndex: 'ownerKey',
      key: 'owner',
      width: '14%',
      render: (value: string) => (
        <span className="lx-oppowner lx-p360__owner" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      title: t('cus.p360.follow.summary'),
      dataIndex: 'followSummaryKey',
      key: 'summary',
      width: '58%',
      render: (value: string) => (
        <span className="lx-p360__summary" title={t(value)}>
          {t(value)}
        </span>
      ),
    },
    {
      title: t('cus.p360.follow.next'),
      dataIndex: 'nextFollowUp',
      key: 'nextFollowUp',
      width: '15%',
      render: (value: string) => <span className="lx-num" title={value}>{value}</span>,
    },
  ];

  return (
    <PageContainer titleKey="cus.p360.title" hideTitle>
      {/* 页面级返回链接 —— 在 hero 卡之外、正文第一行。 */}
      {backLink}

      {/* 页头 = 一企一档：身份 → 概览数 → 客户主体字段表 → 联系人。
          客户主体与联系人原先在右侧栏，2026-09-23 按用户要求合并进这一块。
          （返回按钮 2026-09-25 从这里移到卡片之外 —— 卡片里的返回读作"这张卡片的返回"。） */}
      <section className="lx-glass lx-p360__hero">
        <div className="lx-p360__head">
          <div className="lx-p360__idblock">
            <h2 className="lx-p360__name">{customer.name}</h2>
            <div className="lx-p360__tags">
              <LxTag variant={TYPE_VARIANT[customer.type]}>{t(`cus.type.${customer.type}`)}</LxTag>
              <TierBadge tier={customer.tier} label={t(`cus.tier.${customer.tier}`)} />
              <span className="lx-p360__code">{customer.code}</span>
            </div>
          </div>
          {/* 右上角两个动作：编辑（改这家客户）· 新建商机（给这家客户加生意）。
              两者都作用在**当前客户**上，故并成一组；原先只有「新建商机」一个按钮，
              编辑入口加进来若各占一行会把页头撑成两行、把客户名挤到第二屏。 */}
          <div className="lx-p360__acts">
            <button
              type="button"
              className="lx-p360__act lx-focusable"
              onClick={() => setEditing(true)}
            >
              <EditOutlined />
              {t('cus.p360.editCustomer')}
            </button>
            <button
              type="button"
              className="lx-entrybar__create lx-focusable"
              onClick={() => {
                void navigate('/opportunity/new');
              }}
            >
              <UserAddOutlined />
              {t('cus.p360.newOpp')}
            </button>
          </div>
        </div>
        <dl className="lx-p360__facts">
          {facts.map((fact) => (
            <div key={fact.key} className="lx-p360__fact">
              <dt>{fact.label}</dt>
              <dd className="lx-num">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="lx-p360__profile">
          <section className="lx-p360__block">
            <LxSectionHeader title={t('cus.p360.section.base')} sub={t('cus.p360.section.baseSub')} />
            <dl className="lx-p360__specs">
              {baseFields.map((field) => (
                <div key={field.key} className="lx-p360__spec">
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="lx-p360__block">
            <LxSectionHeader
              title={t('cus.p360.section.contact')}
              sub={t('cus.p360.section.contactSub')}
              /* 人数写在标题右侧：多联系人后，"这个区里有几个对接人"变成需要一眼看到的事实 */
              actions={
                contacts.length > 1 ? (
                  <span className="lx-muted lx-num">
                    {t('cus.p360.contact.count', { count: contacts.length })}
                  </span>
                ) : undefined
              }
            />
            {/* 联系人清单（2026-10-07 由单人改清单）。主联系人排在最前并标
                「主」—— 不排在前的话，用户每次都要扫一遍才找到该找谁；
                不标的话，"谁是主"就成了要猜的事，而 360 页的整条时间线
                （跟进、成交）都是靠主联系人串起来的。 */}
            <ul className="lx-p360__contacts">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className={`lx-p360__contactrow${contact.primary ? ' is-primary' : ''}`}
                >
                  <div className="lx-p360__contactmain">
                    <span className="lx-p360__contactname">{t(contact.name)}</span>
                    {contact.primary ? (
                      <span className="lx-p360__contactbadge">{t('cus.p360.contact.primary')}</span>
                    ) : null}
                    <span className="lx-p360__contactrole">{t(contact.role)}</span>
                  </div>
                  <div className="lx-p360__contactchannels">
                    {contact.phone ? (
                      <span className="lx-p360__channel">
                        <PhoneOutlined aria-hidden="true" />
                        <span className="lx-num">{contact.phone}</span>
                      </span>
                    ) : null}
                    {contact.email ? (
                      <span className="lx-p360__channel">
                        <MailOutlined aria-hidden="true" />
                        <span>{contact.email}</span>
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      {/* 商机列表 / 跟进记录：同一位置切换，两块都吃满整宽。 */}
      <section className="lx-section lx-p360__body">
        <div className="lx-p360__tabhead">
          <div className="lx-tabbar" role="tablist" aria-label={t('cus.p360.title')}>
            <button
              type="button"
              role="tab"
              id="p360-tab-opp"
              aria-selected={tab === 'opp'}
              aria-controls="p360-panel-opp"
              className={`lx-tabbar__item lx-focusable${tab === 'opp' ? ' is-active' : ''}`}
              onClick={() => setTab('opp')}
            >
              {t('cus.p360.section.opp')}
              <span className="lx-tabbar__count lx-num">{oppRows.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="p360-tab-follow"
              aria-selected={tab === 'follow'}
              aria-controls="p360-panel-follow"
              className={`lx-tabbar__item lx-focusable${tab === 'follow' ? ' is-active' : ''}`}
              onClick={() => setTab('follow')}
            >
              {t('cus.p360.section.follow')}
              <span className="lx-tabbar__count lx-num">{followRows.length}</span>
            </button>
          </div>
          <span className="lx-p360__tabsub">
            {tab === 'opp' ? t('cus.p360.section.oppSub') : t('cus.p360.section.followSub')}
          </span>
        </div>

        {tab === 'opp' ? (
          <div id="p360-panel-opp" role="tabpanel" aria-labelledby="p360-tab-opp" className="lx-p360__opp">
            <LxTableCard>
              <LxTable<OppRow>
                columns={columns}
                dataSource={[...oppRows]}
                total={oppRows.length}
                pageNo={1}
                pageSize={20}
                /* 固定列宽 + 永不横滚：本表九列的自然宽装不进 1366 及以下的
                   内容区（998 / 1084px），开 fit 之后列宽只认上面的百分比。 */
                fit
              />
            </LxTableCard>
          </div>
        ) : (
          <div id="p360-panel-follow" role="tabpanel" aria-labelledby="p360-tab-follow" className="lx-p360__follow">
            <LxTableCard>
              <LxTable<(typeof followRows)[number]>
                columns={followColumns}
                dataSource={[...followRows]}
                total={followRows.length}
                pageNo={1}
                pageSize={20}
                /* 同上：四列同样走固定列宽，避免"哪条小结长一点就把表顶出去"。 */
                fit
              />
            </LxTableCard>
          </div>
        )}
      </section>

      {/* 编辑客户抽屉。字段清单与客户新建页共用 `./fields` 的同一份（见该文件说明），
    差别只有「备注」一项：360 页没有备注的展示位，在看不见的地方改字段是静默失败。
    初值每次打开都从 `customer` 重算，配 `destroyOnHidden` 关掉即复位 ——
    不加它的话改完 A 客户、关掉、切到 B 客户，抽屉里还留着 A 的值。 */}
      <FormEditDrawer
        open={editing}
        onClose={() => {
          /* 关掉即丢弃联系人改动：`ContactsEditor` 是受控组件，
             它的值存在 `contactDraft` 里，一关抽屉就没有下一次打开的起点了。
             不还原的话，"取消"这个动作在联系人这一段上会变成假的。 */
          setContactDraft(null);
          setEditing(false);
        }}
        titleKey="cus.p360.editTitle"
        subtitleKey="cus.p360.editSub"
        sections={customerEditSections(customer, t)}
        initialValues={customerEditValues(customer, t)}
        submitLabelKey="cus.p360.editSubmit"
        submitHintKey="cus.p360.edited"
        onSubmit={(values) => {
          /* 主联系人回写必须与字段改动**同一次 setState** 落下去。
             分两次 set 会有一帧中间态：客户字段已是新的、`contactKey` 还是旧的
             —— 而 `contactKey` 正是 360 页头部读的那一格。 */
          const draft = contactDraft ?? contactsOf(customer);
          /* 姓名为空的行直接丢弃：它是"刚点了新增还没填"的状态，
             落进数据会让联系人区出现一行空白，比没有这一行更糟。 */
          const named = draft.filter((row) => row.name.trim() !== '');
          const patchFields = customerEditPatch(values, customer, t);
          setPatch({ ...patchFields, ...syncPrimaryContact(named) });
          setContactPatch(named);
        }}
      >
        <ContactsEditor
          contacts={contactDraft ?? contactsOf(customer)}
          onChange={setContactDraft}
        />
      </FormEditDrawer>
    </PageContainer>
  );
}
