# 灵犀系统（Synapse X）· 代码仓

> 面向中小制造企业出海经营的 AI-Native 数智化平台。
> 本目录为**仓库组根**，下辖 4 个代码仓库 + 1 个文档库，全部纳入同一 GitLab 组 `lingxi/`。

---

## 一、仓库导航

| 仓库 | 内容 | 技术栈 | 状态 |
|---|---|---|---|
| [`lingxi-server/`](lingxi-server/) | 后端 Monorepo（14 个 Maven 模块） | JDK 25 LTS · Spring Boot 4.1.1 · MyBatis-Plus · PostgreSQL 17 | 骨架就绪 |
| [`lingxi-web/`](lingxi-web/) | 前端 Monorepo（pnpm workspace） | React 19 · Vite 7 · TypeScript 5.9 · Ant Design 5 | 骨架就绪 |
| [`lingxi-data-worker/`](lingxi-data-worker/) | 数据采集与算法任务 | Python 3.13（独立 CI 流水线） | 一期空缺，仅占位 |
| [`lingxi-ops/`](lingxi-ops/) | 运维脚本 · 配置模板 · CI 流水线 | Shell · YAML | 11 脚本 + CI 就绪 |
| [`lingxi-docs/`](lingxi-docs/) | 文档库（**唯一权威源**） | Markdown · OpenAPI 3.0 | 五件套已落位 |

根级三件套：`AGENTS.md`（AI 开发约定）· `contracts.md`（模块间契约索引）· `TASKS.md`（统一任务清单）

---

## 二、文档先行（编码前必读）

| 用途 | 文档 |
|---|---|
| 产品是什么 | [`lingxi-docs/01-product/灵犀系统产品规划说明书2.0.md`](lingxi-docs/01-product/) |
| 做哪些功能 | [`lingxi-docs/01-product/灵犀系统功能清单V2.0.md`](lingxi-docs/01-product/)（净 266 项：P0-A 98 + P0-B 53） |
| 技术怎么选 | [`lingxi-docs/08-standards/灵犀系统技术架构和组件选型方案2.0.md`](lingxi-docs/08-standards/) |
| **编码怎么守规矩** | [`lingxi-docs/08-standards/灵犀系统技术规约2.0.md`](lingxi-docs/08-standards/)（**唯一技术规范**） |

> 【强制】**模块文档不齐不派发开发任务**；AI 任务边界永不包含权威文档目录。

---

## 三、环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| JDK | **25 LTS** | 后端编译目标，`pom.xml` 已 `<release>25</release>`；低版本直接编译失败 |
| Maven | 3.9+ | 后端构建 |
| Node.js | 22 LTS | 前端构建 |
| pnpm | 10+ | 前端包管理（禁止 npm/yarn 混用） |
| PostgreSQL | 17 | **云端服务**，经 SSH 隧道访问 `127.0.0.1:13306` |
| Valkey | 9 | **云端服务**，经 SSH 隧道访问 `127.0.0.1:16379` |

### 环境硬约束

1. **禁止 Docker / K8s**：全链路云主机 + systemd 进程化 + 脚本化部署。出现 `Dockerfile` / `docker-compose` / k8s 清单即视为违反规约（附录 D 规则 18）。
2. **本地不落地数据服务**：DB 与缓存一律连接云端，本地只开两条 SSH 隧道。
3. **应用代码禁止自建 SSH**：隧道是基础设施，应用只连 `127.0.0.1`（可观测、可自愈、可统一监测）。
4. **环境操作只能通过脚本**：禁止手敲 `mvn spring-boot:run`、手工 `psql` 改数据等绕过脚本的动作。

---

## 四、快速开始

```bash
# 0. 准备环境变量（首次）
cp lingxi-ops/.env.example lingxi-ops/.env        # 填入 SSH / DB / 缓存 / 模型 Key
cp lingxi-server/.env.example lingxi-server/.env  # 同上（后端运行时读取）

# 1. 建隧道（幂等，重复执行不会产生重复进程）
cd lingxi-ops && ./scripts/tunnel-up.sh

# 2. 环境体检（四层：隧道 / DB / 缓存 / 服务）
./scripts/check-env.sh

# 3. 初始化数据库（含迁移前自动备份，可重复执行）
./scripts/init-db.sh

# 4. 启动前后端（PID 管理 + 端口占用检查）
./scripts/start-dev.sh

# 5. 停止
./scripts/stop-dev.sh
```

**夜间自动化派发前必须**先 `check-env.sh`：不通则不派发（避免整夜产出废代码，E6）。

