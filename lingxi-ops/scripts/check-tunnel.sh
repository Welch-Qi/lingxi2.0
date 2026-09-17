#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— check-tunnel.sh
#
# 职责：隧道三层探测（TCP 端口 -> DB 真查询 -> 缓存真 PING），失败自动重建；仍不通则通知并暂停当晚派发
# 幂等：只读探测（重建动作由 tunnel-up.sh 承担）
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

SCRIPT_NAME="check-tunnel"
DB_LOCAL_PORT="${LX_DB_TUNNEL_PORT:-13306}"
CACHE_LOCAL_PORT="${LX_CACHE_TUNNEL_PORT:-16379}"
PAUSE_FLAG="${RUNTIME_DIR}/.tunnel-down"

probe_tcp() {
  local port="$1"
  (echo > "/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
}

probe_db() {
  # 第二层：真查询（不只是端口通）
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${LX_DB_PASSWORD:-}" psql -h 127.0.0.1 -p "${DB_LOCAL_PORT}" \
      -U "${LX_DB_USER:-postgres}" -d "${LX_DB_NAME:-lingxi}" -tAc "SELECT 1" >/dev/null 2>&1
  else
    warn "未安装 psql 客户端，跳过 DB 真查询（第二层探测降级）"
    return 0
  fi
}

probe_cache() {
  # 第三层：真 PING
  if command -v valkey-cli >/dev/null 2>&1; then
    [[ "$(valkey-cli -h 127.0.0.1 -p "${CACHE_LOCAL_PORT}" ${LX_CACHE_PASSWORD:+-a "${LX_CACHE_PASSWORD}"} ping 2>/dev/null)" == "PONG" ]]
  elif command -v redis-cli >/dev/null 2>&1; then
    [[ "$(redis-cli -h 127.0.0.1 -p "${CACHE_LOCAL_PORT}" ${LX_CACHE_PASSWORD:+-a "${LX_CACHE_PASSWORD}"} ping 2>/dev/null)" == "PONG" ]]
  else
    warn "未安装 valkey-cli/redis-cli，跳过缓存真 PING（第三层探测降级）"
    return 0
  fi
}

check_all() {
  probe_tcp "${DB_LOCAL_PORT}" || { warn "DB 端口 ${DB_LOCAL_PORT} 不通"; return 1; }
  probe_tcp "${CACHE_LOCAL_PORT}" || { warn "缓存端口 ${CACHE_LOCAL_PORT} 不通"; return 1; }
  probe_db || { warn "DB 真查询失败"; return 1; }
  probe_cache || { warn "缓存真 PING 失败"; return 1; }
  return 0
}

log "开始三层探测…"
if check_all; then
  log "隧道健康"
  rm -f "${PAUSE_FLAG}"
  exit 0
fi

log "探测失败，尝试自动重建隧道…"
if ! bash "${SCRIPT_DIR}/tunnel-up.sh"; then
  warn "隧道重建失败（第 1 次）"
  sleep 5
  bash "${SCRIPT_DIR}/tunnel-up.sh" || warn "隧道重建失败（第 2 次）"
fi

if check_all; then
  log "隧道已恢复"
  rm -f "${PAUSE_FLAG}"
  exit 0
fi

# 仍不通：置暂停标记 + 通知人工 + 暂停当晚派发（§3.1 E6）
log "隧道仍不可用，写入暂停标记并通知人工"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "${PAUSE_FLAG}"
if [[ -n "${LX_NOTIFY_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "${LX_NOTIFY_WEBHOOK_URL}" \
    -H 'Content-Type: application/json' \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"[灵犀] SSH 隧道不可用，已暂停当晚任务派发，请人工检查\"}}" \
    >/dev/null 2>&1 || warn "通知发送失败"
fi
fail "隧道不可用：今晚禁止派发任何任务（技术规约2.0 §3.1 E6）"
