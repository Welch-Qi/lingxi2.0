# 灵犀系统多产品 API 契约（V1.0）

> 版本：V1.0 ｜ 2026-10-13 ｜ 三产品口径（灵犀 · 开物 · 元枢）
> 定位：文档先行五件套之一 —— 本文件为**唯一权威来源**。
> 配套：`contracts.md`（跨模块契约登记处）·《灵犀系统技术规约2.0》V2.1 ·《灵犀系统技术架构和组件选型方案2.0》V2.1
> 变更须留版本与操作人；契约类变更属 T4，需人工确认。AI 不得自主改写本文件。

---

## 一、契约分层（四类，各有唯一登记处）

| 层 | 载体 | 登记处 | 适用 |
|---|---|---|---|
| **① 模块间契约** | Java `api` 包（DTO + 接口 + 事件） | **`contracts.md`（唯一登记处）** | 三产品内部 |
| ② 对外开放 API | OpenAPI 3.0 | 本文 + `03-api/openapi/` | 租户系统集成 |
| ③ Webhook 回调 | OpenAPI 3.0（回调段） | 本文 | 事件通知外部系统 |
| ④ MCP 工具契约 | `MCP` 规范 | `contracts.md` + 元枢工具网关注册表 | 智能体调用 |

> **铁律**：任一新增/变更契约**必须先在 `contracts.md` 登记**，再改代码。未登记的跨模块调用评审直接驳回。
> **禁止**为智能体新建 `/api/agent/**` 影子写接口 —— 人工与智能体走同一套应用 Service、同一张表（双通道同源）。

---

## 二、路径命名与版本

```
/api/v1/{产品}/{域}/{资源复数}
```

| 段 | 取值 | 说明 |
|---|---|---|
| 产品段 | 省略（业务域）/ `sys`（元枢平台） | 三产品路径前缀见下表 |
| 域 | `sys` `dt` `sem` `ac` `wb` `cus` `prd` `ord` `svc` `mkg` `intel` `ana` `ag` `kc` `cc` | 与代码域前缀一致 |
| 资源 | 小写复数 | `leads` / `orders` / `tickets` |

| 产品 | 域前缀 | 示例 |
|---|---|---|
| 元枢 | `sys` `dt` `sem` `ac` | `/api/v1/sys/session`、`/api/v1/sem/metrics` |
| 灵犀 | `wb` `cus` `prd` `ord` `svc` `mkg` `intel` `ana` `ag` `kc` `cc` | `/api/v1/cus/leads` |
| 开物 | `kw`（预留，一期不实现） | — |

- **破坏性变更走新版本段**（`/api/v2`）；非破坏性变更（新增可选字段）可原地升级。
- 多语言字段一律 **JSONB**，形如 `{"zh-CN":"张三","en-US":"San Zhang"}`（见 `sys_user.display_name` 注释）。

---

## 三、HTTP 头约定（全站强制，引自技术规约附录 B）

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization` | ✅ | `Bearer` + Keycloak 签发 JWT |
| `X-Tenant-Id` | ✅ | 网关校验与 Token 一致后注入；**服务内从 `TenantContext` 读，禁止从请求参数取租户** |
| `X-Trace-Id` | ✅ | 网关生成，全链路透传：HTTP → 事件 → LLM → 工具 |
| `X-Idempotency-Key` | 写操作 ✅ | UUID；按 `key + tenantId` 去重 |
| `Accept-Language` | — | 用户语言（locale） |
| `X-Timezone` | — | IANA 时区名，优先用户配置 |
| `X-Agent-Code` | 智能体调用 ✅ | 智能体标识，用于审计与效能归集 |

> 服务间与智能体调用**必须透传** `X-Tenant-Id` / `X-Trace-Id` / 用户身份上下文；**缺失租户上下文的请求由拦截器直接拒绝**（`TenantContext.current()` 抛异常，绝不回退"全网可见"）。

---

## 四、统一响应体与分页

### 4.1 响应体（代码实读：`com.yuanshu.starter.core.web.R<T>`）

```json
{ "code": 0, "message": "success", "messageKey": "common.success", "data": {}, "traceId": "..." }
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | int | `0` = 成功；非 0 见第五节错误码表 |
| `message` | string | 面向开发者的**英文**描述 |
| `messageKey` | string | 面向用户提示的 **i18n 键**（前端据此查语言包） |
| `data` | T | 业务数据；失败时为 `null` |
| `traceId` | string | 与 `X-Trace-Id` 一致，排障入口 |

> `R` 是 record，**禁止各模块自行定义返回结构**。

### 4.2 分页（固定结构）

```json
{ "list": [], "total": 100, "pageNo": 1, "pageSize": 20 }
```

