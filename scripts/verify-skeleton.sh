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

# ---------------------------------------------------------------- 2. 后端模块
title '[2/9] 后端 Maven 模块（口径：14 = 11 业务 + data + platform + BOM）'
BIZ_MODULES="workbench customer product order service marketing intel analytics agent knowledge configcenter"
for m in ${BIZ_MODULES}; do need_dir "lingxi-server/lingxi-${m}"; done
need_dir 'lingxi-server/lingxi-data'
need_dir 'lingxi-server/lingxi-platform'
need_dir 'lingxi-server/lingxi-dependencies'
BIZ_COUNT=$(printf '%s\n' ${BIZ_MODULES} | wc -l | tr -d ' ')
ok "业务模块计数 = ${BIZ_COUNT}（期望 11）"
if [ "${BIZ_COUNT}" -ne 11 ]; then bad "业务模块数量口径不符（实际 ${BIZ_COUNT}，期望 11）"; fi

title '[2b/9] 公共 Starter 组（5 个）与独立进程（2 个）'
for s in core security mybatis llm observability; do need_dir "lingxi-server/lingxi-starters/lingxi-starter-${s}"; done
need_dir 'lingxi-server/lingxi-agent-runtime'
need_dir 'lingxi-server/lingxi-data-jobs'

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
    if [ ! -d "${ROOT_DIR}/lingxi-server/lingxi-${mod}/src/main/java/com/lingxi/${pkg}/${layer}" ]; then
      LAYER_MISSING=$((LAYER_MISSING + 1))
      warn "缺失分层目录：lingxi-${mod} → com/lingxi/${pkg}/${layer}"
    fi
  done
done
if [ "${LAYER_MISSING}" -eq 0 ]; then
  ok "11 个业务模块 × 5 层 = 55 个分层目录齐全（包名用代码域前缀）"
else
  bad "存在 ${LAYER_MISSING} 个缺失的分层目录（ArchUnit 与代码组织会错位）"
fi
# 数据底座与平台模块的各层
for pair in "data:dt" "platform:sys"; do
  mod="${pair%%:*}"; pkg="${pair##*:}"
  if [ -d "${ROOT_DIR}/lingxi-server/lingxi-${mod}/src/main/java/com/lingxi/${pkg}" ]; then
    ok "lingxi-${mod} 分层根存在（com/lingxi/${pkg}）"
  else
    bad "lingxi-${mod} 分层根缺失（com/lingxi/${pkg}）"
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
title '[5/9] 前端工程（11 个路由分区 + 5 个内部包）'
WEB_ROOT="${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/routes"
for r in workbench customer product order service marketing intel analytics agent knowledge config; do
  need_dir "lingxi-web/apps/lingxi-web/src/routes/${r}"
done
# 排除 login：它是身份跳转中转页，不属 11 个一级菜单分区
ROUTE_COUNT=$(find "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/routes" -mindepth 1 -maxdepth 1 -type d \
  -not -name 'login' 2>/dev/null | wc -l | tr -d ' ')
if [ "${ROUTE_COUNT}" -ne 11 ]; then
  bad "一级菜单路由分区数量 = ${ROUTE_COUNT}（期望 11；login 为登录中转页不计）"
else
  ok '一级菜单路由分区数量 = 11（另含 login 中转页）'
fi
for p in ui request types utils i18n; do need_dir "lingxi-web/packages/lingxi-${p}"; done
need_file 'lingxi-web/pnpm-workspace.yaml'
if [ -f "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/app/router/modules.ts" ]; then
  REGISTERED=$(grep -c "^import" "${ROOT_DIR}/lingxi-web/apps/lingxi-web/src/app/router/modules.ts")
  ok "路由注册表 modules.ts 存在（登记 import 行数 = ${REGISTERED}）"
else
  bad '路由注册表 app/router/modules.ts 缺失——新增分区将无法注册'
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
for repo in lingxi-server lingxi-web lingxi-ops lingxi-data-worker; do
  if [ -d "${ROOT_DIR}/${repo}/.git" ]; then ok "${repo} 已初始化 Git"; else warn "${repo} 尚未初始化 Git"; fi
done

# ---------------------------------------------------------------- 汇总
printf '\n\033[1m校验结果：通过 %s · 失败 %s · 提醒 %s\033[0m\n' "${PASS}" "${FAIL}" "${WARN}"
if [ "${FAIL}" -gt 0 ]; then
  printf '\033[31m判定：FAIL（存在骨架缺失，禁止派发开发任务）\033[0m\n'
  exit 1
fi
printf '\033[32m判定：PASS（骨架完整，可派发 READY 任务）\033[0m\n'
exit 0
