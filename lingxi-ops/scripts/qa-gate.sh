#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— qa-gate.sh（验收门禁）
#
# 职责：独立于开发方的验收。不采信开发方（AI Coding 工具）自报结果（§1.3 A5）。
#       测试 + 覆盖率 + SAST + 依赖/密钥扫描 + 硬编码反模式扫描（附录D 18 条）
# 幂等：只读（除生成 artifacts 下的报告文件）
# 依据：《灵犀系统技术规约2.0》§4.9.6 安全门禁 · §4.12 测试规约 · 附录D 扫描规则
#
# 退出码：0 = 验收通过；1 = 验收失败（自动生成 FIX 任务）
# ============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${OPS_ROOT}/../lingxi-server"
WEB_DIR="${OPS_ROOT}/../lingxi-web"
ARTIFACT_DIR="${OPS_ROOT}/artifacts"
TASK_ID="${1:-local-$(date -u +%Y%m%d%H%M%S)}"
RESULT_FILE="${ARTIFACT_DIR}/${TASK_ID}/qa-result.json"
mkdir -p "$(dirname "${RESULT_FILE}")"

[[ -f "${OPS_ROOT}/.env" ]] && { set -a; source "${OPS_ROOT}/.env"; set +a; }

SCRIPT_NAME="qa-gate"
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [qa-gate] $*"; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [qa-gate] [WARN] $*" >&2; }

declare -i V_FAIL=0
declare -a FAILED_ITEMS=()

mark_fail() { V_FAIL+=1; FAILED_ITEMS+=("$1"); warn "FAIL: $1"; }
mark_pass() { log "  OK: $1"; }

# ============================================================ 0. 运行模式
#
# 两种模式（默认值 0 = 全量，行为与历史一致）：
#   QA_GATE_SCAN_ONLY=0（默认）—— 跑全部 6 段（构建/单测/覆盖率 + 架构 + 前端 + SAST + 密钥 + 扫描）
#   QA_GATE_SCAN_ONLY=1          —— **只跑第 6 段附录 D 反模式扫描**
#
# 为什么需要扫描专用模式：CI 已把「构建/单测/覆盖率/架构/前端」拆成独立 job 并行执行，
# 若 security:hardcode 再调本脚本全量，会重复跑一次 mvn clean verify（数分钟）纯浪费。
# 本地开发与门禁自检仍用全量模式（不设该变量）。
if [[ "${QA_GATE_SCAN_ONLY:-0}" == "1" ]]; then
  SCAN_ONLY=1
  log "---- 扫描专用模式（QA_GATE_SCAN_ONLY=1）：仅执行第 6 段附录 D 反模式扫描 ----"
else
  SCAN_ONLY=0
fi

# ============================================================ 1. 后端构建与单测
if [[ "${SCAN_ONLY}" == "0" ]]; then
log "---- 1/6 后端编译、单测与覆盖率 ----"
# 不用 -q：失败时需保留完整输出用于定位（历史缺陷：-q 使 maven-verify.log 仅剩 1 行）
if ( cd "${SERVER_DIR}" && mvn -B -ntp clean verify -DskipITs       -Djacoco.skip=false > "${ARTIFACT_DIR}/${TASK_ID}/maven-verify.log" 2>&1 ); then
  # 覆盖率：优先读 jacoco 汇总 CSV，缺失则如实标记 no-data（不假装达标）
  COVERAGE="no-data"
  COVERAGE_CSV="$(find "${SERVER_DIR}" -path "*target/site/jacoco/jacoco.csv" 2>/dev/null | head -1)"
  if [[ -n "${COVERAGE_CSV}" ]]; then
    COVERAGE="$(awk -F, 'NR>1 {im+=$4; ic+=$5; bm+=$6; bc+=$7} END {if (bm+bc>0) printf "%.1f%%", 100*bc/(bm+bc); else print "no-data"}' "${COVERAGE_CSV}")"
    COVERAGE="${COVERAGE}（行覆盖，来自 $(basename "$(dirname "${COVERAGE_CSV}")")）"
  fi
  if [[ "${COVERAGE}" == "no-data" ]]; then
    mark_pass "后端 verify（编译/单测/打包通过）"
    warn "覆盖率门禁无数据：未生成 jacoco.csv —— 全仓缺少测试代码时 check 目标为空集会静默通过；本次不视为覆盖率达标"
  else
    mark_pass "后端 verify（含覆盖率 ${COVERAGE}）"
  fi
