#!/usr/bin/env bash
# =============================================================================
# verify-skeleton.sh —— 代码仓骨架完整性校验（只读，幂等）
#
# 定位：属「初始化校验」脚本，不计入技术规约2.0 §4.13.2 的 11 个运维脚本。
# 用途：初始化后、以及每次改动目录结构后，回答一个问题——
#       「骨架还在不在？有没有人（或 AI）悄悄删了目录、改了命名口径？」
#
# 设计取舍：只做存在性与口径校验，不校验代码内容（那是 qa-gate.sh 的职责）。
#           原因：目录结构的破坏是静默的（编译仍能过），必须独立探针才能发现。
#
# 退出码：0 = 全部通过；1 = 存在 FAIL 项
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PASS=0
FAIL=0
WARN=0

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; WARN=$((WARN + 1)); }
title() { printf '\n\033[36m%s\033[0m\n' "$1"; }

need_dir()  { if [ -d "${ROOT_DIR}/$1" ]; then ok "目录 $1"; else bad "缺失目录 $1"; fi; }
need_file() { if [ -f "${ROOT_DIR}/$1" ]; then ok "文件 $1"; else bad "缺失文件 $1"; fi; }
need_exec() {
  if [ -f "${ROOT_DIR}/$1" ]; then
    if [ -x "${ROOT_DIR}/$1" ]; then ok "可执行 $1"; else warn "存在但无执行位 $1（chmod +x）"; fi
  else bad "缺失脚本 $1"; fi
}

printf '\033[1m灵犀系统 · 代码仓骨架校验\033[0m\n根目录：%s\n' "$ROOT_DIR"

# ---------------------------------------------------------------- 1. 仓库组根级
title '[1/9] 仓库组根级三件套与忽略规则'
need_file 'AGENTS.md'
need_file 'contracts.md'
need_file 'TASKS.md'
need_file 'README.md'
need_file '.gitignore'
if [ -f "${ROOT_DIR}/.gitignore" ]; then
  if grep -qE '^\.env$' "${ROOT_DIR}/.gitignore"; then
    ok '.gitignore 已忽略 .env（密钥不入库）'
  else
    bad '.gitignore 未忽略 .env——密钥可能入库（最高风险）'
  fi
else
  bad '.gitignore 缺失，无法保证 .env 不入库'
fi

# ---------------------------------------------------------------- 2. 后端模块（三产品：元枢底座 + 灵犀集群）
title '[2/9] 后端 Maven 模块（口径：单体 15 = 元枢 4 + 灵犀 11；另有 BOM 与 2 独立进程）'
BIZ_MODULES="workbench customer product order service marketing intel analytics agent knowledge configcenter"
for m in ${BIZ_MODULES}; do need_dir "lingxi-server/lingxi/lingxi-${m}"; done
need_dir 'lingxi-server/yuanshu/yuanshu-platform'
need_dir 'lingxi-server/yuanshu/yuanshu-data'
need_dir 'lingxi-server/yuanshu/yuanshu-semantic'
need_dir 'lingxi-server/yuanshu/yuanshu-agent-factory'
need_dir 'lingxi-server/lingxi-dependencies'
need_dir 'lingxi-server/yuanshu'          # 元枢中间聚合 POM
need_dir 'lingxi-server/lingxi'           # 灵犀中间聚合 POM
BIZ_COUNT=$(printf '%s\n' ${BIZ_MODULES} | wc -l | tr -d ' ')
ok "灵犀业务模块计数 = ${BIZ_COUNT}（期望 11）"
if [ "${BIZ_COUNT}" -ne 11 ]; then bad "灵犀业务模块数量口径不符（实际 ${BIZ_COUNT}，期望 11）"; fi
# 开物一期不建任何目录（归口表 §6.4）；出现 kaiwu 目录即为越界
if [ -d "${ROOT_DIR}/lingxi-server/kaiwu" ]; then bad '禁止项：lingxi-server/kaiwu 目录已提前创建（开物一期只登记契约不建目录）'; else ok '开物目录基线：0（一期不建目录，符合归口表 §6.4）'; fi

