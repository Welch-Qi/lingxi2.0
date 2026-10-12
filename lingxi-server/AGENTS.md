# AGENTS.md · lingxi-server（后端）

> 总纲见仓库根级 `../AGENTS.md`（本文件冲突时以根级为准）。

## 构建与校验

```bash
mvn -q validate                       # 校验 BOM 与模块聚合关系
mvn -q -DskipTests compile            # 编译（需 JDK 25，低版本直接失败）
mvn -q test                           # 单测
mvn -q verify                         # 全量门禁：测试 + 覆盖率 + SpotBugs + Checkstyle + ArchUnit
```

## 本仓库特有约束

1. **版本号只写在 `lingxi-dependencies/pom.xml`**。子模块 `pom.xml` 出现 `<version>` 即驳回。
2. **模块计数口径（三产品）**：单体 15 = **元枢 4**（`yuanshu-platform`/`yuanshu-data`/`yuanshu-semantic`/`yuanshu-agent-factory`）+ **灵犀 11**；另 BOM `lingxi-dependencies`。
   `lingxi-starters`（5 个 starter）为公共组件组；`yuanshu-agent-runtime` / `yuanshu-data-jobs` 为独立进程，均**不计入**。
   目录：`lingxi-server/yuanshu/**`（元枢）与 `lingxi-server/lingxi/**`（灵犀）。**groupId 统一 `com.lingxi`**，底座四模块 Java 包为 `com.yuanshu.*`。
   【跨产品硬约束】`com.yuanshu..` 禁依赖 `com.lingxi.{业务域}..`；灵犀各域禁依赖元枢非 `api` 包——ArchUnit 强制。
3. **五层分层不可越界**：`api` / `app` / `domain` / `infra` / `starter`。
   依赖方向 `app → domain ← infra`，跨模块只依赖对方 `api` 包，`domain` 层禁止出现框架类型——**由 ArchUnit 在 CI 强制**。
4. **MyBatis-Plus 必须用 `mybatis-plus-spring-boot4-starter`**（`boot3-starter` 在 Spring Boot 4 下不兼容）。
5. **连接只连 `127.0.0.1:13306`（PG）/ `127.0.0.1:16379`（Valkey）**；禁止在代码中自建 SSH 隧道。
6. **迁移脚本与代码同 PR**：`src/main/resources/db/migration/{域}/V{yyyyMMddHHmm}__{域}_{描述}.sql`，
   已执行的历史脚本禁止修改。
7. **写操作必须消费 `X-Idempotency-Key`**；跨模块改动禁止直改对方表，走事件（Outbox）。

## 红线（命中即冻结合并，转人工 Review）

`yuanshu-platform/auth/**` · `*SecurityConfig*` · `*TokenService*` · `*LoginController*` ·
`*TenantInterceptor*` · `*DataScope*` · `*PermissionEvaluator*` · `*Casbin*` · `billing/**` · `quota/**` · `payment/**`
