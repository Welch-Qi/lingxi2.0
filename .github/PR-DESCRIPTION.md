# 三产品模块拆分 + 文档先行五件套 + 真库演练闭环

> ## 🔴 红线提示：本 PR 新增了 4 条 Casbin 权限码策略
>
> 本 PR **触及「租户隔离权限」红线**，按 AGENTS.md 铁律 10 **禁止自动合并**，必须人工 Review。
>
> **具体新增的权限码策略**（`lingxi_policy.csv` 25 → 29 条 `p`）：
>
> | 策略 | scope | 说明 |
> |---|---|---|
> | `p, SUB_AGENT_CUS, cus:customer:query, access, DEPT` | DEPT | 智能体工具调用（隔离④）所需权限码，原不存在。scope 取 `DEPT`（对齐既有 `cus:lead:create`），**未用 `ALL`** —— 客户数据有归属人维度 |
> | `p, ROLE_SALES_REP, cus:customer:export, access, SELF` | SELF | 客户导出为独立动作，与该角色既有 `cus:customer:view` 同 scope |
> | `p, ROLE_SALES_DIRECTOR, cus:customer:export, access, DEPT_AND_SUB` | DEPT_AND_SUB | 同上，scope 与该角色其余 `cus` 权限一致 |
> | `p, ROLE_CONTENT_DIRECTOR, kc:knowledge:view, access, ALL` | ALL | 知识检索，与既有 `kc:template:*` 同组 |
>
> **验证**（jCasbin 引擎真实决策，非模拟）：
> ```
> LOADED policies=29
>   enforce(SUB_AGENT_CUS, cus:customer:query, DEPT)                = true   ← 新增生效
>   enforce(ROLE_SALES_REP, cus:customer:export, SELF)             = true   ← 新增生效
>   enforce(ROLE_SALES_DIRECTOR, cus:customer:export, DEPT_AND_SUB) = true   ← 新增生效
>   enforce(ROLE_CONTENT_DIRECTOR, kc:knowledge:view, ALL)          = true   ← 新增生效
>   enforce(ROLE_SALES_REP, cus:customer:export, DEPT)              = false  ← scope 不匹配被拒 ✅
> ```
> 最后一条最关键：销售代表持 `DEPT` scope 请求导出**被拒**，证明数据权限 scope 真实生效。
>
> **评审请重点确认**：① `DEPT` scope 是否过宽；② `cus:customer:export` 是否需要更细粒度拆分
> （如按字段/按导出模板）；③ `kc:knowledge:view` 给 `ALL` 是否符合最小权限原则。

---

## 这个 PR 是什么

本 PR 是**堆叠分支的第 4 层**（最上层），包含 **22 笔提交、139 文件、+5743/-829**。
它把「元枢底座 / 灵犀业务集群 / 开物」三产品模块拆分落地，并补齐了此前缺失的
文档、迁移链路与真库验证能力。

> ⚠️ **本 PR 不能直接合入 `main`** —— base 必须是
> `feature/infra-three-product-repo-upgrade-M0000-001`。四层堆叠关系见下。

---

## 堆叠关系（必须按序合并）

```
main
 └─ fix/build-pom-unblock-M0000-001                    (1 笔 · f63ff58)
     └─ fix/server-deps-boot4-adapt-M0000-001          (2 笔 · +b0e7e79)
         └─ feature/infra-three-product-repo-upgrade-M0000-001  (7 笔 · +5 笔)
             └─ fix/three-product-module-split-M0000-001  ← 本 PR (29 笔累计 · 本层 +22 笔)
```

已用 `git merge-base --is-ancestor` 逐层校验，四层**严格线性**（已验证）。

**合并顺序**：先合第 1 层 → 再合第 2 层 → 第 3 层 → 最后本 PR。
每合一层后，下一层的 base 才存在。

---

## 本 PR 的 22 笔提交（按主题分组）

### A. 三产品模块拆分（3 笔 · #M0000-001）

| 提交 | 内容 |
|---|---|
| `3ac4b5b` | 三产品模块拆分收敛 —— 聚合 POM 统一 + Starter 拆底座/集群两组 |
| `c064930` | 技术架构方案与技术规约升 V2.1 三产品口径 |
| `02f1170` | 补齐文档先行五件套 API/租户/安全三份权威文档 |