title '[2b/9] 公共 Starter 组（5 个）与元枢独立进程（2 个）'
for s in core security mybatis llm observability; do need_dir "lingxi-server/lingxi-starters/lingxi-starter-${s}"; done
need_dir 'lingxi-server/yuanshu/yuanshu-agent-runtime'
need_dir 'lingxi-server/yuanshu/yuanshu-data-jobs'

# ---------------------------------------------------------------- 3. 分层与 BOM
title '[3/9] 模块内五层分层（api / app / domain / infra / starter）'
# 包名用「代码域前缀」而非 Maven 模块名（技术规约2.0 §2.6：cus / prd / ord / svc / mkg …）
LAYER_MISSING=0
# 逐模块精确校验（模块名与包名不一致，必须显式映射，不能靠字符串推断）
for pair in "workbench:wb" "customer:cus" "product:prd" "order:ord" "service:svc" \
            "marketing:mkg" "intel:intel" "analytics:ana" "agent:ag" "knowledge:kc" "configcenter:cc"; do
  mod="${pair%%:*}"
  pkg="${pair##*:}"
  for layer in api app domain infra starter; do
    if [ ! -d "${ROOT_DIR}/lingxi-server/lingxi/lingxi-${mod}/src/main/java/com/lingxi/${pkg}/${layer}" ]; then
      LAYER_MISSING=$((LAYER_MISSING + 1))
      warn "缺失分层目录：lingxi/lingxi-${mod} → com/lingxi/${pkg}/${layer}"
    fi
  done
done
if [ "${LAYER_MISSING}" -eq 0 ]; then
  ok "11 个业务模块 × 5 层 = 55 个分层目录齐全（包名用代码域前缀）"
else
  bad "存在 ${LAYER_MISSING} 个缺失的分层目录（ArchUnit 与代码组织会错位）"
fi
# 元枢底座模块的各层（包前缀 com.yuanshu，模块名与包名显式映射）
for pair in "yuanshu-platform:sys" "yuanshu-data:dt" "yuanshu-semantic:sem" "yuanshu-agent-factory:ac"; do
  mod="${pair%%:*}"; pkg="${pair##*:}"
  if [ -d "${ROOT_DIR}/lingxi-server/yuanshu/${mod}/src/main/java/com/yuanshu/${pkg}" ]; then
    ok "${mod} 分层根存在（com/yuanshu/${pkg}）"
  else
    bad "${mod} 分层根缺失（com/yuanshu/${pkg}）"
  fi
done
# 独立进程包根
for pair in "yuanshu-agent-runtime:agentruntime" "yuanshu-data-jobs:datajobs"; do
  mod="${pair%%:*}"; pkg="${pair##*:}"
  if [ -d "${ROOT_DIR}/lingxi-server/yuanshu/${mod}/src/main/java/com/yuanshu/${pkg}" ]; then
    ok "${mod} 包根存在（com/yuanshu/${pkg}）"
  else
    bad "${mod} 包根缺失（com/yuanshu/${pkg}）"
  fi
done

if [ -f "${ROOT_DIR}/lingxi-server/lingxi-dependencies/pom.xml" ]; then
  if grep -q 'java.version' "${ROOT_DIR}/lingxi-server/lingxi-dependencies/pom.xml"; then
    ok 'BOM 已声明 java.version'
  else
    warn 'BOM 未见 java.version 属性'
  fi
  if grep -q 'mybatis-plus-spring-boot4-starter' "${ROOT_DIR}/lingxi-server/lingxi-dependencies/pom.xml"; then
    ok 'BOM 使用 Boot 4 专用 starter（mybatis-plus-spring-boot4-starter）'
  else
    bad 'BOM 未使用 mybatis-plus-spring-boot4-starter——Boot 4 下会不兼容'
  fi
else
  bad 'BOM（lingxi-dependencies/pom.xml）缺失'
fi

# ---------------------------------------------------------------- 4. 子模块禁用版本号
title '[4/9] 子模块禁止自行声明依赖版本（依赖版本只写在 BOM）'
# 注意：<parent> 内的 <version> 是聚合关系声明，必须存在，不算违规；
#       只检查 <dependencies> 段内是否出现 <version>。
OFFENDERS=0
for pom in $(find "${ROOT_DIR}/lingxi-server" -name pom.xml \
              -not -path '*/lingxi-dependencies/*' \
              -not -path "${ROOT_DIR}/lingxi-server/pom.xml" 2>/dev/null); do
  if awk '/<dependencies>/,/<\/dependencies>/' "$pom" | grep -qE '^[[:space:]]*<version>'; then
    OFFENDERS=$((OFFENDERS + 1))
    bad "依赖硬写版本（应从 BOM 继承）：${pom#"${ROOT_DIR}/"}"
  fi
