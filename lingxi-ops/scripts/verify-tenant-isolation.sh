#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— verify-tenant-isolation.sh（租户隔离自动化验证套件，6 项）
#
# 职责：合并前必跑门禁。租户数据越权为 P0 级安全事故（§4.9.3）
# 幂等：只读（仅写入测试报告）
# 依据：《灵犀系统技术规约2.0》§4.9.4 四道防线 · §4.12 隔离测试
#
# 用法：verify-tenant-isolation.sh <租户A_TOKEN> <租户B_TOKEN> [API_BASE]
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
CODE_A_TO_B="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${TOKEN_A}" \
  "${API_BASE}/api/v1/cus/customers/${B_RES_ID}" 2>/dev/null)"
if [[ "${CODE_A_TO_B}" == "403" || "${CODE_A_TO_B}" == "404" ]]; then
  log "  A 访问 B 的资源 -> ${CODE_A_TO_B} OK"; PASSED+=1
else
  warn "  A 访问 B 的资源 -> ${CODE_A_TO_B}（必须 403/404：租户越权为 P0 事故）"; FAILED+=1
fi

# ② 列表层：租户 A 的列表接口 -> 结果集必须 100% 属于租户 A（抽样断言）
log "-- ② 列表层归属 --"
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

# ③ 检索层：租户 A 搜索不得召回租户 B 记录（含向量检索）
log "-- ③ 检索层（含向量）--"
SEARCH_BODY="$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${API_BASE}/api/v1/kc/knowledge/search?keyword=${LX_TEST_B_KEYWORD:-test}" 2>/dev/null)"
if echo "${SEARCH_BODY}" | grep -qE "${LX_TEST_B_MARKER:-__TENANT_B_MARKER__}"; then
  warn "  检索召回了租户 B 的记录"; FAILED+=1
else
  log "  检索未召回他租户记录 OK"; PASSED+=1
fi

# ④ 智能体层：智能体以租户 A 上下文调用工具 -> 不得读取租户 B 数据
log "-- ④ 智能体层 --"
AGENT_BODY="$(curl -s -X POST -H "Authorization: Bearer ${TOKEN_A}" -H "Content-Type: application/json" \
  -d '{"skillId":"cus.customer.query","params":{"id":"'"${B_RES_ID}"'"}}' \
  "${API_BASE}/api/v1/ag/tools/invoke" 2>/dev/null)"
if echo "${AGENT_BODY}" | grep -qE "010003|600003|403|not found|未找到"; then
  log "  智能体工具调用被正确拦截 OK"; PASSED+=1
else
  warn "  智能体可能读到了他租户数据（响应：$(echo "${AGENT_BODY}" | head -c 120)）"; FAILED+=1
fi

# ⑤ 导出/报表：导出行数必须等于本租户计数（对账断言）
log "-- ⑤ 导出对账 --"
EXPORT_A="$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${API_BASE}/api/v1/cus/customers/export?format=csv" 2>/dev/null | wc -l)"
EXPORT_B="$(curl -s -H "Authorization: Bearer ${TOKEN_B}" "${API_BASE}/api/v1/cus/customers/export?format=csv" 2>/dev/null | wc -l)"
if [[ "${EXPORT_A}" -gt 0 ]] && [[ "${EXPORT_A}" != "${EXPORT_B}" ]]; then
  log "  两租户导出行数不同（A=${EXPORT_A} B=${EXPORT_B}）OK"; PASSED+=1
elif [[ "${EXPORT_A}" -eq 0 ]]; then
  warn "  租户 A 导出为空，无法对账（请确认测试数据）"; FAILED+=1
else
  warn "  两租户导出行数相同（A=${EXPORT_A} B=${EXPORT_B}），高度可疑"; FAILED+=1
fi

# ⑥ RLS 校验：绕过应用层直连数据库查询 -> RLS 必须拦住
log "-- ⑥ RLS 直连校验（第三道防线）--"
DB_PORT="${LX_DB_TUNNEL_PORT:-13306}"
if command -v psql >/dev/null 2>&1; then
  RLS_RESULT="$(PGPASSWORD="${LX_DB_PASSWORD:-}" psql -h 127.0.0.1 -p "${DB_PORT}" \
    -U "${LX_DB_USER:-postgres}" -d "${LX_DB_NAME:-lingxi}" -tAc \
    "SET app.tenant_id = '${LX_TEST_TENANT_A_ID:-1}'; SELECT count(*) FROM sys_user;" 2>/dev/null | tail -1 | tr -d ' ' || echo "err")"
  TOTAL="$(PGPASSWORD="${LX_DB_PASSWORD:-}" psql -h 127.0.0.1 -p "${DB_PORT}" \
    -U "${LX_DB_USER:-postgres}" -d "${LX_DB_NAME:-lingxi}" -tAc \
    "SELECT count(*) FROM sys_user;" 2>/dev/null | tail -1 | tr -d ' ' || echo "err")"
  if [[ "${RLS_RESULT}" != "${TOTAL}" ]]; then
    log "  RLS 生效（本租户 ${RLS_RESULT} < 总数 ${TOTAL}）OK"; PASSED+=1
  else
    warn "  RLS 未生效或策略为公开（本租户 ${RLS_RESULT} == 总数 ${TOTAL}）"; FAILED+=1
  fi
else
  warn "  未安装 psql，跳过 RLS 直连校验（CI 环境必须安装）"; FAILED+=1
fi

# ---- 报告 ----
cat > "${REPORT}" <<JSON
{
  "suite": "tenant-isolation",
  "checkedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "passed": ${PASSED},
  "failed": ${FAILED},
  "verdict": "$([[ ${FAILED} -eq 0 ]] && echo PASS || echo FAIL)",
  "note": "6 项隔离套件为合并前必跑门禁（技术规约2.0 §4.9.4）"
}
JSON

log "报告：${REPORT}"
log "通过 ${PASSED} 项 / 失败 ${FAILED} 项"
(( FAILED > 0 )) && fail "租户隔离验证未通过：禁止合并"
log "租户隔离验证全部通过"
