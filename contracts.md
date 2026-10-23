# contracts.md · 模块间契约索引

> **本文件的定位**：跨模块调用与事件的**唯一登记处**。
> 规则：跨模块只能依赖目标模块的 `api` 包（DTO + 接口 + 事件），任一新增/变更契约**必须先在此登记**，
> 再改代码。未登记的跨模块调用在评审中直接驳回。
>
> 【强制】契约变更属 T4 任务，需人工确认；契约是前后端与模块间唯一的耦合面。

---

## 一、契约登记格式

每个模块在本文件「模块契约」章节下登记一节，格式固定：

```markdown
### {模块名}（lingxi-{域}）

**对外接口**（`com.lingxi.{域}.api`）

| 接口 | 用途 | 调用方 | 稳定性 |
|---|---|---|---|
| `XxxQueryApi#getById(Long)` | 按 ID 取只读视图 | order / service | 稳定 |
| `XxxCommandApi#create(XxxCreateCmd)` | 创建（同步，仅限强一致场景） | — | 稳定 |

**对外事件**（`com.lingxi.{域}.api.event`）

| 事件 | 触发时机 | 消费方 | 幂等键 |
|---|---|---|---|
| `lx.{域}.{实体}.{动作}` | ... | ... | `eventId` |

**契约变更记录**