done
if [ "${OFFENDERS}" -eq 0 ]; then ok '子模块未见依赖硬写版本（全部从 BOM 继承）'; fi

# ---------------------------------------------------------------- 5. 前端
title '[5/9] 前端工程（13 个路由分区 + 5 个内部包）'
WEB_ROOT="${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/routes"
for r in workbench customer lead opportunity product order service marketing intel analytics agent knowledge config; do
  need_dir "lingxi-web/apps/lingxi-web/src/routes/${r}"
done
# 排除两个**身份跳转中转页**（不进菜单树）：login（登录）、workspace-select（选租户/工作区）。
# 计数口径 = 目录数 − 这两个；新增一级菜单分区时必须同步这里与下面的期望值。
ROUTE_COUNT=$(find "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/routes" -mindepth 1 -maxdepth 1 -type d \
  -not -name 'login' -not -name 'workspace-select' 2>/dev/null | wc -l | tr -d ' ')
if [ "${ROUTE_COUNT}" -ne 13 ]; then
  bad "一级菜单路由分区数量 = ${ROUTE_COUNT}（期望 13；login 与 workspace-select 为跳转中转页不计）"
else
  ok '一级菜单路由分区数量 = 13（另含 login / workspace-select 两个跳转中转页）'
fi
for p in ui request types utils i18n; do need_dir "lingxi-web/packages/lingxi-${p}"; done
need_file 'lingxi-web/pnpm-workspace.yaml'
if [ -f "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/app/router/modules.ts" ]; then
  REGISTERED=$(grep -c "^import" "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/app/router/modules.ts")
  ok "路由注册表 modules.ts 存在（登记 import 行数 = ${REGISTERED}）"
else
  bad '路由注册表 app/router/modules.ts 缺失——新增分区将无法注册'
fi

# 元枢管理台（yuanshu-console）：与 lingxi-web 同层的独立 app，5 个管理台分区
title '[5/9b] 元枢管理台前端（独立 app + 5 个分区）'
CONSOLE_ROUTES="${ROOT_DIR}/lingxi-web/apps/yuanshu-console/src/routes"
for r in overview iam governance prompts metrics; do
  need_dir "lingxi-web/apps/yuanshu-console/src/routes/${r}"
done
need_file 'lingxi-web/apps/yuanshu-console/package.json'
need_file 'lingxi-web/apps/yuanshu-console/src/app/router/modules.ts'
if [ -d "${CONSOLE_ROUTES}" ]; then
  CONSOLE_COUNT=$(find "${CONSOLE_ROUTES}" -mindepth 1 -maxdepth 1 -type d \
    -not -name 'login' -not -name 'workspace-select' 2>/dev/null | wc -l | tr -d ' ')
  if [ "${CONSOLE_COUNT}" -ne 5 ]; then
    bad "元枢管理台分区数量 = ${CONSOLE_COUNT}（期望 5：overview/iam/governance/prompts/metrics）"
  else
    ok '元枢管理台分区数量 = 5（另含 login / workspace-select 中转页）'
  fi
fi
# 开物前端一期不建 app（只登记预留分区名）
if [ -d "${ROOT_DIR}/lingxi-web/apps/kaiwu-web" ] || [ -d "${ROOT_DIR}/lingxi-web/apps/kaiwu-console" ]; then
  bad '禁止项：开物前端一期只登记预留分区，不建 app 目录'
else
  ok '开物前端基线：0 个 app'
fi

# ---------------------------------------------------------------- 6. 配置文件
title '[6/9] 配置模板（5 个 yml，非敏感；密钥走 .env）'
for f in app db cache model tunnel; do need_file "lingxi-ops/config/${f}.yml"; done
need_file 'lingxi-ops/.env.example'
need_file 'lingxi-server/.env.example'
if [ -f "${ROOT_DIR}/lingxi-ops/.env" ]; then
  warn '存在 lingxi-ops/.env（本地密钥，确认未入库：git check-ignore .env）'
