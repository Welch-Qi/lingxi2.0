# 待业务实现任务 · 总览与派发顺序

> 生成日期：2026-10-23
> 生成方：WorkBuddy（AI 工具）—— **按 AGENTS.md 铁律 8，`TASKS.md` 由协调 Agent 唯一写入，
> 本文件只提供简报清单与派发顺序，不改 `TASKS.md`**
> 依据：隔离套件 ①~⑤ 无法执行的根因是「业务未实现」，不是配置或框架问题

---

## 一、根因事实（2026-10-23 真库核查）

| 项 | 实测状态 |
|---|---|
| 全仓 Controller / Mapper / Entity | **0 / 0 / 0**（仅元枢底座 36 个 starter 类） |
| 真库 `lingxi2` 表 | 仅 sys(18) / dt(14) / ag(10) / mkg(2) = **44 张** |
| 其余 10 个业务域表 | `cus` / `kc` / `wb` / `prd` / `ord` / `svc` / `intel` / `ana` / `ac` / `cc` **各 0 张** |
| 03-api 契约 | 有路径命名 / 响应体 / 错误码规范，**无 `cus/*` `kc/*` `ag/*` 具体端点** |
| 隔离套件 | ⑥（RLS 直连）✅ 已通过；①~⑤ 因无端点无法执行 |

**结论**：客户中心这条主线必须从 **契约 → DDL → 代码** 三步走，缺一不可。

---

## 二、简报清单（5 份，`tasks/` 目录下）

| 简报 | 任务号 | 既有/新增 | 模块 | 类型 | 分级 | 依赖 | 覆盖套件项 |
|---|---|---|---|---|---|---|---|
| `tasks/M0201-001.md` | M0201-001 | **既有**（补实现指引） | M02 客户中心 | DOC | T2 | 无 | 全部（契约前置） |
| `tasks/M0200-002.md` | M0200-002 | **新增** | M02 客户中心 | DEV | T3 | M0201-001 | ①②⑤（表） |
| `tasks/M0202-001.md` | M0202-001 | **既有**（补实现指引） | M02 客户中心 | DEV | T3 | M0200-002 + M0201-001 | ①②⑤（端点） |
| `tasks/M1100-001.md` | M1100-001 | **新增** | M11 知识中心 | DEV | T3 | M0201-001 | ③ |
| `tasks/M1600-001.md` | M1600-001 | **新增** | M16 智能体 | DEV | T3 | M0201-001 | ④ |

> ⚠️ **编号已对齐既有 `TASKS.md`**（2026-10-23 核对）：
> M02 域既有链为 `M0201-001`(契约) → `M0202-001`(CRUD) → `M0202-002`(消歧) →
> `M0202-003`(线索) → `M0202-004`(跟进) → `M0203-001`(测试)。
> 故本批**未新造** M0201-001 / M0202-001 编号，而是为其补「实现指引」简报；
> 真正新增的只有 **M0200-002**（DDL，既有链缺此步）、**M1100-001**、**M1600-001**。

---

## 三、依赖图与推荐派发顺序

```
              M0201-001（契约 · 既有任务 · 无依赖）★最先
              ├──▶ M0200-002（DDL · cus 9 表 · 新增）──▶ M0202-001（客户 CRUD · 既有）
              │                                                    └─▶ 隔离 ①②⑤
              ├──▶ M1100-001（知识检索 · 新增）───────────▶ 隔离 ③
              └──▶ M1600-001（智能体工具调用 · 新增）─────▶ 隔离 ④
                                                          ⑥ 已通过（2026-10-22）
```

**建议派发顺序**：

1. **M0201-001**（契约 · 既有任务）—— 唯一无依赖项，立即可派。
   ⚠️ 它含 `kc/*` 与 `ag/*` 两个他域端点，**待决策 1** 建议协调 Agent 拆成 3 份契约任务
   （本仓只留 `cus/*`）。
2. **M0200-002**（DDL · 新增）—— 契约评审通过后立即派（独立于代码，可并行于 M1100/M1600）。
3. **M1100-001** 与 **M1600-001** —— 契约落地后并行派发。
4. **M0202-001**（CRUD · 既有任务）—— 依赖 DDL，最后派。

**关键**：①②⑤ 三项**全部**依赖 M0202-001。③ 依赖 M1100-001。④ 依赖 M1600-001。
五项全绿后，M0000-006（隔离套件 6 项）方可置 `QA_PASS`。

---

## 四、任务号建议（协调 Agent 落 `TASKS.md` 时参考）

```
| M0201-001 | M02 | DOC | T2 | READY   | M0000-008 | 客户中心 API 契约补全（03-api）★既有任务，补实现指引 |
| M0200-002 | M02 | DEV | T3 | BLOCKED | M0201-001 | 客户中心 DDL 建表（cus 域 Flyway 迁移）★新增 |
| M0202-001 | M02 | DEV | T3 | BLOCKED | M0200-002 | 客户档案 CRUD 实现（打通隔离 ①②⑤）★既有任务，补实现指引 |
| M1100-001 | M11 | DEV | T3 | BLOCKED | M0201-001 | 知识检索接口（混合检索，打通隔离 ③）★新增 |
| M1600-001 | M16 | DEV | T3 | BLOCKED | M0201-001 | 智能体工具调用接口（打通隔离 ④）★新增 |
```

