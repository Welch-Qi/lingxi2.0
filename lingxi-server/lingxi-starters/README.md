# lingxi-starters · 灵犀业务域通用 Starter（一期空缺）

> 本目录为**预留位**，当前不含任何 Maven 模块，**未纳入 `lingxi-server/pom.xml` 的 `<modules>`**。

## 定位

三产品拆分后，公共 Starter 按产品归属分为两组：

| 组 | 目录 | 包根 | 一期状态 |
|---|---|---|---|
| **元枢底座技术能力**（5 个） | `../yuanshu-starters/` | `com.yuanshu.starter.*` | ✅ 已建：core / mybatis / security / llm / observability |
| **灵犀业务域通用件** | 本目录 | `com.lingxi.starter.*` | ⬜ **一期空缺，二期按需创建** |

## 为什么底座 Starter 全归元枢

逐类核对现有 5 个 Starter 的全部 31 个类，**无一条是业务域能力**：

| Starter | 内容 | 归属 |
|---|---|---|
| `yuanshu-starter-core` | 统一响应体 `R` / 全局异常 / 错误码 / TraceId / 租户上下文 / 审计字段填充 | 平台底座 |
| `yuanshu-starter-mybatis` | 租户插件 `YuanshuTenantLineHandler` / 免注入白名单 | 租户隔离四道防线实现 |
| `yuanshu-starter-security` | `PermissionService` / `@RequirePermission` / `@RequireDataScope` / 切面 | 三层权限决策 |
| `yuanshu-starter-observability` | `BizLogger` / `YuanshuMetrics` | 可观测底座 |
| `yuanshu-starter-llm` | `ModelGateway` / `ModelScene` / `GuardrailChain` | 模型网关 + 护栏 |

与《三产品架构规划-20260930》§5 对齐：元枢第一阶段只做**语义本体、多租户、智能体工厂、模型网关**——其中多租户与模型网关正是本组提供的能力。

## 何时该在本目录建模块

仅当出现**灵犀业务域内复用、且不属于任何单一业务模块**的技术件时，才建 `lingxi-starter-*`。判据：

| 应建在本目录 | 不应建（放哪） |
|---|---|
| 两个以上灵犀业务模块共用的技术件 | 单一模块自用 → 放该模块 `infra` |
| 与元枢底座无关的能力 | 与元枢能力重复 → **禁止**，改用元枢 Starter |
| 灵犀专属的集成适配（如渠道 SDK 封装） | 任何承载业务规则的代码 |

## 约束

1. 本组 artifactId 形如 `lingxi-starter-{技术件}`，包根 `com.lingxi.starter.{技术件}`。
2. **不得反向依赖元枢实现层** —— 只允许依赖 `com.yuanshu.*` 的 `api` 包与 Starter（ArchUnit 规则「底座 Starter 只承载技术能力」与「跨产品只能触碰元枢 api 包」双重约束）。
3. 新增模块须走 ADR 决策，不得由 AI 自主创建。
