#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— tunnel-up.sh
#
# 职责：建立 SSH 隧道（PostgreSQL + Valkey 两条），autossh 保活
# 幂等：重复执行不产生重复进程（按 PID 文件与端口占用双重判断）
# 依据：《灵犀系统技术规约2.0》§3.1 E2/E3/E4 · §4.13.2
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

SCRIPT_NAME="tunnel-up"

require_env LX_SSH_HOST LX_SSH_USER LX_SSH_KEY_FILE LX_CLOUD_DB_HOST LX_CLOUD_CACHE_HOST

DB_LOCAL_PORT="${LX_DB_TUNNEL_PORT:-13306}"
CACHE_LOCAL_PORT="${LX_CACHE_TUNNEL_PORT:-16379}"
PID_FILE="${RUNTIME_DIR}/tunnel.pid"

# ---- 保活参数（30 秒心跳防防火墙掐断；3 次失败判死；转发失败即退出防"假活"）----
SSH_OPTS=(
  -o "ServerAliveInterval=${LX_TUNNEL_ALIVE_INTERVAL:-30}"
  -o "ServerAliveCountMax=${LX_TUNNEL_ALIVE_COUNT_MAX:-3}"
  -o "ExitOnForwardFailure=yes"
  -o "ConnectTimeout=${LX_TUNNEL_CONNECT_TIMEOUT:-10}"
  -o "StrictHostKeyChecking=accept-new"
  -o "TCPKeepAlive=yes"
  -i "${LX_SSH_KEY_FILE}"
  -N
)

tunnel_alive() {
  local pid_file="$1"
  [[ -f "${pid_file}" ]] || return 1
  local pid; pid="$(cat "${pid_file}" 2>/dev/null || true)"
  [[ -n "${pid}" ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  return 0
}

port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -q ":${port} "
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | grep -q ":${port} "
  else
    (echo > "/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
  fi
}

if tunnel_alive "${PID_FILE}" && port_listening "${DB_LOCAL_PORT}" && port_listening "${CACHE_LOCAL_PORT}"; then
  log "隧道已存在且两个端口均可用，无需重复建立（幂等退出）"
  exit 0
fi

log "清理可能存在的残留隧道进程…"
if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  [[ -n "${old_pid}" ]] && kill "${old_pid}" 2>/dev/null || true
  rm -f "${PID_FILE}"
fi

log "建立隧道：DB 127.0.0.1:${DB_LOCAL_PORT} -> ${LX_CLOUD_DB_HOST}:${LX_CLOUD_DB_PORT:-5432}"
log "建立隧道：Cache 127.0.0.1:${CACHE_LOCAL_PORT} -> ${LX_CLOUD_CACHE_HOST}:${LX_CLOUD_CACHE_PORT:-6379}"

# 只绑定 127.0.0.1，禁止暴露到局域网（配置文件 config/tunnel.yml 同源）
if command -v autossh >/dev/null 2>&1; then
  log "使用 autossh 启动（自动重连）"
  AUTOSSH_LOG_FILE="${LOG_DIR}/autossh.log" \
  AUTOSSH_GATETIME=0 \
  autossh -M "${LX_TUNNEL_MONITOR_PORT:-0}" \
    "${SSH_OPTS[@]}" \
    -L "127.0.0.1:${DB_LOCAL_PORT}:${LX_CLOUD_DB_HOST}:${LX_CLOUD_DB_PORT:-5432}" \
    -L "127.0.0.1:${CACHE_LOCAL_PORT}:${LX_CLOUD_CACHE_HOST}:${LX_CLOUD_CACHE_PORT:-6379}" \
    "${LX_SSH_USER}@${LX_SSH_HOST}" -p "${LX_SSH_PORT:-22}" \
    >> "${LOG_DIR}/tunnel.log" 2>&1 &
else
  warn "未安装 autossh（生产环境必须安装），降级为 ssh + ServerAliveInterval 保活"
  ssh "${SSH_OPTS[@]}" \
    -L "127.0.0.1:${DB_LOCAL_PORT}:${LX_CLOUD_DB_HOST}:${LX_CLOUD_DB_PORT:-5432}" \
    -L "127.0.0.1:${CACHE_LOCAL_PORT}:${LX_CLOUD_CACHE_HOST}:${LX_CLOUD_CACHE_PORT:-6379}" \
    "${LX_SSH_USER}@${LX_SSH_HOST}" -p "${LX_SSH_PORT:-22}" \
    >> "${LOG_DIR}/tunnel.log" 2>&1 &
fi

echo $! > "${PID_FILE}"
sleep 3

if port_listening "${DB_LOCAL_PORT}" && port_listening "${CACHE_LOCAL_PORT}"; then
  log "隧道建立成功，PID=$(cat "${PID_FILE}")"
  rm -f "${RUNTIME_DIR}/.tunnel-down"
else
  fail "隧道端口未就绪，请检查 ${LOG_DIR}/tunnel.log（常见原因：私钥权限、安全组、云端端口未放通）"
fi
