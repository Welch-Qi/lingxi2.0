# 灵犀系统 · WorkBuddy + Qoder 自动化交付总方案
## （任务分级模型版 · 唯一执行蓝本）

> 版本：v1.1 ｜ 2026-09-05
> 定位：整合《多智能体流水线方案》《WorkBuddy-Qoder 混合方案》《夜间流水线补充方案》，形成一套可直接落地的执行蓝本。核心特征：**所有开发任务按复杂度分为 T1~T5 五级，自动路由到不同模型档位，在夜间折扣窗口（22:00~08:00）无人值守执行，白天只留人工门禁。**
> v1.1 增补：四条工程规约（SSH 隧道监测重连 / 文档先行 / 统一任务清单 / 配置化脚本化），见《灵犀系统-自动化交付工程规约补充v1.1.md》，与本方案共同构成完整执行蓝本。

---

## 一、总体架构

```
┌────────────────────── WorkBuddy（编排中枢）──────────────────────┐
│  协调 Agent          验收 Agent          环境 Agent               │
│  任务分解/派发/解锁   独立测试+SAST+审查   服务启停/DB迁移/健康检查  │
└──────┬──────────────────┬──────────────────────┬────────────────┘
       │ 派发(qodercli -p) │ 独立验收(不经Qoder)   │
       ▼                  ▼                      ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Qoder 开发执行 │   │  测试报告解析  │   │ 脚本化联调环境 │
│ 按分级选模型   │   │  qa-result   │   │ start/stop编排│
│ worktree 隔离 │   └──────────────┘   └──────────────┘
└──────┬───────┘
       │ 回传：result.json + git 分支 + stdout JSON + exit code
       ▼
   TASKS.md 状态机 → 通过合并 PR 解锁下一模块 / 失败派修复任务(≤5轮)
```

**职责一句话**：WorkBuddy 负责"决定做什么、判断做没做好"；Qoder 负责"把代码写出来"；人只负责三件事——开局审查任务分解、每模块审查敏感代码 PR、全量完成后的交付验收。

---

## 二、任务分级体系与模型路由（核心）

### 2.1 五级任务分类表

| 级别 | 任务类型 | 模型档位 | max-turns | timeout | 验收强度 | 夜间倍率 |
|---|---|---|---|---|---|---|
| **T1** | 核心功能开发（M1~M10 主代码、复杂业务逻辑、智能体编排） | **Max 档（Qwen3.8-max）** | 60 | 90 min | 全量：测试+覆盖率+SAST+契约 diff+敏感审查 | 0.1× |
| **T2** | Bug 修复、CRUD 补齐、接口对接、样式还原 | **Plus 档** | 40 | 60 min | 测试+SAST+diff 审查 | 0.04× |
| **T3** | 测试脚本生成、文档整理、代码注释、迁移脚本 | **Effective 档** | 25 | 30 min | 测试+lint | ≈0 |
| **T4** | 派发前预处理：简报格式化、依赖分析、TASKS.md 维护 | Effective 档（WorkBuddy 自身执行） | — | — | 产物抽查 | — |
| **T5** | 重构、架构调整 | **禁止 AI 自主执行**——必须人先设计方案，AI 只按方案执行（拆解为多个 T1/T2 子任务） | — | — | 人审 100% | — |

### 2.2 路由实现：tier 字段 + 自动选型

任务简报首行固定写分级，派发脚本据此自动拼装命令：

```markdown
# tasks/M3-backend.md（简报首行）
---
tier: T1
---
## 目标
按 contracts.md 实现数据中心模块的 4 个 API……
## 验收标准（可自动校验）
- pytest tests/contract/test_m3*.py 全部通过
- 覆盖率 ≥ 70%
- semgrep 扫描 0 高危
## 边界
- 仅改 src/modules/datacenter/ 与对应测试目录
```

```bash
# qoder_client.sh 核心路由逻辑（节选）
tier=$(head -5 "$task_file" | grep '^tier:' | cut -d' ' -f2)
case "$tier" in
  T1) MODEL="qwen3.8-max";  TURNS=60; TMO=5400 ;;
  T2) MODEL="qwen-plus";    TURNS=40; TMO=3600 ;;
  T3) MODEL="qwen-eff";     TURNS=25; TMO=1800 ;;
  T5) echo "T5 禁止自主派发，需人工拆解"; exit 1 ;;
esac
timeout "$TMO" qodercli -p "读取 $task_file，按 AGENTS.md 与 contracts.md 实现，\
结果写入 artifacts/${MOD}/result.json" \
  --model "$MODEL" --max-turns "$TURNS" \
  --permission-mode auto --worktree --output-format=json
```

### 2.3 模型名称确认

派发前执行 `qoderclicn --list-models`，确认 Max 档模型实际 ID（你指定的 **Qwen3.8-max**，若列表中为 `qwen3-coder-plus`/`Qwen3.7-Max` 等名称则按实际 ID 填入路由表）。模型名只改 `qoder_client.sh` 一处，全局生效。

### 2.4 分级升降级规则

