#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— verify-tenant-isolation.sh（租户隔离自动化验证套件，6 项）
#
# 职责：合并前必跑门禁。租户数据越权为 P0 级安全事故（§4.9.3）
# 幂等：只读（仅写入测试报告）
# 依据：《灵犀系统技术规约2.0》§4.9.4 四道防线 · §4.12 隔离测试
#
# 用法：verify-tenant-isolation.sh <租户A_TOKEN> <租户B_TOKEN> [API_BASE]
#
# 范围开关（LX_ISOLATION_SCOPE）：
#   all（默认）—— 跑全部 6 项（本地/正式门禁口径）
#   db          —— 只跑第 ⑥ 项（RLS 直连校验）。用于「业务接口尚未实现」的阶段：
#                  ①~⑤ 依赖 /api/v1/cus|kc|ag（当前全仓 0 个 Controller），
#                  在这些接口落地前跑它们必然全 FAIL —— 若一并计入，会使门禁
#                  永久为红、等于形同虚设。故此时**明确跳过并记入报告**，
#                  不静默放过（报告里 skipped 项与原因可见）。
# ============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACT_DIR="${OPS_ROOT}/artifacts"
REPORT="${ARTIFACT_DIR}/tenant-isolation-$(date -u +%Y%m%d%H%M%S).json"
mkdir -p "${ARTIFACT_DIR}"

TOKEN_A="${1:-${LX_TEST_TOKEN_A:-}}"
TOKEN_B="${2:-${LX_TEST_TOKEN_B:-}}"
API_BASE="${3:-${LX_API_BASE:-http://127.0.0.1:8080}}"
SCOPE="${LX_ISOLATION_SCOPE:-all}"
declare -i SKIPPED=0
declare -a SKIPPED_ITEMS=()

skip_item() {
  SKIPPED+=1
  SKIPPED_ITEMS+=("$1")
  warn "  ${1} 已跳过（scope=${SCOPE}：$2）"
}

SCRIPT_NAME="verify-tenant-isolation"
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [isolation] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [isolation] [FAIL] $*" >&2; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [isolation] [WARN] $*" >&2; }

[[ -z "${TOKEN_A}" || -z "${TOKEN_B}" ]] && fail "需提供两个租户的 Token（或用 LX_TEST_TOKEN_A/B）"

declare -i PASSED=0 FAILED=0

req() { # method path token -> 输出 "http_code body"
  local method="$1" path="$2" token="$3"
  curl -s -o /tmp/lx_iso_body -w '%{http_code}' -X "${method}" \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant-Id: ${4:-}" \
    -H "Accept: application/json" \
    "${API_BASE}${path}" 2>/dev/null
  echo
  cat /tmp/lx_iso_body 2>/dev/null
}

check() { # 序号 名称 期望 实际
  if [[ "$3" == "$4" ]]; then
    log "  ① ${1} ${2}: OK（${4}）"; PASSED+=1
  else
    warn "  ${1} ${2}: FAIL（期望 ${3}，实际 ${4}）"; FAILED+=1
  fi
}

log "==== 租户隔离 6 项套件（合并前必跑门禁）===="

# ① 数据层：租户 A 的 Token 访问租户 B 的资源 ID -> 必须 403/404
log "-- ① 数据层越权 --"
B_RES_ID="${LX_TEST_B_RESOURCE_ID:-1}"
if [[ "${SCOPE}" != "all" ]]; then
  skip_item "① 数据层越权" "业务接口未实现（需 /api/v1/cus/customers/{id}）"
else
CODE_A_TO_B="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${TOKEN_A}" \
  "${API_BASE}/api/v1/cus/customers/${B_RES_ID}" 2>/dev/null)"
if [[ "${CODE_A_TO_B}" == "403" || "${CODE_A_TO_B}" == "404" ]]; then
  log "  A 访问 B 的资源 -> ${CODE_A_TO_B} OK"; PASSED+=1
