# TASKS.md · 统一任务清单

> 【强制】本文件由**协调 Agent 唯一写入**，AI Coding 工具与人类开发者**只读**（技术规约2.0 §3.4 W3）。
> 任何工具不得自行改写任务状态；状态流转只由验收结果驱动。

---

## 一、状态机

```
READY ──▶ IN_PROGRESS ──▶ TESTING ──┬─▶ QA_PASS ──▶ MERGED
                                    ├─▶ QA_FAIL ──▶ （生成 FIX 任务，回 IN_PROGRESS）
                                    └─▶ NEEDS_HUMAN ──▶ （人工介入 / 红线 Review）
```

| 状态 | 含义 | 谁能置入 |
|---|---|---|
| `READY` | 简报齐备、依赖已满足，可派发 | 协调 Agent |
| `IN_PROGRESS` | 已派发给 AI 工具执行中 | 协调 Agent |
| `TESTING` | 实现完成，等待门禁与验收 | 协调 Agent |
| `QA_PASS` | `qa-gate.sh` 全绿且验收通过 | 协调 Agent（凭产物） |
| `QA_FAIL` | 门禁失败，需生成 FIX 任务 | 协调 Agent |
| `NEEDS_HUMAN` | 连续失败 ≥3 次 / 同一 Bug 修复 >5 轮 / 命中红线 | 协调 Agent |
| `MERGED` | 已合并主干 | 协调 Agent |
| `BLOCKED` | 依赖未满足或环境不通 | 协调 Agent |

**验收凭产物，不凭自报**：每个任务必须产出 `artifacts/M{模块}/result.json` + 测试与覆盖率报告，
否则一律不得置 `QA_PASS`（AGENTS.md 铁律 9）。

---

## 二、任务登记格式

```markdown
| 任务号 | 模块 | 类型 | 分级 | 状态 | 依赖 | 简报 | 产物 |
|---|---|---|---|---|---|---|---|
| M0203-001 | M02 | DEV | T3 | READY | — | tasks/M02-DEV.md | artifacts/M02/result.json |
```

- **任务号**：`M{模块}{序号}-{三位流水}`，如 `M0203-007`
- **类型**：`DEV`（开发）/ `TEST`（测试）/ `FIX`（修复）/ `DOC`（文档）
- **分级**：`T1`~`T5`（见 AGENTS.md 第二节；T5 禁止派发给 AI）
- **简报**：`tasks/M{模块}-{类型}.md`——**无简报不派发**

---

## 三、模块编号（本清单内部编号）

| 模块号 | 模块 | 功能编号前缀 | 后端模块 | 优先级 |
|---|---|---|---|---|
| M00 | 工程地基 | — | 全仓（BOM / Starter / 脚本 / CI） | P0-A |
| M01 | 工作台 + 角色工作台 | UW- / RW- | lingxi-workbench | P0-A |
| M02 | 客户中心 | OP-CUS- / BO-SAL- | lingxi-customer | P0-A |
| M03 | 商品中心 | OP-PRD- | lingxi-product | P0-A |
| M04 | 订单交付 | OP-ORD- | lingxi-order | P0-A |
| M05 | 售后服务 | OP-SVC- / BO-SVC- | lingxi-service | P0-B |
| M06 | 营销中心 | OP-MKT- / BO-MKG- | lingxi-marketing | P0-A |
| M07 | 市场情报 | BO-MKT- / GM- | lingxi-intel | P0-B |
| M08 | 经营分析 | DM- / OP-BA- | lingxi-analytics | P0-B |
| M09 | 智能体中心 | AG- / AC- | lingxi-agent | P0-A |
| M10 | 知识中心 | KC- | lingxi-knowledge | P0-A |
| M11 | 配置中心 | CC- | lingxi-configcenter | P0-A |
| M12 | L1 数据底座 | DT- | lingxi-data | P0-A（**建设顺序 L1→L2→L3→L4，先行**） |
| M13 | 智能体运行时 | — | lingxi-agent-runtime | P0-A |

> 建设顺序为硬约束：数据底座（M12）与人工运营底座（M01~M11）必须先于智能体（M09/M13）形成闭环，
> 否则智能体无数据可依、无对象可操作。

---

## 四、当前任务列表

### M00 工程地基（本阶段）