| 日期 | 变更 | 影响范围 | 任务号 |
|---|---|---|---|
```

---

## 二、契约设计五条硬规则

| # | 规则 | 说明 |
|---|---|---|
| 1 | **优先事件、慎用同步** | 跨模块同步调用只用于「查询只读视图」与「强一致且低延迟」两场景；其余走事件 |
| 2 | **DTO 不共享实体** | `api` 包只放 DTO；禁止其他模块依赖本模块 `domain` 实体（否则一改表结构全线炸） |
| 3 | **同步调用超时 ≤3s** | 域间同步调用必须设超时，禁止无限等待；超时按失败处理并降级 |
| 4 | **消费必须幂等** | 消费方按 `eventId` 去重（`sys_event_consume_log`），禁止假设「只会投一次」 |
| 5 | **只增不改语义** | 已有字段不改含义只新增；废弃字段标记 `@Deprecated` 并保留 ≥1 个版本 |

---

## 三、事件命名与投递机制

**命名**：`{命名空间}.{域}.{实体}.{动作}`，三产品各占独立命名空间（硬约束 3：存量 `lx.*` 前向兼容，不得改名）：

| 命名空间 | 归属 | 说明 |
|---|---|---|
| `lx.*` | 灵犀（存量） | 业务事件，**存量不动**；示例：`lx.cus.lead.created` · `lx.ord.order.status_changed` · `lx.svc.ticket.escalated` |
| `ys.*` | 元枢（新增） | 底座治理事件；示例：`ys.sys.user.role_changed` · `ys.ac.autonomy.policy_updated` |
| `kw.*` | 开物（预留） | 一期只登记不实现；见第十一节开物契约预留 |

**投递**：本地事务 + Outbox 表（`sys_outbox`）→ 后台轮询投递 → 消费方幂等落库。
理由：不引入消息中间件（最小组件数原则），同时保证「业务成功则事件不丢」。

| 字段 | 说明 |
|---|---|
| `event_id` | 全局唯一，消费幂等键 |
| `event_type` | `lx.{域}.{实体}.{动作}` |
| `tenant_id` | 租户上下文，消费方按此隔离 |
| `payload` | JSONB，仅放消费方必需字段（不放整实体） |
| `occurred_at` | UTC |

---

## 四、模块清单与归属（三产品：元枢 4 单体 + 灵犀 11 单体 + BOM）

> 目录按产品归口物理重组：`lingxi-server/yuanshu/**`（元枢底座）、`lingxi-server/lingxi/**`（灵犀集群）。
> **groupId 统一保留 `com.lingxi`**（组织级版本源不动），底座四模块 Java 包改名 `com.yuanshu.*`。

### 元枢数智底座（`com.yuanshu.*`，单体 4）

| 模块 | 域前缀 | 职责 | 主要上游 | 主要下游 |
|---|---|---|---|---|
| `yuanshu-platform` | `sys` | L0 平台公共（认证 / IAM / 租户 / 组织 / 审计 / ID / 文件 / 通知；CC-13~18 权限用户角色） | — | 全模块 |
| `yuanshu-data` | `dt` | L1 大数据（接入 / 企业实体中心 / 资产 / 质量；DT-01~07、GM-01~12） | 外部数据源 | semantic, intel, analytics |
| `yuanshu-semantic` | `sem` | 语义管理（行业本体 / 术语编码 / **指标口径中心** / 行业包托管；GM-01~12 + KC-01~06 知识引擎框架） | data | intel, analytics, agent-factory |
| `yuanshu-agent-factory` | `ac` | 智能体工厂治理面（AC-01~09、AG-07~09 定义/自主度/审批/轨迹；KC-16~19/22 提示词资产） | platform | agent-runtime, 灵犀各域 |

### 灵犀营销服集群（`com.lingxi.*`，单体 11）

| 模块 | 域前缀 | 职责 | 主要上游 | 主要下游 |
|---|---|---|---|---|
| `lingxi-workbench` | `wb` / `rw` | 统一工作台 + 角色工作台（聚合各域只读视图） | 全模块 | — |
| `lingxi-customer` | `cus` | 客户 / 线索 / 跟进 / 商机 | intel（情报线索） | order, marketing, analytics |
| `lingxi-product` | `prd` | 商品主数据 / 素材 / 价格 | — | order, marketing, analytics |
| `lingxi-order` | `ord` | 订单交付 / OTD 节点 | customer, product | service, analytics |
| `lingxi-service` | `svc` | 售后工单 / 投诉 / 赔付 | order | analytics, knowledge |
| `lingxi-marketing` | `mkg` | 营销活动 / 内容 / 社媒分发 | product, customer, knowledge | analytics, intel |
| `lingxi-intel` | `intel` | 市场情报 / 竞品 / 趋势 | yuanshu-data / semantic | customer, marketing, analytics |
| `lingxi-analytics` | `ana` | 经营分析 / 指标 / 看板 | 全模块（只读） | — |
| `lingxi-agent` | `ag` | 智能体业务（仅 AG-01~06 六智能体业务逻辑；治理面已剥离至 yuanshu-agent-factory） | 全模块 | agent-runtime |
| `lingxi-knowledge` | `kc` | 知识内容（仅 KC-07~15 话术 / 模板 / QA；提示词资产归元枢） | — | agent, marketing, service |
| `lingxi-configcenter` | `cc` | 业务配置（仅 CC-09~12；CC-01~08 能力声明归元枢、界面留灵犀；CC-13~18 已迁元枢） | — | 全模块 |
| `lingxi-dependencies` | — | BOM：版本唯一锁定处（三产品共用） | — | 全模块（构建期） |

**独立部署进程（不计入单体模块，均归元枢 `com.yuanshu.*`）**：
- `yuanshu-agent-runtime` — L3 智能体运行时（编排 / 工具网关 / 护栏 / 边界拦截 / Token 计量）
- `yuanshu-data-jobs` — 数据任务进程（采集 / 清洗 / 实体消歧 / 指标计算）

**开物工业集群（一期只登记不建目录）**：`kaiwu/` 聚合二期创建，模块规划 `kaiwu-product-archive / kaiwu-quality / kaiwu-carbon / kaiwu-equipment / kaiwu-efficiency / kaiwu-industry-pack`（对应 KO/PC/QS/CB/EQ/PE/IP）；见第十一节。

---

## 五、三产品归口与元枢四类能力出口（一底两翼）

> 元枢只对灵犀与未来开物提供**四类公共能力出口**；两翼集群均**只经此调用**，不得自建第二套底座能力（硬约束 1/2，ArchUnit 跨产品方向规则机器校验）。

| # | 能力出口 | 承载模块（元枢） | 对外契约 | 灵犀/开物如何调用 |
|---|---|---|---|---|
| ① | 多租户会话与权限 | `yuanshu-platform` | `SessionQueryApi` / `TenantQueryApi` / `AuditApi` / `IdApi` | 前端首屏唯一会话入口；权限判定只在后端 platform |
| ② | 大数据与指标语义 | `yuanshu-data` + `yuanshu-semantic` | `EntityResolveApi` / `MetricQueryApi` / `OntologyQueryApi` / `IndustryPackManageApi` | 口径/本体/实体唯一来源，业务不得自算 |
| ③ | 智能体工厂 | `yuanshu-agent-factory` | `AutonomyPolicyApi` / `AgentRegistrationApi` | **开物五智能体必须经 `AgentRegistrationApi` 注册**（§6.3 风险 3） |
| ④ | 提示词与知识引擎资产 | `yuanshu-agent-factory` / `yuanshu-semantic` | 提示词版本链 / 知识引擎框架（KC-01~06、KC-16~19/22） | 代码只引用场景码，不内联提示词 |

**跨产品依赖方向红线**（ArchUnit 新增 2 条 + 既有规则）：
- `com.yuanshu..` 禁止依赖 `com.lingxi.{业务域}..`（元枢不承载业务）；
- 灵犀各域禁止依赖元枢的非 `api` 包（跨产品只能依赖 api 契约）。

---

## 六、已定义的核心契约

### yuanshu-platform（`com.yuanshu.sys.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `SessionQueryApi#current()` | 取当前会话上下文（用户 / 租户 / 权限码） | 前端首屏唯一入口，对应 `/api/v1/platform/session` |
| `TenantQueryApi#currentTenant()` | 取当前租户配置（时区 / 语言 / 品牌） | 全模块依赖 |
| `FileApi#presignedPut(...)` | 文件直传预签名 | 禁止业务模块自建上传通道 |
| `NotifyApi#send(NotifyCmd)` | 统一通知出口 | 禁止各模块自建短信 / 邮件发送 |
| `AuditApi#log(AuditCmd)` | 审计留痕 | 关键动作强制调用（价格 / 合同 / 权限变更 / 接管） |
| `IdApi#nextId()` | 雪花 ID | 禁止各模块自造 ID 生成器 |

**对外事件**（底座治理，元枢命名空间）：`ys.sys.tenant.created` · `ys.sys.tenant.quota_exhausted` · `ys.sys.user.role_changed`

### lingxi-agent（`com.lingxi.agent.api`，仅业务 AG-01~06）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `AgentTaskQueryApi#myPending(...)` | 我的待处理任务（待审批 + 待人工） | 前端任务中心数据源 |
| `AgentTaskCommandApi#takeover(taskId, reason)` | 人工接管 | 原因强制填写，记审计 |

**对外事件**（业务运行时）：`lx.ag.task.succeeded` · `lx.ag.task.failed`

> 自主度、审批、轨迹与拦截属**治理面**，已剥离至 `yuanshu-agent-factory`（见下）。

### yuanshu-agent-factory（`com.yuanshu.ac.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `AutonomyPolicyApi#resolve(agentCode, sceneCode)` | 解析场景自主度 | **运行时唯一自主度判据**；禁止业务代码自行判断能否放行（自 lingxi-agent 迁入） |
| `AgentRegistrationApi#register(AgentRegistrationCmd)` | 智能体注册 | **开物五智能体必须经此注册**；OwnerProduct 含 LINGXI/KAIWU |

**对外事件**（治理面）：`ys.ac.autonomy.policy_updated` · `ys.ac.agent.registered` · `ys.ac.boundary.intercepted` · `ys.ac.task.needs_approval`

### lingxi-customer（`com.lingxi.customer.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `LeadQueryApi#getById(Long)` | 线索只读视图 | 供 order / marketing 引用 |
| `CompanyQueryApi#getById(Long)` | 企业档案只读视图 | 供 intel / marketing 引用 |

**对外事件**：`lx.cus.lead.created` · `lx.cus.lead.qualified` · `lx.cus.lead.converted` · `lx.cus.followup.added`

### lingxi-order（`com.lingxi.order.api`）

**对外事件**：`lx.ord.order.created` · `lx.ord.order.status_changed` · `lx.ord.otd.node_delayed`

### lingxi-service（`com.lingxi.service.api`）

**对外事件**：`lx.svc.ticket.created` · `lx.svc.ticket.escalated` · `lx.svc.compensation.approved`

### lingxi-marketing（`com.lingxi.marketing.api`）

**对外事件**：`lx.mkg.campaign.launched` · `lx.mkg.content.published` · `lx.mkg.lead.captured`

### yuanshu-data（`com.yuanshu.dt.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `EntityResolveApi#resolve(ResolveCmd)` | 企业实体消歧（域名 > 名称规范化 > 地址+行业） | 相似度 ≥0.85 自动归并；第三级入人工队列 |

**对外事件**：`lx.dt.entity.merged` · `lx.dt.entity.review_queued` · `lx.dt.quality.issue_raised`

> 指标口径查询 `MetricQueryApi` 属语义层，已迁至 `yuanshu-semantic`。

### yuanshu-semantic（`com.yuanshu.sem.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `MetricQueryApi#query(MetricQuery)` | 指标口径查询（自 yuanshu-data 迁入语义侧） | 指标定义唯一来源，业务模块不得自算口径 |
| `OntologyQueryApi#getTerms(ontologyCode)` | 行业本体 / 术语编码查询 | 三产品共享的语义基底 |
| `IndustryPackManageApi#install(packCode)` | 行业包托管（安装 / 启用 / 版本） | 开物电池行业包二期经此接入 |

**对外事件**：`ys.sem.metric.definition_changed` · `ys.sem.industry_pack.installed`

> **待补齐**：workbench / product / intel / analytics / knowledge / configcenter 的对外契约在
> 各模块设计完成后按第一节格式补登。**未登记不得开始跨模块调用开发。**

---

## 七、契约变更流程

```
① 在本文件登记变更（含影响范围与任务号）
② 更新 lingxi-docs/03-api 对应 OpenAPI 契约   ← AI 可写（规约 V2.2 起开放）
③ 人工确认（T4）—— 环节在 PR 评审时，不在 AI 动手前
④ 实现 + 契约测试（Pact，节点 8）
⑤ CI 全绿 + ≥1 名模块 Owner 评审
```

**禁止**：先改代码再补文档；只改一边（生产者改了消费方不知道）；未登记的口头约定。

> **2026-10-23 变更（规约 V2.2）**：`lingxi-docs/03-api/` 已开放给 AI 写入 ——
> 契约是 API-First 的产物（§4.12「先契约后开发」），本就该由执行方产出，
> 禁写会逼出「先写代码后补契约」的倒挂。
> **人工确认（T4）并未取消**，只是确认环节从「AI 动手前」移到「PR 评审时」。
> `contracts.md`（本文件）的登记仍由人执行；`03-api/` 以外的 `docs/` 权威文档仍禁写。

---

## 八、开物契约预留（一期只登记、不实现）

> 遵循归口表 §6.4：开物一期不建目录，仅在此预留契约三件套，实现随开物二期任务派发。

| 契约 | 提供方（元枢） | 用途 | 命名空间 |
|---|---|---|---|
| 唯一产品 ID 查询 | `yuanshu-semantic`（经 `OntologyQueryApi`/产品档案） | 开物六模块共用的产品主数据入口 | `kw.*` |
| `AgentRegistrationApi` 注册 | `yuanshu-agent-factory` | 开物五智能体接入元枢治理面（§6.3 风险 3） | `ys.ac.*` |
| OTD 协同事件 | 灵犀 `lingxi-order` ↔ 开物 | OP-ORD-02 ↔ PE-02 交付—能效联动 | `kw.*` |
| 质量反馈联动事件 | 灵犀 `lingxi-service` ↔ 开物 | OP-SVC-01 ↔ QS-06 售后—质量闭环 | `kw.*` |

---

## 九、本次结构升级契约迁移记录

| 日期 | 变更 | 性质 | 影响范围 | 任务号 |
|---|---|---|---|---|
| 2026-10-12 | 底座四模块改名 `lingxi-*`→`yuanshu-*`（platform/data 契约条目归入元枢名下；Java 包 `com.yuanshu.*`，groupId 保留 `com.lingxi`） | T4 | 元枢 + 全仓引用 | 本计划（确认即视为人工确认） |
| 2026-10-12 | 新增 `yuanshu-semantic`（承接 MetricQueryApi/OntologyQueryApi/IndustryPackManageApi）与 `yuanshu-agent-factory`（承接 AutonomyPolicyApi/AgentRegistrationApi） | T4 | 语义/治理面契约 | 本计划 |
| 2026-10-12 | `AutonomyPolicyApi` 自 lingxi-agent 迁至 yuanshu-agent-factory；`MetricQueryApi` 自 yuanshu-data 迁至 yuanshu-semantic | T4 | 跨模块调用方 | 本计划 |
| 2026-10-12 | 事件命名空间分区：存量 `lx.*` 不动（硬约束 3）；元枢底座治理事件新增 `ys.*`；开物预留 `kw.*` | T4 | 事件登记 | 本计划 |
| 2026-10-12 | 登记开物契约三件套（只登记不实现） | T4 | 开物二期 | 本计划 |