### B. 文档先行：补齐各域数据字典（6 笔 · #M0000-008）

`50a6619` 营销中心 · `6aadb59` 市场情报与经营分析 · `167a7c3` 智能体与知识中心
· `e1167e8` 工作台 · `d498e57` 概念实体清单补录六域 + ADR-0004 V2 口径同步
· `16936ae` ADR-0004 修订为 V2「实体主档按租户分档」（更正与已落地基线不符的前提）

### C. 数据库与迁移链路修复（6 笔 · #M0000-008）

| 提交 | 内容 |
|---|---|
| `8e82e74` | 修复 `qa-gate.sh` 三处验收可信度缺陷 |
| `d249934` | 补齐 9 张 `dt_*` 表 RLS 策略 —— 闭合租户隔离第三道防线 |
| `77b494a` | 迁移脚本收敛到 `yuanshu-platform` + 去重版本号 + 修复 Flyway 执行链路断裂 |
| `4e379e9` | 规约新增迁移脚本归属与宿主规则，同步 04-tenant 与 02-data 口径 |
| `086381f` | 本地真库演练脚本 + 库名隔离（`lingxi` / `lingxi2`）+ 补 dt 基线缺失的扩展创建 |
| `5360155` | 移除 `dt_account_asset` 冗余表级唯一约束 —— 修复软删后无法重建同名资产 |

### D. 应用启动缺陷修复（4 笔 · #M0000-008）

| 提交 | 内容 |
|---|---|
| `5e14d1d` | 本地真库演练通过：6 迁移全 applied + 23 条 RLS 策略生效 |
| `fb253d5` | 隔离测试第⑥项改用**非 owner 账号**并做真实隔离断言 |
| `eaf05f2` | 修复应用启动失败的**四个缺陷** + 补齐 Spring AI 与 Flyway 自动配置 |
| `adaed38` | 配置收敛为单一来源 + 补齐 RLS 第三道防线的应用侧链路 |

### E. 任务简报与裁决（4 笔 · #M0000-008）

| 提交 | 内容 |
|---|---|
| `724dfd8` | 新增 5 份任务简报 + 1 份总览（客户中心主线 + 知识检索 + 智能体工具） |
| `c3daccf` | 规约升 V2.2 —— 放开 `lingxi-docs/03-api/` 的 AI 写入权限 |
| `c8e5ba9` | **裁决落地 —— 新增 4 条 Casbin 策略 + 19 条待决策落定** 🔴 涉红线 |

---

## 关键技术内容

### 1. 四个启动缺陷 —— 只有真跑才能发现

`eaf05f2` 修的四个问题，**静态检查一个都查不出**：

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | Spring Boot 4.1 把 Flyway 支持拆到 `spring-boot-flyway` 模块，项目未引 | **应用启动永不执行迁移，数据库不会被初始化** |
| 2 | `@EnableConfigurationProperties` 已注册 Bean，`@Bean` 方法又建一个 | 启动失败（`required a single bean, but 2 were found`）；`@ConditionalOnMissingBean` 挡不住 |
| 3 | `new Enforcer("casbin/xxx.conf", ...)` 把参数当**文件路径**读 | 打成 jar 必失败 |
| 4 | 缺 `spring.ai.openai.*` 配置，starter 自动装配 6 类客户端 | 缺 credential 即启动失败 |

**验证**：清空库（0 表）→ 启动应用 → 7 迁移自动 applied → **46 表 + 23 条 RLS 策略**。

### 2. RLS 第三道防线的应用侧链路（此前从未闭环）

23 张表全开 RLS，策略读会话变量 `app.tenant_id`，但此前：

- `YuanshuTenantLineHandler` 只改 SQL 文本，**从不设会话变量** → RLS 恒读 NULL → 0 行可见
- `TenantContext.set()` **全仓无人调用**
- **无租户 Filter**（只有 `TraceIdFilter`）

本 PR 新增 3 个组件闭合链路：