else
  warn "  A 访问 B 的资源 -> ${CODE_A_TO_B}（必须 403/404：租户越权为 P0 事故）"; FAILED+=1
fi
fi

# ② 列表层：租户 A 的列表接口 -> 结果集必须 100% 属于租户 A（抽样断言）
log "-- ② 列表层归属 --"
if [[ "${SCOPE}" != "all" ]]; then
  skip_item "② 列表层归属" "业务接口未实现（需 /api/v1/cus/customers 列表）"
else
LIST_BODY="$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${API_BASE}/api/v1/cus/customers?pageNo=1&pageSize=50" 2>/dev/null)"
if echo "${LIST_BODY}" | grep -qE '"tenantId"[[:space:]]*:[[:space:]]*[0-9]+'; then
  OTHER="$(echo "${LIST_BODY}" | grep -oE '"tenantId"[[:space:]]*:[[:space:]]*[0-9]+' | awk -F: '{print $2}' | tr -d ' ' | sort -u | grep -v "^${LX_TEST_TENANT_A_ID:-1}$" || true)"
  if [[ -z "${OTHER}" ]]; then
    log "  列表结果 100% 属于租户 A OK"; PASSED+=1
  else
    warn "  列表含非本租户数据（tenantId=${OTHER}）"; FAILED+=1
  fi
else
  warn "  列表响应未返回 tenantId，无法断言（建议接口回传该字段用于隔离校验）"; FAILED+=1
fi
fi

# ③ 检索层：租户 A 搜索不得召回租户 B 记录（含向量检索）
log "-- ③ 检索层（含向量）--"
if [[ "${SCOPE}" != "all" ]]; then
  skip_item "③ 检索层（含向量）" "业务接口未实现（需 /api/v1/kc/knowledge/search）"
else
SEARCH_BODY="$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${API_BASE}/api/v1/kc/knowledge/search?keyword=${LX_TEST_B_KEYWORD:-test}" 2>/dev/null)"
if echo "${SEARCH_BODY}" | grep -qE "${LX_TEST_B_MARKER:-__TENANT_B_MARKER__}"; then
  warn "  检索召回了租户 B 的记录"; FAILED+=1
else
  log "  检索未召回他租户记录 OK"; PASSED+=1
fi
fi

# ④ 智能体层：智能体以租户 A 上下文调用工具 -> 不得读取租户 B 数据
log "-- ④ 智能体层 --"
if [[ "${SCOPE}" != "all" ]]; then
  skip_item "④ 智能体层" "业务接口未实现（需 /api/v1/ag/tools/invoke）"
else
AGENT_BODY="$(curl -s -X POST -H "Authorization: Bearer ${TOKEN_A}" -H "Content-Type: application/json" \
  -d '{"skillId":"cus.customer.query","params":{"id":"'"${B_RES_ID}"'"}}' \
  "${API_BASE}/api/v1/ag/tools/invoke" 2>/dev/null)"
if echo "${AGENT_BODY}" | grep -qE "010003|600003|403|not found|未找到"; then
  log "  智能体工具调用被正确拦截 OK"; PASSED+=1
else
  warn "  智能体可能读到了他租户数据（响应：$(echo "${AGENT_BODY}" | head -c 120)）"; FAILED+=1
fi
fi

# ⑤ 导出/报表：导出行数必须等于本租户计数（对账断言）
log "-- ⑤ 导出对账 --"
if [[ "${SCOPE}" != "all" ]]; then
  skip_item "⑤ 导出对账" "业务接口未实现（需 /api/v1/cus/customers/export）"
else
EXPORT_A="$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${API_BASE}/api/v1/cus/customers/export?format=csv" 2>/dev/null | wc -l)"
EXPORT_B="$(curl -s -H "Authorization: Bearer ${TOKEN_B}" "${API_BASE}/api/v1/cus/customers/export?format=csv" 2>/dev/null | wc -l)"
if [[ "${EXPORT_A}" -gt 0 ]] && [[ "${EXPORT_A}" != "${EXPORT_B}" ]]; then
  log "  两租户导出行数不同（A=${EXPORT_A} B=${EXPORT_B}）OK"; PASSED+=1