> 模块号沿用 03-api 域码（`cus`→M02、`kc`→M11、`ag`→M16）。
> **编号策略**：M02 域**复用既有任务号**（`M0201-001` 契约 / `M0202-001` CRUD），
> 只为它们补「实现指引」简报，不新造编号 —— 避免与既有链冲突；
> 真正新增的仅 3 个：`M0200-002`（DDL，既有链缺此步）、`M1100-001`、`M1600-001`。
> ⚠️ `M0200-002` 的模块号在 M02 域内偏前（`00` 段），如协调 Agent偏好同域连号，
> 可改为 `M0202-005`（既有链后续位）—— 但注意它**不是** `M0202-002`（已被「企业实体消歧接入」占用）。

---

## 五、待决策已全部裁决（2026-10-23）

> ✅ 用户裁决：**按各简报的推荐执行**。
> **权威依据：[`tasks/裁决记录-2026-10-23.md`](./裁决记录-2026-10-23.md)** —— 共 19 条逐条落定，
> 并已落地 4 条新增 Casbin 策略（`lingxi_policy.csv` 24 → 29 条 p）。
> 下列表格保留为决策历史，**执行时以裁决记录为准**。

| 简报 | 待决策要点 |
|---|---|
| M0201-001 | ① `kc`/`ag` 契约是否拆任务 ② `cus_health_score`（`[B]`）本期是否做 ③ `cus_tag_relation`「已收敛」最终形态 |
| M0200-002 | ① 建表分几个脚本 ② `cus_health_score` 是否建表 ③ `cus_tag_relation` 结构定稿 ④ `cus_*` 是否需白名单豁免（建议否） |
| M0202-001 | ① CSV 导出规模上限 ② `entity_id` 获取方式（消歧 API 未就绪）③ `customer_type` 初值 ④ `tier` 初值 |
| M1100-001 | ① 混合检索融合算法（建议 RRF）② 向量来源 ③ `object_type` 取值清单 ④ `kc_content_usage` 分区表本期是否做 |
| M1600-001 | ① `skillId` 取值（需新增 Casbin 策略 or 改用 `dt:entity:search`）② 审批流落地范围 ③ `ag_skill_registry` 种子数据归属 ④ `autonomy_max` 来源 |

**其中 3 条涉及红线，建议优先裁决**：
- M1600-001 待决策 ① —— 需新增 Casbin 策略（权限变更）
- M0201-001 待决策 ② —— `entity_id` NOT NULL 但消歧 API 未就绪
- M1100-001 待决策 ③ —— `object_type` 取值清单缺失会阻塞实现

---

### 已落地的变更（裁决的代码侧副作用）

`lingxi-server/yuanshu/yuanshu-platform/src/main/resources/casbin/lingxi_policy.csv` 新增 4 条策略：

| 策略 | 用途 |
|---|---|
| `p, SUB_AGENT_CUS, cus:customer:query, access, DEPT` | 隔离④ 的 `cus.customer.query` 工具（原不存在） |
| `p, ROLE_SALES_REP, cus:customer:export, access, SELF` | 客户导出（SELF，与既有 `cus:customer:view` 同 scope） |
| `p, ROLE_SALES_DIRECTOR, cus:customer:export, access, DEPT_AND_SUB` | 同上，scope 与该角色其余 `cus` 权限一致 |
| `p, ROLE_CONTENT_DIRECTOR, kc:knowledge:view, access, ALL` | 知识检索（与既有 `kc:template:*` 同组） |

> ⚠️ 新增权限码属**租户隔离权限**红线（AGENTS.md 铁律 10）→ 合并前须模块 Owner 评审。

### `object_type` 取值清单（裁决 14）

见裁决记录 §三，8 个取值：`entity_company` / `entity_contact` / `document` / `template` /
`script` / `qa` / `raw_customs` / `raw_company`；非法取值报 `010004`。

## 六、顺带发现的两个文档口径漂移（已在简报中指派）

1. **02-data 10 篇表名与真库不一致**：
   文档 `ag_agent_instance` / `ag_task` / `ag_task_trace` vs
   真库 `ag_agent` / `ag_agent_task` / `ag_agent_task_trace`
   → 已指派 **M1100-001** 顺带订正（真库是既成事实，文档需对齐）
2. **04-tenant 文档记载「config 各 4 份」** —— 已于 2026-10-23 收敛为单一来源
   （`lingxi-ops/config` 权威，副本已删），该表述需更新 → 建议由协调 Agent
   触发一次文档修订任务（不在本清单内，因属 `lingxi-docs` 权威文档修改）

---

## 七、验证命令（各执行 Agent 通用）

```bash
export JAVA_HOME="/c/Users/ASUS/.workbuddy/binaries/jdk/jdk-25.0.4.1+1"
export MAVEN_HOME="/c/Users/ASUS/.workbuddy/binaries/maven/apache-maven-3.9.16"
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:/c/Program Files/PostgreSQL/17/bin:$PATH"

cd lingxi-server && mvn -B -ntp package          # 含 ArchUnit + 新增 RLS 测试
bash lingxi-ops/scripts/verify-skeleton.sh       # 应 PASS（99 项）
bash lingxi-ops/scripts/local-rehearsal.sh --reset   # 真库迁移演练
bash lingxi-ops/scripts/verify-tenant-isolation.sh <A_TOKEN> <B_TOKEN>   # 6 项套件
```