else
  mark_fail "后端 verify 失败（编译/单测/覆盖率未达标）；日志：artifacts/${TASK_ID}/maven-verify.log"
  COVERAGE="failed"
fi
fi   # SCAN_ONLY=1 时跳过第 1 段

# ============================================================ 2. 架构边界（ArchUnit）
if [[ "${SCAN_ONLY}" == "0" ]]; then
log "---- 2/6 架构边界校验（ArchUnit：五层分层 + 跨模块只依赖 api 包 + 跨产品方向规则）----"
ARCH_TEST_REPORT="${SERVER_DIR}/yuanshu/yuanshu-platform/target/surefire-reports"
ARCH_TXT="${ARCH_TEST_REPORT}/com.yuanshu.sys.architecture.ArchitectureRuleTest.txt"
if [[ -f "${ARCH_TXT}" ]]; then
  # 必须解析测试结果，不能只判文件存在（历史缺陷：文件存在但 0 测试/有失败仍会误判 OK）
  ARCH_RUN="$(grep -oE 'Tests run:[[:space:]]*[0-9]+' "${ARCH_TXT}" | head -1 | grep -oE '[0-9]+' || echo 0)"
  ARCH_FAIL="$(grep -oE 'Failures:[[:space:]]*[0-9]+' "${ARCH_TXT}" | head -1 | grep -oE '[0-9]+' || echo 0)"
  ARCH_ERR="$(grep -oE 'Errors:[[:space:]]*[0-9]+' "${ARCH_TXT}" | head -1 | grep -oE '[0-9]+' || echo 0)"
  if [[ "${ARCH_RUN}" -gt 0 && "${ARCH_FAIL}" -eq 0 && "${ARCH_ERR}" -eq 0 ]]; then
    mark_pass "ArchUnit 规则全部通过（${ARCH_RUN} 条）"
  else
    mark_fail "ArchUnit 未通过（run=${ARCH_RUN} failures=${ARCH_FAIL} errors=${ARCH_ERR}）；技术规约2.0 §2.2 为强制项"
  fi
else
  mark_fail "ArchUnit 未执行或无测试报告（缺 ${ARCH_TXT##*/}）；技术规约2.0 §2.2 为强制项"
fi
fi   # SCAN_ONLY=1 时跳过第 2 段

# ============================================================ 3. 前端检查
if [[ "${SCAN_ONLY}" == "0" ]]; then
log "---- 3/6 前端：类型检查 + lint + 单测 ----"
if [[ -d "${WEB_DIR}" ]]; then
  if ( cd "${WEB_DIR}" && pnpm -s run typecheck && pnpm -s run lint )       > "${ARTIFACT_DIR}/${TASK_ID}/web-check.log" 2>&1; then
    mark_pass "前端 typecheck + lint"
  else
    mark_fail "前端 typecheck/lint 失败；日志：artifacts/${TASK_ID}/web-check.log"
  fi
  if ( cd "${WEB_DIR}" && pnpm -s run test:unit -- --run )       > "${ARTIFACT_DIR}/${TASK_ID}/web-test.log" 2>&1; then
    mark_pass "前端单测"
  else
    mark_fail "前端单测失败；日志：artifacts/${TASK_ID}/web-test.log"
  fi
else
  warn "未找到 lingxi-web，跳过前端检查"
fi
else
  # 扫描专用模式：仍须执行 ESLint —— 附录 D 规则 10（硬编码中文文案）与
  # 规则 12（组件内直调 HTTP）由 ESLint 的 no-restricted-syntax /
  # no-restricted-imports 判定（AST 级，自动豁免注释与语言包）。
  # 缺这一步，扫描模式下这两条规则将无人判定（形同虚设）。
  log "---- 3/6 前端：ESLint（承载附录 D 规则 10/12）----"
  if [[ -d "${WEB_DIR}" ]]; then
    if ( cd "${WEB_DIR}" && pnpm -s exec eslint . )        > "${ARTIFACT_DIR}/${TASK_ID}/web-lint.log" 2>&1; then
      mark_pass "ESLint（附录 D 规则 10/12）0 error"
    else
      mark_fail "ESLint 报错（附录 D 规则 10/12 命中）；日志：artifacts/${TASK_ID}/web-lint.log"
    fi
  else
    warn "未找到 lingxi-web，跳过 ESLint（规则 10/12 将无人判定）"
  fi