- **升级**：Effective/Plus 档任务同一问题失败 2 次 → 自动升一档重派（并记入 retro，校准后续分级）
- **降级**：T1 任务中"改动 < 3 文件且无新接口"的子项 → 降为 T2 执行
- **防滥用**：协调 Agent 每周汇总各档位任务量与失败率，人工复核分级合理性

### 2.5 成本测算（夜间折扣窗口）

| 档位 | 倍率 | 预估任务占比 | 说明 |
|---|---|---|---|
| Max（T1） | 0.1× | ~30% 任务 / ~60% token 消耗 | 只有主代码值得用强模型 |
| Plus（T2） | 0.04× | ~40% 任务 | 夜间几乎可忽略 |
| Effective（T3/T4） | ≈0 | ~30% 任务 | 忽略不计 |

**结论**：分级 + 夜间折扣双重优化后，全项目 10 模块预计 Credits 消耗为"全 Max 档不分级"方案的 **35~45%**，且夜间窗口全部落在中国时区折扣时段。强模型复杂任务一次到位反而比弱模型反复重试更省（官方实证）。

---

## 三、模块拆解与开发顺序

依赖排序：被依赖的底座先行，聚合层最后。

| 模块 | 内容 | 任务构成 | 说明 |
|---|---|---|---|
| M1 认证与工作区 | 登录/SSO/租户/工作区选择 | T1×2 + T2×2 + T3×2 | 一切的前置 |
| M2 配置中心 | 企业公约/用户/角色/权限矩阵 | T1×1 + T2×3 + T3×2 | 标准结构，为权限体系奠基 |
| M3 数据中心 | 客户/商品/渠道/员工主数据 | T1×1 + T2×3 + T3×2 | CRUD 为主，Plus 档消化大半 |
| M4 市场情报 | 搜索指数/热词/产品机会 | T1×2 + T2×2 + T3×2 | 含爬取与数据接入 |
| M5 内容营销 | 社媒管理/发布排期 | T1×1 + T2×2 + T3×1 | 三方平台 API 对接多 |
| M6 销售转化 | 线索/客户画像/商机看板 | T1×2 + T2×3 + T3×2 | 业务逻辑最重的模块 |
| M7 智能决策 | 数据洞察/问答式分析 | T1×2 + T2×2 + T3×1 | 智能体编排，T5 禁区需人先设计 |
| M8 知识中心 | 模板/话术/提示词库 | T1×1 + T2×2 + T3×1 | |
| M9 智能体中心 | 五大智能体运行框架 | T1×2 + T2×2 + T3×1 | 同 M7，架构人定 |
| M10 超级工作台 | 聚合各模块入口与首页 | T1×1 + T2×2 + T3×1 | 依赖全部模块，最后做 |

M4/M5/M6 在 M1~M3 完成后**可并行**（各自独立 worktree，2~3 任务并行上限）。

---

## 四、每日自动化节律

### 22:00 · 自动化①【夜间开发调度】
```
rrule: FREQ=DAILY;BYHOUR=22;BYMINUTE=0
动作：协调 Agent 读 TASKS.md → 取所有 status=READY 任务（≤4 个/晚）
     → 按 tier 逐个派发（qoder_client.sh 自动选模型）
     → 每任务完成即写 result.json + 更新 TASKS.md
     → 07:30 硬截止，未完成标记 INTERRUPTED 并落盘进度
```

### 08:00 · 自动化②【晨间验收报告】
```
rrule: FREQ=DAILY;BYHOUR=8;BYMINUTE=0
动作：验收 Agent 汇总夜间 result.json / qa-result.json
     → 生成 reports/acceptance-YYYYMMDD.md
     → 你上班后只需：看报告 + 审查标记 NEEDS_HUMAN 的敏感 PR
```

### 夜间时间线示例
```
22:00  派发 M6 后端（T1/Max）→ M6 测试脚本（T3/Effective）并行
00:30  M6 后端完成 → 验收 PASS → 解锁 M6 前端（T1/Max）+ M6 fix-1（T2/Plus）
03:40  M6 前端触碰租户隔离文件 → 结论 NEEDS_HUMAN → 冻结合并
05:00  继续跑 M6 遗留 T2/T3 任务
07:30  硬截止收尾，写状态文件
08:00  晨间报告：2 模块闭环 / 1 个敏感 PR 待你审 / 1 个 INTERRUPTED 断点
```

**护栏四件套**（官方睡前清单）：①状态落盘断点续跑 ②timeout + max-turns 双硬截止（超时写状态文件，不按成功处理）③单晚 ≤4 任务分批 ④通知出口（IM 提醒跑完/卡住）。环境前提：开发机"永不睡眠"。

---

## 五、派发与回传机制

**派发**（WorkBuddy → Qoder）：
1. 协调 Agent 把任务写成 `tasks/M6-backend.md`（含 tier 字段）commit 入库
2. 调 `qoder_client.sh dispatch tasks/M6-backend.md` —— 脚本按 tier 自动选模型拼命令
3. Qoder 在独立 worktree 分支（`cursor/…`/`qoder/feat-m6-backend`）读简报执行

