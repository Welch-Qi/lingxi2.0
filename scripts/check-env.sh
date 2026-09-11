#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— check-env.sh
#
# 职责：四层体检：隧道 / DB / 缓存 / 服务健康（夜间任务前置，不通则不派发）
# 幂等：只读
# 依据：《灵犀系统技术规约2.0》§4.13.2 · §3.1 E6
#
# 约束（§3.1 E5）：所有环境操作只能通过 scripts/ 中的脚本执行，禁止手工操作。
# 本脚本为 lingxi-ops 权威版本；各仓库根级 scripts/ 只放薄封装，禁止复制修改。
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_DIR="${OPS_ROOT}/config"
RUNTIME_DIR="${LX_RUNTIME_DIR:-${OPS_ROOT}/artifacts/runtime}"
LOG_DIR="${LX_LOG_DIR:-${OPS_ROOT}/artifacts/logs}"
mkdir -p "${RUNTIME_DIR}" "${LOG_DIR}"

# ---- 载入环境变量（.env 优先；缺失则用 .env.example 兜底仅用于提示） ----
if [[ -f "${OPS_ROOT}/.env" ]]; then
  set -a; # shellcheck disable=SC1091
  source "${OPS_ROOT}/.env"; set +a
else
  echo "[WARN] 未找到 ${OPS_ROOT}/.env；请先执行： cp .env.example .env 并填写真实值" >&2
fi

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] [FAIL] $*" >&2; exit 1; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] [WARN] $*" >&2; }

require_env() {
  local missing=()
  for key in "$@"; do
    [[ -z "${!key:-}" ]] && missing+=("${key}")
  done
  if (( ${#missing[@]} > 0 )); then
    fail "以下环境变量未配置：${missing[*]}（见 .env.example）"
  fi
}

SCRIPT_NAME="check-env"
DB_LOCAL_PORT="${LX_DB_TUNNEL_PORT:-13306}"
CACHE_LOCAL_PORT="${LX_CACHE_TUNNEL_PORT:-16379}"
BACKEND_PORT="${SERVER_PORT:-8080}"
declare -i FAILED=0

layer() { log "---- 第 $1 层：$2 ----"; }

# 第 1 层：隧道
layer 1 "SSH 隧道"
if bash "${SCRIPT_DIR}/check-tunnel.sh" >/dev/null 2>&1; then
  log "  隧道 OK"
else
  warn "  隧道 FAIL"
  FAILED+=1
fi

# 第 2 层：数据库
layer 2 "PostgreSQL"
if command -v psql >/dev/null 2>&1; then
  if PGPASSWORD="${LX_DB_PASSWORD:-}" psql -h 127.0.0.1 -p "${DB_LOCAL_PORT}" \
      -U "${LX_DB_USER:-postgres}" -d "${LX_DB_NAME:-lingxi}" -tAc "SELECT 1" >/dev/null 2>&1; then
    log "  数据库 OK"
    # 检查 RLS 策略存在性（第四道防线的兜底校验，§4.4.5）
    RLS_COUNT="$(PGPASSWORD="${LX_DB_PASSWORD:-}" psql -h 127.0.0.1 -p "${DB_LOCAL_PORT}" \
      -U "${LX_DB_USER:-postgres}" -d "${LX_DB_NAME:-lingxi}" -tAc \
      "SELECT count(*) FROM pg_policies" 2>/dev/null | tr -d ' ' || echo 0)"
    if [[ "${RLS_COUNT:-0}" -gt 0 ]]; then
      log "  RLS 策略数：${RLS_COUNT}"
    else
      warn "  未检测到 RLS 策略，租户隔离第三道防线缺失（§4.9.4 ③）"
      FAILED+=1
    fi
  else
    warn "  数据库 FAIL"
    FAILED+=1
  fi
else
  warn "  未安装 psql，跳过（第二层探测降级）"
fi

# 第 3 层：缓存
layer 3 "Valkey"
CLI=""
command -v valkey-cli >/dev/null 2>&1 && CLI="valkey-cli"
[[ -z "${CLI}" ]] && command -v redis-cli >/dev/null 2>&1 && CLI="redis-cli"
if [[ -n "${CLI}" ]]; then
  if [[ "$(${CLI} -h 127.0.0.1 -p "${CACHE_LOCAL_PORT}" ${LX_CACHE_PASSWORD:+-a "${LX_CACHE_PASSWORD}"} ping 2>/dev/null)" == "PONG" ]]; then
    log "  缓存 OK"
  else
    warn "  缓存 FAIL"
    FAILED+=1
  fi
else
  warn "  未安装 valkey-cli/redis-cli，跳过"
fi

# 第 4 层：服务健康
layer 4 "服务健康"
if (echo > "/dev/tcp/127.0.0.1/${BACKEND_PORT}") >/dev/null 2>&1; then
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/actuator/health" >/dev/null 2>&1; then
    log "  后端 OK"
  else
    warn "  后端端口在监听但健康检查未通过"
    FAILED+=1
  fi
else
  log "  后端未启动（开发期可接受；夜间派发前必须启动）"
fi

echo
if (( FAILED > 0 )); then
  fail "环境体检未通过（${FAILED} 项失败）：禁止派发任务（技术规约2.0 §3.1 E6）"
fi
log "环境体检全部通过"