fi   # SCAN_ONLY=1 时：第 3 段只跑 ESLint（承载规则 10/12），跳过 typecheck/单测

# ============================================================ 4. SAST
if [[ "${SCAN_ONLY}" == "0" ]]; then
log "---- 4/6 静态扫描（Semgrep + SpotBugs）----"
if command -v semgrep >/dev/null 2>&1; then
  if semgrep --quiet --error --config=p/owasp-top-ten --config=p/java       "${SERVER_DIR}" > "${ARTIFACT_DIR}/${TASK_ID}/semgrep.log" 2>&1; then
    mark_pass "Semgrep（OWASP Top 10 + Java 规则）0 高危"
  else
    mark_fail "Semgrep 命中高危问题；日志：artifacts/${TASK_ID}/semgrep.log"
  fi
else
  warn "未安装 semgrep，跳过（CI 环境必须安装，§4.9.6）"
fi

# ============================================================ 5. 依赖与密钥
log "---- 5/6 依赖漏洞与密钥泄露 ----"
if command -v gitleaks >/dev/null 2>&1; then
  if gitleaks detect --no-banner --redact       -s "${OPS_ROOT}/.." > "${ARTIFACT_DIR}/${TASK_ID}/gitleaks.log" 2>&1; then
    mark_pass "gitleaks（0 密钥泄露）"
  else
    mark_fail "gitleaks 检出密钥泄露；日志：artifacts/${TASK_ID}/gitleaks.log"
  fi
else
  warn "未安装 gitleaks，跳过（CI 环境必须安装）"
fi
if command -v trivy >/dev/null 2>&1; then
  if trivy fs --quiet --severity HIGH,CRITICAL --exit-code 1       "${SERVER_DIR}" "${WEB_DIR}" > "${ARTIFACT_DIR}/${TASK_ID}/trivy.log" 2>&1; then
    mark_pass "Trivy 依赖扫描 0 高危 CVE"
  else
    mark_fail "Trivy 命中高危 CVE；日志：artifacts/${TASK_ID}/trivy.log"
  fi
else
  warn "未安装 trivy，跳过"
fi
fi   # SCAN_ONLY=1 时跳过第 4/5 段（SAST + 依赖密钥，CI 已有独立 job）

# ============================================================ 6. 硬编码反模式扫描（附录D）
log "---- 6/6 硬编码与反模式扫描（18 条，命中即验收 FAIL）----"
BASE_REF="${LX_BASE_REF:-HEAD~1}"
if git -C "${OPS_ROOT}/.." rev-parse "${BASE_REF}" >/dev/null 2>&1; then
  # 路径过滤须与规约附录 D 口径一致：
  #   · 规则 1「jdbc 连接串」与规则 4「模型名」**允许**出现在 config/ 下（配置模板本就如此）
  #   · 历史缺陷：原过滤式 '^(config/|...)' 只匹配路径**开头**的 config/，
  #     而实际路径为 lingxi-ops/config/db.yml → 未被过滤 → 规则 1 误判违规。
  #     改为 '(^|/)config/' 匹配任意层级的 config/ 目录。
  CHANGED="$(git -C "${OPS_ROOT}/.." diff --name-only "${BASE_REF}" -- '*.java' '*.ts' '*.tsx' '*.sql' '*.yml' '*.xml' | grep -v -E '(^|/)config/|.*\.md$' || true)"
else
  warn "${BASE_REF} 不可用，改为扫描全部受版本控制文件"
  # 必须含 yml/yaml —— 附录 D 规则 1/3/18 的扫描范围包含它们
  # （历史缺陷：此处漏了 yml，导致 base ref 不可用时 workflow 等配置文件全部漏扫）
  CHANGED="$(git -C "${OPS_ROOT}/.." ls-files | grep -E '\.(java|ts|tsx|sql|xml|yml|yaml)$' | grep -v -E '(^|/)config/' || true)"
fi