`pageSize` **默认 20、上限 200**（超限自动截断，不报错）。

---

## 五、错误码（6 位 `AABBCC`，引自技术规约附录 A）

格式：`AA` = 模块段 · `BB` = 子模块段 · `CC` = 序号；`0` = 成功。

| AA | 模块 | AA | 模块 | AA | 模块 |
|---|---|---|---|---|---|
| 01 | 公共/平台级 | 31 | 市场情报 | 70 | 知识中心 |
| 02 | 连接器与外部通道 | 40 | 经营分析 | 80 | 配置中心 |
| 10 | 工作台与角色工作台 | 50 | 数据底座（L1） | 98 | 数据任务/批处理 |
| 20 | 客户中心 | 60 | 智能体与 AI（L3） | 99 | 系统内部 |
| 21 | 商品中心 | — | — | — | — |
| 22 | 订单交付 | — | — | — | — |
| 23 | 售后服务 | — | — | — | — |
| 30 | 营销中心 | — | — | — | — |

**平台级公共错误码**（已实现于 `PlatformErrorCode`）：

| 码 | 含义 | 码 | 含义 |
|---|---|---|---|
| 010001 | 未认证 / Token 失效 | 010007 | 幂等冲突（重复请求） |
| 010002 | 无功能权限 | 010008 | 租户配额超限 |
| 010003 | 无数据权限（越权） | 010009 | 限流 |
| 010004 | 参数校验失败 | 010010 | 功能未开通（Feature Toggle） |
| 010005 | 资源不存在 | 019999 | 系统内部错误 |
| 010006 | 资源冲突（重复/并发版本） | 600001 | LLM 调用失败（已降级） |
| — | — | 600002 | 智能体任务失败（已转人工） |
| — | — | **600003** | **越界拦截（已转人工）** |
| — | — | **600004** | **待人工审批（自主度不足）** |
| — | — | 600005 | 预算超限（租户/任务 Token） |

> 智能体侧告警码：`600001~600005`，每条带 `messageKey`（如 `agent.error.needsApproval`）供前端查语言包。

---

## 六、三产品的接口面

### 6.1 元枢四类能力出口（唯一底座出口）

| # | 能力出口 | 承载模块 | 对外契约 | 状态 |
|---|---|---|---|---|
| ① | 多租户会话与权限 | `yuanshu-platform` | `SessionQueryApi` / `TenantQueryApi` / `AuditApi` / `IdApi` / `FileApi` / `NotifyApi` | ⬜ 骨架（`api` 包已建，仅 `package-info`） |
| ② | 大数据与指标语义 | `yuanshu-data` + `yuanshu-semantic` | `EntityResolveApi` / `MetricQueryApi` / `OntologyQueryApi` / `IndustryPackManageApi` | ✅ 3/4 已实现（`EntityResolveApi` 待补） |
| ③ | 智能体工厂 | `yuanshu-agent-factory` | `AutonomyPolicyApi` / `AgentRegistrationApi` | ✅ 2/2 已实现 |
| ④ | 提示词与知识引擎资产 | `yuanshu-agent-factory` + `yuanshu-semantic` | 提示词版本链 / 知识引擎框架 | ⬜ 骨架 |

**对应 REST 落点（建议，待评审）**

| 契约 | 建议路径 |
|---|---|
| `SessionQueryApi` | `GET /api/v1/sys/session` —— 前端首屏**唯一**会话入口 |
| `TenantQueryApi` | `GET /api/v1/sys/tenant/current` —— 时区/语言/品牌 |
| `AuditApi` | `POST /api/v1/sys/audit`（内部为主） |
| `IdApi` | `POST /api/v1/sys/ids`（批量取雪花 ID） |
| `FileApi` | `POST /api/v1/sys/files/presigned-put` —— 预签名直传 |
| `NotifyApi` | `POST /api/v1/sys/notifications` —— **统一通知出口，业务模块禁自建短信/邮件** |
| `EntityResolveApi` | `POST /api/v1/dt/entity/resolve` —— 企业实体消歧 |
| `MetricQueryApi` | `POST /api/v1/sem/metrics/query` |
| `OntologyQueryApi` | `GET /api/v1/sem/ontology/{code}/terms` |
| `IndustryPackManageApi` | `POST /api/v1/sem/industry-packs/{code}/install` |
| `AutonomyPolicyApi` | `GET /api/v1/ac/autonomy-policy?agentCode=&sceneCode=` —— **运行时唯一自主度判据** |
| `AgentRegistrationApi` | `POST /api/v1/ac/agents/register` —— **开物五智能体必须经此注册** |

### 6.2 灵犀业务域对外 API