**回传**（Qoder → WorkBuddy，四路冗余，任一路可用即视为结果已到）：

| 通道 | 内容 |
|---|---|
| result.json（主） | 状态 / PR 链接 / 测试数 / 覆盖率 / 变更文件清单 |
| git 分支 | 代码本体 + commit 记录 |
| stdout JSON | 执行轨迹、token 消耗、结束原因 |
| exit code | 0=完成 / 124=超时 / 1=失败 |

---

## 六、质量安全三层防线（要点回顾）

1. **L1 生成自检**（Qoder）：按 AGENTS.md/contracts.md 规约 + 自写测试 + 提交前 lint/test
2. **L2 独立验收**（WorkBuddy，不信自报）：全量测试 + 覆盖率≥70% + Semgrep SAST + 依赖 CVE 审计（防幻觉包名）+ 契约 schema diff
3. **L3 人工门禁**（人）：认证/租户隔离/权限/计费目录出现在 diff → 自动冻结 PR 强制人审；重构（T5）人先设计

修复闭环：验收失败 → 生成 bug 报告（复现步骤+失败测试+SAST 证据）→ 按原级或升一档派修复（≤5 轮）→ 超限升级人工。

---

## 七、验收记录三级落盘

| 层 | 载体 | 用途 |
|---|---|---|
| 任务级 | `artifacts/M6/qa-result.json` | 通过率/覆盖率/SAST/结论 PASS·FAIL·NEEDS_HUMAN |
| 模块级 | `TASKS.md` 状态机 | READY→IN_PROGRESS→TESTING→QA_PASS/QA_FAIL/NEEDS_HUMAN→MERGED |
| 全局级 | `reports/acceptance-YYYYMMDD.md` | 晨间报告：进度/Bug 趋势/待人工清单/累计覆盖率 |

全局验收档案同时构成**商业化交付的质量追溯证据**（客户尽调、审计直接可用）。

---

## 八、落地资产清单（开工前一次备齐）

| # | 资产 | 说明 | 耗时 |
|---|---|---|---|
| 1 | Qoder CLI + PAT | `npm i -g @qoder-ai/qodercli`（国内版 qoderclicn），`QODER_PERSONAL_ACCESS_TOKEN` 环境变量 | 半天 |
| 2 | 模型绑定确认 | `qoderclicn --list-models` 确认 Qwen3.8-max 实际 ID，写入路由表 | 10 分钟 |
| 3 | 仓库三件套 | `AGENTS.md`（团队规约）+ `contracts.md`（API/数据契约）+ `TASKS.md`（M1~M10） | 1 天 |
| 4 | `qoder_client.sh` | dispatch（tier 路由）/ poll / result 三命令封装 | 1 天 |
| 5 | `qa_gate.sh` | 测试+SAST+契约校验三合一，输出 qa-result.json | 半天 |
| 6 | 联调环境脚本 | start-dev.sh / stop-dev.sh（进程方式管前后端服务）+ check-env.sh（隧道/DB/Redis/服务四层体检）+ init-db.sh（迁移走 SSH 隧道连云端库） | 1 天 |
| 7 | WorkBuddy 自动化①② | 22:00 调度 + 08:00 报告（仓库就绪后创建并激活） | 10 分钟 |

---

## 九、实施路线与人工检查点

| 阶段 | 内容 | 周期 |
|---|---|---|
| **P0 试运行** | 资产 1~6 备齐 → M1 单模块跑一夜 → 校准分级表/护栏参数 | 1 周 |
| **P1 主力推进** | 自动化①②激活 → M2~M9 按依赖顺序推进，M4/M5/M6 并行 | 2~3 周 |
| **P2 收尾交付** | M10 聚合层 → 全量回归 → 渗透测试 → 交付验收 | 1 周 |

**三个人工检查点**（其余时间你可以不写一行代码）：
1. P0 结束：审查 M1 代码质量，确认分级表和验收标准是否需要校准
2. 首个并行批次（M4~M6）完成：确认并行隔离没有冲突，校准并行数
3. P2 交付验收：全量回归报告 + 渗透测试 + 商业化门禁终审

---

## 十、风险与对策

| 风险 | 对策 |
|---|---|
| AI 生成代码含安全漏洞（业界 45% 漏洞率实证） | L2 SAST + L3 敏感人审双保险；上线前渗透测试 |
| 夜间任务跑偏/死循环烧 Credits | max-turns + timeout 双截止；分批 ≤4；失败半径可控 |
| 分级不当导致弱模型反复失败 | 失败 2 次自动升档 + 每周人工复核分级 |
| 架构漂移（AI 乱落逻辑层） | contracts.md 契约 + T5 禁区（重构必须人先设计） |
| 断点丢失 | 状态文件 + TASKS.md 双落盘，任何时刻可从断点续跑 |
| 并行 worktree 冲突 | 禁止两个 Agent 改同一文件；模块级目录隔离 |