---

## 五、11 个幂等脚本（仅此入口可操作环境）

| 脚本 | 职责 |
|---|---|
| `tunnel-up.sh` | 建立 SSH 隧道（autossh + 保活 + `ExitOnForwardFailure`） |
| `check-tunnel.sh` | 三层探测（TCP → DB 真查询 → 缓存真 PING），失败自动重建，仍不通则暂停当晚派发 |
| `init-db.sh` | 数据库初始化与迁移（含迁移前备份） |
| `start-dev.sh` / `stop-dev.sh` | 前后端启停（PID 文件 + 端口检查） |
| `check-env.sh` | 四层体检（只读） |
| `qa-gate.sh` | 验收门禁：测试 + 覆盖率 + ArchUnit + SAST + 依赖扫描 + 硬编码反模式扫描 |
| `dispatch-task.sh` | 读任务清单 → 分级选模型 → 调 AI Coding 工具（按任务 ID 去重） |
| `verify-tenant-isolation.sh` | 租户隔离 6 项套件（合并前必跑） |
| `deploy.sh` / `rollback.sh` | 发布与回滚（版本目录隔离 + 灰度切换，回滚目标 <5 分钟） |
| `verify-skeleton.sh` | **骨架完整性校验**（只读）：模块口径 / 分层 / BOM / 分区 / 脚本 / 文档落位 / Git —— 初始化校验脚本，不计入规约 §4.13.2 的 11 个 |

```bash
# 一句话确认骨架完好（每次改动目录结构或新增模块后跑）
bash lingxi-ops/scripts/verify-skeleton.sh
```

---

## 六、当前工程状态

| 项 | 状态 |
|---|---|
| Git 仓库（5 个，main 分支，各含首次提交） | ✅ 已初始化（`lingxi-dev / dev@lingxi.local`，**需替换为真实身份**） |
| 后端模块目录（20 个：13 单体 + 5 Starter + 2 独立进程） | ✅ 已建，含 `package-info.java` 声明分层职责 |
| BOM 版本锁定（`lingxi-dependencies`） | ✅ 已锁，全部版本经 Maven Central 核验 |
| 五层分层骨架与 ArchUnit 规则 | ✅ `ArchUnit` 4 条规则进 CI |
| Flyway 基线迁移（sys / dt / ag 三组） | ✅ 含 RLS 策略与自主度 CHECK 约束 |
| 前端 11 路由分区 + 5 内部包 | ✅ 可 `pnpm dev` 起壳 |
| 12 脚本（11 运维 + 1 骨架校验）+ GitLab CI（7 阶段） | ✅ 已生成 |
| 骨架自检 | ✅ `bash lingxi-ops/scripts/verify-skeleton.sh` → 通过 77 / 失败 0（另有 4 项文档缺口提醒） |
| 业务功能实现 | ⬜ 待按 `TASKS.md` 分批派发 |

> **换行符策略**：全部文本文件强制 LF（`.gitattributes` + 各仓 `.gitignore`）。
> 原因：Shell 脚本被转成 CRLF 后，在 Linux 云主机上会以 `bad interpreter: /bin/bash^M` 直接失败，
> 而本地一切正常——这类「环境相关故障」排查成本极高，故在仓级别锁死。

> **版本基线偏差说明**：前端生态已出现主版本跃迁（Vite 8 / AntD 6 / TS 7 / React Router 8）。
> 本仓按《技术架构和组件选型方案2.0》基线锁定为 React 19 / Vite 7 / TS 5.9 / AntD 5 / RR 7，
> 遵循「版本只选发布 ≥6 个月的稳定版」；升级须走 ADR 决策，不得由 AI 自主升级。

---

## 七、三条不可自动合并红线

| 红线 | 触发模式 | 为什么 |
|---|---|---|
| ① 认证与会话 | `lingxi-platform/auth/**` · `*SecurityConfig*` · `*TokenService*` · `*LoginController*` | 漏一个校验点即可绕过登录 |
| ② 租户隔离与权限 | `*TenantInterceptor*` · `*DataScope*` · `*PermissionEvaluator*` · `*Casbin*` · rls-*.sql | 漏一个 `where tenant_id` 即跨租户泄露（P0） |
| ③ 计费 / 配额 / 支付 | `billing/**` · `quota/**` · `payment/**` · `*CreditsService*` | 错一次即资损，不可逆 |

命中即冻结 PR、禁止自动合并，必须人工 Review。判定依据不是任务难易，而是**错误代价不可逆**。