按 11 域逐个登记（工作台/客户/商品/订单/售后/营销/情报/分析/智能体业务/知识内容/业务配置）。

**客户域三中心同域复用** `lingxi-customer`，故其路径下有三条资源线：

| 资源 | 路径 |
|---|---|
| 客户 | `/api/v1/cus/companies`、`/api/v1/cus/contacts` |
| 线索 | `/api/v1/cus/leads` |
| 商机 | `/api/v1/cus/opportunities` |

> `LeadQueryApi` / `CompanyQueryApi` 已登记于 `contracts.md`，代码待补（`api` 包已建）。

### 6.3 开物接入面（一期只登记不实现）

| 契约 | 提供方 | 用途 | 命名空间 |
|---|---|---|---|
| 唯一产品 ID 查询 | `yuanshu-semantic` | 开物六模块共用的产品主数据入口 | `kw.*` |
| 智能体注册 | `yuanshu-agent-factory` | 开物五智能体接入元枢治理面 | `ys.ac.*` |
| OTD 协同事件 | `lingxi-order` ↔ 开物 | OP-ORD-02 ↔ PE-02 | `kw.*` |
| 质量反馈联动事件 | `lingxi-service` ↔ 开物 | OP-SVC-01 ↔ QS-06 | `kw.*` |

---

## 七、事件契约

**命名**：`{命名空间}.{域}.{实体}.{动作}`，三产品各占独立命名空间。

| 命名空间 | 归属 | 示例 |
|---|---|---|
| `lx.*` | 灵犀（存量，**前向兼容不得改名**） | `lx.cus.lead.created` · `lx.ord.order.status_changed` |
| `ys.*` | 元枢（新增底座治理事件） | `ys.sys.user.role_changed` · `ys.ac.autonomy.policy_updated` |
| `kw.*` | 开物（预留） | — |

**投递**：本地事务 + Outbox 表（`sys_outbox`）→ 后台轮询投递 → 消费方幂等落库（`sys_event_consume_log`，按 `event_id` 去重）。
> 不引入消息中间件（最小组件数原则），同时保证「业务成功则事件不丢」。

**字段**：`event_id`（全局唯一/幂等键）· `event_type` · `tenant_id` · `payload`（JSONB，**仅放消费方必需字段，不放整实体**）· `occurred_at`（UTC）。

---

## 八、模型调用契约（场景码，非模型名）

> **铁律**：业务代码只声明**场景码**，禁止指定具体模型名 —— 模型名只允许出现在 `config/model.yml`。
> 理由：模型可随时替换与降级（主 → 备用 → 规则兜底），写死模型名将导致换模型要改业务代码并回归全部场景。

命名 `{域}.{场景}.{动作}`，已内置 5 个（`ModelScene`）：

| 场景码 | 用途 |
|---|---|
| `mkg.email.write` | 邮件撰写 |
| `kc.script.suggest` | 话术推荐 |
| `ana.qa.answer` | 问答式取数 |
| `cus.lead.score` | 线索评分 |
| `kc.prompt.embed` | 知识向量化 |

所有调用经元枢模型网关（`ModelGateway`），禁止绕过。

---

## 九、类型生成（前端侧强制）

- 前端接口类型 **禁止手写**：`packages/lingxi-types` 由本文档对应的 OpenAPI 契约生成（`pnpm gen:types` → `openapi/gen-types.sh`）。
- 生成口径：每个产品/域一个 OpenAPI 文件 → 合并生成单一 `lingxi-types` 包。

---

## 十、目录组织建议

```
lingxi-docs/03-api/
├── _index.md
├── 灵犀系统多产品API契约-1.0.md          # 本文（总纲）
└── openapi/
    ├── yuanshu/{sys,dt,sem,ac}/*.yaml   # 元枢四域
    ├── lingxi/{wb,cus,prd,ord,svc,mkg,intel,ana,ag,kc,cc}/*.yaml
    └── kaiwu/                            # 开物（一期占位）
```

> **待评审**：是否将 OpenAPI 拆到域级文件，还是元枢/灵犀各合并为一个文件（文件数与评审成本的取舍）。

---

## 十一、待确认项（不阻塞开工，开工前须澄清） 3 项

| # | 问题 |
|---|---|
| 1 | 第一节的「四层契约」划分是否认可？（① 模块间 ② 对外开放 ③ Webhook ④ MCP） |
| 2 | 第 6.1 节的「契约 → REST 路径」落点是**我的建议**，需你确认后才能写入 OpenAPI |
| 3 | 第十节 OpenAPI 拆域级还是产品级合并？ |

---

*本文件为权威文档；修改须走人工确认并留版本与操作人记录。*