else
  ok '未见 .env（未配置或已正确忽略）'
fi
if grep -q 'Dockerfile\|docker-compose' "${ROOT_DIR}/lingxi-ops/config/app.yml" 2>/dev/null; then
  bad '配置中出现容器化残留'
else
  ok '配置中无容器化残留'
fi

# ---------------------------------------------------------------- 7. 运维脚本
title '[7/9] 11 个幂等运维脚本'
CANON="tunnel-up check-tunnel init-db start-dev stop-dev check-env qa-gate dispatch-task verify-tenant-isolation deploy rollback"
SCRIPTS_OK=0
for s in ${CANON}; do
  if [ -f "${ROOT_DIR}/lingxi-ops/scripts/${s}.sh" ]; then SCRIPTS_OK=$((SCRIPTS_OK + 1)); fi
done
if [ "${SCRIPTS_OK}" -eq 11 ]; then
  ok "11 个运维脚本齐全（口径与规约 §4.13.2 一致）"
else
  bad "运维脚本数量 = ${SCRIPTS_OK}（期望 11）"
fi
need_file 'lingxi-ops/ci/gitlab-ci.yml'

# ---------------------------------------------------------------- 8. 文档库
title '[8/9] 文档库落位（五件套 + ADR）'
need_file 'lingxi-docs/01-product/灵犀系统产品规划说明书2.0.md'
need_file 'lingxi-docs/01-product/灵犀系统功能清单V2.0.md'
need_file 'lingxi-docs/08-standards/灵犀系统技术规约2.0.md'
need_file 'lingxi-docs/08-standards/灵犀系统技术架构和组件选型方案2.0.md'
for d in 01-product 02-data 03-api 04-tenant 05-security 06-adr 07-runbook 08-standards; do
  need_file "lingxi-docs/${d}/_index.md"
done
ADR_COUNT=$(find "${ROOT_DIR}/lingxi-docs/06-adr" -name 'ADR-*.md' 2>/dev/null | wc -l | tr -d ' ')
if [ "${ADR_COUNT}" -ge 1 ]; then ok "ADR 已录 ${ADR_COUNT} 份"; else warn '尚未录入 ADR'; fi

# ---------------------------------------------------------------- 9. 待补齐缺口
title '[9/9] 已知缺口（不阻塞骨架，阻塞对应模块开工）'
for f in "lingxi-docs/02-data" "lingxi-docs/03-api" "lingxi-docs/04-tenant" "lingxi-docs/05-security"; do
  cnt=$(find "${ROOT_DIR}/${f}" -maxdepth 1 -name '*.md' -not -name '_index.md' 2>/dev/null | wc -l | tr -d ' ')
  if [ "${cnt}" -eq 0 ]; then warn "${f} 权威文档未产出（对应任务 M0000-008）"; fi
done
for repo in "lingxi-server" "lingxi-web" "lingxi-ops" "yuanshu-data-worker" "lingxi-docs"; do
  if [ -d "${ROOT_DIR}/${repo}/.git" ]; then
    ok "${repo} 已初始化 Git（分支 $(cd "${ROOT_DIR}/${repo}" && git branch --show-current 2>/dev/null)）"
  else
    warn "${repo} 尚未初始化 Git"
  fi
done
if [ -d "${ROOT_DIR}/.git" ]; then
  ok "仓库组根已初始化 Git（umbrella repo，仅跟踪根级约定文件）"
else
  warn "仓库组根未初始化 Git——根级 AGENTS/contracts/TASKS 将失去版本追踪"
fi

# ---------------------------------------------------------------- 汇总
printf '\n\033[1m校验结果：通过 %s · 失败 %s · 提醒 %s\033[0m\n' "${PASS}" "${FAIL}" "${WARN}"
if [ "${FAIL}" -gt 0 ]; then
  printf '\033[31m判定：FAIL（存在骨架缺失，禁止派发开发任务）\033[0m\n'
  exit 1
fi
printf '\033[32m判定：PASS（骨架完整，可派发 READY 任务）\033[0m\n'
exit 0