scan_rule() {
  local no="$1" desc="$2" pattern="$3" pathspec="$4" mode="${5:-}"
  local targets
  targets="$(echo "${CHANGED}" | grep -E "${pathspec}" || true)"
  # 排除请求层与通用组件库（规则 12 的适用范围：业务页面组件）
  targets="$(echo "${targets}" | grep -vE 'packages/lingxi-(request|ui)/' || true)"
  [[ -z "${targets}" ]] && return 0
  local hits
  # 性能：把命中该路径类型的文件**一次性**交给 grep（-H 输出文件名），
  # 而非逐文件循环起进程 —— 全量扫描 444 文件时后者会产生上千次进程 fork，
  # 在 Windows Git Bash 上单次 grep 约 0.9s，导致扫描段耗时数分钟（CI 不可接受）。
  # 语义等价：仍是逐行匹配 + 每条规则最多展示 20 条命中。
  local abs_files=() f
  while read -r f; do
    [[ -n "${f}" && -f "${OPS_ROOT}/../${f}" ]] && abs_files+=("${OPS_ROOT}/../${f}")
  done <<< "${targets}"
  [[ "${#abs_files[@]}" -eq 0 ]] && return 0
  hits="$(grep -nHE "${pattern}" "${abs_files[@]}" 2>/dev/null \
          | sed "s|${OPS_ROOT}/../||" || true)"
  # 规约口径「非 127.0.0.1 的 IP+端口」：本地与内网地址不算云端地址
  if [[ "${mode}" == "EXCLUDE_LOCAL_IP" ]]; then
    hits="$(echo "${hits}" | grep -vE '(127\.0\.0\.1|0\.0\.0\.0|localhost)' || true)"
  fi
  hits="$(echo "${hits}" | head -20 || true)"
  if [[ -n "${hits}" ]]; then
    echo "${hits}" | sed 's/^/      /'
    mark_fail "附录D 规则 ${no}：${desc}"
  fi
}

scan_rule 1  "硬编码数据库连接串"              'jdbc:(postgresql|mysql|oracle)://'                                          '\.(java|yml|xml)$'
scan_rule 2  "硬编码云端地址（非 127.0.0.1 的 IP+端口）" '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]{2,5}'  '\.(java|ts|tsx)$' EXCLUDE_LOCAL_IP
scan_rule 3  "硬编码口令与密钥"                '(password|secret|apiKey|api_key|token)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{6,}' '\.(java|ts|tsx|yml|xml)$'
scan_rule 4  "代码中出现模型名（禁，只允许 config/model.yml）" '(gpt-|qwen|claude|gemini|deepseek)[a-z0-9.\-]*'      '\.(java|ts|tsx)$'
scan_rule 5  "非 infra 层引用数据访问组件（越层）" '(JdbcTemplate|DataSource|@Mapper)'                                   '/app/.*\.java$'
scan_rule 7  "智能体专用写接口（影子 API）"    '/api/v1/agent/.*(post|put|patch|Post|Put|Patch)'                             '\.(java|ts|tsx)$'
scan_rule 8  "编排层直连业务 REST（绕过 MCP 工具网关）" '(RestTemplate|WebClient)[^;]*(/api/v1/)'                        '\.java$'
scan_rule 9  "内联提示词（必须走提示词库）"    '(你是一个|You are a|Your task is)'                                           '\.(java|ts|tsx)$'
# 规则 10（硬编码中文文案）由 ESLint 的 no-restricted-syntax 判定（AST 级，
# 自动豁免注释与语言包，见 lingxi-web/eslint.config.js）—— 已在第 3 段的
# `pnpm lint` 中执行。此处不再用正则重复判定（历史缺陷：粗糙正则把注释里的中文、
# JSX 文本节点等一并误报，且与 ESLint 两套实现必然漂移）。
scan_rule 10 "前端硬编码中文文案（违反 i18n）" '^$a$'                                                       'lingxi-web/.*\.(tsx|ts)$'
# 规则 12（组件内直调 HTTP）由 ESLint 的 no-restricted-imports 判定
# （禁 import axios，并已对 packages/lingxi-request 放行）—— 已在第 3 段的
# `pnpm lint` 中执行。此处不再用正则重复判定（历史缺陷：粗糙正则把请求层本体
# packages/lingxi-request/src/http.ts 也判为违规 —— axios 正是其实现）。
scan_rule 12 "前端组件内直调 HTTP"             '^$a$'                                                         'lingxi-web/.*\.(tsx|ts)$'
scan_rule 13 "状态硬编码判断（必须走状态机）"  'if[[:space:]]*\([[:space:]]*status[[:space:]]*=='                              '\.java$'
scan_rule 15 "浮点金额字段（必须最小单位整数）" '(float|double)[[:space:]]+(amount|price|money|balance|fee)'                   '\.java$'
# 规则 16 由下方「补充判定」段负责（逐表检查 CREATE TABLE 后 40 行内是否含 tenant_id，
# 并按 sys_ 白名单豁免）。此处不做粗粒度匹配 —— 否则任何含建表的 sql 都会被误判失败。
scan_rule 16 "新增表 DDL 缺 tenant_id（白名单外）" '^$a$'                                                  '\.sql$'
scan_rule 17 "代码中直连 SSH（隧道只由脚本管理）" '(jsch|paramiko|com\.jcraft)'                                             '\.(java|xml)$'
scan_rule 18 "容器化残留（Docker/K8s）"        '(docker-compose|Dockerfile|kind:[[:space:]]*Deployment|apiVersion:[[:space:]]*apps/)' '\.(yml|yaml|java|xml)$'

