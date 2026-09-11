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

**命名**：`lx.{域}.{实体}.{动作}`
示例：`lx.cus.lead.created` · `lx.ord.order.status_changed` · `lx.svc.ticket.escalated`

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

## 四、模块清单与归属（14 个 Maven 模块）

| 模块 | 域前缀 | 职责 | 主要上游 | 主要下游 |
|---|---|---|---|---|
| `lingxi-workbench` | `wb` / `rw` | 统一工作台 + 角色工作台（聚合各域只读视图） | 全模块 | — |
| `lingxi-customer` | `cus` | 客户 / 线索 / 跟进 / 商机 | intel（情报线索） | order, marketing, analytics |
| `lingxi-product` | `prd` | 商品主数据 / 素材 / 价格 | — | order, marketing, analytics |
| `lingxi-order` | `ord` | 订单交付 / OTD 节点 | customer, product | service, analytics |
| `lingxi-service` | `svc` | 售后工单 / 投诉 / 赔付 | order | analytics, knowledge |
| `lingxi-marketing` | `mkg` | 营销活动 / 内容 / 社媒分发 | product, customer, knowledge | analytics, intel |
| `lingxi-intel` | `intel` | 市场情报 / 竞品 / 趋势 | lingxi-data（L1） | customer, marketing, analytics |
| `lingxi-analytics` | `ana` | 经营分析 / 指标 / 看板 | 全模块（只读） | — |
| `lingxi-agent` | `ag` / `ac` | 智能体中心（管理面：定义 / 自主度 / 审批 / 轨迹） | 全模块 | agent-runtime |
| `lingxi-knowledge` | `kc` | 知识中心（模板 / 提示词 / 话术库 / 向量检索） | — | agent, marketing, service |
| `lingxi-configcenter` | `cc` | 配置中心（企业公约 / 权限 / 开关 / 字典 / 全球化） | — | 全模块 |
| `lingxi-data` | `dt` | L1 数据底座（接入 / 实体中心 / 资产 / 质量 / 指标） | 外部数据源 | intel, analytics, customer |
| `lingxi-platform` | `sys` | L0 平台公共（认证 / IAM / 租户 / 组织 / 文件 / 通知 / 审计 / ID / 检索） | — | 全模块 |
| `lingxi-dependencies` | — | BOM：版本唯一锁定处 | — | 全模块（构建期） |

**独立部署进程（不计入单体模块）**：
- `lingxi-agent-runtime` — L3 智能体运行时（编排 / 工具网关 / 护栏 / 边界拦截 / Token 计量）
- `lingxi-data-jobs` — 数据任务进程（采集 / 清洗 / 实体消歧 / 指标计算）

---

## 五、已定义的核心契约

### lingxi-platform（`com.lingxi.platform.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `SessionQueryApi#current()` | 取当前会话上下文（用户 / 租户 / 权限码） | 前端首屏唯一入口，对应 `/api/v1/platform/session` |
| `TenantQueryApi#currentTenant()` | 取当前租户配置（时区 / 语言 / 品牌） | 全模块依赖 |
| `FileApi#presignedPut(...)` | 文件直传预签名 | 禁止业务模块自建上传通道 |
| `NotifyApi#send(NotifyCmd)` | 统一通知出口 | 禁止各模块自建短信 / 邮件发送 |
| `AuditApi#log(AuditCmd)` | 审计留痕 | 关键动作强制调用（价格 / 合同 / 权限变更 / 接管） |
| `IdApi#nextId()` | 雪花 ID | 禁止各模块自造 ID 生成器 |

**对外事件**：`lx.sys.tenant.created` · `lx.sys.tenant.quota_exhausted` · `lx.sys.user.role_changed`

### lingxi-agent（`com.lingxi.agent.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `AgentTaskQueryApi#myPending(...)` | 我的待处理任务（待审批 + 待人工） | 前端任务中心数据源 |
| `AgentTaskCommandApi#takeover(taskId, reason)` | 人工接管 | 原因强制填写，记审计 |
| `AgentTaskCommandApi#approve/reject(taskId, ...)` | 审批通过 / 驳回 | 仅 `NEEDS_APPROVAL` 可调用 |
| `AutonomyPolicyApi#resolve(agentCode, sceneCode)` | 解析场景自主度 | **运行时唯一自主度判据**；禁止业务代码自行判断能否放行 |

**对外事件**：`lx.ag.task.needs_approval` · `lx.ag.task.needs_human` · `lx.ag.task.succeeded` · `lx.ag.task.failed` · `lx.ag.boundary.intercepted`

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

### lingxi-data（`com.lingxi.data.api`）

**对外接口**

| 接口 | 用途 | 说明 |
|---|---|---|
| `EntityResolveApi#resolve(ResolveCmd)` | 企业实体消歧（域名 > 名称规范化 > 地址+行业） | 相似度 ≥0.85 自动归并；第三级入人工队列 |
| `MetricQueryApi#query(MetricQuery)` | 指标口径查询 | 指标定义唯一来源，业务模块不得自算口径 |

**对外事件**：`lx.dt.entity.merged` · `lx.dt.entity.review_queued` · `lx.dt.quality.issue_raised`

> **待补齐**：workbench / product / intel / analytics / knowledge / configcenter 的对外契约在
> 各模块设计完成后按第一节格式补登。**未登记不得开始跨模块调用开发。**

---

## 六、契约变更流程

```
① 在本文件登记变更（含影响范围与任务号）
② 更新 lingxi-docs/03-api 对应 OpenAPI 契约
③ 人工确认（T4）
④ 实现 + 契约测试（Pact，节点 8）
⑤ CI 全绿 + ≥1 名模块 Owner 评审
```

**禁止**：先改代码再补文档；只改一边（生产者改了消费方不知道）；未登记的口头约定。