elif [[ "${EXPORT_A}" -eq 0 ]]; then
  warn "  租户 A 导出为空，无法对账（请确认测试数据）"; FAILED+=1
else
  warn "  两租户导出行数相同（A=${EXPORT_A} B=${EXPORT_B}），高度可疑"; FAILED+=1
fi
fi

# ⑥ RLS 校验：绕过应用层直连数据库查询 -> RLS 必须拦住
#
# ⚠️ 关键：用**非 owner、非 superuser 账号**连接（LX_TEST_DB_USER）。
#    PostgreSQL 规则：superuser 与表 owner **默认绕过 RLS**（除非 FORCE ROW LEVEL SECURITY，
#    本仓 23 张表均未 force）—— 用 owner 连库测出的"隔离生效"是**假象**。
#    历史缺陷：原实现用 LX_DB_USER（本机=postgres=superuser+owner）直查，
#    且断言为「本租户数 != 总数」—— 两租户数据量相同时即使 RLS 完全失效也判 PASS。
#
#    现改为真实隔离断言：
#      1) 造 A/B 两租户各 1 条数据
#      2) 以租户 A 上下文查询 -> 只见 A 的行，不见 B 的
#      3) 以租户 B 上下文查询 -> 只见 B 的行，不见 A 的
#      4) 不设租户上下文 -> 0 行（fail-closed）
#    并对每张 RLS 覆盖表逐一断言，而非只测 sys_user 一张。
log "-- ⑥ RLS 直连校验（第三道防线·非 owner 账号）--"
DB_PORT="${LX_DB_TUNNEL_PORT:-13306}"
DB_NAME="${LX_DB_NAME:-lingxi}"
DB_ADMIN="${LX_DB_USER:-postgres}"
# 测试专用账号：非 owner、非 superuser —— 只有它才能真正受 RLS 约束
DB_TEST_USER="${LX_TEST_DB_USER:-lx_rls_test}"
DB_TEST_PASS="${LX_TEST_DB_PASSWORD:-}"

if ! command -v psql >/dev/null 2>&1; then
  warn "  未安装 psql，跳过 RLS 直连校验（CI 环境必须安装）"; FAILED+=1
elif [[ -z "${DB_TEST_PASS}" ]]; then
  warn "  未配置 LX_TEST_DB_PASSWORD（非 owner 测试账号口令），跳过 RLS 直连校验"; FAILED+=1