| 组件 | 作用 |
|---|---|
| `YuanshuRlsSessionInterceptor` | 拦 `StatementHandler.prepare` 拿 Connection，在同一连接同一事务内 `set_config('app.tenant_id', ...)`；无上下文**显式置空** → fail-closed |
| `TenantContextFilter` | JWT `tenant_id` claim（可信）+ `X-Tenant-Id` 头**不一致即拒绝**（防伪造）；缺上下文 403 |
| `TenantContextProperties` | `yuanshu.tenant.*` 配置绑定（规约禁 `@Value` 散落取值） |

> ⚠️ 拦截器注册必须走 `SqlSessionFactoryBeanCustomizer.setPlugins(...)` ——
> **MyBatis-Plus 自动配置只收集 InnerInterceptor 通道，不注入 `Interceptor[]`**，
> 否则 Bean 存在但**静默不生效**。

### 3. 顺带修掉一个真实的数据泄露路径

`db.yml` 补 `local-cache-scope: STATEMENT`。默认 `SESSION` 作用域下 MyBatis 一级缓存
跨语句存活 —— 同一 SqlSession 内租户上下文变化时，第二次相同 SQL
**直接命中缓存而不下发数据库** → 读到上一个租户的数据。
（这是 `switchingTenantSwitchesVisibilityOnSameConnection` 测试失败暴露的。）

### 4. 隔离测试第⑥项：从「假通过」到真验证

原实现用 `LX_DB_USER`（本机 = `postgres` = **superuser + 全部表的 owner**）直连，
而 PostgreSQL 规则：**superuser 与表 owner 默认绕过 RLS**（本仓 23 张表均未 force）。
→ 测出的「隔离生效」是**假象**。

且原断言为「本租户数 != 总数」—— 两租户数据量相同时，**即使 RLS 完全失效也判 PASS**。

现改为：独立非 owner 账号 + **逐表真实断言**（A 看不到 B + 无上下文 0 行）。

---

## 验证结果（真库 PostgreSQL 17.11 + pgvector 0.8.7）

| 项 | 结果 |
|---|---|
| 后端 `mvn validate` | ✅ BUILD SUCCESS（23 模块） |
| 后端 `mvn package` | ✅ **Tests run: 16, Failures: 0**（ArchUnit 6 + RLS 10） |
| 应用启动 | ✅ `Started LingxiApplication in 11.272 seconds`，`actuator/health = UP` |
| Flyway 自动迁移 | ✅ 空库 → 7 迁移 applied → 46 表 + 23 RLS 策略 |
| 真库演练 `local-rehearsal.sh --reset` | ✅ 7/7 脚本 · 23 策略 · 跨租户隔离 fail-closed |
| 隔离测试第⑥项 | ✅ 6 张表全部满足「跨租户不可见 + 无上下文 fail-closed」 |
| Casbin 策略决策 | ✅ jCasbin 引擎加载 29 条策略，4 条新策略真实生效（含 scope 拒绝用例） |
| 骨架自检 `verify-skeleton.sh` | ✅ 99 项全过 |
| 前端四道门禁 | ✅ typecheck / lint / check-i18n / build |

### 新增的 10 个集成测试

| 测试 | 覆盖 |
|---|---|
| `RlsSessionVariableTest`（5） | 机制层：`set_config` → RLS（fail-closed / 跨租户互不可见 / 连接复用不串租户） |
| `RlsMyBatisInterceptorTest`（5） | **MyBatis 真实链路**：拦截器确实被调用（签名错了会静默失效，只有真跑才暴露） |

两个测试都在 `@BeforeAll` 断言 `usesuper=false` —— 防止将来被误改成超管连接而得假象。

---

## 配置单一来源收敛

`lingxi-server/config/` 与 `lingxi-ops/config/` 曾各存一份**完全相同**的 5 个 yml，
改一份另一份不生效（上一轮排查「Spring AI 缺 api-key」时在此耗时）。
根因：`application.yml` 的 import 写死 `./config/*.yml`，而 `verify-skeleton.sh` 校验的是另一份
—— **校验与运行各看一份**。

- 权威源 = `lingxi-ops/config`
- `application.yml` import 改 `${LX_CONFIG_DIR:./config}/xxx.yml`（5 个全覆盖）
- 删除 `lingxi-server/config/` 下 5 个副本（保留 `checkstyle/`，pom 的 `configLocation` 引用它）
- `verify-skeleton.sh` 新增 2 项防漂移校验（副本复现即失败）
- 顺带补齐 import 漏掉的 `tunnel.yml`