| 任务号 | 模块 | 类型 | 分级 | 状态 | 依赖 | 说明 |
|---|---|---|---|---|---|---|
| M0000-001 | M00 | DOC | T2 | **QA_PASS** | — | 代码仓初始化：目录结构 / BOM / 骨架 / 脚本 / 文档落位 / 5 个 Git 仓库初始化（main 分支） |
| M0000-002 | M00 | DEV | T3 | READY | — | 在 JDK 25 + Maven 3.9 环境执行 `mvn -q validate` 与 `mvn -q compile`，修正骨架编译错误 |
| M0000-003 | M00 | DEV | T3 | READY | M0000-002 | `pnpm install && pnpm -C apps/lingxi-web build` 通过（含 `tsc --noEmit` strict 校验） |
| M0000-004 | M00 | DEV | T3 | READY | M0000-001 | 补齐 `lingxi-web` 剩余路由分区页面骨架（11 个分区，当前仅 workbench） |
| M0000-005 | M00 | DEV | T4 | READY | M0000-002 | 打通 `tunnel-up.sh → check-env.sh → init-db.sh`，确认 Flyway 三组基线迁移可执行 |
| M0000-006 | M00 | TEST | T3 | READY | M0000-005 | 运行 `verify-tenant-isolation.sh`，确认 RLS 策略生效、6 项隔离套件可执行 |
| M0000-007 | M00 | DEV | T3 | READY | M0000-002 | 实现 `/api/v1/platform/session`（会话上下文：用户 / 租户 / 权限码），前端登录闭环 |
| M0000-008 | M00 | DOC | T2 | READY | — | 补齐 `lingxi-docs/02-data` 数据模型文档与 `03-api` OpenAPI 契约骨架 |
| M0000-009 | M00 | DEV | T2 | READY | M0000-005 | 生成 `03-api` 契约并跑通 OpenAPI → `@lingxi/types` 类型生成（`gen-types.sh`） |
| M0000-010 | M00 | DEV | T4 | **NEEDS_HUMAN** | — | 节点 8 待接入组件（Nacos 配置中心 / Pact 契约测试）完成 Spring Boot 4.1 兼容性验证后再锁版本 |

### M12 L1 数据底座（先行，P0-A）

| 任务号 | 模块 | 类型 | 分级 | 状态 | 依赖 | 说明 |
|---|---|---|---|---|---|---|
| M1200-001 | M12 | DOC | T3 | READY | M0000-008 | 输出数据底座设计：多源接入 / 实体中心 / 资产目录 / 质量规则 / 指标口径 |
| M1200-002 | M12 | DEV | T4 | BLOCKED | M1200-001 | 企业实体消歧（域名 > 名称规范化 > 地址+行业，相似度 ≥0.85 自动归并） |
| M1200-003 | M12 | DEV | T3 | BLOCKED | M1200-002 | 人工归并审核队列（第三级），归并可逆 + 操作留痕 |
| M1200-004 | M12 | DEV | T3 | BLOCKED | M0000-005 | 指标定义与口径服务（`MetricQueryApi`），禁止各模块自算口径 |
| M1200-005 | M12 | DEV | T3 | BLOCKED | M1200-002 | 知识向量化（pgvector + HNSW）与混合检索（pg_trgm + 向量） |

### M01~M11 业务模块（示例：客户中心起手）

| 任务号 | 模块 | 类型 | 分级 | 状态 | 依赖 | 说明 |
|---|---|---|---|---|---|---|
| M0201-001 | M02 | DOC | T2 | READY | M0000-008 | 客户中心数据模型与 OpenAPI 契约 |
| M0202-001 | M02 | DEV | T3 | BLOCKED | M0201-001 | 客户档案 CRUD + 权限码 `cus:customer:*` + 数据权限 scope |
| M0202-002 | M02 | DEV | T3 | BLOCKED | M0202-001 | 企业实体消歧接入（复用 M12 `EntityResolveApi`，不重复造） |
| M0202-003 | M02 | DEV | T3 | BLOCKED | M0201-001 | 线索管理（创建 / 分配 / 资格判定 / 转化），暴露 `lx.cus.lead.*` 事件 |
| M0202-004 | M02 | DEV | T3 | BLOCKED | M0202-003 | 跟进记录（含 AI 生成标记 `source_type=AGENT` 与人工接管） |
| M0203-001 | M02 | TEST | T3 | BLOCKED | M0202-004 | 客户中心模块测试（单测 + 集成 + 租户隔离用例） |

> 其余模块（M03~M11）任务在各自模块文档齐备后由协调 Agent 分批登记。
> **未登记的模块不得开工**——这是防止 AI 自行发挥范围的第一道闸。

---

## 五、红线任务（当前需人工 Review 的部分）

| 任务号 | 命中红线 | 说明 |
|---|---|---|
| M0000-007 | ① 认证与会话 | `/api/v1/platform/session` 与会话上下文 |
| M0000-006 | ② 租户隔离与权限 | 隔离套件与 RLS 校验 |
| M1200-003 | ② 租户隔离与权限 | 归并队列涉及跨租户数据边界 |

命中红线的任务：即使 CI 全绿，**也必须人工 Review 后方可置 `MERGED`**。

---

## 六、协调 Agent 操作约定

1. **派发前**：`check-env.sh` 必须通过（不通不派发），任务状态置 `IN_PROGRESS`
2. **派发时**：`dispatch-task.sh {任务号}`，按分级选模型，自动去重
3. **回收时**：读取 `artifacts/M{模块}/result.json`，跑 `qa-gate.sh`，按结果置 `QA_PASS` 或 `QA_FAIL`
4. **失败处理**：`QA_FAIL` → 生成 `FIX` 任务；同一 Bug 超 5 轮或连续失败 ≥3 次 → `NEEDS_HUMAN`
5. **每周**：汇总 `QA_PASS` 率、平均轮次、失败原因分布，回写到本文件的统计区

### 统计区（协调 Agent 维护）

| 指标 | 值 |
|---|---|
| 任务总数 | 21 |
| QA_PASS | 1 |
| READY | 10 |
| IN_PROGRESS / TESTING | 0 |
| BLOCKED | 9 |
| NEEDS_HUMAN | 1 |
| 命中红线任务 | 3 |
