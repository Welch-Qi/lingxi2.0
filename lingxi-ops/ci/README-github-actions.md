# 灵犀系统 CI 流水线（GitHub Actions）

> **权威 workflow**：`.github/workflows/ci.yml`
> **规约依据**：《灵犀系统技术规约2.0》§4.12 测试规约（强制流水线顺序）· §4.12 门禁阈值 · §3.2 L7 容器化边界
> **与 GitLab CI 的关系**：`lingxi-ops/ci/gitlab-ci.yml` 与本 workflow **阶段划分、门禁项、job 命名保持一致**
> （同一套规约、同一批脚本），仅运行时载体不同。GitHub 侧为本仓库的实际执行方。

---

## 一、流水线阶段（规约 §4.12 强制顺序）

```
编译 ──▶ ArchUnit 依赖检查 ──▶ 单测 ──▶ 契约测试 ──▶ 覆盖率门禁
      ──▶ 隔离套件 ──▶ 静态扫描 ──▶ 依赖与密钥扫描
任一环节失败阻断合并
```

| # | Job ID（GitHub） | 显示名 | 规约依据 | 关键动作 |
|---|---|---|---|---|
| 1 | `build-backend` | build:backend | §3.2 L3 | JDK 25 + Maven 3.9，`clean package` |
| 2 | `build-frontend` | build:frontend | §4.2 | Node 22 + pnpm 11.13，`typecheck` + `build` |
| 3 | `arch-check` | arch-check | §2.2 强制 | ArchUnit：五层分层 + 跨产品方向 |
| 4 | `test-backend` / `test-frontend` | test:backend / test:frontend | §4.12 | JUnit 5 + Vitest |
| 5 | `contract-test` | contract-test | §4.12 强制 | Pact 双向校验（profile 未就绪时告警不阻断） |
| 6 | `coverage` | coverage | §3.8 W7 | JaCoCo，总体 ≥70% |
| 7 | `isolation` | isolation | §4.9.4 强制 | 真库 6 项隔离套件 |
| 8 | `security-sast` | security:sast | §4.9.6 | Semgrep（OWASP Top 10 + Java） |
| 9 | `security-dependency` | security:dependency | §4.9.6 | Trivy `fs` 模式（不出镜像） |
| 10 | `security-secrets` | security:secrets | §4.9.6 | gitleaks |
| 11 | `security-hardcode` | security:hardcode | 附录 D 18 条 | `qa-gate.sh` 扫描专用模式 |
| 12 | `qa-gate` | qa-gate | 汇总 | 汇聚上游结论，任一失败即整体失败 |

> ⚠️ **Job ID 不能含冒号**：GitHub 要求 job ID 只含 `[A-Za-z0-9_-]`
> （GitLab CI 允许 `security-sast` 这种写法，GitHub 不允许）。
> 故 **Job ID 用连字符、显示名保留冒号**（UI 上仍显示 `security-sast`，
> 与 `05-security` 第六节的命名约定一致）。
> 同样地，表达式里访问这些 job 必须用**方括号**：`needs['security-sast'].result`，
> 点号语法会在冒号处解析失败。

---

## 二、容器化边界（重要）

规约 §3.2 L7 与附录 D 规则 18：**部署侧全链路禁用容器编排**（形态为「云主机 + systemd + 脚本化」），
仓库内**不得**出现任何容器编排清单文件。

GitHub Actions 的 `services:` 属**托管运行时的官方机制**，不落任何清单文件，
故 `isolation` job 用它提供集成测试所需的真实 PostgreSQL 17 + pgvector
（规约 §4.12 明确要求集成测试用真实 PostgreSQL；Testcontainers 同样依赖运行时容器）。

> ⚠️ `qa-gate.sh` 的附录 D 规则 18 扫描**包含 `.yml`** —— 所以本目录与 workflow 文件里
> **连注释都不能写出被禁词字面形式**（扫描不区分注释与代码）。

---

## 三、敏感值边界

附录 D 规则 1（硬编码连接串）与规则 3（硬编码口令）**同样作用于 `.yml`**。故：

- workflow 内**不出现**任何 `jdbc:...://` 连接串 —— 连接信息由 `db.yml` 用 `${LX_DB_*}` 变量拼装
- 测试库口令走 `POSTGRES_HOST_AUTH_METHOD: trust`（一次性 CI 实例，非敏感）
- workflow 内不写明文口令（规则 3 的匹配模式要求引号包裹的 6 位以上字符串）

---

## 四、当前的两处「已知未就绪」

这两项**在 CI 里明确告警而非静默跳过**，待对应任务落地后自动生效：

### 4.1 契约测试（Pact）