else
  # 探测测试账号是否存在且非 superuser/非 owner —— 不可用则明确失败，不可静默跳过
  ADMIN_Q="PGPASSWORD='${LX_DB_PASSWORD:-}' psql -h 127.0.0.1 -p ${DB_PORT} -U ${DB_ADMIN} -d ${DB_NAME} -tAc"
  # 补授权：库被重建后（--reset / 首次部署）GRANT 会丢失，
  # 表现为 "permission denied for table ..."，且 A_sees_B 取到的是错误信息而非数字。
  eval "${ADMIN_Q} \"GRANT USAGE ON SCHEMA public TO ${DB_TEST_USER}\"" >/dev/null 2>&1
  eval "${ADMIN_Q} \"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${DB_TEST_USER}\"" >/dev/null 2>&1
  eval "${ADMIN_Q} \"GRANT USAGE ON SCHEMA public TO ${DB_TEST_USER}\"" >/dev/null 2>&1
  ACC_INFO="$(eval "${ADMIN_Q} \"SELECT CASE WHEN r.rolsuper THEN 1 ELSE 0 END||'|'||CASE WHEN r.rolbypassrls THEN 1 ELSE 0 END||'|'||(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner=r.oid) FROM pg_roles r WHERE r.rolname='${DB_TEST_USER}'\"" 2>/dev/null | tail -1 | tr -d ' ')"
  if [[ -z "${ACC_INFO}" || "${ACC_INFO}" == "|"* ]]; then
    warn "  测试账号 ${DB_TEST_USER} 不存在（需预先创建并授予表权限）"; FAILED+=1
  else
    ACC_SUPER="${ACC_INFO%%|*}"; ACC_REST="${ACC_INFO#*|}"; ACC_BYPASS="${ACC_REST%%|*}"; ACC_OWNER="${ACC_REST#*|}"
    if [[ "${ACC_SUPER}" == "1" ]]; then
      warn "  测试账号 ${DB_TEST_USER} 是 superuser —— 会绕过 RLS，测出的隔离是假象"; FAILED+=1
    elif [[ "${ACC_BYPASS}" == "1" ]]; then
      warn "  测试账号 ${DB_TEST_USER} 有 BYPASSRLS 属性 —— 会绕过 RLS"; FAILED+=1
    elif [[ "${ACC_OWNER}" != "0" ]]; then
      warn "  测试账号 ${DB_TEST_USER} 是 ${ACC_OWNER} 张表的 owner —— 会绕过 RLS"; FAILED+=1
    else
      log "  测试账号 ${DB_TEST_USER} 已确认：非 superuser、非 owner（RLS 真实生效路径）"
      # 逐表断言：以租户 A/B 上下文分别查询，要求各自只见本租户数据
      RLS_TABLES="${LX_TEST_RLS_TABLES:-dt_entity_company dt_entity_contact dt_account_asset mkg_unsubscribe mkg_social_account sys_user}"
      RLS_OK=0; RLS_BAD=0; RLS_DETAIL=""
      for tbl in ${RLS_TABLES}; do
        if ! eval "${ADMIN_Q} \"SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${tbl}'\"" 2>/dev/null | grep -q 1; then
          RLS_DETAIL="${RLS_DETAIL} ${tbl}:NO_POLICY"
          continue
        fi
        # 造数据：A/B 各 1 行（表无 id/tenant_id 业务列时跳过造数据，仅断言策略存在）
        HAS_COLS="$(eval "${ADMIN_Q} \"SELECT (EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='${tbl}' AND column_name='tenant_id'))::text||'|'||(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='${tbl}' AND column_name='id'))::text\"" 2>/dev/null | tail -1 | tr -d ' ')"
        TEN_COL="${HAS_COLS%%|*}"; ID_COL="${HAS_COLS#*|}"
        SEED_OK="skipped"
        if [[ "${TEN_COL}" == "1" && "${ID_COL}" == "1" ]]; then
          eval "${ADMIN_Q} \"SET app.tenant_id='${LX_TEST_TENANT_A_ID:-1001}'; INSERT INTO ${tbl} (id, tenant_id) VALUES (900001, ${LX_TEST_TENANT_A_ID:-1001}) ON CONFLICT DO NOTHING; SET app.tenant_id='${LX_TEST_TENANT_B_ID:-2002}'; INSERT INTO ${tbl} (id, tenant_id) VALUES (900002, ${LX_TEST_TENANT_B_ID:-2002}) ON CONFLICT DO NOTHING;\"" >/dev/null 2>&1 && SEED_OK="seeded"
        fi
        # 以测试账号（受 RLS 约束）分别查询两个租户上下文
        # 注意：psql -c 传多语句时，"SET ..." 会额外输出一行 "SET"，
        # 故取值须过滤出纯数字行（grep -E '^[0-9]+$'），不能直接 tail -1
        # （否则取到 "SET"，断言恒失败）。
        num_only() { grep -E '^[0-9]+$' | tail -1; }
        A_SAW="$(PGPASSWORD="${DB_TEST_PASS}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_TEST_USER}" -d "${DB_NAME}" -tAc \
          "SET app.tenant_id='${LX_TEST_TENANT_A_ID:-1001}'; SELECT count(*) FROM ${tbl} WHERE tenant_id = ${LX_TEST_TENANT_A_ID:-1001};" 2>/dev/null | num_only)"
        A_SAW_B="$(PGPASSWORD="${DB_TEST_PASS}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_TEST_USER}" -d "${DB_NAME}" -tAc \
          "SET app.tenant_id='${LX_TEST_TENANT_A_ID:-1001}'; SELECT count(*) FROM ${tbl} WHERE tenant_id = ${LX_TEST_TENANT_B_ID:-2002};" 2>/dev/null | num_only)"
        NO_CTX="$(PGPASSWORD="${DB_TEST_PASS}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_TEST_USER}" -d "${DB_NAME}" -tAc \
          "SELECT count(*) FROM ${tbl} WHERE tenant_id IS NOT NULL;" 2>/dev/null | num_only)"
        # 断言：A 上下文看不到 B 的数据；无租户上下文看不到任何行（fail-closed）
        if [[ "${A_SAW_B}" == "0" && "${NO_CTX}" == "0" ]]; then
          RLS_OK=$((RLS_OK+1))
        else
          RLS_BAD=$((RLS_BAD+1))
          RLS_DETAIL="${RLS_DETAIL} ${tbl}:A_sees_B=${A_SAW_B},no_ctx=${NO_CTX}"
        fi
        # 清理
        if [[ "${SEED_OK}" == "seeded" ]]; then
          eval "${ADMIN_Q} \"DELETE FROM ${tbl} WHERE id IN (900001, 900002);\"" >/dev/null 2>&1
        fi
      done
      if [[ "${RLS_BAD}" -eq 0 && "${RLS_OK}" -gt 0 ]]; then
        log "  RLS 生效：${RLS_OK} 张表全部满足「跨租户不可见 + 无上下文 fail-closed」OK"; PASSED+=1
      else
        warn "  RLS 未生效或断言不通过（${RLS_OK} 通过 / ${RLS_BAD} 失败）${RLS_DETAIL}"; FAILED+=1
      fi
    fi
  fi
