# ADR-0002 版本基线锁定与 BOM 单一版本源

| 项 | 内容 |
|---|---|
| 状态 | 已采纳（Accepted） |
| 日期 | 2026-09-11 |
| 决策人 | 产品与架构负责人 |
| 影响范围 | `lingxi-server`（全部 Maven 模块）· `lingxi-web`（pnpm workspace） |

## 背景

技术选型方案给出主版本基线（JDK 25 / Spring Boot 4.1 / React 19 / Vite 7 等）。
初始化代码仓时需明确两件事：

1. **版本写在哪**——若允许各模块自行声明版本，必然出现「A 模块 boot 4.1.1、B 模块 4.2.0」的隐性不兼容；
2. **发现更新版本时怎么办**——npm / Maven Central 上已存在更新的主版本（Vite 8、Ant Design 6、TypeScript 7、React Router 8）。

## 决策

**（1）单一版本源**：后端所有版本号只在 `lingxi-server/lingxi-dependencies/pom.xml` 中定义，
各子模块 `pom.xml` **一律不写 `<version>`**；前端各包在各自 `package.json` 声明，内部包一律 `workspace:*`。

**（2）按方案基线锁定，不跟随最新版**：

| 组件 | 锁定版本 | 说明 |
|---|---|---|
| JDK | 25 LTS | `maven.compiler.release=25` |
| Spring Boot | 4.1.1 | Spring Boot 3.5 已于 2026-06-30 EOL |
| Spring Cloud | 2025.1.3 | 经 Boot 4.1 对应关系核验 |
| Spring AI / LangChain4j | 2.0.1 / 1.20.0 | 由官方 BOM 导入 |
| MyBatis-Plus | 3.5.17 | **必须用 `mybatis-plus-spring-boot4-starter`**（boot3-starter 在 Boot 4 下不兼容） |
| PostgreSQL / Valkey | 17 / 9 | 云端托管 |
| React / Vite / TypeScript | 19.3.0 / 7.3.6 / 5.9.3 | 按方案基线，不升 Vite 8 / TS 7 |
| Ant Design / React Router | 5.29.3 / 7.x | 按方案基线，不升 AntD 6 / RR 8 |

**（3）版本准入规则**：只选已发布 **≥6 个月**的稳定版；升级须走 ADR + 人工评审，**禁止 AI 自主升级**。

## 理由

1. **锁定而非追随**：AI Coding 的商业化交付依赖「确定性编译结果」。版本漂移会让「本地能跑、CI 挂」变成常态，而 AI 无法判断是代码问题还是依赖问题。
2. **BOM 是自动化门禁的前提**：`maven-enforcer` 的 `requireJavaVersion [25,)`、`bannedDependencies`（排除 `docker-java`）等规则只有在版本集中时才可校验。
3. **≥6 个月稳定版**：新主版本的前 6 个月是破坏性变更与安全修补的高发期；交付型产品不应承担该风险。
4. **核验过的事实**：初始化时逐项核验了 Maven Central 与 npm registry，确认了 Boot 3.5 EOL 与 MyBatis-Plus Boot 4 专用 starter——这两条若按经验假设写，构建会直接失败。

## 被否方案

| 方案 | 否决理由 |
|---|---|
| 跟随最新版（Vite 8 / AntD 6 / TS 7） | 主版本跃迁涉及组件 API 与生态适配；TS 7 与 Vite 8 的插件生态成熟度未知，属交付风险 |
| 各模块自行声明版本 | 必然产生隐性版本冲突，且 BOM 失去意义 |
| 用 `<properties>` 集中但允许模块覆盖 | 覆盖口子一旦存在就会被用，等价于没有约束 |
| 立刻升级到最新版并同步改造 | 一期尚无业务代码，改造收益为零、风险为正；应在业务压力出现时再评估 |

## 影响与后续约束

- 【强制】新增依赖必须先在 BOM 声明版本与用途，再在模块引用；PR 中出现未在 BOM 定义的 `<version>` 直接驳回
- 【强制】`mvn dependency:tree` 结果须无版本冲突（CI 校验）
- 【强制】前端内部包引用一律 `workspace:*`；出现具体版本号即驳回
- **已知偏差**：本仓前端按方案基线锁定，与 npm 最新主版本存在代差，已在根级 `README.md` 明确说明
- **待办**：节点 8 的 Nacos 与 Pact **暂不锁定版本**（需先完成 Spring Boot 4.1 兼容性验证），对应任务 `M0000-010`（NEEDS_HUMAN）