规约 §4.12 要求契约测试为【强制】，但 `lingxi-server` 尚无 `contract-test` profile。
CI 的 `contract-test` job 会探测 profile 是否存在：

- 存在 → 执行 `mvn verify -Pcontract-test`
- 不存在 → 发出 `::warning` 告警并跳过，**不阻断**（阻断一个尚无实现的门禁等于形同虚设）

依赖任务：`tasks/M0201-001.md`（客户中心 API 契约）

### 4.2 隔离套件 ①~⑤

`verify-tenant-isolation.sh` 的 ①~⑤ 依赖 `/api/v1/cus|kc|ag` 业务接口，
而全仓当前 **0 个 Controller**（业务尚未实现）—— 一并跑必然全 FAIL，
会使门禁**永久为红**，等于形同虚设。

故 CI 用 `LX_ISOLATION_SCOPE=db` 只跑第 ⑥ 项（RLS 直连校验，真库可验证），
①~⑤ 由脚本**明确记入报告的 `skippedItems`**（非静默跳过），
并在 job 摘要中可见。业务接口落地后把 scope 改回 `all` 即可。

依赖任务：`tasks/M0200-002.md`（DDL）· `tasks/M0202-001.md`（CRUD）· `tasks/M1100-001.md`（知识检索）· `tasks/M1600-001.md`（智能体工具）

---

## 五、本地等价命令（与 CI 对齐）

| CI job | 本地等价命令 |
|---|---|
| `build-backend` | `cd lingxi-server && mvn -B -ntp -DskipTests clean package` |
| `build-frontend` | `cd lingxi-web && pnpm install --frozen-lockfile && pnpm -s run typecheck && pnpm -s run build` |
| `arch-check` | `cd lingxi-server && mvn -B -ntp -pl :yuanshu-platform -am test -Dtest=ArchitectureRuleTest` |
| `test-backend` | `cd lingxi-server && mvn -B -ntp test` |
| `test-frontend` | `cd lingxi-web && pnpm -s run test:unit -- --run` |
| `coverage` | `cd lingxi-server && mvn -B -ntp verify -Djacoco.skip=false` |
| `isolation` | `bash lingxi-ops/scripts/local-rehearsal.sh --reset` + `LX_ISOLATION_SCOPE=db bash lingxi-ops/scripts/verify-tenant-isolation.sh <A> <B>` |
| `security-sast` | `semgrep --error --config=p/owasp-top-ten --config=p/java lingxi-server` |
| `security-dependency` | `trivy fs --severity HIGH,CRITICAL --exit-code 1 lingxi-server lingxi-web` |
| `security-secrets` | `gitleaks detect --no-banner --redact -s .` |
| `security-hardcode` | `QA_GATE_SCAN_ONLY=1 bash lingxi-ops/scripts/qa-gate.sh local-scan` |
| **全量门禁** | `bash lingxi-ops/scripts/qa-gate.sh`（6 段全跑，约 4~5 分钟） |

> `qa-gate.sh` 的 `QA_GATE_SCAN_ONLY=1` 是**扫描专用模式**：只跑附录 D 18 条扫描 + ESLint
> （规则 10/12 由 ESLint 的 AST 级判定承载），跳过 `mvn clean verify` 与前端 typecheck/单测
> —— 避免与 CI 的独立 job 重复。

---

## 六、与分支保护的配合

仓库已对 `main` / 堆叠基线分支 / 开发分支启用保护：

| 规则 | 值 |
|---|---|
| 需审批人数 | **0 名**（单账号仓库，见下方说明） |
| required_status_checks | 10 项（`qa-gate` / `arch-check` / `test:backend` / `test:frontend` / `coverage` / `isolation` / `security:sast` / `security:dependency` / `security:secrets` / `security:hardcode`） |
| strict | ✅ 要求分支与 base 同步后才可合并 |
| 自动合并 | 禁用 |
| 强制推送 / 删分支 | 禁用 |
| 线性历史 | 要求（堆叠链需保持线性） |
| 必须解决对话 | 是 |

**为何审批人数是 0**：GitHub 不允许 PR 作者批准自己的 PR。当前仓库仅有
`Welch-Qi` 一个账号（既是 PR 作者又是唯一 admin），若把 `required_approving_review_count`
设为 1，所有 PR 都会永久阻塞在「需他人审批」——这是结构性自锁，不是配置疏漏。
因此单账号阶段把审批数设为 0，**把关全部交给 10 项 required status checks**，
CI 不绿就合不进去。

**待有第二个模块 Owner 账号后**，把 `main` 的 `required_approving_review_count` 改为 1
（API：`PATCH /repos/{owner}/{repo}/branches/main/protection/required_pull_request_reviews`，
body `{"required_approving_review_count":1}`），恢复「CI 全绿 + 人工审批」双条件。