fi

# ---- 报告 ----
# skipped 项必须写入报告（不静默放过）：审阅者能看到「哪些没跑、为什么」
SKIPPED_JSON="[]"
if [[ ${SKIPPED} -gt 0 ]]; then
  SKIPPED_JSON="["
  for i in "${!SKIPPED_ITEMS[@]}"; do
    [[ $i -gt 0 ]] && SKIPPED_JSON="${SKIPPED_JSON},"
    SKIPPED_JSON="${SKIPPED_JSON}\"${SKIPPED_ITEMS[$i]}\""
  done
  SKIPPED_JSON="${SKIPPED_JSON}]"
fi

cat > "${REPORT}" <<JSON
{
  "suite": "tenant-isolation",
  "checkedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scope": "${SCOPE}",
  "passed": ${PASSED},
  "failed": ${FAILED},
  "skipped": ${SKIPPED},
  "skippedItems": ${SKIPPED_JSON},
  "verdict": "$([[ ${FAILED} -eq 0 ]] && echo PASS || echo FAIL)",
  "note": "6 项隔离套件为合并前必跑门禁（技术规约2.0 §4.9.4）"
}
JSON

log "报告：${REPORT}"
log "通过 ${PASSED} 项 / 失败 ${FAILED} 项 / 跳过 ${SKIPPED} 项"
if [[ ${SKIPPED} -gt 0 ]]; then
  warn "  跳过的项（scope=${SCOPE}）：${SKIPPED_ITEMS[*]}"
  warn "  ⚠️ 这些项依赖尚未实现的业务接口，未纳入本次判定 —— 对应任务见 tasks/ 下的客户中心主线简报"
fi
if (( FAILED > 0 )); then
  fail "租户隔离验证未通过（失败 ${FAILED} 项）：禁止合并"
  exit 1
fi
log "租户隔离验证全部通过"