---

## 规约 V2.2：放开 `03-api/` 的 AI 写入权限

`c3daccf` 改的是**规则本身**（4 文件 6 处条款口径同步），评审时请一并确认：

| 位置 | 变更 |
|---|---|
| `AGENTS.md` §二 | 任务边界加例外条款（`03-api/` 开放 AI 写入） |
| `08-standards/技术规约2.0.md` | §1.3 A3 · §2.4 规则表 · §3.8 K6 **三处**同步，版本升 V2.2 |
| `contracts.md` §七 | 契约变更流程：步骤②标「AI 可写」、③标「确认在评审时」 |
| `03-api/_index.md` | 规则 3 + 新增「写入权限（规约 V2.2）」说明块 |

**人工确认（T4）并未取消** —— 环节从「AI 动手前」移到「PR 评审时」；
破坏性契约变更（删字段 / 改语义 / 改路径）仍须人工确认后才能合并。
`03-api/` 以外的 `docs/` 权威文档与 `config/` **仍禁写**。

---

## 评审关注点

### 🔴 涉红线条目（必须人工裁决）

1. **新增 4 条 Casbin 权限码策略** —— 见本 PR 顶部「红线提示」段
2. **RLS 策略 + 会话变量拦截器 + 租户 Filter** —— 租户隔离第三道防线的完整落地
3. **规约 V2.2 放开 `03-api/` AI 写入权限** —— 规则实质变更，需确认人工确认环节的位移是否可接受

### 需要重点 review 的代码

| 位置 | 关注点 |
|---|---|
| `YuanshuRlsSessionInterceptor` | `set_config(..., false)` 会话级 —— 连接复用时靠「每次调用都重设」保证不串租户 |
| `TenantContextFilter` | JWT claim 与请求头**不一致即抛异常**（403）—— 是否会误伤合法场景 |
| `lingxi_policy.csv` | 4 条新增权限码的 scope 粒度（详见顶部红线提示） |
| `db.yml` `local-cache-scope: STATEMENT` | 关闭一级缓存的**性能影响**（本系统单接口查询为主，可接受） |
| `db.yml` `spring.ai.model.*.enabled=false` | 关闭 4 类不用的模型自动装配 —— 确认无遗漏场景 |

### 待决策已全部裁决

此前 5 份简报中的 19 条待决策，已于 2026-10-23 全部按推荐执行落定 ——
权威依据见 **`tasks/裁决记录-2026-10-23.md`**（逐条落定 + `object_type` 8 个取值清单）。
简报中的「待决策」段落已加指针，执行时以裁决记录为准。

### 已知遗留

- 隔离测试 **①~⑤ 仍无法跑** —— 所依赖的 `/api/v1/cus|kc|ag` 接口**尚无任何 Controller 实现**
  （全仓 0 个 Controller / 0 个 Mapper）。这不是本 PR 的问题，已写成任务简报（`tasks/`）。
- 02-data 10 篇表名与真库不一致（`ag_agent_instance` vs `ag_agent` 等）——
  已指派 M1100-001 顺带订正，**本 PR 未改**。

---

## 合规声明

- ✅ 未新增 Dockerfile / docker-compose / k8s 清单（规约 §3.2 L7）
- ✅ 迁移脚本与代码同 PR 提交；已执行脚本**未修改**（修正走新增 Wave 迁移）
- ✅ `TASKS.md` **未改动**（协调 Agent 唯一写入，AGENTS.md 铁律 8）
- ✅ 未新增自主度等级；未触碰认证会话、计费配额支付两条红线
- 🔴 **新增了 4 条 Casbin 权限码策略**（25 → 29 条 `p`）—— 属**租户隔离权限**红线，
  按 AGENTS.md 铁律 10 **禁止自动合并**，须 ≥1 名模块 Owner 评审
- ⚠️ 规约升 V2.2 —— 规则实质变更（放开一类文档的 AI 写入权限），需评审确认

---

🤖 AI 产出（人工主导）· 待评审