# ---- 规则 16 的补充判定：DDL 建表后 40 行内必须出现 tenant_id，除非表名在 sys_ 白名单 ----
# 历史缺陷：本段只 printf 输出，**从不调用 mark_fail** —— 检测到违规却不判失败（漏报）。
# 修正：把命中结果收集起来，统一 mark_fail（一次违规记一项）。
if [[ -n "${CHANGED}" ]]; then
  DDL_HITS=""
  while read -r f; do
    [[ -f "${OPS_ROOT}/../$f" ]] || continue
    part="$(awk '
      /CREATE TABLE/ { tbl=$0; buf=""; cnt=0; intable=1 }
      intable { buf = buf "
" $0; cnt++
                if (cnt > 40) {
                  if (buf !~ /tenant_id/ && tbl !~ /sys_dict|sys_i18n|sys_country|sys_currency|casbin_rule|dt_metric_catalog/) {
                    printf "%s:%d: 表可能缺 tenant_id 列 -> %s
", FILENAME, NR, tbl
                  }
                  intable = 0
                }
              }
    ' "${OPS_ROOT}/../$f" || true)"
    [[ -n "${part}" ]] && DDL_HITS="${DDL_HITS}${part}"$'\n'
  done <<< "$(echo "${CHANGED}" | grep -E '\.sql$' || true)"
  if [[ -n "${DDL_HITS}" ]]; then
    echo "${DDL_HITS}" | sed '/^$/d' | sed 's/^/      /'
    mark_fail "附录D 规则 16：新增表 DDL 缺 tenant_id（白名单外）"
  fi
fi

# ============================================================ 结果落盘
VERDICT="PASS"
(( V_FAIL > 0 )) && VERDICT="FAIL"

# 用 python 生成 JSON：保证转义正确且空数组合法
#（历史缺陷：纯 bash 拼串时 FAILED_ITEMS 为空会产出 "failedItems": , 非法 JSON）
FENV_VERDICT="${VERDICT}" \
FENV_TASK="${TASK_ID}" \
FENV_COVERAGE="${COVERAGE:-unknown}" \
FENV_FAILED="$(printf '%s\n' "${FAILED_ITEMS[@]:-}" | grep -v '^$' || true)" \
FENV_EVIDENCE="artifacts/${TASK_ID}" \
FENV_RESULT="${RESULT_FILE}" \
python - <<'PY'
import json, os, datetime
failed = [l for l in os.environ.get("FENV_FAILED", "").split("\n") if l.strip()]
result = {
    "taskId":     os.environ["FENV_TASK"],
    "verdict":    os.environ["FENV_VERDICT"],
    "checkedAt":  datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "coverage":   os.environ["FENV_COVERAGE"],
    "failedItems": failed,
    "evidenceDir": os.environ["FENV_EVIDENCE"],
    "note":       "本结果由独立门禁脚本产出，未采信开发方自报（技术规约2.0 §1.3 A5）",
}
with open(os.environ["FENV_RESULT"], "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY

log "验收结果已写入：${RESULT_FILE}"
# 自检：确保产物是合法 JSON（CI 会消费本文件）
if command -v python >/dev/null 2>&1; then
  python -c "import json,sys; json.load(open(sys.argv[1],encoding='utf-8'))" "${RESULT_FILE}" \
    || { warn "产物 JSON 非法，门禁结果不可信"; exit 2; }
fi
if (( V_FAIL > 0 )); then
  warn "验收失败（${V_FAIL} 项）：应自动生成 FIX 任务并回链原任务（§3.8 W4）"
  exit 1
fi
log "验收通过（verdict=PASS）"
